/**
 * AuraTranslate - İstemci Tarafı JavaScript Mantığı
 * Kullanıcı etkileşimleri, API istekleri, terimce yönetimi ve hata yakalama
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elemanları
  const sourceTextEl = document.getElementById('sourceText');
  const targetTextEl = document.getElementById('targetText');
  const sourceLangSelect = document.getElementById('sourceLangSelect');
  const targetLangSelect = document.getElementById('targetLangSelect');
  const domainSelect = document.getElementById('domainSelect');
  const styleSelect = document.getElementById('styleSelect');
  const translateBtn = document.getElementById('translateBtn');
  const btnSpinner = document.getElementById('btnSpinner');
  const btnText = document.getElementById('btnText');
  const swapLanguagesBtn = document.getElementById('swapLanguagesBtn');
  const copyBtn = document.getElementById('copyBtn');
  const copyBtnText = document.getElementById('copyBtnText');
  const copyToast = document.getElementById('copyToast');
  const pasteBtn = document.getElementById('pasteBtn');
  const clearSourceBtn = document.getElementById('clearSourceBtn');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const sourceCharCount = document.getElementById('sourceCharCount');
  const targetCharCount = document.getElementById('targetCharCount');
  const translationMeta = document.getElementById('translationMeta');
  
  // Hata Kutusu Elemanları
  const errorBanner = document.getElementById('errorBanner');
  const errorTitle = document.getElementById('errorTitle');
  const errorMessage = document.getElementById('errorMessage');
  const dismissErrorBtn = document.getElementById('dismissErrorBtn');

  // Terimce (Glossary) Elemanları
  const toggleGlossaryBtn = document.getElementById('toggleGlossaryBtn');
  const glossaryContainer = document.getElementById('glossaryContainer');
  const closeGlossaryBtn = document.getElementById('closeGlossaryBtn');
  const glossaryInput = document.getElementById('glossaryInput');
  const glossaryCountBadge = document.getElementById('glossaryCountBadge');
  const saveGlossaryBtn = document.getElementById('saveGlossaryBtn');

  // LocalStorage'dan önceki terimceyi geri yükle
  const savedGlossary = localStorage.getItem('auratranslate_glossary') || '';
  glossaryInput.value = savedGlossary;
  updateGlossaryBadge();

  // 1. Karakter Sayaçları
  function updateCharCounts() {
    const srcLen = sourceTextEl.value.length;
    const tgtLen = targetTextEl.value.length;
    sourceCharCount.textContent = `${srcLen.toLocaleString('tr-TR')} karakter`;
    targetCharCount.textContent = `${tgtLen.toLocaleString('tr-TR')} karakter`;
    copyBtn.disabled = tgtLen === 0;
  }

  sourceTextEl.addEventListener('input', updateCharCounts);

  // 2. Hata Gösterme ve Gizleme Fonksiyonları
  function showError(title, message) {
    errorTitle.textContent = title || 'Hata';
    errorMessage.textContent = message || 'İşlem gerçekleştirilemedi.';
    errorBanner.classList.remove('hidden');
    // Sayfayı hatanın rahat görünmesi için hafifçe yukarı kaydır
    errorBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideError() {
    errorBanner.classList.add('hidden');
  }

  dismissErrorBtn.addEventListener('click', hideError);

  // 3. Dilleri Değiştir (Swap Languages)
  swapLanguagesBtn.addEventListener('click', () => {
    const currentSrc = sourceLangSelect.value;
    const currentTgt = targetLangSelect.value;

    // Otomatik Algıla seçiliyse hedefe geçmesini engelle
    if (currentSrc === 'Otomatik Algıla') {
      sourceLangSelect.value = currentTgt;
      targetLangSelect.value = 'Türkçe';
    } else {
      sourceLangSelect.value = currentTgt;
      targetLangSelect.value = currentSrc;
    }

    // Metinleri de yer değiştir (Eğer hedefte çeviri varsa kaynağa al)
    const currentSrcText = sourceTextEl.value;
    const currentTgtText = targetTextEl.value;

    if (currentTgtText.trim()) {
      sourceTextEl.value = currentTgtText;
      targetTextEl.value = currentSrcText;
      updateCharCounts();
    }
  });

  // 4. Panodan Yapıştır ve Temizle
  pasteBtn.addEventListener('click', async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      sourceTextEl.value = clipboardText;
      updateCharCounts();
      hideError();
      sourceTextEl.focus();
    } catch (err) {
      showError('Pano Erişimi Başarısız', 'Panodan yapıştırma izni verilmedi. Lütfen metni klavyenizden (Ctrl + V) yapıştırın.');
    }
  });

  clearSourceBtn.addEventListener('click', () => {
    sourceTextEl.value = '';
    targetTextEl.value = '';
    updateCharCounts();
    translationMeta.textContent = 'Hazır';
    hideError();
    sourceTextEl.focus();
  });

  // 5. Çeviriyi Tek Tıkla Kopyalama
  copyBtn.addEventListener('click', async () => {
    const textToCopy = targetTextEl.value;
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      copyToast.classList.remove('hidden');
      copyBtnText.textContent = 'Kopyalandı!';
      setTimeout(() => {
        copyToast.classList.add('hidden');
        copyBtnText.textContent = 'Kopyala';
      }, 2000);
    } catch (err) {
      // Fallback kopyalama yöntemi
      targetTextEl.select();
      document.execCommand('copy');
      copyToast.classList.remove('hidden');
      setTimeout(() => copyToast.classList.add('hidden'), 2000);
    }
  });

  // 6. Terimce Çekmecesini Açma/Kapatma
  function updateGlossaryBadge() {
    const lines = glossaryInput.value.split('\n').filter(l => l.trim() && !l.trim().startsWith('#') && (l.includes('=') || l.includes('->') || l.includes(':')));
    glossaryCountBadge.textContent = `${lines.length} terim`;
  }

  toggleGlossaryBtn.addEventListener('click', () => {
    glossaryContainer.classList.toggle('hidden');
  });

  closeGlossaryBtn.addEventListener('click', () => {
    glossaryContainer.classList.add('hidden');
  });

  saveGlossaryBtn.addEventListener('click', () => {
    localStorage.setItem('auratranslate_glossary', glossaryInput.value);
    updateGlossaryBadge();
    glossaryContainer.classList.add('hidden');
  });

  glossaryInput.addEventListener('input', () => {
    localStorage.setItem('auratranslate_glossary', glossaryInput.value);
    updateGlossaryBadge();
  });

  // 7. Yükleme Durumu (Loading State)
  function setLoading(isLoading) {
    if (isLoading) {
      translateBtn.disabled = true;
      btnSpinner.classList.remove('hidden');
      btnText.textContent = 'Çevriliyor...';
      loadingIndicator.classList.remove('hidden');
      translationMeta.textContent = 'Model yanıtı bekleniyor...';
    } else {
      translateBtn.disabled = false;
      btnSpinner.classList.add('hidden');
      btnText.textContent = 'Çevir';
      loadingIndicator.classList.add('hidden');
    }
  }

  // 8. Ana Çeviri İstek Fonksiyonu
  async function performTranslation() {
    const text = sourceTextEl.value.trim();
    if (!text) {
      showError('Metin Eksik', 'Lütfen çevirmek istediğiniz metni sol sütundaki kutuya yazın.');
      sourceTextEl.focus();
      return;
    }

    hideError();
    setLoading(true);

    const payload = {
      text: text,
      sourceLang: sourceLangSelect.value,
      targetLang: targetLangSelect.value,
      domain: domainSelect.value,
      style: styleSelect.value,
      glossary: glossaryInput.value
    };

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const err = data.error || {};
        showError(
          err.title || 'Çeviri Hatası',
          err.message || 'Sunucudan beklenmeyen bir hata yanıtı alındı.'
        );
        translationMeta.textContent = 'Hata oluştu';
        return;
      }

      // Başarılı çeviri
      targetTextEl.value = data.translatedText;
      updateCharCounts();
      
      const now = new Date();
      const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      translationMeta.textContent = `Tamamlandı (${timeStr}) • Model: ${data.meta?.model || 'Gemini'}`;

    } catch (err) {
      console.error('İstek Hatası:', err);
      showError(
        'Bağlantı Kurulamadı',
        'Sunucuya ulaşılamıyor. Node.js uygulamasının terminalde çalıştığından (npm start) ve internet bağlantınızdan emin olun.'
      );
      translationMeta.textContent = 'Bağlantı kesildi';
    } finally {
      setLoading(false);
    }
  }

  // Çevir düğmesi tıklama olayı
  translateBtn.addEventListener('click', performTranslation);

  // Ctrl + Enter veya Cmd + Enter kısayolu ile hızlı çeviri
  sourceTextEl.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      performTranslation();
    }
  });
});
