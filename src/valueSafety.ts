export const SAFE_COLOR = /^(?:#[0-9a-f]{3,8}|(?:rgb|rgba|hsl|hsla)\([\d.%\s,-]+\)|[a-z]+)$/i;
export const SAFE_SPACING = /^-?(?:\d+|\d*\.\d+)(?:px|rem|em|vh|vw|%|ch|vmin|vmax|ex|cm|mm|in|pt|pc)$/i;
export const SAFE_FONT_FAMILY = /^[\w\s,'"-]+$/;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
