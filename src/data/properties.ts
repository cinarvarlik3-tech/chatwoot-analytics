/**
 * Univotel property portfolio: location, pricing, gender policy and quality.
 *
 * Hand-maintained. Edit this file to add a property or change prices, then run
 * `node scripts/geo-refresh.js` to regenerate coordinates and distances.json.
 * Coordinates are committed so the Maps API is never called at runtime.
 *
 * quality 1-5 is the mean of five axes rated with the operator:
 * oda kalitesi, mahremiyet, mutfak/çamaşır, ortak alan, dahil hizmetler.
 * marginIndex is money-per-customer relative to the portfolio baseline of 1.0;
 * Galata and Şişli are own-operated (no partner commission) and earn ~2x.
 */

export interface PropertyRoom {
  /** Turkish label as used in the price list. */
  name: string;
  /** People sharing the room; drives the privacy adjustment. */
  occupancy: number;
  /** TL per person per month. */
  priceMin: number;
  priceMax: number;
}

export interface Property {
  id: string;
  name: string;
  aliases: string[];
  gender: "female" | "male" | "mixed";
  /** Contract length in months; 9, 10 or 12 across the portfolio. */
  contractMonths: number;
  lat: number;
  lng: number;
  quality: number;
  marginIndex: number;
  /** True when utilities are billed on top of rent (Kavacık only). */
  billsExtra?: boolean;
  rooms: PropertyRoom[];
}

/** Added to Kavacık's rent so it tiers honestly against all-inclusive rivals. */
export const KAVACIK_BILLS_TL = 4000;

export const PROPERTIES: Property[] = [
  {
    id: "univotel-sisli",
    name: "Univotel Şişli",
    aliases: ["GK Regency Suites"],
    gender: "mixed",
    contractMonths: 9,
    lat: 41.047818, lng: 28.985252,
    quality: 3.9,
    marginIndex: 2,
    rooms: [
      { name: "Single Büyük", occupancy: 1, priceMin: 41000, priceMax: 41000 },
      { name: "Single", occupancy: 1, priceMin: 38000, priceMax: 38000 },
      { name: "Double Mutfaklı", occupancy: 2, priceMin: 28000, priceMax: 28000 },
      { name: "Double", occupancy: 2, priceMin: 22000, priceMax: 26000 },
    ],
  },
  {
    id: "univotel-galata",
    name: "Univotel Galata",
    aliases: [],
    gender: "mixed",
    contractMonths: 9,
    lat: 41.02613, lng: 28.97775,
    quality: 3.8,
    marginIndex: 2,
    rooms: [
      { name: "Triple 1+1", occupancy: 3, priceMin: 24000, priceMax: 32000 },
      { name: "Double", occupancy: 2, priceMin: 30000, priceMax: 30000 },
      { name: "Double Geniş", occupancy: 2, priceMin: 32000, priceMax: 32000 },
    ],
  },
  {
    id: "univotel-kavacik",
    name: "Univotel Kavacık",
    aliases: [],
    gender: "mixed",
    contractMonths: 12,
    lat: 41.09335, lng: 29.0877,
    quality: 3.2,
    marginIndex: 1,
    billsExtra: true,
    rooms: [
      { name: "Stüdyo 305", occupancy: 1, priceMin: 34000, priceMax: 34000 },
      { name: "Stüdyo std", occupancy: 1, priceMin: 35000, priceMax: 36000 },
      { name: "Stüdyo 701 balkonlu", occupancy: 1, priceMin: 52000, priceMax: 52000 },
    ],
  },
  {
    id: "turkuaz-sutluce",
    name: "Turkuaz Sütlüce",
    aliases: ["Turkuaz Yurtları Sütlüce"],
    gender: "female",
    contractMonths: 10,
    lat: 41.05934, lng: 28.95187,
    quality: 2.6,
    marginIndex: 1,
    rooms: [
      { name: "Single", occupancy: 1, priceMin: 32000, priceMax: 32000 },
      { name: "Double", occupancy: 2, priceMin: 25000, priceMax: 25000 },
      { name: "Triple", occupancy: 3, priceMin: 23000, priceMax: 23000 },
      { name: "Quad", occupancy: 4, priceMin: 18000, priceMax: 18000 },
    ],
  },
  {
    id: "ah-besiktas",
    name: "A.H. Beşiktaş",
    aliases: ["Academic House Beşiktaş"],
    gender: "female",
    contractMonths: 9,
    lat: 41.0477, lng: 29.00323,
    quality: 2.4,
    marginIndex: 1,
    rooms: [
      { name: "Single", occupancy: 1, priceMin: 35000, priceMax: 55500 },
      { name: "Double", occupancy: 2, priceMin: 30000, priceMax: 32000 },
      { name: "Triple", occupancy: 3, priceMin: 20000, priceMax: 25000 },
      { name: "Quad", occupancy: 4, priceMin: 23000, priceMax: 24000 },
      { name: "Quint", occupancy: 5, priceMin: 21000, priceMax: 22000 },
    ],
  },
  {
    id: "ah-kadikoy",
    name: "A.H. Kadıköy",
    aliases: ["Academic House Kadıköy"],
    gender: "female",
    contractMonths: 9,
    lat: 40.98913, lng: 29.02669,
    quality: 2.8,
    marginIndex: 1,
    rooms: [
      { name: "Single", occupancy: 1, priceMin: 49000, priceMax: 49000 },
      { name: "Double", occupancy: 2, priceMin: 33500, priceMax: 33500 },
      { name: "Triple", occupancy: 3, priceMin: 27900, priceMax: 27900 },
      { name: "Quad", occupancy: 4, priceMin: 24000, priceMax: 24000 },
      { name: "Quint", occupancy: 5, priceMin: 20000, priceMax: 20000 },
    ],
  },
  {
    id: "ah-maltepe",
    name: "A.H. Maltepe",
    aliases: ["Academic House Maltepe"],
    gender: "female",
    contractMonths: 9,
    lat: 40.92208, lng: 29.13312,
    quality: 3.9,
    marginIndex: 1,
    rooms: [
      { name: "Double", occupancy: 2, priceMin: 49500, priceMax: 49500 },
      { name: "Triple", occupancy: 3, priceMin: 36300, priceMax: 39600 },
      { name: "Quad", occupancy: 4, priceMin: 28600, priceMax: 29700 },
      { name: "Quint", occupancy: 5, priceMin: 24200, priceMax: 27500 },
    ],
  },
  {
    id: "ah-atasehir",
    name: "A.H. Ataşehir",
    aliases: ["Academic House Ataşehir"],
    gender: "female",
    contractMonths: 9,
    lat: 40.97949, lng: 29.11711,
    quality: 4,
    marginIndex: 1,
    rooms: [
      { name: "Single", occupancy: 1, priceMin: 50000, priceMax: 60000 },
      { name: "Double", occupancy: 2, priceMin: 44000, priceMax: 44000 },
      { name: "Triple", occupancy: 3, priceMin: 35500, priceMax: 35500 },
      { name: "Quad", occupancy: 4, priceMin: 30000, priceMax: 30000 },
      { name: "Quint", occupancy: 5, priceMin: 27000, priceMax: 27000 },
    ],
  },
  {
    id: "ah-fatih",
    name: "A.H. Fatih",
    aliases: ["Academic House Fatih"],
    gender: "female",
    contractMonths: 9,
    lat: 41.0143, lng: 28.92973,
    quality: 2.6,
    marginIndex: 1,
    rooms: [
      { name: "Single", occupancy: 1, priceMin: 35000, priceMax: 35000 },
      { name: "Double", occupancy: 2, priceMin: 25000, priceMax: 25000 },
      { name: "Triple", occupancy: 3, priceMin: 23000, priceMax: 23000 },
      { name: "Quad", occupancy: 4, priceMin: 20000, priceMax: 20000 },
      { name: "Quint", occupancy: 5, priceMin: 14500, priceMax: 15600 },
    ],
  },
  {
    id: "academia-residence",
    name: "Academia Residence",
    aliases: [],
    gender: "mixed",
    contractMonths: 10,
    lat: 41.08203, lng: 28.97153,
    quality: 4.3,
    marginIndex: 1,
    rooms: [
      { name: "Single Salon", occupancy: 1, priceMin: 35000, priceMax: 45000 },
      { name: "Double Salon", occupancy: 2, priceMin: 33000, priceMax: 33000 },
      { name: "Single Yatak", occupancy: 1, priceMin: 42000, priceMax: 53000 },
      { name: "Double Yatak", occupancy: 2, priceMin: 35000, priceMax: 35000 },
      { name: "Tek Kişilik Daire", occupancy: 1, priceMin: 86000, priceMax: 86000 },
    ],
  },
  {
    id: "academia-seyrantepe",
    name: "Academia Seyrantepe",
    aliases: [],
    gender: "male",
    contractMonths: 9,
    lat: 41.09952, lng: 29.00028,
    quality: 3.6,
    marginIndex: 1,
    rooms: [
      { name: "Single", occupancy: 1, priceMin: 45600, priceMax: 45600 },
      { name: "Double", occupancy: 2, priceMin: 36100, priceMax: 36100 },
      { name: "Triple", occupancy: 3, priceMin: 28500, priceMax: 28500 },
      { name: "Quad", occupancy: 4, priceMin: 24700, priceMax: 24700 },
    ],
  },
  {
    id: "academia-vadi",
    name: "Academia Vadi",
    aliases: [],
    gender: "female",
    contractMonths: 10,
    lat: 41.103335, lng: 28.979786,
    quality: 3.2,
    marginIndex: 1,
    rooms: [
      { name: "Double", occupancy: 2, priceMin: 42000, priceMax: 45000 },
      { name: "Triple", occupancy: 3, priceMin: 36000, priceMax: 39000 },
      { name: "Quad", occupancy: 4, priceMin: 33000, priceMax: 36000 },
      { name: "Quint", occupancy: 5, priceMin: 31000, priceMax: 33000 },
    ],
  },
  {
    id: "kampushan",
    name: "Kampüshan Eyüpsultan",
    aliases: ["Kampüshan Kız Öğrenci Yurdu"],
    gender: "female",
    contractMonths: 9,
    lat: 41.07453, lng: 28.94293,
    quality: 3.7,
    marginIndex: 1,
    rooms: [
      { name: "Single", occupancy: 1, priceMin: 59400, priceMax: 59400 },
      { name: "Triple Paravan", occupancy: 3, priceMin: 38500, priceMax: 38500 },
      { name: "Triple Modül", occupancy: 3, priceMin: 33000, priceMax: 33000 },
      { name: "Quad Paravan", occupancy: 4, priceMin: 33600, priceMax: 33600 },
      { name: "Quad Modül", occupancy: 4, priceMin: 28000, priceMax: 28000 },
    ],
  },
];
