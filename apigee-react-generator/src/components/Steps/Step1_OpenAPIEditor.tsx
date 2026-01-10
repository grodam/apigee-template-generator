import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, CheckCircle2, AlertCircle, FileText, Server, Shield, GitBranch, Info } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useProjectStore } from '../../store/useProjectStore';
import { OpenAPIParserService } from '../../services/parsers/OpenAPIParser';

export const Step1_OpenAPIEditor: React.FC = () => {
  const { t } = useTranslation();
  const {
    openAPISpec,
    parsedOpenAPI,
    setOpenAPISpec,
    setParsedOpenAPI,
    setAutoDetectedConfig,
    updateApiConfig,
  } = useProjectStore();

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Memoize parser to avoid creating new instance on each render
  const parser = useMemo(() => new OpenAPIParserService(), []);

  // Detect language (JSON or YAML) based on content
  const editorLanguage = useMemo(() => {
    if (!openAPISpec || openAPISpec.trim() === '') {
      return 'json'; // Default to JSON for empty editor
    }
    const trimmed = openAPISpec.trim();
    // Check if it starts with { or [ (JSON)
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return 'json';
    }
    // Otherwise assume YAML
    return 'yaml';
  }, [openAPISpec]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      readFile(file);
    }
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
    if (value !== undefined) {
      setOpenAPISpec(value);
    }
  };

  const validateSpec = async (spec: string) => {
    setIsValidating(true);
    setValidationError(null);

    try {
      // Detect format
      const format = spec.trim().startsWith('{') ? 'json' : 'yaml';

      // Parse and validate
      const parsed = await parser.parse(spec, format);
      setParsedOpenAPI(parsed);

      // Store auto-detected config
      if (parsed.autoDetected) {
        setAutoDetectedConfig(parsed.autoDetected);
      }

      // Update api config with detected OAS version
      updateApiConfig({
        oasVersion: parsed.version,
        oasFormat: format
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

  // Drag & Drop handlers
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

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-[var(--success-light)] text-green-800';
      case 'POST': return 'bg-[var(--info-light)] text-blue-800';
      case 'PUT': return 'bg-[var(--warning-base)] text-orange-800';
      case 'DELETE': return 'bg-[var(--error-light)] text-red-800';
      case 'PATCH': return 'bg-[var(--accent-300)] text-purple-800';
      default: return 'bg-[var(--slate-200)] text-[var(--text-primary)]';
    }
  };

  const autoDetected = parsedOpenAPI?.autoDetected;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('step1.openapi.title', 'Import OpenAPI Specification')}</h1>
        <p className="text-[var(--text-secondary)] text-lg">{t('step1.openapi.subtitle', 'Upload or paste your OpenAPI specification to auto-detect configuration')}</p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6 items-center">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".json,.yaml,.yml"
          onChange={handleFileUpload}
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="soft-button secondary h-10"
        >
          <Upload className="mr-2 h-4 w-4" />
          {t('step2.uploadButton')}
        </Button>
        <Button
          onClick={() => validateSpec(openAPISpec)}
          disabled={!openAPISpec || isValidating}
          className="soft-button h-10"
        >
          {isValidating ? t('common.validating') : t('common.validate')}
        </Button>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-all mb-6
          ${isDragging
            ? 'border-[var(--accent-400)] bg-[var(--accent-50)] gradient-card'
            : 'border-[var(--border-default)] hover:border-[var(--accent-300)] bg-[var(--bg-secondary)]'
          }
        `}
      >
        <FileText className="mx-auto h-12 w-12 text-[var(--text-muted)] mb-4" />
        <p className="text-sm text-[var(--text-secondary)] mb-2 font-medium">
          {t('step2.dragDrop')}
        </p>
        <p className="text-xs text-[var(--text-muted)] font-medium">
          {t('step2.supportedFiles')}
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monaco Editor */}
        <div className="lg:col-span-2">
          <div className="soft-card overflow-hidden" style={{ height: '500px' }}>
            <Editor
              height="500px"
              language={editorLanguage}
              value={openAPISpec}
              onChange={handleEditorChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                scrollBeyondLastLine: false,
              }}
            />
          </div>
        </div>

        {/* Validation Panel */}
        <div className="space-y-4">
          <div className="soft-card">
            <div className="section-header">
              <div className="icon">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h3>{t('step2.validation.title')}</h3>
            </div>

            <div className="space-y-4">
              {validationError && (
                <Alert className="soft-alert error">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {validationError}
                  </AlertDescription>
                </Alert>
              )}

              {parsedOpenAPI && !validationError && (
                <>
                  <Alert className="soft-alert success">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription className="text-sm font-medium">
                      {t('step2.validation.valid')}
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <p className="soft-label">{t('step2.validation.openApiVersion')}</p>
                    <Badge className="pill-badge">
                      {parsedOpenAPI.version}
                    </Badge>
                  </div>

                  <div className="space-y-2 gradient-border-content">
                    <p className="soft-label">{t('step2.validation.endpointsDetected')}</p>
                    <p className="text-3xl font-bold text-[var(--accent-600)]">
                      {parsedOpenAPI.paths.length}
                    </p>
                  </div>

                  <div className="space-y-3 max-h-[200px] overflow-auto">
                    <p className="soft-label">{t('step2.validation.paths')}</p>
                    {parsedOpenAPI.paths.slice(0, 10).map((path, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm soft-stagger">
                        <Badge className={`${getMethodColor(path.method)} font-semibold text-xs px-2 py-1 rounded-lg`}>
                          {path.method}
                        </Badge>
                        <span className="text-xs text-[var(--text-secondary)] truncate font-mono">
                          {path.path}
                        </span>
                      </div>
                    ))}
                    {parsedOpenAPI.paths.length > 10 && (
                      <p className="text-xs text-[var(--text-muted)] italic">
                        +{parsedOpenAPI.paths.length - 10} {t('common.more', 'more')}...
                      </p>
                    )}
                  </div>
                </>
              )}

              {!openAPISpec && !validationError && (
                <Alert className="soft-alert info">
                  <AlertDescription className="text-sm">
                    {t('step2.placeholder')}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {/* Auto-Detected Configuration Panel */}
          {autoDetected && (
            <div className="soft-card">
              <div className="section-header">
                <div className="icon">
                  <Info className="h-5 w-5" />
                </div>
                <h3>{t('step1.autoDetected.title', 'Auto-Detected Configuration')}</h3>
              </div>

              <div className="space-y-4">
                {/* Environment Hosts Mapping */}
                {autoDetected.environmentHosts && Object.keys(autoDetected.environmentHosts).length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-[var(--text-muted)]" />
                      <p className="soft-label">{t('step1.autoDetected.servers', 'Target Servers')}</p>
                    </div>
                    <div className="space-y-1">
                      {/* Group environments by host */}
                      {(() => {
                        const ENV_ORDER = ['dev1', 'uat1', 'staging', 'prod1'];
                        const hostToEnvs: Record<string, string[]> = {};
                        for (const [env, config] of Object.entries(autoDetected.environmentHosts)) {
                          const host = config?.host || '';
                          if (host) {
                            if (!hostToEnvs[host]) hostToEnvs[host] = [];
                            hostToEnvs[host].push(env);
                          }
                        }
                        // Sort environments within each host group
                        for (const host of Object.keys(hostToEnvs)) {
                          hostToEnvs[host].sort((a, b) => ENV_ORDER.indexOf(a) - ENV_ORDER.indexOf(b));
                        }
                        // Sort host groups: non-prod first, then prod
                        const sortedEntries = Object.entries(hostToEnvs).sort(([, envsA], [, envsB]) => {
                          const aHasProd = envsA.includes('prod1');
                          const bHasProd = envsB.includes('prod1');
                          if (aHasProd && !bHasProd) return 1;
                          if (!aHasProd && bHasProd) return -1;
                          return 0;
                        });
                        return sortedEntries.map(([host, envs], index) => (
                          <div key={index} className="flex items-center gap-2 text-xs flex-wrap">
                            {envs.map(env => (
                              <Badge key={env} className="pill-badge text-xs">
                                {env}
                              </Badge>
                            ))}
                            <span className="font-mono text-[var(--text-secondary)] truncate">
                              {host}
                            </span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                {/* Authentication */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-[var(--text-muted)]" />
                    <p className="soft-label">{t('step1.autoDetected.auth', 'Southbound Auth')}</p>
                  </div>
                  <Badge className={`pill-badge ${
                    autoDetected.auth.type === 'OAuth2-ClientCredentials' ? 'bg-blue-100 text-blue-800' :
                    autoDetected.auth.type === 'Basic' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {autoDetected.auth.type}
                  </Badge>
                </div>

                {/* Target Path */}
                {autoDetected.targetPath && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-[var(--text-muted)]" />
                      <p className="soft-label">{t('step1.autoDetected.targetPath', 'Target Path')}</p>
                    </div>
                    <code className="text-xs font-mono bg-[var(--bg-tertiary)] px-2 py-1 rounded block">
                      {autoDetected.targetPath}
                    </code>
                    {autoDetected.hasVariablePath && (
                      <p className="text-xs text-[var(--text-muted)] italic">
                        {t('step1.autoDetected.variabilized', 'Path variabilized for environment differences')}
                      </p>
                    )}
                  </div>
                )}

                {/* Info Note */}
                <Alert className="soft-alert info">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {t('step1.autoDetected.note', 'These values will be used to pre-fill the configuration in the next step. You can modify them later.')}
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
