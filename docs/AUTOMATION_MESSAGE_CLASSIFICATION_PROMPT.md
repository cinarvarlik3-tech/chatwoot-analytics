# Implementation Brief: CRM Automation / Bot Message Classification (2026 Live Data)

Use this document as the **single source of truth** for implementing automation (bot) message detection in the Univotel CRM analytics stack. Work in **any codebase state**: discover paths, schema, and sync code dynamically before changing anything.

---

## 1. Mission

Classify **automation/bot outbound messages** in the **live CRM (2026)** so analytics can:

- Exclude them from **human salesperson** performance metrics
- Optionally expose them as a separate **automation/bot** metric later
- Do so **definitively in the database** when possible, not only at query time

**Scope:** 2026 live CRM data only. **Do not** change 2025 Chatwoot archive behavior unless explicitly needed for shared utilities.

**Non-goals (for this task):**

- Per-rule analytics UI (store rule ID for future use, but UI is optional)
- Fixing all Chatwoot sync bugs (document and fix only what blocks classification)
- Identifying messages via Chatwoot `automation_rule_id` alone without verification

---

## 2. Current Problem

### 2.1 Business context

Univotel uses **Chatwoot rule-based automations** (if/then conditions) that send canned outbound replies (property descriptions, “hangi üniversite/kampüs”, Istanbul-only replies, etc.). These must **not** count as human agent activity in the CRM analytics dashboard.

### 2.2 Data context

Two databases are typically involved:

| Database | Role | Env var (typical) |
|----------|------|-------------------|
| Live CRM Supabase | Dashboard reads this for 2026 | `CRM_DATABASE_URL` |
| Chatwoot (live or archive) | Source of truth for message metadata | `CHATWOOT_DATABASE_URL` or live Chatwoot API |

The **analytics dashboard** (Next.js app) reads CRM via API routes and SQL. **Message ingest/sync from Chatwoot → CRM** likely lives in a **different service** (webhook, edge function, worker). **Find it; do not assume it is in the dashboard repo.**

### 2.3 CRM table: `lead_messages` (known shape)

Columns relevant to classification (verify live schema first):

- `id`, `lead_uuid`, `chatwoot_message_id`, `chatwoot_conversation_id`
- `message_type`, `direction`, `content`, `is_private`
- `sender_type`, `sender_id`, `sender_name`, `sender_agent_id`
- `created_at`, `synced_at`

**Missing today:** any column for automation/bot classification (e.g. `chatwoot_automation_rule_id`, `is_automation`, `message_origin`).

**Important:** All (or nearly all) CRM messages should have `chatwoot_message_id` populated — use this for backfill joins to Chatwoot.

### 2.4 Known message patterns in production data

Automations appear in several **inconsistent** shapes:

**A. “Clean” automation rows**

- `message_type = 'outgoing'`
- `sender_type IS NULL`
- Canned `content` (templates below)
- ~370 rows in one observed snapshot

**B. Mis-synced automation rows (same templates, wrong metadata)**

- `direction = 'outgoing'` but `message_type = 'incoming'`
- `sender_name` = customer name (not null)
- `sender_type IS NULL`
- Same canned bodies as (A)
- **Much larger** volume than (A) in observed data (~1,000+ for single templates)

**C. ChatBot user**

- `sender_type = 'user'`, `sender_name` like `'ChatBot'`
- Outbound
- Separate from rule automations; decide explicitly whether to classify as bot

**D. Human agents pasting templates**

- `sender_type = 'user'`, real agent names
- Same URLs/bodies as automations (agents copy-paste property sheets)
- **Must not** classify as bot when a human sender is correctly set

**E. System activity**

- `message_type = 'activity'`, `sender_type = 'system'`
- Not chat automations; usually exclude from message metrics entirely

### 2.5 Chatwoot canonical signal (when applicable)

Chatwoot Automation Rules `send_message` sets:

```json
content_attributes: { "automation_rule_id": <integer> }
```

Chatwoot treats messages with this field as **non-human** responses. CRM sync currently **does not persist** `content_attributes`, so this signal is **lost** at ingest.

**Observed in 2025 archive DB:** zero messages with `automation_rule_id` in `content_attributes` — **do not assume** live Chatwoot behaves the same; **verify on the instance CRM actually syncs from**.

---

## 3. Desired Result

### 3.1 Database (CRM)

Persist classification on `lead_messages`:

**Minimum (required):**

```sql
chatwoot_automation_rule_id INTEGER NULL
-- NULL = not tagged by Chatwoot (or unknown)
-- Non-null = definitive automation rule message
```

**Recommended (for complete bot coverage):**

```sql
is_automation BOOLEAN NOT NULL DEFAULT false
automation_match_method TEXT NULL
-- e.g. 'chatwoot_rule_id' | 'template_substring' | 'template_levenshtein' | 'chatbot_sender' | 'manual'
automation_template_key TEXT NULL  -- optional, e.g. 'ask_university', 'academic_house_atasehir'
```

**Classification rule (logical):**

```
is_automation = true WHEN any of:
  - chatwoot_automation_rule_id IS NOT NULL
  - template classifier matches (see §4.2) under agreed conditions
  - (optional) sender_name ILIKE 'ChatBot' AND outbound
```

### 3.2 Ingest / sync

On every new/updated message from Chatwoot:

1. Read `content_attributes.automation_rule_id` when present
2. Write to `chatwoot_automation_rule_id`
3. Run template classifier if rule ID is null (or always, to set `is_automation`)
4. Set `is_automation` and `automation_match_method` accordingly

### 3.3 Backfill

One-time (and optionally periodic) job:

1. For all existing `lead_messages` with `chatwoot_message_id`
2. Fetch `content_attributes` from **live Chatwoot** (DB join or API)
3. Apply template classifier for rows still unclassified
4. Update CRM rows

### 3.4 Analytics dashboard

Update 2026 CRM analytics queries:

- **Human salesperson outbound:** `is_automation = false` AND `sender_type = 'user'` AND not ChatBot (if not marked `is_automation`)
- **Incoming customer metrics:** unchanged (`incoming` customer messages)
- **Optional bot metric:** `is_automation = true`

Do **not** rely on runtime template matching in API once `is_automation` is backfilled (keep classifier in one shared module used by sync + backfill + tests).

---

## 4. Classification Framework

Implement a **single shared classifier module** (language-agnostic spec):

```text
classifyMessage(message) → {
  isAutomation: boolean
  method: string | null
  templateKey: string | null
  automationRuleId: number | null
}
```

### 4.1 Priority order (first match wins)

1. **`chatwoot_automation_rule_id`** from Chatwoot `content_attributes` → definitive
2. **ChatBot sender** (if product decision = yes) → `sender_name` matches ChatBot pattern
3. **Template substring identifiers** (§4.2) under strict conditions
4. **Template Levenshtein fallback** (§4.3) for templates without unique substrings
5. Otherwise → not automation

### 4.2 Template substring identifiers

Use when **all** of the following hold (initial product rule — adjust after investigation):

- `is_private = false`
- Outbound: `message_type = 'outgoing'` OR `direction = 'outgoing'` (investigate which field is reliable; may need OR during transition)
- **Strict mode:** `sender_type IS NULL`
- **Expanded mode (recommended after investigation):** classify by content even if `sender_name` is wrongly set, when template match is strong (unique drive ID or property-specific opener)

**Global URL markers** (strong when combined with outbound + automation-like sender):

- `Sayfamız: https://www.univotel.com`
- `Detaylar ve fiyat bilgisi: https://drive.google.com`
- `Oda ve mekan fotoğrafları: https://drive.google.com`
- `Şubemizin Lokasyonu: https://maps`

**Property-specific markers** (preferred — unique in normal chat):

| template_key | Identifier (substring) |
|--------------|------------------------|
| ask_university | `Size daha iyi yardımcı olabilmem için hangi üniversite ve hangi kampüsteydeniz efendim` |
| istanbul_only | `Bu sene sadece İstanbul'da hizmet vermekteyiz efendim` |
| gender_ask | `Kız öğrenci için mi bakıyordunuz` |
| no_location | `Sizin üniversitenize yakın henüz bir lokasyonumuz yok` |
| univotel_galata | `Efendim Univotel Galata, Beyoğlu/Galata'da` + drive file id if present |
| univotel_sisli | `Efendim Univotel Şişli, Şişli/Osmanbey'de` |
| univotel_kavacik | `Normal Univotel şubelerinden farklı olan Univotel Kavacık` |
| academic_house_atasehir | `Academic House Ataşehir, Ataşehir/Küçükbakkalköy'de` + `1oBgx5_blupWE6YX1PWw3zJxFrREjPwnD` |
| academic_house_kadikoy | `Academic House Kadıköy, Kadıköy/Caferağa'da` |
| academic_house_fatih | `Academic House Fatih, Fatih/Beyazıt'ta` |
| academic_house_maltepe | `Academic House Maltepe, Maltepe/Bağlarbaşı'nda` |
| academic_house_besiktas | `Academic House Beşiktaş, Beşiktaş/Türkali'de` |
| academia_residence | `Academia Residence, Kağıthane Merkez'de` |
| kampushan | `Kampüshan, Eyüpsultan Esentepe'de` |

**Maintain as data:** JSON/DB table `automation_templates` with `key`, `match_type` (`substring`|`levenshtein`), `match_value`, `active`.

**Discovery step:** Before hardcoding, **query production** for new template clusters:

```sql
-- Example: find high-frequency outbound bodies not yet classified
SELECT LEFT(content, 120), COUNT(*)
FROM lead_messages
WHERE is_private = false AND direction = 'outgoing'
GROUP BY 1 ORDER BY 2 DESC LIMIT 50;
```

Add new templates when stable canned blocks appear.

### 4.3 Levenshtein fallback

For templates **without** unique substrings (or punctuation variants):

- Normalize: lowercase (Turkish locale), NFKD strip diacritics, collapse whitespace, trim
- Compare normalized `content` to normalized **canonical full template text**
- Match if `levenshtein(normalized_content, normalized_template) <= 7`

**Use for:** short templates (ask_university, istanbul_only, gender_ask, no_location).

**Do not** Levenshtein-match long property sheets if a drive file ID or univotel path substring exists — use substring first.

**Implementation options:**

- Node: `fastest-levenshtein` or similar in backfill/sync
- Postgres: `fuzzystrmatch` extension (`levenshtein()`) — verify enabled on Supabase

### 4.4 Normalization helper (required)

```text
normalizeForMatch(text):
  - toLowerCase (tr)
  - Unicode NFKD + remove combining marks
  - replace non-alphanumeric with space
  - collapse whitespace
  - trim
```

Use consistently in substring and Levenshtein paths.

---

## 5. Investigation Checklist (MANDATORY — do before implementation)

Complete these steps and **record findings** in a short `INVESTIGATION.md` or PR description.

### 5.1 Schema discovery

- [ ] Confirm `lead_messages` columns on live CRM (may differ from this doc)
- [ ] Confirm `chatwoot_message_id` coverage (% non-null)
- [ ] Find message sync code path (webhook handler, worker, edge function, repo name)
- [ ] Inspect webhook/API payload: does `content_attributes` arrive at sync layer?
- [ ] Confirm live Chatwoot access method (direct Postgres vs REST API vs same Supabase)

### 5.2 Chatwoot `automation_rule_id` coverage (CRITICAL)

On the **live Chatwoot instance** CRM syncs from (not necessarily the 2025 archive):

- [ ] Join sample CRM rows → Chatwoot messages via `chatwoot_message_id`
- [ ] For rows matching known template content, count:
  - `% with content_attributes.automation_rule_id`
- [ ] For strict cohort (`outgoing` + `sender_type IS NULL`), same count
- [ ] For mis-synced cohort (`direction=outgoing`, `message_type=incoming`), same count

**Decision matrix:**

| Coverage | Action |
|----------|--------|
| High (>90% on known templates) | Primary signal = `automation_rule_id`; template fallback for remainder |
| Low (<50%) | Primary signal = template classifier; store `automation_rule_id` when present but don’t rely on it alone |
| Mixed | Hybrid permanently |

### 5.3 False positive check

- [ ] Count human outbound (`sender_type = 'user'`, not ChatBot) where content contains global URL markers — expect **many** (agents paste sheets)
- [ ] Confirm strict `sender_type IS NULL` rule avoids classifying those
- [ ] If using expanded content-only mode, require **unique** markers (drive file ID, property opener), not global URLs alone

### 5.4 Sync bug impact

- [ ] Quantify mis-synced rows (wrong `message_type` / `sender_name`)
- [ ] Decide: fix sync normalization at ingest **and/or** classify by content regardless of sender fields
- [ ] Document whether fixing sync is in scope or follow-up

### 5.5 ChatBot

- [ ] Count ChatBot outbound messages
- [ ] Product decision: include in `is_automation`? (Recommended: yes)

### 5.6 Analytics touchpoints

- [ ] Locate 2026 analytics SQL (e.g. `crmAnalytics`, `crmSalesAnalytics`, API routes)
- [ ] List every query counting outbound/human messages
- [ ] Plan filter: `AND (is_automation = false OR is_automation IS NULL)` during migration

---

## 6. Implementation Phases

### Phase 0 — Investigation only

Deliver findings table (§5.2 decision matrix). **No schema changes** until coverage is understood.

### Phase 1 — Schema + shared classifier

- [ ] Migration: add columns to `lead_messages`
- [ ] Shared classifier module + unit tests with fixture messages (true positives, human paste, customer incoming)
- [ ] Template catalog file or DB table

### Phase 2 — Backfill

- [ ] Script: load CRM messages → fetch Chatwoot `content_attributes` → run classifier → UPDATE CRM
- [ ] Log counts: by method, by template_key, unclassified high-frequency outbound bodies
- [ ] Idempotent: safe to re-run

### Phase 3 — Sync hook

- [ ] On message create/update from Chatwoot: populate new columns
- [ ] Do not break existing ingest if Chatwoot payload lacks fields

### Phase 4 — Analytics

- [ ] Update human salesperson metrics to exclude `is_automation = true`
- [ ] Verify dashboard numbers move in expected direction (human outbound down, not customer incoming)
- [ ] Optional: add bot/automation count to API response

### Phase 5 — Verification

- [ ] Spot-check 20 known automation messages → `is_automation = true`
- [ ] Spot-check 20 known human agent messages → `is_automation = false`
- [ ] Compare salesperson table totals before/after

---

## 7. What-If Scenarios

| Situation | Response |
|-----------|----------|
| Live Chatwoot has no `automation_rule_id` on canned messages | Rely on template classifier; still add column for future; investigate if automations are macros/greetings not Rules |
| Sync code not in this repo | Implement migration + backfill + analytics here; open separate PR in sync repo or document exact hook for other team |
| `CHATWOOT_DATABASE_URL` points to archive not live | Use Chatwoot API with credentials for live instance, or get live DB URL from env |
| `fuzzystrmatch` not enabled on Supabase | Run Levenshtein in Node backfill only; or request extension enable |
| Classifier flags human who pasted full property sheet | Require `sender_type IS NULL` for URL-only matches; require unique drive ID for property templates |
| Mis-synced rows dominate | Use expanded mode: match on unique content even when `sender_name` is wrong; fix sync separately |
| New automation template added in Chatwoot | Add row to template catalog; re-run backfill or nightly job |
| `automation_rule_id` present but message is private note | Ignore private messages (`is_private = true`) always |
| Duplicate CRM rows same `chatwoot_message_id` | Investigate uniqueness; backfill should handle conflicts |
| Analytics repo has no migration access | Provide SQL migration for CRM repo / Supabase dashboard; analytics reads column once exists |

---

## 8. Testing Requirements

### 8.1 Classifier unit tests (minimum cases)

**Must classify as automation:**

- ask_university template (with/without trailing question mark spacing)
- istanbul_only template
- academic_house_atasehir with drive link
- message with only `automation_rule_id` set (mock Chatwoot attributes)
- ChatBot outbound (if in scope)

**Must NOT classify as automation:**

- Customer incoming message
- Human agent custom reply (`sender_type = user`, unique content)
- Human agent pasting property sheet **with** valid user sender (strict mode)

### 8.2 Integration

- Backfill dry-run mode: print counts, no UPDATE
- After backfill: SQL sanity checks (automation count > 0, human outbound decreased)

---

## 9. Codebase Discovery Hints (not prescriptive paths)

Search for:

- `lead_messages` INSERT/UPDATE
- `chatwoot_message_id`
- `CRM_DATABASE_URL`
- `crmAnalytics`, `crmSalesAnalytics`, `/api/crm/`
- `content_attributes`, `automation_rule_id`
- Webhook routes mentioning Chatwoot or `message_created`

Dashboard app may only **read** CRM; sync may live elsewhere — **find both**.

---

## 10. Success Criteria

- [ ] `lead_messages.is_automation` (or equivalent) populated for **≥95%** of known template automation messages in strict + mis-synced cohorts
- [ ] Human salesperson outbound metrics **exclude** classified automations
- [ ] Zero or near-zero false positives on random sample of 50 human agent outbound messages
- [ ] `chatwoot_automation_rule_id` stored when Chatwoot provides it
- [ ] Classifier + template catalog documented and test-covered
- [ ] Backfill script idempotent and runnable in production with dry-run

---

## 11. Explicit Constraints for the Implementing Agent

1. **2026 CRM only** for analytics behavior changes unless shared code requires abstraction.
2. **Discover before assuming** — schema, sync location, Chatwoot instance, env vars.
3. **Investigation phase is blocking** — report `automation_rule_id` coverage before choosing primary signal.
4. **Single classifier module** — no duplicated template strings in analytics SQL and sync.
5. **Do not** classify customer incoming messages as automation.
6. **Prefer DB persistence** over runtime-only API filtering for final state.
7. **Minimal diff** in analytics queries: add `is_automation` filter, don’t rewrite unrelated dashboard features.
8. **No secrets in repo** — use env vars for DB URLs and Chatwoot API tokens.
9. Document any product decisions made (ChatBot, expanded vs strict sender rule) in PR/commit message.

---

## 12. Reference: Observed Production Counts (snapshot — re-verify live)

These numbers are **hints only**; re-query before implementation:

| Cohort | Approx. count |
|--------|----------------|
| Strict: `outgoing` + `sender_type IS NULL` | ~370 |
| Single template “hangi üniversite…” (all shapes) | ~1,000+ |
| ChatBot outbound | ~390 |
| Human outbound containing property URLs | ~1,700+ (must not bot-classify via URL alone) |

---

## 13. Deliverables Checklist

- [ ] Investigation summary with decision matrix
- [ ] CRM migration SQL
- [ ] Shared classifier module + tests
- [ ] Template catalog (JSON or SQL seed)
- [ ] Backfill script with `--dry-run`
- [ ] Sync hook changes (this repo or documented patch for sync repo)
- [ ] Analytics query updates (2026 human outbound / optional bot metrics)
- [ ] README section: how to re-run backfill when templates change

---

*End of brief. Start at §5 Investigation Checklist, then proceed by §6 Implementation Phases based on findings.*
