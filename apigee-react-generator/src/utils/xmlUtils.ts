/**
 * XML Utilities
 *
 * Utilities for safe XML generation and manipulation.
 */

/**
 * Escape special characters for safe XML content
 * Prevents XML injection attacks
 */
export function escapeXml(value: string): string {
  if (typeof value !== 'string') {
    return String(value);
  }

  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
