/**
 * Canonical property message templates + identity metadata for usage counting.
 *
 * `content` mirrors the repo-root templates.json. `aliases`/`guards` capture
 * product identity that the raw template text alone doesn't: known renames
 * (e.g. "GK Rezidans" -> "Univotel Şişli", same property/page) and distinct
 * products that reuse large parts of a template's body (e.g. "GK Regency
 * Suites" is a separate hotel, not a Univotel Şişli variant; "Univotel
 * Şişhane" is a separate property from Univotel Galata).
 */

export interface MessageTemplate {
  shortCode: string;
  /** Display label for charts/tables. */
  label: string;
  content: string;
  /** Normalized phrases that identify this property, including renames. */
  aliases: string[];
  /** Normalized phrases marking a different product — any match excludes the message. */
  guards?: string[];
}

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    shortCode: "aca-atasehir-sezon-ful",
    label: "Academic House Ataşehir",
    aliases: ["academic house atasehir"],
    content:
      "Academic House Ataşehir, Ataşehir/Küçükbakkalköy'de bulunan kız öğrenci yurdumuzdur. 1-5 kişilik odalarımız mevcut, her odanın içinde özel banyo/WC bulunur.\n\nYeditepe, Acıbadem vb. çevre üniversitelerine toplu taşımayla 20 dakika civarlarında, hızlı ulaşım sağlamaktadır.\n\nFiyata dahil kahvaltı, spor salonu, 7/24 güvenlik, haftada 2 gün temizlik,ücretsiz çamaşırhane ve kütüphane gibi imkanlarımız vardır.  Bunlara üstelik yurdumuza ait olan kafeden öğrencilerimiz %20 indirimli faydalanırlar.\n\nDepozito 1 aylık kira miktarındadır ve çıkışta iade edilir.\n\nDetaylar ve fiyat bilgisi: https://drive.google.com/file/d/1oBgx5_blupWE6YX1PWw3zJxFrREjPwnD/view?usp=share_link\n\nOda ve mekan fotoğrafları: https://drive.google.com/drive/folders/1NNhySeLMbbxS8dbBQev2M_fCPmaLC9fX?usp=sharing\n\nSayfamız: https://www.univotel.com/yurtlar/academic-house-atasehir-kiz-ogrenci-yurdu Şubemizin Lokasyonu: https://maps.app.goo.gl/WyBzqW6R6jAR8iuU7 ",
  },
  {
    shortCode: "gk-ful",
    label: "Univotel Şişli",
    aliases: ["univotel sisli", "gk rezidans"],
    guards: ["gk regency", "4 yildizli otel"],
    content:
      "Efendim Univotel Şişli, Şişli/Osmanbey'de bulunan rezidans şubemizdir. 1-2-3 kişilik mutfaklı ve mutfaksız oda seçeneklerimiz bulunur. Otel konforunda, özel banyo/WC'li odalar. Süper hızlı WiFi, 7/24 güvenlik, haftalık temizlik, klima, çamaşırhane, kütüphane ve ortak yaşam alanları gibi imkanlarımız vardır.\n\n**Detaylar ve fiyat bilgisi: **https://drive.google.com/file/d/1A0vzyyTwjxveMqMfvqTnCh_f_xhpvJDU/view?usp=sharing\n\nOda videoları ve fotoğrafları: https://drive.google.com/drive/folders/1s-GqETYRo3HyEsIJ4zau33aFmmD_o0_N?usp=sharing\n\nSayfamız: https://www.univotel.com/univoteller/gk-residence Şubemizin Konumu: https://maps.app.goo.gl/UwwhKCJ3err4UjzY6 ",
  },
  {
    shortCode: "aca-maltepe-sezon-ful",
    label: "Academic House Maltepe",
    aliases: ["academic house maltepe"],
    content:
      "Academic House Maltepe, Maltepe/Bağlarbaşı'nda bulunan kız öğrenci yurdumuzdur. Marmara Üniversitesi, Ticaret Üniversitesi vb. civar okullarına 15-20 dakika gibi kısa sürelerde ulaşım sağlayabilmektedir.\n\n2, 3, 4 (bazalı/ranzalı) ve 5 kişilik odalarımız mevcut, her odanın içinde özel banyo/WC bulunur.  Süper hızlı WiFi, 24/7 güvenlik, haftalık temizlik, klima, çamaşırhane, kütüphane ve ortak yaşam alanları gibi imkanlarımız vardır.\n\n**Detaylar ve fiyat bilgisi: **https://drive.google.com/file/d/1k6pO_lmzizqrBMb8649-ef77TYCqlFhS/view?usp=sharing\n\nOda ve mekan fotoğrafları: https://drive.google.com/drive/folders/15nq9aLVgVDRdIemBAdmWwZlC17z-n2PO?usp=sharing\n\nSayfamız: https://www.univotel.com/yurtlar/academic-house-maltepe-kiz Şubemizin Konumu: https://maps.app.goo.gl/3C6JVH85BWdsm3Eq7 ",
  },
  {
    shortCode: "aca-kadikoy-sezon-ful",
    label: "Academic House Kadıköy",
    aliases: ["academic house kadikoy"],
    content:
      "Academic House Kadıköy, Kadıköy/Caferağa'da bulunan kız öğrenci şubemizdir. 1-5 kişilik odalarımız mevcut, her odanın içinde özel banyo/WC bulunur.\n\nMetro, Marmaray ve metrobüs gibi ulaşım araçlarına 10 dakika yürüme mesafesindedir.\n\nFiyata dahil kahvaltı, 7/24 güvenlik, haftalık temizlik, çamaşırhane, etüt alanları gibi imkanlarımız vardır.\n\nDetaylar ve fiyat bilgisi: https://drive.google.com/file/d/1vEH3mAzQuZhnZS8yDZ2Wn2JcAPgTydsE/view?usp=sharing\n\nOda videoları: https://drive.google.com/drive/folders/1muJBsMIH2b6-p9FWmvon_VsIm0FvLHYm?usp=sharing\n\nSayfamız: https://www.univotel.com/yurtlar/academic-house-kadikoy-kiz-ogrenci-yurdu Şubemizin Konumu: https://maps.app.goo.gl/gfySFcPtcFToCKX98 ",
  },
  {
    shortCode: "aca-besiktas-sezon-ful",
    label: "Academic House Beşiktaş",
    aliases: ["academic house besiktas"],
    content:
      "Academic House Beşiktaş, Beşiktaş/Türkali'de bulunan kız öğrenci yurdumuzdur. 1-5 kişilik odalarımız mevcut, her odanın içinde özel banyo/WC bulunur.\n\nBahçeşehir, Galatasaray, YTÜ vb. çevre üniversitelerine 15-20 dakikalık yürüme mesafesinde bulunmaktadır.\n\nFiyata dahil kahvaltı, 7/24 güvenlik, haftada 2 temizlik, ücretsiz çamaşırhane ve etüt odası gibi imkanlarımız vardır.\n\nDetaylar ve fiyat bilgisi: https://drive.google.com/file/d/1mR3uvVvdRrqPknBhhoo0bbazJFAVDA2I/view?usp=share_link\n\nOda ve mekan fotoğrafları: https://drive.google.com/drive/folders/16Us7PoLZloCFPaDDgyRb7FfqK8faPNkw?usp=sharing\n\nSayfamız: https://www.univotel.com/yurtlar/academic-house-besiktas-kiz-ogrenci-yurdu Şubemizin Konumu: https://maps.app.goo.gl/D2buuWzNoCd693uR8 ",
  },
  {
    shortCode: "aca-fatih-sezon-ful",
    label: "Academic House Fatih",
    aliases: ["academic house fatih"],
    content:
      "Academic House Fatih, Fatih/Beyazıt'ta bulunan kız öğrenci yurdumuzdur. 1-4 kişilik odalarımız mevcut.\n\nİstanbul Üniversitesi, Kadir Has Üniversitesi vb. çevre üniversitelerine 20 dakikadan kısa sürede hızlı ulaşım sağlayabilmektedir.\n\nFiyata dahil kahvaltı, 7/24 güvenlik, haftada 2 gün temizlik, ücretsiz çamaşırhane, ortak mutfak gibi imkanlarımız vardır.\n\nToplam 22 kişilik kapasiteyle yurdumuz, butik ve huzurlu bir konaklama sunmaktadır.\n\nDetaylar ve fiyat bilgisi:https://drive.google.com/file/d/1Qf0tk_09lp6cWJYELzPTmdmXC60EvQQK/view?usp=sharing\n\nSayfamız: https://www.univotel.com/yurtlar/academic-house-fatih-kiz-ogrenci-yurdu Şubemizin Konumu: https://maps.app.goo.gl/cFj1hqmrZ7uYWFiN9 ",
  },
  {
    shortCode: "unver-ful",
    label: "Univotel Galata",
    aliases: ["univotel galata"],
    guards: ["univotel sishane"],
    content:
      "Efendim Univotel Galata, Beyoğlu/Galata'da bulunan öğrenci rezidansı şubemizdir. Her birinde banyo/wc ve mini mutfak dahil olan 2 kişilik stüdyo odalar ve 3 kişilik 1+1 daire seçenekleri bulunan şubemiz, 25-30 kişilik kapasitesiyle sessiz ve huzurlu bir konaklama sunmaktadır.\n\nŞişhane M2 metro durağına 10 dk, Tophane tramvay durağına ise 5 dakika yürüme mesafesinde konumlanmaktadır.\n\nDetaylar ve Fiyat Bilgisi;\n\nhttps://drive.google.com/file/d/1xHaReInASyD3S16EfDIj8PZCfQsc9suj/view?usp=sharingOda Fotoğrafları;\n\nhttps://www.univotel.com/univoteller/galata\n\nŞubemizin Konumu;\n\nhttps://maps.app.goo.gl/KFpGhdV5qHiagAiU7 Oda Videoları; https://drive.google.com/drive/folders/1FTe7-__VytOjarrOmhszU0n-fkwzCuuy?usp=sharing ",
  },
  {
    shortCode: "aka-residence-ful",
    label: "Academia Residence",
    aliases: ["academia residence"],
    content:
      "Academia Residence, Kağıthane Merkez'de bulunan rezidans konseptli şubemizdir. 1+1 daire tipinde, 1 ve 2 kişilik salon ve oda seçeneklerimiz vardır efendim. Her dairemizde mutfak ve banyo/WC mevcuttur.\n\nŞubemizde kapının önünden çevre okullara saat başı gidip gelen ücretsiz servislerimiz mevcuttur.\n\nSüper hızlı WiFi, 7/24 güvenlik, haftalık temizlik, klima, çamaşırhane, kütüphane ve ortak yaşam alanları mevcuttur.\n\nDetaylar ve fiyat bilgisi: https://drive.google.com/file/d/1Mb6yxBuF-1N6hksOOl2ArxIXpKES04Dc/view?usp=sharing Oda ve mekan fotoğrafları: https://drive.google.com/drive/folders/1Pq5KXFeppvVbBXDN9bfx1gSkeOd_Rhst?usp=sharing\n\nSayfamız: https://www.univotel.com/univoteller/academia-residence\n\nŞubemizin Konumu: https://maps.app.goo.gl/iVfcdxHJTumTGxvq5 ",
  },
  {
    shortCode: "kavacik-ful",
    label: "Univotel Kavacık",
    aliases: ["univotel kavacik"],
    content:
      "Normal Univotel şubelerinden farklı olan Univotel Kavacık, ev tutmaya daha yakın bir konsepttir. Bütün odalar tek kişilik mobilyalı stüdyo dairedir ve temizlik, yemek vb. öğrenciye aittir.\n\nBeykoz Üniversitesi'ne 7 dakika yürüme, Medipol Üniversitesi'ne 10 dakikalık otobüs ve Türk Alman Üniversitesi'ne  34 dakikalık otobüs yolculuğu ile ulaşım sağlamaktadır.\n\nŞubemizin bütün daireleri tek kişilik olup içerisinde mutfak, beyaz eşya, wc/banyo ve mobilyalar dahildir. Binaya girişler şifreli kapı sistemiyle yapılmaktadır.\n\nDetaylar ve Fiyat Bilgisi;\n\nhttps://drive.google.com/file/d/1GGM4oWLB9BTZul_M67snofWh4ClMzMxs/view?usp=drive_link\n\nOda Videoları;\n\nhttps://drive.google.com/drive/folders/1fd2wzlwfSA8Y2qG3JFtJDw7-P1MY69u4?usp=sharing ",
  },
  {
    shortCode: "aka-seyrantepe-ful",
    label: "Academia Seyrantepe",
    aliases: ["academia seyrantepe"],
    content:
      "Academia Seyrantepe, Kağıthane/Seyrantepe'de bulunan erkek öğrenci yurdumuzdur. 1-4 kişilik odalarımız mevcuttur.\n\nŞubemizde kapının önünden çevre okullara saat başı gidip gelen ücrete dahil servislerimiz mevcuttur.\n\nFiyata dahil kahvaltı, 7/24 güvenlik, haftalık temizlik, klima, çamaşırhane, spor salonu, kütüphane ve ortak yaşam alanları gibi imkanlarımız vardır.\n\nDetaylar ve fiyat bilgisi: https://drive.google.com/file/d/1nn_MqCAPCLyXuLLsEWJ-fq3m_dnKZKcF/view?usp=sharing\n\nMekan fotoğrafları: https://drive.google.com/drive/folders/1UFtzGvNNlVuWwRvmTxTwMfara_7P46gl?usp=sharing\n\nSayfamız: https://www.univotel.com/yurtlar/academia-seyrantepe-erkek-ogrenci-yurdu Şubemizin Konumu: https://maps.app.goo.gl/vjFYoKKo7Li3aLUh7 ",
  },
  {
    shortCode: "aka-vadi-ful",
    label: "Academia Vadi",
    aliases: ["academia vadi"],
    content:
      "Academia Vadi, Sarıyer Ayazağa'da bulunan kız öğrenci yurdumuzdur. 2-5 kişilik odalarımız mevcuttur; Fiyata dahil kahvaltı, 7/24 güvenlik, haftada 2 gün temizlik, çamaşırhane, kütüphane, spor salonu ve ortak alanlar gibi imkanlarımız vardır. Yurdumuzun kapısından çevre okullarına günlük servis hizmeti sunulmaktadır.\n\nDetaylar ve fiyat bilgisi:  https://drive.google.com/file/d/1ckBn2HbSKLOT21pXEkektP-a9WnYjv59/view?usp=sharing\n\nSayfamız: https://www.univotel.com/yurtlar/academia-vadi-ogrenci-yurdu Şubemizin Konumu: https://maps.app.goo.gl/iHxYbexFmsFiyUFC6 ",
  },
  {
    shortCode: "kampushan-ful",
    label: "Kampüshan",
    aliases: ["kampushan"],
    content:
      "Kampüshan, Eyüpsultan Esentepe'de bulunan kız öğrenci yurdumuzdur. Tek kişilik, 3 kişilik (paravanlı/modül) ve 4 kişilik (paravanlı/modül) oda seçeneklerimiz mevcuttur, her odanın içinde özel banyo/WC bulunur. Süper hızlı WiFi, 24/7 güvenlik, haftalık temizlik, klima, çamaşırhane, spor salonu, kütüphane, sinema odası ve teras gibi imkanlarımız vardır.    **Detaylar ve Fiyat Bilgisi; **https://drive.google.com/file/d/13Ux3Upfyf6nUtOl6dfnTaR2I8OcMN63s/view?usp=sharingSayfamız: https://www.univotel.com/yurtlar/kampushan-kiz-ogrenci-yurdu Oda ve Mekan Çekimleri: https://drive.google.com/file/d/1k9mOiZ2yGN3VM8y36cqxCgrdm7OckIzs/view?usp=sharing Şubemizin Konumu: https://maps.app.goo.gl/jYZ8BSka5AT4Yke37 ",
  },
];
