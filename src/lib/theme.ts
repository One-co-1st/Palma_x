export const THEMES = [
  {
    key: 'paper',
    label: 'Paper',
    description: 'Warm ivory. The institution as printed.',
  },
  {
    key: 'ink',
    label: 'Ink',
    description: 'Dark ground, light type. The ceremony after dark.',
  },
  {
    key: 'archive',
    label: 'Archive',
    description: 'Aged paper, lower contrast. For long reading.',
  },
] as const;

export type ThemeKey = (typeof THEMES)[number]['key'];

export const THEME_STORAGE_KEY = 'palma-theme';
export const DEFAULT_THEME: ThemeKey = 'paper';

export function isThemeKey(value: unknown): value is ThemeKey {
  return typeof value === 'string' && THEMES.some((theme) => theme.key === value);
}

/**
 * Runs before paint, inlined in the document head.
 *
 * Without this the first frame is painted in the default theme and then
 * repainted — a white flash for every reader who chose Ink. Kept deliberately
 * tiny and dependency-free, because it is parsed and executed on every single
 * page load before anything else happens.
 */
export const THEME_BOOTSTRAP = `(function(){try{
var s=localStorage.getItem('${THEME_STORAGE_KEY}');
if(s==='paper'||s==='ink'||s==='archive'){document.documentElement.dataset.theme=s;return}
if(window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.dataset.theme='ink'}
}catch(e){}})()`;
