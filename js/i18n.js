// ===== INTERNATIONALIZATION =====
import { translations } from './translations.js';

let currentLang = localStorage.getItem('localserve-lang') || 'en';

export function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('localserve-lang', lang);

    const t = translations[lang];
    if (!t) return;

    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = t[key];
            } else {
                el.textContent = t[key];
            }
        }
    });

    // Update lang attribute on html
    document.documentElement.lang = lang === 'hi' ? 'hi' : lang === 'te' ? 'te' : 'en';

    // Update active state in dropdown
    document.querySelectorAll('.lang-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.lang === lang);
    });

    // Update button label
    const langBtn = document.querySelector('.lang-btn');
    if (langBtn && t.lang_label) {
        langBtn.textContent = t.lang_label + ' ▾';
    }

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
}

export function getCurrentLang() {
    return currentLang;
}

export function t(key) {
    return translations[currentLang]?.[key] || translations.en[key] || key;
}

// Initialize language
export function initI18n() {
    setLanguage(currentLang);

    // Language dropdown toggle
    const langBtn = document.querySelector('.lang-btn');
    const langDropdown = document.querySelector('.lang-dropdown');

    if (langBtn && langDropdown) {
        langBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            langDropdown.classList.toggle('open');
        });

        document.addEventListener('click', () => {
            langDropdown.classList.remove('open');
        });

        document.querySelectorAll('.lang-option').forEach(opt => {
            opt.addEventListener('click', () => {
                setLanguage(opt.dataset.lang);
                langDropdown.classList.remove('open');
            });
        });
    }
}
