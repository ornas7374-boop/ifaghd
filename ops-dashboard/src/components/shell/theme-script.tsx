const THEME_INIT = `(function(){try{var t=localStorage.getItem("relay-theme");if(t==="light")document.documentElement.dataset.theme="light";}catch(e){}})();`;

/** Runs before paint so the light theme never flashes dark. */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />;
}
