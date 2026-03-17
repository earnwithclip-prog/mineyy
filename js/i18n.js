// ===== INTERNATIONALIZATION (COMPLETE REWRITE) =====
import { translations } from './translations.js';

// Default language is English; restore from localStorage if available
let currentLang = localStorage.getItem('localserve-lang') || 'en';

/**
 * Apply a language to the entire page.
 * Updates all [data-i18n] elements, the lang-btn label, active states, and html[lang].
 */
export function setLanguage(lang) {
    // Validate language exists
    if (!translations[lang]) {
        console.warn(`[i18n] Language "${lang}" not found, falling back to English.`);
        lang = 'en';
    }

    currentLang = lang;
    localStorage.setItem('localserve-lang', lang);

    const t = translations[lang];
    const fallback = translations.en;

    // --- Update all elements with data-i18n attribute ---
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const value = t[key] || fallback[key];
        if (!value) return;

        // Handle different element types
        const tagName = el.tagName.toUpperCase();

        if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
            // For inputs and textareas, set the placeholder
            el.placeholder = value;
        } else if (tagName === 'OPTION') {
            // For <option> elements inside <select>
            el.textContent = value;
        } else {
            // For all other elements, check if value contains HTML
            if (value.includes('<') && value.includes('>')) {
                el.innerHTML = value;
            } else {
                el.textContent = value;
            }
        }
    });

    // --- Update html lang attribute ---
    document.documentElement.lang = lang;

    // --- Update the language button label ---
    document.querySelectorAll('.lang-btn').forEach(btn => {
        const langNames = { en: '🌐 English', hi: '🌐 हिन्दी', te: '🌐 తెలుగు' };
        btn.textContent = (langNames[lang] || langNames.en) + ' ▾';
    });

    // --- Update active state on dropdown options ---
    document.querySelectorAll('.lang-option').forEach(opt => {
        if (opt.dataset.lang === lang) {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }
    });

    // --- Dispatch event for other modules to react ---
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
}

/**
 * Get the current language code.
 */
export function getCurrentLang() {
    return currentLang;
}

/**
 * Get a single translation string by key.
 */
export function t(key) {
    return translations[currentLang]?.[key] || translations.en?.[key] || key;
}

/**
 * Initialize the i18n system.
 * - Applies the saved (or default) language
 * - Sets up language dropdown toggle and option click handlers
 */
export function initI18n() {
    // Apply the current language immediately
    setLanguage(currentLang);

    // --- Setup ALL language switcher dropdowns on the page ---
    document.querySelectorAll('.lang-switcher').forEach(switcher => {
        const btn = switcher.querySelector('.lang-btn');
        const dropdown = switcher.querySelector('.lang-dropdown');

        if (!btn || !dropdown) return;

        // Toggle dropdown on button click
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Close all other dropdowns first
            document.querySelectorAll('.lang-dropdown').forEach(d => {
                if (d !== dropdown) d.classList.remove('open');
            });

            dropdown.classList.toggle('open');
        });

        // Prevent clicks inside dropdown from closing it
        dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Handle language option clicks
        dropdown.querySelectorAll('.lang-option').forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const lang = opt.dataset.lang;
                if (lang) {
                    setLanguage(lang);
                }

                // Close dropdown after selection
                dropdown.classList.remove('open');
            });
        });
    });

    // --- Close all dropdowns when clicking anywhere on the document ---
    document.addEventListener('click', () => {
        document.querySelectorAll('.lang-dropdown').forEach(d => {
            d.classList.remove('open');
        });
    });
}
