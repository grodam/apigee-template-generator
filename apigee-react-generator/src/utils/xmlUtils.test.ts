import { describe, it, expect } from 'vitest';
import { escapeXml } from './xmlUtils';

describe('xmlUtils', () => {
  describe('escapeXml', () => {
    it('should escape ampersand', () => {
      expect(escapeXml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should escape less than', () => {
      expect(escapeXml('a < b')).toBe('a &lt; b');
    });

    it('should escape greater than', () => {
      expect(escapeXml('a > b')).toBe('a &gt; b');
    });

    it('should escape double quotes', () => {
      expect(escapeXml('He said "hello"')).toBe('He said &quot;hello&quot;');
    });

    it('should escape single quotes', () => {
      expect(escapeXml("It's fine")).toBe('It&apos;s fine');
    });

    it('should escape multiple special characters', () => {
      expect(escapeXml('<script>alert("XSS & more")</script>')).toBe(
        '&lt;script&gt;alert(&quot;XSS &amp; more&quot;)&lt;/script&gt;'
      );
    });

    it('should handle empty string', () => {
      expect(escapeXml('')).toBe('');
    });

    it('should handle string without special characters', () => {
      expect(escapeXml('Hello World')).toBe('Hello World');
    });

    it('should handle non-string input by converting to string', () => {
      // @ts-expect-error Testing non-string input
      expect(escapeXml(123)).toBe('123');
      // @ts-expect-error Testing non-string input
      expect(escapeXml(null)).toBe('null');
      // @ts-expect-error Testing non-string input
      expect(escapeXml(undefined)).toBe('undefined');
    });

    it('should handle string with only special characters', () => {
      expect(escapeXml('<>&"\'')).toBe('&lt;&gt;&amp;&quot;&apos;');
    });

    it('should handle XML-like content', () => {
      expect(escapeXml('<element attr="value">content</element>')).toBe(
        '&lt;element attr=&quot;value&quot;&gt;content&lt;/element&gt;'
      );
    });

    it('should prevent XML injection', () => {
      const malicious = '"><script>alert(1)</script><"';
      const escaped = escapeXml(malicious);
      expect(escaped).not.toContain('<script>');
      expect(escaped).toBe('&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;&lt;&quot;');
    });
  });
});
