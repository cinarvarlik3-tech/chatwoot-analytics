/**
 * Shared SQL fragments for CRM lead_messages analytics (2026).
 */

/**
 * Customer incoming messages.
 *
 * `direction` is authoritative; `message_type` is legacy and unreliable. They
 * disagree on ~2,150 rows and message_type is wrong in BOTH directions: 2,093 agent
 * sends carry message_type='incoming' (including the bot's own "hangi üniversite ve
 * hangi kampüsteydeniz efendim?"), and 59 genuine customer messages carry
 * message_type='outgoing'. Those rows also have sender_type NULL with sender_name
 * holding the *contact's* name, which looks like a migration that mis-set the column.
 *
 * The previous `(direction = 'incoming' OR message_type = 'incoming')` union counted
 * 857 agent messages across 708 leads as customer traffic. Removing message_type
 * lowers inbound counts by that amount -- the inflation coming out, not a regression.
 * Verified separately: no genuine inbound row is dropped by the automation clause.
 */
export const HUMAN_INCOMING_MESSAGE_FILTER = `
  lm.is_private = false
  AND COALESCE(lm.is_automation, false) = false
  AND lm.direction = 'incoming'
`;

/** Human agent outbound messages (excludes bot/automation). */
export const HUMAN_OUTBOUND_MESSAGE_FILTER = `
  lm.is_private = false
  AND COALESCE(lm.is_automation, false) = false
  AND lm.direction = 'outgoing'
  AND lm.message_type = 'outgoing'
  AND lm.sender_type = 'user'
`;

/** Classified automation/bot outbound messages. */
export const AUTOMATION_OUTBOUND_MESSAGE_FILTER = `
  lm.is_private = false
  AND lm.is_automation = true
  AND (lm.direction = 'outgoing' OR lm.message_type = 'outgoing')
`;

/**
 * All outgoing messages minus bot messages, i.e. the complement of
 * AUTOMATION_OUTBOUND_MESSAGE_FILTER over the same outbound set.
 * Broader than HUMAN_OUTBOUND_MESSAGE_FILTER: it also keeps mis-synced rows
 * whose sender metadata is missing but which are not classified as automation.
 */
export const HUMAN_OUTGOING_MESSAGE_FILTER = `
  lm.is_private = false
  AND COALESCE(lm.is_automation, false) = false
  AND (lm.direction = 'outgoing' OR lm.message_type = 'outgoing')
`;

/** All outbound messages regardless of automation classification (bot + human). */
export const ALL_OUTBOUND_MESSAGE_FILTER = `
  lm.is_private = false
  AND (lm.direction = 'outgoing' OR lm.message_type = 'outgoing')
`;
