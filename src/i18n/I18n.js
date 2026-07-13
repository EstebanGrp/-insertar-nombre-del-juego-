import en from "./locales/en.js";
import es from "./locales/es.js";
import ja from "./locales/ja.js";
import pt from "./locales/pt.js";
import zh from "./locales/zh.js";
import de from "./locales/de.js";

const STORAGE_KEY = "dimensional_ghost_language";
const LOCALES = Object.freeze({ en, es, ja, pt, zh, de });
const HTML_LANG = Object.freeze({ en: "en", es: "es", ja: "ja", pt: "pt-BR", zh: "zh-CN", de: "de" });
export const LANGUAGE_ORDER = Object.freeze(["en", "es", "ja", "pt", "zh", "de"]);
export const LANGUAGE_LABELS = Object.freeze({
  en: "English",
  es: "Español",
  ja: "日本語",
  pt: "Português",
  zh: "中文",
  de: "Deutsch",
});

class I18n {
  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY);
    this.language = LOCALES[stored] ? stored : "en";
    this.applyDocumentLanguage();
  }

  t(key, variables = {}) {
    const template = LOCALES[this.language]?.[key] ?? LOCALES.en[key] ?? key;
    return String(template).replace(/\{(\w+)\}/g, (_match, name) =>
      Object.prototype.hasOwnProperty.call(variables, name) ? String(variables[name]) : `{${name}}`,
    );
  }

  setLanguage(language) {
    if (!LOCALES[language]) return false;
    this.language = language;
    localStorage.setItem(STORAGE_KEY, language);
    this.applyDocumentLanguage();
    window.dispatchEvent(new CustomEvent("game-language-changed", { detail: { language } }));
    return true;
  }

  applyDocumentLanguage() {
    document.documentElement.lang = HTML_LANG[this.language] || "en";
    document.documentElement.dataset.language = this.language;
    document.title = this.t("app.title");
  }

  languageName(language = this.language) {
    return LANGUAGE_LABELS[language] ?? language;
  }

  nextLanguage() {
    const index = LANGUAGE_ORDER.indexOf(this.language);
    const next = LANGUAGE_ORDER[(index + 1) % LANGUAGE_ORDER.length];
    this.setLanguage(next);
    return next;
  }

  zone(zoneKey = "lab") {
    return this.t(`zone.${zoneKey}`);
  }
}

export const i18n = new I18n();
