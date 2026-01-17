import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Editor from '@monaco-editor/react';
import { useKvmStore, type KvmEntry } from '@/store/useKvmStore';

interface KvmJsonViewProps {
  className?: string;
}

export const KvmJsonView: React.FC<KvmJsonViewProps> = ({ className }) => {
  const { t } = useTranslation();
  const { currentKvm, updateEntriesFromJson } = useKvmStore();

  // Display KVM in raw Apigee API format
  const jsonContent = useMemo(() => {
    if (!currentKvm) return '{}';

    return JSON.stringify(currentKvm, null, 2);
  }, [currentKvm]);

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (!value) return;

      try {
        const parsed = JSON.parse(value);

        // Validate structure - expect Apigee KVM format
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          return;
        }

        // Extract entries from Apigee format
        const entries: KvmEntry[] = [];
        if (Array.isArray(parsed.keyValueEntries)) {
          for (const entry of parsed.keyValueEntries) {
            if (entry && typeof entry.name === 'string') {
              entries.push({
                name: entry.name,
                value: String(entry.value ?? ''),
              });
            }
          }
        }

        updateEntriesFromJson(entries);
      } catch {
        // JSON is invalid, don't update
        // This is expected while typing
      }
    },
    [updateEntriesFromJson]
  );

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
    <div className={className}>
      <Editor
        height="100%"
        language="json"
        value={jsonContent}
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
  );
};
