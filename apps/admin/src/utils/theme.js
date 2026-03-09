export const THEME_KEY = 'adminTheme';
export const THEME_LIGHT = 'light';
export const THEME_DARK = 'dark';

export function getStoredTheme() {
  if (typeof window === 'undefined') {
    return THEME_LIGHT;
  }
  const stored = window.localStorage.getItem(THEME_KEY);
  return stored === THEME_DARK ? THEME_DARK : THEME_LIGHT;
}

export function applyTheme(theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_KEY, theme);
  }
}
