/**
 * KVM Validation Constants and Utilities
 * Based on Apigee X/hybrid limits and best practices
 */

// ============================================
// Constants
// ============================================

/** Maximum length for KVM name (Apigee limit) */
export const KVM_NAME_MAX_LENGTH = 255;

/** Maximum length for entry name (Apigee limit ~2KB) */
export const ENTRY_NAME_MAX_LENGTH = 2048;

/** Maximum length for entry value (Apigee limit ~512KB) */
export const ENTRY_VALUE_MAX_LENGTH = 524288;

/** Warning threshold for large entry values (100KB) */
export const ENTRY_VALUE_WARNING_THRESHOLD = 100000;

/** Threshold for showing size indicator in table view (10KB) */
export const ENTRY_VALUE_SIZE_INDICATOR_THRESHOLD = 10000;

/** Recommended maximum number of entries per KVM */
export const MAX_ENTRIES_PER_KVM = 5000;

/** Warning threshold for number of entries */
export const ENTRIES_WARNING_THRESHOLD = 4000;

/** Pattern for valid KVM/Entry names */
export const NAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

/** Debounce delay for JSON validation (ms) */
export const JSON_VALIDATION_DEBOUNCE_MS = 300;

/** Reserved KVM names that should be avoided */
export const RESERVED_KVM_NAMES = [
  'default',
  'system',
  'config',
  'configuration',
  'settings',
  'admin',
  'test',
  'temp',
  'tmp',
  'cache',
  'backup',
];

// ============================================
// Validation Types
// ============================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
  errorKey?: string;
  warningKey?: string;
}

export interface KvmValidationOptions {
  checkReserved?: boolean;
  existingNames?: string[];
}

export interface EntryValidationOptions {
  existingNames?: string[];
}

// ============================================
// KVM Name Validation
// ============================================

/**
 * Validate a KVM name
 */
export function validateKvmName(
  name: string,
  options: KvmValidationOptions = {}
): ValidationResult {
  const trimmed = name.trim();

  // Required
  if (!trimmed) {
    return {
      valid: false,
      error: 'KVM name is required',
      errorKey: 'kvm.validation.nameRequired',
    };
  }

  // Max length
  if (trimmed.length > KVM_NAME_MAX_LENGTH) {
    return {
      valid: false,
      error: `KVM name must be ${KVM_NAME_MAX_LENGTH} characters or less (current: ${trimmed.length})`,
      errorKey: 'kvm.validation.nameTooLong',
    };
  }

  // Format
  if (!NAME_PATTERN.test(trimmed)) {
    return {
      valid: false,
      error: 'Name can only contain letters, numbers, dots, hyphens, and underscores',
      errorKey: 'kvm.validation.nameInvalidFormat',
    };
  }

  // Reserved words
  if (options.checkReserved !== false && RESERVED_KVM_NAMES.includes(trimmed.toLowerCase())) {
    return {
      valid: false,
      error: `"${trimmed}" is a reserved name. Please choose a different name.`,
      errorKey: 'kvm.validation.nameReserved',
    };
  }

  // Duplicate check
  if (options.existingNames?.includes(trimmed)) {
    return {
      valid: false,
      error: 'A KVM with this name already exists',
      errorKey: 'kvm.validation.nameDuplicate',
    };
  }

  // Warnings
  let warning: string | undefined;
  let warningKey: string | undefined;

  if (trimmed.startsWith('.') || trimmed.startsWith('-') || trimmed.startsWith('_')) {
    warning = 'Names starting with special characters may cause issues';
    warningKey = 'kvm.validation.nameStartsWithSpecial';
  }

  return { valid: true, warning, warningKey };
}

// ============================================
// Entry Name Validation
// ============================================

/**
 * Validate an entry name
 */
export function validateEntryName(
  name: string,
  options: EntryValidationOptions = {}
): ValidationResult {
  const trimmed = name.trim();

  // Required
  if (!trimmed) {
    return {
      valid: false,
      error: 'Entry name is required',
      errorKey: 'kvm.validation.entryNameRequired',
    };
  }

  // Max length
  if (trimmed.length > ENTRY_NAME_MAX_LENGTH) {
    return {
      valid: false,
      error: `Entry name must be ${ENTRY_NAME_MAX_LENGTH} characters or less (current: ${trimmed.length})`,
      errorKey: 'kvm.validation.entryNameTooLong',
    };
  }

  // Format
  if (!NAME_PATTERN.test(trimmed)) {
    return {
      valid: false,
      error: 'Name can only contain letters, numbers, dots, hyphens, and underscores',
      errorKey: 'kvm.validation.entryNameInvalidFormat',
    };
  }

  // Duplicate check
  if (options.existingNames?.includes(trimmed)) {
    return {
      valid: false,
      error: 'An entry with this name already exists',
      errorKey: 'kvm.validation.entryNameDuplicate',
    };
  }

  return { valid: true };
}

// ============================================
// Entry Value Validation
// ============================================

/**
 * Validate an entry value
 */
export function validateEntryValue(value: string): ValidationResult {
  // Max length
  if (value.length > ENTRY_VALUE_MAX_LENGTH) {
    const sizeKB = Math.round(value.length / 1024);
    const maxKB = Math.round(ENTRY_VALUE_MAX_LENGTH / 1024);
    return {
      valid: false,
      error: `Entry value must be ${maxKB}KB or less (current: ${sizeKB}KB)`,
      errorKey: 'kvm.validation.entryValueTooLong',
    };
  }

  // Warnings for large values
  let warning: string | undefined;
  let warningKey: string | undefined;

  if (value.length > 100000) {
    const sizeKB = Math.round(value.length / 1024);
    warning = `Large value (${sizeKB}KB) may impact performance`;
    warningKey = 'kvm.validation.entryValueLarge';
  }

  return { valid: true, warning, warningKey };
}

// ============================================
// JSON Content Validation
// ============================================

export interface JsonValidationResult extends ValidationResult {
  entries?: Array<{ name: string; value: string }>;
  duplicatesRemoved?: string[];
  entriesCount?: number;
}

/**
 * Validate and parse KVM JSON content
 */
export function validateKvmJson(jsonString: string): JsonValidationResult {
  // Try to parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    const error = e as SyntaxError;
    return {
      valid: false,
      error: `Invalid JSON: ${error.message}`,
      errorKey: 'kvm.validation.jsonInvalid',
    };
  }

  // Must be an object
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      valid: false,
      error: 'JSON must be an object with keyValueEntries array',
      errorKey: 'kvm.validation.jsonNotObject',
    };
  }

  const obj = parsed as Record<string, unknown>;

  // Check for keyValueEntries
  if (!('keyValueEntries' in obj)) {
    return {
      valid: false,
      error: 'JSON must contain a keyValueEntries array',
      errorKey: 'kvm.validation.jsonMissingEntries',
    };
  }

  if (!Array.isArray(obj.keyValueEntries)) {
    return {
      valid: false,
      error: 'keyValueEntries must be an array',
      errorKey: 'kvm.validation.jsonEntriesNotArray',
    };
  }

  // Extract and validate entries
  const seenNames = new Map<string, number>();
  const duplicatesRemoved: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < obj.keyValueEntries.length; i++) {
    const entry = obj.keyValueEntries[i] as Record<string, unknown>;

    if (!entry || typeof entry !== 'object') {
      errors.push(`Entry at index ${i} is not a valid object`);
      continue;
    }

    if (typeof entry.name !== 'string') {
      errors.push(`Entry at index ${i} has invalid or missing name`);
      continue;
    }

    const name = entry.name;
    const value = String(entry.value ?? '');

    // Validate entry name format
    if (!NAME_PATTERN.test(name)) {
      errors.push(`Entry "${name}" has invalid characters in name`);
      continue;
    }

    // Validate entry name length
    if (name.length > ENTRY_NAME_MAX_LENGTH) {
      errors.push(`Entry "${name}" name exceeds maximum length`);
      continue;
    }

    // Validate entry value length
    if (value.length > ENTRY_VALUE_MAX_LENGTH) {
      errors.push(`Entry "${name}" value exceeds maximum length`);
      continue;
    }

    // Track duplicates
    if (seenNames.has(name)) {
      duplicatesRemoved.push(name);
    }
    seenNames.set(name, i);
  }

  // If there are validation errors, return them
  if (errors.length > 0) {
    return {
      valid: false,
      error: errors.join('; '),
      errorKey: 'kvm.validation.jsonEntryErrors',
    };
  }

  // Check for duplicate entry names - this is now an error, not a warning
  if (duplicatesRemoved.length > 0) {
    const uniqueDupes = [...new Set(duplicatesRemoved)];
    return {
      valid: false,
      error: `Duplicate entry names found: ${uniqueDupes.join(', ')}`,
      errorKey: 'kvm.validation.duplicateEntryNames',
      duplicatesRemoved: uniqueDupes,
    };
  }

  // Build entries list (no deduplication needed since we error on duplicates)
  const finalEntries: Array<{ name: string; value: string }> = [];

  for (let i = 0; i < obj.keyValueEntries.length; i++) {
    const entry = obj.keyValueEntries[i] as Record<string, unknown>;
    if (entry && typeof entry.name === 'string') {
      finalEntries.push({
        name: entry.name,
        value: String(entry.value ?? ''),
      });
    }
  }

  // Check entries limit
  let warning: string | undefined;
  let warningKey: string | undefined;

  if (finalEntries.length > MAX_ENTRIES_PER_KVM) {
    return {
      valid: false,
      error: `Too many entries (${finalEntries.length}). Maximum is ${MAX_ENTRIES_PER_KVM}`,
      errorKey: 'kvm.validation.tooManyEntries',
    };
  }

  if (finalEntries.length > ENTRIES_WARNING_THRESHOLD) {
    warning = `Large number of entries (${finalEntries.length}) may impact performance`;
    warningKey = 'kvm.validation.manyEntries';
  }

  return {
    valid: true,
    entries: finalEntries,
    entriesCount: finalEntries.length,
    warning,
    warningKey,
  };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Format byte size to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
