# AuraTranslate - Gemini API Makine Çevirisi Uygulaması

Gemini API kullanarak geliştirilmiş; alan, üslup ve özel terimce (glossary) destekli modern ve pastel tonlu makine çevirisi web uygulaması.

---

## 🌟 Özellikler
- **Çoklu Dil Desteği:** İngilizce ↔ Türkçe, İspanyolca, Almanca, Fransızca, İtalyanca, Rusça, Arapça, Japonca ve Otomatik Dil Algılama.
- **Tek Tıkla Dil Değiştirme (Swap):** Kaynak ve hedef dilleri ile kutulardaki metinleri anında yer değiştirir.
- **Alan (Domain) Seçimi:**
  - Genel
  - Edebi (Duygu, ahenk ve metaforları korur)
  - Tıp & Sağlık (Biyomedikal terminolojiye sadık kalır)
  - Hukuk & Mevzuat (Kanuni kalıplara ve terminolojiye harfiyen uyar)
  - Akademik & Bilimsel
  - Teknik & Mühendislik
- **Üslup (Style) Seçimi:**
  - Resmi (Kurumsal, "Siz" dili)
  - Gündelik (Samimi, "Sen" dili)
  - Şiirsel / Lirik
- **Özel Terimce (Glossary):**
  - Kullanıcı `kaynak terim = hedef terim` şeklinde satırlar ekleyebilir.
  - Model bu terimleri çeviride KESİNLİKLE kullanır.
  - Terimler tarayıcınızın yerel hafızasında saklanır, sayfa yenilense de kaybolmaz.
- **Doğrudan Çeviri Çıktısı:** Model tırnak, giriş ("İşte çeviri:") veya sonuç açıklamaları eklemeden sadece saf çeviriyi döndürür.
- **Türkçe Hata Yönetimi:** API anahtarı eksikliği, kota aşımı, geçersiz anahtar veya internet kesintilerinde kullanıcıya ne yapması gerektiğini açıklayan Türkçe uyarı kutusu gösterilir.
- **Pastel & Modern Tasarım:** Göz yormayan lavanta, nane ve pastel tonlar, DeepL tarzı iki sütunlu panel ve tam mobil uyumluluk.

---

## 🚀 Yeni Başlayanlar İçin Kurulum ve Çalıştırma Adımları

### 1. Adım: API Anahtarınızı `.env` Dosyasına Ekleyin
Proje klasöründeki `.env` dosyasını Not Defteri veya VS Code ile açın:
```env
GEMINI_API_KEY=AIzaSy...buraya_kendi_anahtarinizi_yapistirin
PORT=3000
```
> *(Eğer henüz anahtarınız yoksa [Google AI Studio](https://aistudio.google.com/app/apikey) adresinden ücretsiz bir Gemini API Key alabilirsiniz.)*

### 2. Adım: Bağımlılıkları Yükleme (Gerekirse)
Terminalde projenin olduğu klasörde şu komutu çalıştırın (zaten kurulmuş durumdadır):
```bash
npm.cmd install
```

### 3. Adım: Uygulamayı Başlatma
Terminali açıp uygulamayı başlatmak için:
```bash
node server.js
```
*(veya `npm.cmd start`)*

Başarılı olduğunda ekranda şu mesajı göreceksiniz:
```text
=======================================================
🚀 Makine Çevirisi Uygulaması Başarıyla Başlatıldı!
🔗 Tarayıcınızda açın: http://localhost:3000
=======================================================
```

### 4. Adım: Tarayıcıda Açma
Google Chrome, Microsoft Edge veya dilediğiniz bir tarayıcıyı açın ve adres çubuğuna şunu yazın:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📂 Proje Dosya Yapısı
```text
AI FOR TRANSLATORS/
├── server.js            # Node.js Express backend sunucusu ve Gemini API entegrasyonu
├── package.json         # Bağımlılıklar (@google/generative-ai, express, dotenv)
├── .env                 # Gemini API anahtarınızın yer aldığı dosya
├── .env.example         # Örnek çevre değişkenleri şablonu
├── README.md            # Başlangıç ve kullanım rehberi
└── public/              # Kullanıcı arayüzü dosyaları
    ├── index.html       # İki sütunlu, modern arayüz iskeleti
    ├── style.css        # Pastel tonlar ve mobil uyumlu CSS tasarımı
    └── script.js        # Çeviri, terimce, kopyalama ve hata yakalama JavaScript kodu
```
