import { describe, it, expect } from 'vitest';
import {
  generateProxyName,
  pathToPathSuffix,
  scopeToPolicyName,
  extractPathPrefixes
} from './stringUtils';

describe('stringUtils', () => {
  describe('generateProxyName', () => {
    it('should generate a proxy name with all components', () => {
      const result = generateProxyName('elis', 'finance', ['sap', 'salesforce'], 'invoice', 'v1');
      expect(result).toBe('elis.finance.sap-salesforce.invoice.v1');
    });

    it('should handle single backend app', () => {
      const result = generateProxyName('elis', 'hr', ['workday'], 'employee', 'v2');
      expect(result).toBe('elis.hr.workday.employee.v2');
    });

    it('should handle multiple backend apps', () => {
      const result = generateProxyName('ext', 'supply-chain', ['oracle', 'sap', 'jde'], 'order', 'v1');
      expect(result).toBe('ext.supply-chain.oracle-sap-jde.order.v1');
    });

    it('should handle empty backend apps array', () => {
      const result = generateProxyName('elis', 'finance', [], 'invoice', 'v1');
      expect(result).toBe('elis.finance..invoice.v1');
    });

    it('should handle entity ext', () => {
      const result = generateProxyName('ext', 'digital', ['web'], 'catalog', 'v3');
      expect(result).toBe('ext.digital.web.catalog.v3');
    });
  });

  describe('pathToPathSuffix', () => {
    it('should convert path parameters to wildcards', () => {
      expect(pathToPathSuffix('/customer/{id}')).toBe('/customer/*');
    });

    it('should handle multiple path parameters', () => {
      expect(pathToPathSuffix('/orders/{orderId}/items/{itemId}')).toBe('/orders/*/items/*');
    });

    it('should handle paths without parameters', () => {
      expect(pathToPathSuffix('/customers')).toBe('/customers');
    });

    it('should handle complex parameter names', () => {
      expect(pathToPathSuffix('/users/{user_id}/posts/{post-id}')).toBe('/users/*/posts/*');
    });

    it('should handle root path', () => {
      expect(pathToPathSuffix('/')).toBe('/');
    });

    it('should handle nested paths with parameters', () => {
      expect(pathToPathSuffix('/api/v1/customers/{customerId}/orders/{orderId}/items/{itemId}')).toBe(
        '/api/v1/customers/*/orders/*/items/*'
      );
    });
  });

  describe('scopeToPolicyName', () => {
    it('should convert scope to policy name with single colon', () => {
      expect(scopeToPolicyName('customer:read')).toBe('O2-VerifyAccessToken-customer.read');
    });

    it('should handle multiple colons', () => {
      expect(scopeToPolicyName('api:customer:read:all')).toBe('O2-VerifyAccessToken-api.customer.read.all');
    });

    it('should handle scope without colon', () => {
      expect(scopeToPolicyName('admin')).toBe('O2-VerifyAccessToken-admin');
    });

    it('should handle complex scopes', () => {
      expect(scopeToPolicyName('invoice:write:create')).toBe('O2-VerifyAccessToken-invoice.write.create');
    });
  });

  describe('extractPathPrefixes', () => {
    it('should extract unique prefixes from paths', () => {
      const paths = ['/customers', '/customers/{id}', '/orders', '/orders/{id}/items'];
      const result = extractPathPrefixes(paths);
      expect(result).toHaveLength(2);
      expect(result).toContain('/customers');
      expect(result).toContain('/orders');
    });

    it('should handle paths with api prefix', () => {
      const paths = ['/api/customers', '/api/orders'];
      const result = extractPathPrefixes(paths);
      expect(result).toHaveLength(1);
      expect(result).toContain('/api');
    });

    it('should handle empty array', () => {
      const result = extractPathPrefixes([]);
      expect(result).toHaveLength(0);
    });

    it('should handle single path', () => {
      const result = extractPathPrefixes(['/users/{id}']);
      expect(result).toHaveLength(1);
      expect(result).toContain('/users');
    });

    it('should handle root path', () => {
      const result = extractPathPrefixes(['/']);
      expect(result).toHaveLength(0);
    });

    it('should extract first segment only', () => {
      const paths = ['/v1/api/customers', '/v2/api/orders'];
      const result = extractPathPrefixes(paths);
      expect(result).toHaveLength(2);
      expect(result).toContain('/v1');
      expect(result).toContain('/v2');
    });
  });
});
