import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Editor from '@monaco-editor/react';
import { AlertCircle, AlertTriangle, CheckCircle2, FileJson } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKvmStore, type KvmEntry } from '@/store/useKvmStore';
import {
  validateKvmJson,
  MAX_ENTRIES_PER_KVM,
  ENTRIES_WARNING_THRESHOLD,
  JSON_VALIDATION_DEBOUNCE_MS,
} from '@/utils/kvmValidation';

interface KvmJsonViewProps {
  className?: string;
}

type ValidationStatus = 'valid' | 'warning' | 'error' | 'typing';

export const KvmJsonView: React.FC<KvmJsonViewProps> = ({ className }) => {
  const { t } = useTranslation();
  const { currentKvm, updateEntriesFromJson } = useKvmStore();

  // Local state for editor content - allows proper bidirectional sync
  const [localContent, setLocalContent] = useState('{}');
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('valid');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [entriesCount, setEntriesCount] = useState(0);
  const isInternalEditRef = useRef(false);
  const lastKvmNameRef = useRef<string | null>(null);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync from store to editor when:
  // 1. A different KVM is selected (name changes)
  // 2. External changes occur (table edits) - detected by comparing serialized content
  useEffect(() => {
    if (!currentKvm) {
      setLocalContent('{}');
      lastKvmNameRef.current = null;
      setEntriesCount(0);
      setValidationStatus('valid');
      setValidationMessage(null);
      return;
    }

    const storeJson = JSON.stringify(currentKvm, null, 2);
    const isNewKvm = currentKvm.name !== lastKvmNameRef.current;

    if (isNewKvm) {
      // New KVM selected - always sync from store
      setLocalContent(storeJson);
      lastKvmNameRef.current = currentKvm.name;
      isInternalEditRef.current = false;
      setEntriesCount(currentKvm.keyValueEntries?.length || 0);
      setValidationStatus('valid');
      setValidationMessage(null);
    } else if (!isInternalEditRef.current) {
      // Same KVM but content changed externally (e.g., table edit)
      setLocalContent(storeJson);
      setEntriesCount(currentKvm.keyValueEntries?.length || 0);
      setValidationStatus('valid');
      setValidationMessage(null);
    }

    // Reset internal edit flag after each store update
    isInternalEditRef.current = false;
  }, [currentKvm]);

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (!value) return;

      // Always update local state for responsive editing
      setLocalContent(value);

      // Clear any pending validation
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }

      // Set typing status immediately
      setValidationStatus('typing');

      // Debounce validation for better UX while typing
      validationTimeoutRef.current = setTimeout(() => {
        // Use centralized validation
        const validation = validateKvmJson(value);

        if (!validation.valid) {
          setValidationStatus('error');
          setValidationMessage(validation.error || 'Invalid JSON');
          setEntriesCount(0);
          return;
        }

        // JSON is valid - update store
        const entries: KvmEntry[] = validation.entries || [];

        // Mark as internal edit to prevent store->editor sync overwriting our changes
        isInternalEditRef.current = true;
        updateEntriesFromJson(entries);

        setEntriesCount(entries.length);

        // Set warning or valid status
        if (validation.warning) {
          setValidationStatus('warning');
          setValidationMessage(validation.warning);
        } else {
          setValidationStatus('valid');
          setValidationMessage(null);
        }
      }, JSON_VALIDATION_DEBOUNCE_MS);
    },
    [updateEntriesFromJson]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  // Status bar content
  const statusBarContent = useMemo(() => {
    switch (validationStatus) {
      case 'error':
        return {
          icon: <AlertCircle className="h-3.5 w-3.5" />,
          text: validationMessage || 'Invalid JSON',
          bgClass: 'bg-red-500/10 border-red-500/30',
          textClass: 'text-red-600 dark:text-red-400',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="h-3.5 w-3.5" />,
          text: validationMessage || 'Warning',
          bgClass: 'bg-yellow-500/10 border-yellow-500/30',
          textClass: 'text-yellow-600 dark:text-yellow-400',
        };
      case 'typing':
        return {
          icon: <FileJson className="h-3.5 w-3.5 animate-pulse" />,
          text: t('kvm.jsonView.typing', 'Validating...'),
          bgClass: 'bg-blue-500/10 border-blue-500/30',
          textClass: 'text-blue-600 dark:text-blue-400',
        };
      case 'valid':
      default:
        return {
          icon: <CheckCircle2 className="h-3.5 w-3.5" />,
          text: t('kvm.jsonView.valid', 'Valid JSON'),
          bgClass: 'bg-green-500/10 border-green-500/30',
          textClass: 'text-green-600 dark:text-green-400',
        };
    }
  }, [validationStatus, validationMessage, t]);

  if (!currentKvm) {
    return (
      <div className={className}>
        <div className="h-full flex items-center justify-center text-[var(--swiss-gray-400)]">
          <p className="text-sm">{t('kvm.viewer.selectKvm', 'Select a KVM to view its content')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Status bar */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-2 border-b text-xs font-medium',
          statusBarContent.bgClass,
          statusBarContent.textClass
        )}
      >
        <div className="flex items-center gap-2">
          {statusBarContent.icon}
          <span className="truncate max-w-[400px]">{statusBarContent.text}</span>
        </div>
        <div className="flex items-center gap-4 text-[var(--swiss-gray-500)]">
          <span
            className={cn(
              'font-mono',
              entriesCount > ENTRIES_WARNING_THRESHOLD && 'text-yellow-500',
              entriesCount > MAX_ENTRIES_PER_KVM && 'text-red-500'
            )}
          >
            {entriesCount} {t('kvm.jsonView.entries', 'entries')}
          </span>
          <span className="text-[var(--swiss-gray-400)]">
            {t('kvm.jsonView.maxEntries', 'max {{max}}', { max: MAX_ENTRIES_PER_KVM })}
          </span>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language="json"
          value={localContent}
          theme="vs-dark"
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            formatOnPaste: true,
            formatOnType: true,
            renderWhitespace: 'selection',
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true,
            },
            padding: { top: 12, bottom: 12 },
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
          }}
        />
      </div>
    </div>
  );
};
