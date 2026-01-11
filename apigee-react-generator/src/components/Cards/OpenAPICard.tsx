import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, CheckCircle2, AlertCircle, Server, Shield, GitBranch } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { SwissCard } from './SwissCard';
import { useProjectStore } from '../../store/useProjectStore';
import { OpenAPIParserService } from '../../services/parsers/OpenAPIParser';
import { cn } from '@/lib/utils';

interface OpenAPICardProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export const OpenAPICard: React.FC<OpenAPICardProps> = ({ isExpanded, onToggle }) => {
  const { t } = useTranslation();
  const {
    openAPISpec,
    parsedOpenAPI,
    setOpenAPISpec,
    setParsedOpenAPI,
    setAutoDetectedConfig,
    updateApiConfig,
    resetForNewSpec,
  } = useProjectStore();

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parser = useMemo(() => new OpenAPIParserService(), []);

  const editorLanguage = useMemo(() => {
    if (!openAPISpec || openAPISpec.trim() === '') return 'json';
    const trimmed = openAPISpec.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
    return 'yaml';
  }, [openAPISpec]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) readFile(file);
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setOpenAPISpec(content);
      validateSpec(content);
    };
    reader.readAsText(file);
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) setOpenAPISpec(value);
  };

  const validateSpec = async (spec: string) => {
    setIsValidating(true);
    setValidationError(null);

    // Reset all configuration for new spec
    resetForNewSpec();

    try {
      const format = spec.trim().startsWith('{') ? 'json' : 'yaml';
      const parsed = await parser.parse(spec, format);

      // Set the spec content after reset
      setOpenAPISpec(spec);
      setParsedOpenAPI(parsed);

      if (parsed.autoDetected) {
        setAutoDetectedConfig(parsed.autoDetected);
      }

      updateApiConfig({
        oasVersion: parsed.version,
        oasFormat: format,
        description: parsed.autoDetected?.description || (parsed.rawSpec as any)?.info?.description || parsed.autoDetected?.title || 'API generated from OpenAPI specification'
      });

      setValidationError(null);
    } catch (error: any) {
      setValidationError(error.message);
      setParsedOpenAPI(null);
      setAutoDetectedConfig(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.json') || file.name.endsWith('.yaml') || file.name.endsWith('.yml'))) {
      readFile(file);
    }
  }, []);

  const autoDetected = parsedOpenAPI?.autoDetected;

  // Calculate completion
  const completion = parsedOpenAPI ? 100 : (openAPISpec ? 50 : 0);

  // Subtitle based on state
  const subtitle = parsedOpenAPI
    ? parsedOpenAPI.autoDetected?.title || 'Specification loaded'
    : openAPISpec
    ? 'Pending validation'
    : undefined;

  // Badge
  const badge = parsedOpenAPI ? (
    <span className="text-[9px] px-2 py-0.5 bg-[var(--swiss-black)] text-[var(--swiss-white)] uppercase font-bold">
      {t('canvas.cards.openapi.loaded', 'Loaded')}
    </span>
  ) : null;

  return (
    <SwissCard
      number="01"
      title={t('canvas.cards.openapi.title', 'OpenAPI Specification')}
      subtitle={subtitle}
      badge={badge}
      completion={completion}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      {/* Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed p-8 text-center mb-6 transition-colors cursor-pointer",
          isDragging
            ? "border-[var(--swiss-black)] bg-[var(--swiss-gray-50)]"
            : "border-[var(--swiss-gray-200)] hover:border-[var(--swiss-black)]"
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".json,.yaml,.yml"
          onChange={handleFileUpload}
        />
        <Upload className="w-8 h-8 mx-auto mb-3 text-[var(--swiss-gray-300)]" />
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--swiss-gray-400)]">
          {t('canvas.cards.openapi.dropzone', 'Drop OpenAPI file or click to browse')}
        </p>
        <p className="text-[10px] text-[var(--swiss-gray-300)] mt-1">YAML or JSON format</p>
      </div>

      {/* Monaco Editor */}
      <div className="bg-gray-900 rounded-none overflow-hidden mb-6" style={{ height: '240px' }}>
        <Editor
          height="240px"
          language={editorLanguage}
          value={openAPISpec}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 11,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            lineNumbers: 'off',
            folding: false,
            glyphMargin: false,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 0,
          }}
        />
      </div>

      {/* Validation Messages */}
      {validationError && (
        <div className="flex items-center gap-2 p-4 mb-6 bg-red-50 border-l-4 border-red-500">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-xs text-red-700">{validationError}</p>
        </div>
      )}

      {parsedOpenAPI && !validationError && (
        <div className="flex items-center gap-2 p-4 mb-6 bg-green-50 border-l-4 border-green-500">
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
          <p className="text-xs text-green-700 font-medium">
            {t('step2.validation.valid', 'Valid OpenAPI specification')} - {parsedOpenAPI.paths.length} endpoints
          </p>
        </div>
      )}

      {/* Detected Values */}
      {autoDetected && (
        <div className="space-y-4 mb-6">
          {/* Auth & Target Path Row */}
          <div className="grid grid-cols-2 gap-4">
            {autoDetected.auth.type && (
              <div className="border-l-4 border-[var(--swiss-black)] pl-4">
                <p className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Auth Detected
                </p>
                <p className="text-sm font-bold">{autoDetected.auth.type}</p>
              </div>
            )}
            {autoDetected.targetPath && (
              <div className="border-l-4 border-[var(--swiss-black)] pl-4">
                <p className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase flex items-center gap-1">
                  <GitBranch className="w-3 h-3" /> Target Path
                </p>
                <p className="text-sm font-bold font-mono truncate">{autoDetected.targetPath}</p>
              </div>
            )}
          </div>

          {/* Servers - Grouped by unique host */}
          {autoDetected.environmentHosts && Object.keys(autoDetected.environmentHosts).length > 0 && (() => {
            // Group environments by host
            const hostToEnvs: Record<string, string[]> = {};
            for (const [env, config] of Object.entries(autoDetected.environmentHosts)) {
              if (config?.host) {
                if (!hostToEnvs[config.host]) {
                  hostToEnvs[config.host] = [];
                }
                hostToEnvs[config.host].push(env);
              }
            }

            return (
              <div className="border-l-4 border-[var(--swiss-black)] pl-4">
                <p className="text-[10px] font-bold text-[var(--swiss-gray-400)] uppercase flex items-center gap-1 mb-2">
                  <Server className="w-3 h-3" /> Servers Detected
                </p>
                <div className="space-y-1">
                  {Object.entries(hostToEnvs).map(([host, envs]) => (
                    <div key={host} className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {envs.map(env => (
                          <span
                            key={env}
                            className="text-[9px] px-1.5 py-0.5 bg-[var(--swiss-black)] text-[var(--swiss-white)] uppercase font-bold"
                          >
                            {env}
                          </span>
                        ))}
                      </div>
                      <span className="text-xs font-mono text-[var(--swiss-gray-600)] truncate">{host}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Parse Button */}
      <button
        onClick={() => validateSpec(openAPISpec)}
        disabled={!openAPISpec || isValidating}
        className={cn(
          "w-full px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all",
          openAPISpec && !isValidating
            ? "bg-[var(--swiss-black)] text-[var(--swiss-white)] hover:bg-[var(--swiss-gray-800)]"
            : "bg-[var(--swiss-gray-300)] text-[var(--swiss-white)] cursor-not-allowed"
        )}
      >
        {isValidating ? 'Validating...' : t('canvas.cards.openapi.parseButton', 'Parse & Auto-fill')}
      </button>
    </SwissCard>
  );
};
