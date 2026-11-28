// CMS admin colour scheme (cms-editor R10): the stored choice is light, dark or system; system follows prefers-color-scheme.
export const THEME_KEY = "tt-cms-theme";
export const PREFS = ["light", "dark", "system"];

export const normalizePref = (value) => (PREFS.includes(value) ? value : "system");
export const resolveTheme = (pref, systemDark) => (pref === "system" ? (systemDark ? "dark" : "light") : pref);

// Sets `data-theme` on `root` (CSS reads it), keeps the choice in `storage`, and calls `onChange(resolved)` whenever the shown scheme changes.
export function initTheme({ storage, root, media, onChange }) {
  let pref;
  try { pref = normalizePref(storage.getItem(THEME_KEY)); } catch { pref = "system"; }
  const apply = () => {
    root.dataset.theme = pref;
    onChange?.(resolveTheme(pref, media.matches), pref);
  };
  media.addEventListener("change", apply);
  apply();
  return {
    get: () => pref,
    set(next) {
      pref = normalizePref(next);
      try { storage.setItem(THEME_KEY, pref); } catch { /* private mode: the choice lasts until reload */ }
      apply();
    },
  };
}
