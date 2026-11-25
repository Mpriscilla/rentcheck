/**
 * Theme catalog.
 *
 * RentCheck's active theme is defined in themes.css; the original slate and
 * paper themes remain available as alternatives:
 *   1. Add a `[data-theme="my-id"] { ... }` block in src/themes.css with
 *      the shadcn token overrides (include `color-scheme: light;` for
 *      light themes).
 *   2. Add an entry here for type safety, autocomplete, and UI display.
 *   3. Add the theme's background to the first-paint <style> block in
 *      index.html so the pre-CSS frame matches (no white flash).
 *   4. Switch via `data-theme` on <html> in index.html.
 *
 * Color values live in styles.css / themes.css — this file is metadata only.
 */

export const THEMES = [
  {
    id: 'rentcheck',
    label: 'RentCheck',
    description: 'Warm cream surfaces with accessible sage accents.',
  },
  {
    id: 'slate',
    label: 'Slate',
    description: 'Neutral dark palette.',
  },
  {
    id: 'paper',
    label: 'Paper',
    description: 'Neutral light palette.',
  },
] as const

export type ThemeId = (typeof THEMES)[number]['id']

/** Read the currently active theme id from <html data-theme>. */
export function getActiveTheme(): ThemeId {
  if (typeof document === 'undefined') return 'rentcheck'
  const id = document.documentElement.getAttribute('data-theme') as ThemeId | null
  return id ?? 'slate'
}

/** Look up a theme entry by id, or fall back to the first theme. */
export function getTheme(id: string) {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}
