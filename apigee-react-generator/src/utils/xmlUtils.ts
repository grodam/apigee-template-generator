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

/**
 * Escape value for use in XML attributes
 */
export function escapeXmlAttribute(value: string): string {
  return escapeXml(value).replace(/\n/g, '&#10;').replace(/\r/g, '&#13;').replace(/\t/g, '&#9;');
}

/**
 * Unescape XML entities back to their original characters
 */
export function unescapeXml(value: string): string {
  if (typeof value !== 'string') {
    return String(value);
  }

  return value
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

/**
 * Validate that a string is safe for use as an XML element name
 */
export function isValidXmlName(name: string): boolean {
  // XML names must start with a letter or underscore
  // and can contain letters, digits, hyphens, underscores, and periods
  const xmlNameRegex = /^[a-zA-Z_][a-zA-Z0-9._-]*$/;
  return xmlNameRegex.test(name);
}

/**
 * Create a safe XML element with escaped content
 */
export function createXmlElement(
  tagName: string,
  content: string,
  attributes?: Record<string, string>
): string {
  if (!isValidXmlName(tagName)) {
    throw new Error(`Invalid XML tag name: ${tagName}`);
  }

  const attrString = attributes
    ? ' ' +
      Object.entries(attributes)
        .map(([key, value]) => `${escapeXmlAttribute(key)}="${escapeXmlAttribute(value)}"`)
        .join(' ')
    : '';

  const escapedContent = escapeXml(content);

  return `<${tagName}${attrString}>${escapedContent}</${tagName}>`;
}

/**
 * Create a self-closing XML element
 */
export function createSelfClosingElement(
  tagName: string,
  attributes?: Record<string, string>
): string {
  if (!isValidXmlName(tagName)) {
    throw new Error(`Invalid XML tag name: ${tagName}`);
  }

  const attrString = attributes
    ? ' ' +
      Object.entries(attributes)
        .map(([key, value]) => `${escapeXmlAttribute(key)}="${escapeXmlAttribute(value)}"`)
        .join(' ')
    : '';

  return `<${tagName}${attrString}/>`;
}

/**
 * Remove XML comments from content
 */
export function removeXmlComments(xml: string): string {
  return xml.replace(/<!--[\s\S]*?-->/g, '');
}

/**
 * Pretty format XML string (simple indentation)
 */
export function formatXml(xml: string, indent: string = '  '): string {
  let formatted = '';
  let currentIndent = '';
  const lines = xml.replace(/>\s*</g, '>\n<').split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Closing tag
    if (trimmed.startsWith('</')) {
      currentIndent = currentIndent.slice(indent.length);
      formatted += currentIndent + trimmed + '\n';
    }
    // Self-closing or processing instruction
    else if (trimmed.endsWith('/>') || trimmed.startsWith('<?')) {
      formatted += currentIndent + trimmed + '\n';
    }
    // Opening tag
    else if (trimmed.startsWith('<') && !trimmed.startsWith('</')) {
      formatted += currentIndent + trimmed + '\n';
      // Only increase indent if there's no closing tag on the same line
      if (!trimmed.includes('</')) {
        currentIndent += indent;
      }
    }
    // Content or other
    else {
      formatted += currentIndent + trimmed + '\n';
    }
  }

  return formatted.trim();
}
