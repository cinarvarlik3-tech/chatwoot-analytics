"use client";

/**
 * Üniversite Analizi: every university the parser has seen, with the metrics that
 * matter for ranking it by business importance. Sortable on every column.
 */

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  GraduationCap,
  Info,
  Search,
} from "lucide-react";
import type {
  UniversityAnalysisResponse,
  UniversityAnalysisRow,
} from "@/lib/types";

type ScopeFilter = "all" | "istanbul" | "outside-istanbul";
type SortKey = keyof UniversityAnalysisRow;

interface Column {
  key: SortKey;
  label: string;
  hint: string;
  group: string;
  format: (row: UniversityAnalysisRow) => string;
  emphasis?: boolean;
}

const int = new Intl.NumberFormat("tr-TR");
const dec = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const one = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const pct = (v: number) => `%${one.format(v)}`;
const dash = "–";

/** Renders a duration in minutes as the largest sensible unit. */
function minutes(v: number | null): string {
  if (v === null) return dash;
  if (v < 60) return `${Math.round(v)} dk`;
  if (v < 60 * 24) return `${one.format(v / 60)} sa`;
  return `${one.format(v / 1440)} gün`;
}

/**
 * The three headline scores, always visible. Everything else is calculation
 * detail behind the "Tablo detaylarını göster" toggle.
 */
const SCORE_COLUMNS: Column[] = [
  { key: "uyumScore", label: "Uyum Skoru", hint: "0-10. Portföyümüzün bu okulun öğrencisini ne kadar iyi barındırabildiği: yürüme/toplu taşıma süresi, fiyat kademesi kapsaması, oda kalitesi ve cinsiyet uygunluğu. Gelir/marj bu skora dahil DEĞİLDİR.", group: "Skorlar", format: (r) => one.format(r.uyumScore), emphasis: true },
  { key: "ilgiScore", label: "İlgi Skoru", hint: "0-10. Talep tarafı: aday hacmi, son 30 gün ivmesi, derin sohbet oranı, dönüş oranı ve huni ilerlemesi.", group: "Skorlar", format: (r) => one.format(r.ilgiScore), emphasis: true },
  { key: "onemScore", label: "Önem Skoru", hint: "0-10. İlgi ve Uyum'un geometrik ortalaması (eşit ağırlık), getiri katsayısıyla düzeltilir. Çarpımsaldır: barındıramadığımız okul talep ne olursa olsun önemli değildir, kimsenin sormadığı okul da öyle.", group: "Skorlar", format: (r) => one.format(r.onemScore), emphasis: true },
];

/**
 * Gender split, behind its own toggle. Kept separate from the detail columns
 * because the female/male gap is the portfolio's biggest structural finding —
 * one male-only property against eight female-only ones.
 */
const GENDER_COLUMNS: Column[] = [
  { key: "uyumFemale", label: "Uyum (K)", hint: "Kadın öğrenci için uyum skoru. Portföyde 8 kadın + 4 karma tesis bulunuyor.", group: "Skorlar", format: (r) => one.format(r.uyumFemale) },
  { key: "uyumMale", label: "Uyum (E)", hint: "Erkek öğrenci için uyum skoru. Yalnızca 1 erkek tesisi (Academia Seyrantepe) ve 4 karma tesis olduğu için genelde çok daha düşüktür.", group: "Skorlar", format: (r) => one.format(r.uyumMale) },
];

const COLUMNS: Column[] = [
  // --- scores -------------------------------------------------------------
  { key: "fark", label: "Fark", hint: "İlgi eksi Uyum. Pozitif = karşılayamadığımız talep; yeni şube açılacak yerleri gösterir. Marjdan etkilenmez.", group: "Skor Detayı", format: (r) => (r.fark > 0 ? "+" : "") + one.format(r.fark) },
  { key: "getiri", label: "Getiri", hint: "Bu okula hizmet veren tesislerin müşteri başına kazanç katsayısı. Galata ve Şişli kendi işletmemiz olduğu için ~2,0.", group: "Skor Detayı", format: (r) => dec.format(r.getiri) },

  // --- volume -------------------------------------------------------------
  { key: "leads", label: "Aday", hint: "İlk andığı üniversiteye atanan lead sayısı. Toplamı eşleşen lead sayısına eşittir.", group: "Hacim", format: (r) => int.format(r.leads), emphasis: true },
  { key: "leadsMentioning", label: "Bahseden", hint: "Bu üniversiteyi anan tüm leadler (ilk anma şartı yok). Aday'dan büyükse üniversite sıkça ikinci seçenek olarak anılıyor.", group: "Hacim", format: (r) => int.format(r.leadsMentioning) },
  { key: "leadShare", label: "Pay", hint: "Bu üniversitenin tüm eşleşen leadler içindeki yüzdesi.", group: "Hacim", format: (r) => pct(r.leadShare) },
  { key: "messages", label: "Mesaj", hint: "Toplam mesaj (gelen + giden). Bir lead birden fazla üniversite andıysa mesajları her birinin altında sayılır.", group: "Hacim", format: (r) => int.format(r.messages), emphasis: true },
  { key: "inboundMessages", label: "Gelen", hint: "Müşteriden gelen mesajlar (direction='incoming').", group: "Hacim", format: (r) => int.format(r.inboundMessages) },
  { key: "outboundMessages", label: "Giden", hint: "Tarafımızdan gönderilen mesajlar (insan + bot).", group: "Hacim", format: (r) => int.format(r.outboundMessages) },

  // --- per lead -----------------------------------------------------------
  { key: "messagesPerLead", label: "Mesaj/Aday", hint: "Lead başına toplam mesaj. Sohbetin ne kadar derinleştiğini gösterir.", group: "Aday Başına", format: (r) => dec.format(r.messagesPerLead), emphasis: true },
  { key: "inboundPerLead", label: "Gelen/Aday", hint: "Lead başına gelen mesaj. Müşteri ilgisinin en doğrudan ölçüsü.", group: "Aday Başına", format: (r) => dec.format(r.inboundPerLead), emphasis: true },
  { key: "outboundPerLead", label: "Giden/Aday", hint: "Lead başına gönderdiğimiz mesaj. Satış eforunun ölçüsü.", group: "Aday Başına", format: (r) => dec.format(r.outboundPerLead), emphasis: true },

  // --- engagement ---------------------------------------------------------
  { key: "engagementRate", label: "Derin Sohbet", hint: "5+ gelen mesaj bırakan leadlerin oranı. funnel_status %95 'yeni' olduğu için ciddi ilgiye en yakın göstergedir.", group: "Etkileşim", format: (r) => pct(r.engagementRate) },
  { key: "returnRate", label: "Dönüş", hint: "Farklı bir günde kendiliğinden geri dönen leadlerin oranı. Takvim gününe göre hesaplanır; herhangi bir mesajlaşma penceresi kuralına bağlı değildir.", group: "Etkileşim", format: (r) => pct(r.returnRate), emphasis: true },
  { key: "sustainedRate", label: "3g+ Dönüş", hint: "İlk temastan 3 günden uzun süre sonra hâlâ yazan leadlerin oranı. Haftalar süren karar sürecinde kalıcı ilginin göstergesi.", group: "Etkileşim", format: (r) => pct(r.sustainedRate) },
  { key: "avgSpanDays", label: "Sohbet Ömrü", hint: "İlk ve son gelen mesaj arasındaki ortalama süre (gün).", group: "Etkileşim", format: (r) => (r.avgSpanDays === null ? dash : `${dec.format(r.avgSpanDays)} g`) },
  { key: "oneAndDoneRate", label: "Tek Mesaj", hint: "Tek mesaj yazıp sessizleşen leadlerin oranı. Yüksekse ilgi yüzeysel.", group: "Etkileşim", format: (r) => pct(r.oneAndDoneRate) },
  { key: "automationShare", label: "Bot Payı", hint: "Giden mesajların yüzde kaçı otomasyon. Yüksekse insan teması az.", group: "Etkileşim", format: (r) => pct(r.automationShare) },
  { key: "medianFirstResponseMin", label: "İlk Yanıt", hint: "İlk müşteri mesajından ilk yanıtımıza kadar geçen medyan süre.", group: "Etkileşim", format: (r) => minutes(r.medianFirstResponseMin) },

  // --- trend --------------------------------------------------------------
  { key: "leads7d", label: "7 Gün", hint: "Son 7 gündeki yeni lead sayısı.", group: "Trend", format: (r) => int.format(r.leads7d) },
  { key: "leads30d", label: "30 Gün", hint: "Son 30 gündeki yeni lead sayısı. Sezon içinde toplam sayıdan daha yön göstericidir.", group: "Trend", format: (r) => int.format(r.leads30d) },
  { key: "growthRate", label: "Büyüme", hint: "Son 7 gün / önceki 7 gün. 1,00 üstü büyüyor demektir.", group: "Trend", format: (r) => (r.growthRate === null ? dash : `${dec.format(r.growthRate)}×`) },

];

const GROUP_ORDER = ["Skor Detayı", "Hacim", "Aday Başına", "Etkileşim", "Trend"];

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-900">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export function UniversityAnalysis() {
  const [data, setData] = useState<UniversityAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("onemScore");
  const [asc, setAsc] = useState(false);
  const [scope, setScope] = useState<ScopeFilter>("istanbul");
  const [query, setQuery] = useState("");
  const [minLeads, setMinLeads] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [showGender, setShowGender] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/crm/university-analysis")
      .then(async (res) => {
        if (!res.ok) throw new Error("İstek başarısız");
        return (await res.json()) as UniversityAnalysisResponse;
      })
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Üniversite analiz verileri yüklenemedi");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Default view is the three scores; details expand the full calculation. */
  const visibleColumns = useMemo(() => {
    // gender split sits directly after Uyum Skoru so the three read together
    const scores = showGender
      ? [SCORE_COLUMNS[0], ...GENDER_COLUMNS, ...SCORE_COLUMNS.slice(1)]
      : SCORE_COLUMNS;
    return showDetails ? [...scores, ...COLUMNS] : scores;
  }, [showDetails, showGender]);

  const rows = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLocaleLowerCase("tr");
    const filtered = data.rows.filter((r) => {
      if (r.leadsMentioning === 0) return false;
      if (scope !== "all" && r.scope !== scope) return false;
      if (r.leads < minLeads) return false;
      if (q && !r.name.toLocaleLowerCase("tr").includes(q)) return false;
      return true;
    });

    const dir = asc ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * dir;
      }
      // nulls (e.g. no response time recorded) always sort last
      if (av === null) return 1;
      if (bv === null) return -1;
      return String(av).localeCompare(String(bv), "tr") * dir;
    });
  }, [data, sortKey, asc, scope, query, minLeads]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setAsc(false);
    }
  }

  const totals = data?.totals;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5 p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <GraduationCap className="h-5 w-5 text-violet-600" />
            Üniversite Analizi
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Gelen konuşmalardan otomatik ayrıştırılan üniversite verileri. 5 dakikada
            bir yenilenir.
          </p>
        </div>
        {data?.lastParsedAt && (
          <div className="text-right text-xs text-slate-400">
            Son ayrıştırma
            <div className="font-medium text-slate-600">
              {new Date(data.lastParsedAt).toLocaleString("tr-TR", {
                timeZone: "Europe/Istanbul",
              })}
            </div>
          </div>
        )}
      </header>

      {totals && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Üniversite" value={int.format(totals.universities)} />
          <StatCard
            label="Eşleşen Aday"
            value={int.format(totals.matchedLeads)}
            sub={`toplam ${int.format(totals.leads)}`}
          />
          <StatCard
            label="Belirtilmemiş"
            value={int.format(totals.unmatchedLeads)}
            sub={`%${one.format((totals.unmatchedLeads / Math.max(1, totals.leads)) * 100)}`}
          />
          <StatCard label="Toplam Mesaj" value={int.format(totals.messages)} />
          <StatCard label="Gelen" value={int.format(totals.inboundMessages)} />
          <StatCard label="Giden" value={int.format(totals.outboundMessages)} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Üniversite ara…"
            className="w-56 rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm text-slate-700 outline-none focus:border-violet-400"
          />
        </div>

        <div className="flex overflow-hidden rounded-lg border border-slate-200">
          {(
            [
              ["istanbul", "İstanbul"],
              ["outside-istanbul", "İstanbul Dışı"],
              ["all", "Tümü"],
            ] as [ScopeFilter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setScope(value)}
              className={`px-3 py-2 text-sm transition-colors ${
                scope === value
                  ? "bg-violet-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          Min. aday
          <input
            type="number"
            min={0}
            value={minLeads}
            onChange={(e) => setMinLeads(Math.max(0, Number(e.target.value) || 0))}
            className="w-20 rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:border-violet-400"
          />
        </label>

        <label className="ml-auto flex cursor-pointer select-none items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showGender}
            onChange={(e) => setShowGender(e.target.checked)}
            className="h-4 w-4 cursor-pointer accent-violet-600"
          />
          Cinsiyet kırılımını göster
        </label>

        <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showDetails}
            onChange={(e) => setShowDetails(e.target.checked)}
            className="h-4 w-4 cursor-pointer accent-violet-600"
          />
          Tablo detaylarını göster
        </label>

        <span className="text-sm text-slate-500">
          {int.format(rows.length)} üniversite
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            {showDetails && (
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-500">
                  #
                </th>
                <th className="sticky left-10 z-10 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-500">
                  Üniversite
                </th>
                {["Skorlar", ...GROUP_ORDER].map((group) => (
                  <th
                    key={group}
                    colSpan={visibleColumns.filter((c) => c.group === group).length}
                    className="border-l border-slate-200 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400"
                  >
                    {group}
                  </th>
                ))}
              </tr>
            )}
            <tr className="border-b border-slate-200 bg-white">
              <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-500">
                {showDetails ? "" : "#"}
              </th>
              <th className="sticky left-10 z-10 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-500">
                {showDetails ? "" : "Üniversite"}
              </th>
              {visibleColumns.map((col, i, arr) => {
                const active = sortKey === col.key;
                const firstInGroup = i === 0 || arr[i - 1].group !== col.group;
                return (
                  <th
                    key={col.key}
                    title={col.hint}
                    onClick={() => toggleSort(col.key)}
                    aria-sort={active ? (asc ? "ascending" : "descending") : "none"}
                    className={`cursor-pointer whitespace-nowrap px-3 py-2 text-right text-xs font-semibold transition-colors hover:bg-slate-50 ${
                      firstInGroup ? "border-l border-slate-200" : ""
                    } ${
                      active
                        ? "bg-violet-50 text-violet-700"
                        : "text-slate-600"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {active ? (
                        asc ? (
                          <ArrowUp className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5" />
                        )
                      ) : (
                        <ArrowDownUp className="h-3 w-3 text-slate-300" />
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={visibleColumns.length + 2}
                  className="px-4 py-10 text-center text-sm text-slate-400"
                >
                  Yükleniyor…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={visibleColumns.length + 2}
                  className="px-4 py-10 text-center text-sm text-slate-400"
                >
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row, index) => (
                <tr
                  key={row.canonicalId}
                  className="border-b border-slate-100 last:border-0 hover:bg-violet-50/40"
                >
                  <td className="sticky left-0 z-10 bg-white px-3 py-2 text-xs text-slate-400">
                    {index + 1}
                  </td>
                  <td className="sticky left-10 z-10 max-w-[18rem] truncate bg-white px-3 py-2 font-medium text-slate-800">
                    <span title={row.name}>{row.name}</span>
                    {row.scope === "outside-istanbul" && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                        İst. dışı
                      </span>
                    )}
                  </td>
                  {visibleColumns.map((col, i, arr) => {
                    const firstInGroup = i === 0 || arr[i - 1].group !== col.group;
                    const active = sortKey === col.key;
                    return (
                      <td
                        key={col.key}
                        className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${
                          firstInGroup ? "border-l border-slate-100" : ""
                        } ${active ? "bg-violet-50/50" : ""} ${
                          col.emphasis
                            ? "font-semibold text-slate-900"
                            : "text-slate-600"
                        }`}
                      >
                        {col.format(row)}
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <div className="space-y-2">
          <p>
            <strong className="text-slate-700">İlgi Skoru</strong> lead
            etkileşimlerinden gelir: aday hacmi, son 30 gün ivmesi, sohbet
            derinliği ve leadlerin kendiliğinden geri dönme oranı. Yani{" "}
            <em>okulun bize ne kadar talep gönderdiğini</em> ölçer.
          </p>
          <p>
            <strong className="text-slate-700">Uyum Skoru</strong> tesis–okul
            ilişkisinden gelir: kampüse yürüme/toplu taşıma süresi, fiyat
            kademelerinin kapsanması, oda kalitesi ve cinsiyet uygunluğu. Yani{" "}
            <em>o okulun öğrencisini gerçekten barındırıp barındıramadığımızı</em>{" "}
            ölçer. Talep bu skora girmez.
          </p>
          <p>
            <strong className="text-slate-700">Önem Skoru</strong> ikisinden
            türetilir — geometrik ortalamaları, getiri katsayısıyla düzeltilir.
            Çarpımsaldır: barındıramadığımız bir okul talep ne kadar yüksek olursa
            olsun önemli değildir, kimsenin sormadığı bir okul da ne kadar iyi
            hizmet verebilsek de önemli değildir.
          </p>
          <p className="text-slate-400">
            Uyum 10 üzerinden değil, portföyün ulaşabileceği en iyi kapsamaya göre
            ölçeklenir: İstanbul&apos;da en iyi konumlanmış varsayımsal bir kampüs
            9,0 alır. 9–10 aralığı, mevcut portföyün kimseye sunamadığı kapsama
            için ayrılmıştır.
          </p>
          {showDetails && (
            <p className="text-slate-400">
              <strong className="text-slate-600">Aday</strong> sütunu her leadi{" "}
              <em>ilk andığı</em> üniversiteye sayar, bu yüzden toplamı eşleşen lead
              sayısına eşittir. <strong className="text-slate-600">Mesaj</strong>{" "}
              sütunları ise leadin mesajlarını <em>andığı her</em> üniversitenin
              altında sayar; bu yüzden toplamları gerçek mesaj sayısının üzerindedir.
              Gelen/giden ayrımı <code>direction</code> alanına dayanır;{" "}
              <code>message_type</code> ~2150 satırda bozuk olduğu için kullanılmaz.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
