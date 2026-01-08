import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useProjectStore } from '../../store/useProjectStore';
import { OpenAPIParserService } from '../../services/parsers/OpenAPIParser';

export const Step2_OpenAPIEditor: React.FC = () => {
  const { t } = useTranslation();
  const {
    openAPISpec,
    parsedOpenAPI,
    setOpenAPISpec,
    setParsedOpenAPI,
    updateApiConfig,
  } = useProjectStore();

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const parser = new OpenAPIParserService();

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
      // Détecter le format
      const format = spec.trim().startsWith('{') ? 'json' : 'yaml';

      // Parser et valider
      const parsed = await parser.parse(spec, format);
      setParsedOpenAPI(parsed);

      // Mettre à jour la config avec la version OAS détectée
      updateApiConfig({
        oasVersion: parsed.version,
        oasFormat: format
      });

      setValidationError(null);
    } catch (error: any) {
      setValidationError(error.message);
      setParsedOpenAPI(null);
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
      case 'GET': return 'bg-[var(--mint-soft)] text-green-800';
      case 'POST': return 'bg-[var(--sky-soft)] text-blue-800';
      case 'PUT': return 'bg-[var(--peach-300)] text-orange-800';
      case 'DELETE': return 'bg-[var(--rose-soft)] text-red-800';
      case 'PATCH': return 'bg-[var(--lavender-300)] text-purple-800';
      default: return 'bg-[var(--cream-300)] text-[var(--text-primary)]';
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('step2.title')}</h1>
        <p className="text-[var(--text-secondary)] text-lg">{t('step2.subtitle')}</p>
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
          border-2 border-dashed rounded-2xl p-8 text-center transition-all mb-6
          ${isDragging
            ? 'border-[var(--lavender-400)] bg-[var(--lavender-50)] gradient-card'
            : 'border-[var(--border-medium)] hover:border-[var(--lavender-300)] bg-[var(--bg-secondary)]'
          }
        `}
      >
        <FileText className="mx-auto h-12 w-12 text-[var(--text-tertiary)] mb-4" />
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
                    <p className="text-3xl font-bold bg-gradient-to-r from-[var(--lavender-600)] to-[var(--peach-500)] bg-clip-text text-transparent">
                      {parsedOpenAPI.paths.length}
                    </p>
                  </div>

                  <div className="space-y-3 max-h-[280px] overflow-auto">
                    <p className="soft-label">{t('step2.validation.paths')}</p>
                    {parsedOpenAPI.paths.map((path, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm soft-stagger">
                        <Badge className={`${getMethodColor(path.method)} font-semibold text-xs px-2 py-1 rounded-lg`}>
                          {path.method}
                        </Badge>
                        <span className="text-xs text-[var(--text-secondary)] truncate font-mono">
                          {path.path}
                        </span>
                      </div>
                    ))}
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
        </div>
      </div>
    </div>
  );
};
