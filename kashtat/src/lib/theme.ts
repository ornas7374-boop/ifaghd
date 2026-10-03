export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "kashtat-theme";

// يُشغَّل قبل الرسم لتجنب وميض الثيم الخاطئ
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark"){t="dark"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="dark"}})();`;
