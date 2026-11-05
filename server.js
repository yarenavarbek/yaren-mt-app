// Gerekli kütüphaneleri yüklüyoruz
require('dotenv').config();
const express = require('express');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// JSON verilerini ve form verilerini ayrıştırmak için middleware'ler
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Statik dosyaları (HTML, CSS, JS, ikonlar vb.) "public" klasöründen sunuyoruz
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Kullanıcıdan gelen "kaynak = hedef" satırlarını ayrıştırıp
 * modele net bir terim tablosu kuralı olarak hazırlar.
 */
function parseGlossary(glossaryRaw) {
  if (!glossaryRaw || typeof glossaryRaw !== 'string') return '';
  
  const lines = glossaryRaw.split('\n');
  const pairs = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue; // Boş veya yorum satırlarını atla
    
    // '=' veya '->' veya ':' karakterlerinden birine göre böl
    const parts = trimmed.split(/=|->|:/);
    if (parts.length >= 2) {
      const src = parts[0].trim();
      const tgt = parts.slice(1).join('=').trim();
      if (src && tgt) {
        pairs.push(`- "${src}" => "${tgt}"`);
      }
    }
  }
  
  return pairs.join('\n');
}

/**
 * Alan (domain) ve üslup (style) açıklamalarını Türkçe talimat metnine dönüştürür.
 */
function getDomainAndStyleInstructions(domain, style) {
  let domainText = 'Genel metin çevirisi.';
  switch (domain) {
    case 'literary':
      domainText = 'Edebi çeviri: Metnin sanatsal ahengini, duygu tonunu, metaforlarını ve edebi lezzetini koru. Dil zenginliğine ve akıcılığına azami özen göster.';
      break;
    case 'medical':
      domainText = 'Tıp ve sağlık çevirisi: Tıbbi ve biyomedikal terminolojiye kesinlikle sadık kal. Klinik kesinlik sağla, hayati önem taşıyan ifadeleri çarpıtmadan doğru medikal terimlerle aktar.';
      break;
    case 'legal':
      domainText = 'Hukuki çeviri: Hukuk terimlerine, kanuni ifade kalıplarına ve resmi mevzuat diline harfiyen uy. Yorum katma, anlam belirsizliği yaratma, terminolojik netlik sağla.';
      break;
    case 'academic':
      domainText = 'Akademik çeviri: Bilimsel, nesnel, literatür diline uygun ve metodolojik bir üslup kullan.';
      break;
    case 'technical':
      domainText = 'Teknik ve mühendislik çevirisi: Teknik şartname, kullanım kılavuzu ve bilişim standartlarına uygun, net ve terimsel tutarlılığı yüksek bir çeviri yap.';
      break;
    default:
      domainText = 'Genel ve doğal günlük iletişim dili.';
  }

  let styleText = 'Doğal ve dengeli bir dil.';
  switch (style) {
    case 'formal':
      styleText = 'Resmi ve kurumsal üslup: Saygılı, mesafeli, profesyonel ve kurallı bir dil kullan (Örn: Siz dili, resmi hitaplar).';
      break;
    case 'casual':
      styleText = 'Gündelik ve samimi üslup: Konuşma diline yakın, sıcak, akıcı ve rahat bir ton benimse (Örn: Sen dili, günlük diyaloglar).';
      break;
    case 'poetic':
      styleText = 'Şiirsel ve lirik üslup: Ritim, ahenk ve duygusal derinliği öne çıkar.';
      break;
    default:
      styleText = 'Doğal, akıcı ve bağlama en uygun üslup.';
  }

  return { domainText, styleText };
}

/**
 * Çeviri API Uç Noktası (POST /api/translate)
 */
app.post('/api/translate', async (req, res) => {
  try {
    const { text, sourceLang, targetLang, domain, style, glossary } = req.body;

    // 1. Temel girdi doğrulaması
    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMPTY_TEXT',
          title: 'Metin Girilmedi',
          message: 'Lütfen çevrilmesini istediğiniz metni yazın veya yapıştırın.'
        }
      });
    }

    // 2. API anahtarı kontrolü
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey.includes('BURAYA_GEMINI_API_KEYINIZI_YAPISTIRIN')) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'MISSING_API_KEY',
          title: 'Gemini API Anahtarı Bulunamadı',
          message: 'Lütfen proje ana dizinindeki .env dosyasını açıp GEMINI_API_KEY değişkenine Google AI Studio anahtarınızı yapıştırın ve sunucuyu yeniden başlatın.'
        }
      });
    }

    // 3. Sistem ve Prompt Talimatlarını Oluşturma
    const { domainText, styleText } = getDomainAndStyleInstructions(domain, style);
    const formattedGlossary = parseGlossary(glossary);

    let systemInstruction = `Sen profesyonel, ödüllü bir mütercim-tercümansın. Görevin kaynak dildeki metni eksiksiz, tutarlı ve en doğru biçimde hedef dile çevirmektir.

KRİTİK VE DEĞİŞMEZ ÇIKTI KURALI:
- Cevabında YALNIZCA VE SADECE çevrilmiş metni döndür.
- Asla "İşte çeviri:", "Translation:", "Çevirisi:", "Not:" gibi giriş ya da sonuç açıklamaları EKLEME.
- Çevirinin başına veya sonuna fazladan tırnak ("...") veya markdown code block (\`\`\`) KOYMA.
- Orijinal metnin satır başlarını ve paragraflarını aynen koru.`;

    let userPrompt = `Kaynak Dil: ${sourceLang || 'Otomatik Algıla'}
Hedef Dil: ${targetLang || 'Türkçe'}

ALAN VE ÜSLUP TALİMATLARI:
- Çeviri Alanı: ${domainText}
- Üslup: ${styleText}
`;

    if (formattedGlossary) {
      userPrompt += `
ZORUNLU TERİMCE (GLOSSARY) KURALI:
Aşağıdaki terim eşleşmelerine KESİNLİKLE uyacaksın. Kaynak terim metinde geçtiğinde, hedef dilde MUTLAKA belirtilen karşılığı kullanılmalıdır:
${formattedGlossary}
`;
    }

    userPrompt += `
ÇEVRİLECEK METİN:
"""
${text}
"""

Yukarıdaki kurallara ve terimceye harfiyen uyarak YALNIZCA çevrilmiş nihai metni ver:`;

    // 4. Gemini Modeli ile İstek Gönderme
    // Doğrudan Gemini 3.5 Flash-Lite (Latest) modeli kullanılıyor
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Birincil olarak gemini-flash-lite-latest ve gemini-3.5-flash-lite kullanılır
    const candidateModels = ['gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-3.5-flash'];
    let result;
    let modelName = candidateModels[0];
    let lastError = null;

    for (const cand of candidateModels) {
      try {
        modelName = cand;
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: systemInstruction,
          generationConfig: {
            temperature: 0.3, // Çeviride tutarlılık ve doğruluğu artırmak için düşük sıcaklık
          }
        });
        result = await model.generateContent(userPrompt);
        break; // Başarılı olduysa döngüden çık
      } catch (err) {
        lastError = err;
        console.warn(`[Model Uyarısı] ${modelName} isteği başarısız oldu, bir sonraki model deneniyor... Hata: ${err.message}`);
      }
    }

    if (!result) {
      throw lastError || new Error('Uygun Gemini modeli bulunamadı.');
    }

    const response = await result.response;
    let translatedText = response.text();

    // Model olur da tırnak veya gereksiz boşluk bırakmışsa temizle
    translatedText = translatedText.trim();
    if (translatedText.startsWith('```') && translatedText.endsWith('```')) {
      translatedText = translatedText.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
    }

    return res.json({
      success: true,
      translatedText: translatedText,
      meta: {
        model: modelName,
        sourceLang,
        targetLang
      }
    });

  } catch (error) {
    console.error('[Sunucu Hatası / Çeviri Hatası]:', error);

    const errorMessage = error.message || '';
    let clientError = {
      code: 'UNKNOWN_ERROR',
      title: 'Beklenmeyen Bir Hata Oluştu',
      message: 'Çeviri yapılırken bir hata oluştu. Lütfen biraz sonra tekrar deneyin.'
    };

    // 1. API Anahtarı Geçersiz / Hatalı
    if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('API key not valid') || errorMessage.includes('unregistered project')) {
      clientError = {
        code: 'INVALID_API_KEY',
        title: 'Geçersiz Gemini API Anahtarı',
        message: 'Girdiğiniz API anahtarı geçersiz veya yetkisiz görünüyor. Lütfen .env dosyasındaki GEMINI_API_KEY değerini kontrol edin.'
      };
    }
    // 2. Kota / İstek Limiti (Rate limit, Quota exceeded)
    else if (errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('429') || errorMessage.includes('quota')) {
      clientError = {
        code: 'QUOTA_EXCEEDED',
        title: 'API Kotası veya İstek Limiti Aşıldı',
        message: 'Gemini API istek limitiniz veya dakikalık kotanız doldu. Lütfen 30-60 saniye bekleyip tekrar deneyin veya Google AI Studio panelinden kotanızı kontrol edin.'
      };
    }
    // 3. İnternet / Bağlantı Hatası (ENOTFOUND, EAI_AGAIN, Network error)
    else if (errorMessage.includes('fetch failed') || errorMessage.includes('ENOTFOUND') || errorMessage.includes('ECONNRESET') || errorMessage.includes('network')) {
      clientError = {
        code: 'NETWORK_ERROR',
        title: 'İnternet Bağlantı Hatası',
        message: 'Google Gemini sunucularına ulaşılamadı. İnternet bağlantınızı veya güvenlik duvarınızı kontrol edin.'
      };
    }
    // 4. Güvenlik / İçerik Filtresi (Safety block)
    else if (errorMessage.includes('SAFETY') || errorMessage.includes('blocked')) {
      clientError = {
        code: 'SAFETY_BLOCK',
        title: 'Güvenlik Filtresi Uyarısı',
        message: 'Metin, Gemini içerik güvenliği filtrelerine takıldığı için çevrilemedi. Lütfen metni gözden geçirin.'
      };
    } else {
      clientError.message = `Detay: ${errorMessage.substring(0, 150)}... Lütfen .env dosyanızı ve bağlantınızı kontrol edin.`;
    }

    return res.status(500).json({
      success: false,
      error: clientError
    });
  }
});

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Makine Çevirisi Uygulaması Başarıyla Başlatıldı!`);
  console.log(`🔗 Tarayıcınızda açın: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
