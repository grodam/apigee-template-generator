import { describe, it, expect } from 'vitest';
import {
  extractGroupPrefix,
  extractResourceName,
  analyzePathsForProducts,
  findSmallestCommonRoot,
  isValidPath,
  normalizePath,
  getDefaultAuthorizedPaths,
  suggestProductsFromPaths
} from './pathAnalyzer';

describe('pathAnalyzer', () => {
  describe('extractGroupPrefix', () => {
    it('should extract prefix from simple API path', () => {
      expect(extractGroupPrefix('/api/Cases')).toBe('/api/Cases');
    });

    it('should extract prefix from path with parameter', () => {
      expect(extractGroupPrefix('/api/Cases/{id}')).toBe('/api/Cases');
    });

    it('should extract prefix from nested path', () => {
      expect(extractGroupPrefix('/v1/customers/{id}/orders')).toBe('/v1/customers');
    });

    it('should handle root path', () => {
      expect(extractGroupPrefix('/')).toBe('/');
    });

    it('should handle single segment path', () => {
      expect(extractGroupPrefix('/users')).toBe('/users');
    });

    it('should skip path parameters in extraction', () => {
      expect(extractGroupPrefix('/api/{version}/customers')).toBe('/api/customers');
    });

    it('should handle deep nested paths', () => {
      expect(extractGroupPrefix('/api/v1/customers/{customerId}/orders/{orderId}')).toBe('/api/v1');
    });
  });

  describe('extractResourceName', () => {
    it('should extract resource name from path prefix', () => {
      expect(extractResourceName('/api/Cases')).toBe('cases');
    });

    it('should extract resource name skipping api prefix', () => {
      expect(extractResourceName('/api/customers')).toBe('customers');
    });

    it('should handle version prefix', () => {
      expect(extractResourceName('/v1/customers')).toBe('customers');
    });

    it('should handle multiple skippable prefixes', () => {
      expect(extractResourceName('/api/v1/orders')).toBe('orders');
    });

    it('should return root for empty path', () => {
      expect(extractResourceName('/')).toBe('root');
    });

    it('should handle single segment with api', () => {
      expect(extractResourceName('/api')).toBe('api');
    });

    it('should handle rest prefix', () => {
      expect(extractResourceName('/rest/products')).toBe('products');
    });

    it('should lowercase the result', () => {
      expect(extractResourceName('/api/CamelCase')).toBe('camelcase');
    });
  });

  describe('analyzePathsForProducts', () => {
    it('should group paths by prefix', () => {
      const paths = [
        { path: '/api/Cases', methods: ['GET'] },
        { path: '/api/Cases/{id}', methods: ['GET', 'PUT'] },
        { path: '/api/Orders', methods: ['POST'] }
      ];

      const result = analyzePathsForProducts(paths);

      expect(result).toHaveLength(2);
      expect(result[0].prefix).toBe('/api/Cases');
      expect(result[0].paths).toContain('/api/Cases');
      expect(result[0].paths).toContain('/api/Cases/{id}');
      expect(result[1].prefix).toBe('/api/Orders');
    });

    it('should collect unique methods per group', () => {
      const paths = [
        { path: '/api/users', methods: ['GET', 'POST'] },
        { path: '/api/users/{id}', methods: ['GET', 'PUT', 'DELETE'] }
      ];

      const result = analyzePathsForProducts(paths);

      expect(result).toHaveLength(1);
      expect(result[0].methods).toContain('GET');
      expect(result[0].methods).toContain('POST');
      expect(result[0].methods).toContain('PUT');
      expect(result[0].methods).toContain('DELETE');
      // GET should not be duplicated
      expect(result[0].methods.filter(m => m === 'GET')).toHaveLength(1);
    });

    it('should handle empty array', () => {
      const result = analyzePathsForProducts([]);
      expect(result).toHaveLength(0);
    });

    it('should sort results by prefix', () => {
      const paths = [
        { path: '/z/zebra', methods: ['GET'] },
        { path: '/a/apple', methods: ['GET'] },
        { path: '/m/mango', methods: ['GET'] }
      ];

      const result = analyzePathsForProducts(paths);

      expect(result[0].prefix).toBe('/a/apple');
      expect(result[1].prefix).toBe('/m/mango');
      expect(result[2].prefix).toBe('/z/zebra');
    });
  });

  describe('suggestProductsFromPaths', () => {
    it('should generate suggested products from paths', () => {
      const paths = [
        { path: '/api/Cases', methods: ['GET', 'POST'] },
        { path: '/api/Cases/{id}', methods: ['GET', 'PUT'] }
      ];

      const result = suggestProductsFromPaths(paths, 'elis.finance.sap.invoice.v1');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('cases');
      expect(result[0].displayName).toBe('Cases');
      expect(result[0].pathPrefix).toBe('/api/Cases');
      expect(result[0].authorizedPaths).toContain('/api/Cases');
      expect(result[0].authorizedPaths).toContain('/api/Cases/**');
      expect(result[0].selected).toBe(true);
    });

    it('should handle duplicate product names by adding index', () => {
      const paths = [
        { path: '/v1/users', methods: ['GET'] },
        { path: '/v2/users', methods: ['GET'] }
      ];

      const result = suggestProductsFromPaths(paths, 'base.name');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('users1');
      expect(result[1].name).toBe('users2');
    });

    it('should generate unique IDs', () => {
      const paths = [
        { path: '/api/a', methods: ['GET'] },
        { path: '/api/b', methods: ['GET'] }
      ];

      const result = suggestProductsFromPaths(paths, 'base');

      expect(result[0].id).not.toBe(result[1].id);
      expect(result[0].id).toMatch(/^[a-f0-9-]{36}$/);
    });
  });

  describe('findSmallestCommonRoot', () => {
    it('should find common root from multiple paths', () => {
      const paths = ['/api/v1/users', '/api/v1/orders'];
      expect(findSmallestCommonRoot(paths)).toBe('/api/v1');
    });

    it('should return first segment when paths differ', () => {
      const paths = ['/users', '/orders'];
      expect(findSmallestCommonRoot(paths)).toBe('/');
    });

    it('should handle single path', () => {
      const paths = ['/DebtCollection/cases'];
      expect(findSmallestCommonRoot(paths)).toBe('/DebtCollection');
    });

    it('should handle empty array', () => {
      expect(findSmallestCommonRoot([])).toBe('/');
    });

    it('should stop at path parameters', () => {
      const paths = ['/api/{id}/users', '/api/{id}/orders'];
      expect(findSmallestCommonRoot(paths)).toBe('/api');
    });

    it('should handle paths with same prefix but different depths', () => {
      const paths = [
        '/DebtCollection/cases',
        '/DebtCollection/payments',
        '/DebtCollection/cases/{id}'
      ];
      expect(findSmallestCommonRoot(paths)).toBe('/DebtCollection');
    });

    it('should normalize paths without leading slash', () => {
      const paths = ['api/users', 'api/orders'];
      expect(findSmallestCommonRoot(paths)).toBe('/api');
    });
  });

  describe('getDefaultAuthorizedPaths', () => {
    it('should return default paths when no paths provided', () => {
      const result = getDefaultAuthorizedPaths();
      expect(result).toEqual(['/', '/**']);
    });

    it('should return default paths for empty array', () => {
      const result = getDefaultAuthorizedPaths([]);
      expect(result).toEqual(['/', '/**']);
    });

    it('should compute paths from common root', () => {
      const paths = ['/api/v1/users', '/api/v1/orders'];
      const result = getDefaultAuthorizedPaths(paths);
      expect(result).toEqual(['/api/v1', '/api/v1/**']);
    });

    it('should return default for root common path', () => {
      const paths = ['/users', '/orders'];
      const result = getDefaultAuthorizedPaths(paths);
      expect(result).toEqual(['/', '/**']);
    });
  });

  describe('isValidPath', () => {
    it('should accept valid path starting with /', () => {
      expect(isValidPath('/api/users')).toBe(true);
    });

    it('should accept path with wildcards', () => {
      expect(isValidPath('/api/**')).toBe(true);
      expect(isValidPath('/api/*')).toBe(true);
    });

    it('should accept path with parameters', () => {
      expect(isValidPath('/api/users/{id}')).toBe(true);
    });

    it('should reject path not starting with /', () => {
      expect(isValidPath('api/users')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidPath('')).toBe(false);
    });

    it('should reject path with invalid characters', () => {
      expect(isValidPath('/api/users<script>')).toBe(false);
      expect(isValidPath('/api/users?query=1')).toBe(false);
    });

    it('should accept path with dots', () => {
      expect(isValidPath('/api/v1.0/users')).toBe(true);
    });

    it('should accept path with dashes and underscores', () => {
      expect(isValidPath('/api-v1/user_accounts')).toBe(true);
    });
  });

  describe('normalizePath', () => {
    it('should remove trailing slashes', () => {
      expect(normalizePath('/api/users/')).toBe('/api/users');
    });

    it('should remove multiple trailing slashes', () => {
      expect(normalizePath('/api/users///')).toBe('/api/users');
    });

    it('should add leading slash if missing', () => {
      expect(normalizePath('api/users')).toBe('/api/users');
    });

    it('should handle root path', () => {
      expect(normalizePath('/')).toBe('/');
    });

    it('should handle empty string', () => {
      expect(normalizePath('')).toBe('/');
    });

    it('should preserve path without changes if valid', () => {
      expect(normalizePath('/api/users')).toBe('/api/users');
    });

    it('should handle path that becomes empty', () => {
      expect(normalizePath('/')).toBe('/');
    });
  });
});
