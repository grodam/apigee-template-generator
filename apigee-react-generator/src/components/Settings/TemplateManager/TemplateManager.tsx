import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TemplateTree } from './TemplateTree';
import { TemplateEditor } from './TemplateEditor';
import { templateRegistry } from '@/services/templates/TemplateRegistry';
import type { TemplateFile, TemplateTreeNode } from '@/models/Template';
import { useProjectStore } from '@/store/useProjectStore';
import { Button } from '@/components/ui/button';
import { Download, Upload, RotateCcw, Save } from 'lucide-react';

export function TemplateManager() {
  const { t } = useTranslation();
  const [treeData, setTreeData] = useState<TemplateTreeNode[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateFile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editedContent, setEditedContent] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { templateOverrides, setTemplateOverride, removeTemplateOverride } = useProjectStore();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      // Convert templateOverrides Record to Map
      const overridesMap = new Map(Object.entries(templateOverrides));
      await templateRegistry.initialize(overridesMap);
      setTreeData(templateRegistry.getTemplateTree());
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateSelect = (template: TemplateFile) => {
    setSelectedTemplate(template);
    setEditedContent(template.content);
    setHasUnsavedChanges(false);
  };

  const handleContentChange = (content: string) => {
    if (!selectedTemplate) return;
    setEditedContent(content);
    setHasUnsavedChanges(content !== selectedTemplate.content);
  };

  const handleSave = () => {
    if (!selectedTemplate || !hasUnsavedChanges) return;

    setIsSaving(true);
    try {
      // Update in registry
      templateRegistry.updateTemplate(selectedTemplate.id, editedContent);

      // Update in store (persisted)
      setTemplateOverride(selectedTemplate.id, editedContent);

      // Get fresh template from registry and update local state
      const updatedTemplate = templateRegistry.getTemplate(selectedTemplate.id);
      if (updatedTemplate) {
        setSelectedTemplate(updatedTemplate);
        setEditedContent(updatedTemplate.content);
      }

      setHasUnsavedChanges(false);
      // Refresh tree
      setTreeData(templateRegistry.getTemplateTree());
    } catch (error) {
      console.error('Failed to save template:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (!selectedTemplate || !hasUnsavedChanges) return;
    // Reset to the saved content (discard unsaved changes)
    setEditedContent(selectedTemplate.content);
    setHasUnsavedChanges(false);
  };

  const handleExportAll = async () => {
    try {
      const blob = await templateRegistry.exportAllAsZip();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `apigee-templates-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export templates:', error);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await templateRegistry.importFromZip(file);

      // Update store with new overrides
      const overrides = templateRegistry.getOverrides();
      for (const [id, content] of overrides) {
        setTemplateOverride(id, content);
      }

      // Refresh UI
      setTreeData(templateRegistry.getTemplateTree());

      if (selectedTemplate) {
        const updated = templateRegistry.getTemplate(selectedTemplate.id);
        if (updated) {
          setSelectedTemplate(updated);
        }
      }

      alert(`Imported ${result.imported} template(s).${result.errors.length > 0 ? `\nErrors: ${result.errors.join(', ')}` : ''}`);
    } catch (error) {
      console.error('Failed to import templates:', error);
      alert('Failed to import templates. Please check the file format.');
    }

    // Reset input
    event.target.value = '';
  };

  const handleExportSingle = () => {
    if (!selectedTemplate) return;

    const { filename, content } = templateRegistry.exportTemplate(selectedTemplate.id);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[var(--text-secondary)]">{t('templates.loading')}</div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left Panel - Tree */}
      <div className="w-72 border-r border-[var(--border-default)] bg-white/30 flex flex-col">
        <div className="p-4 border-b border-[var(--border-default)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">{t('templates.title')}</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportAll}
              className="h-9 text-xs rounded-md border-[var(--border-default)] hover:bg-[var(--bg-tertiary)] inline-flex items-center justify-center gap-1.5"
            >
              <Download className="h-3 w-3" />
              <span>{t('templates.exportZip')}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('template-import-input')?.click()}
              className="h-9 text-xs rounded-md border-[var(--border-default)] hover:bg-[var(--bg-tertiary)] inline-flex items-center justify-center gap-1.5"
            >
              <Upload className="h-3 w-3" />
              <span>{t('templates.importZip')}</span>
            </Button>
            <input
              id="template-import-input"
              type="file"
              accept=".zip"
              onChange={handleImport}
              className="hidden"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <TemplateTree
            nodes={treeData}
            selectedId={selectedTemplate?.id}
            onSelect={handleTemplateSelect}
          />
        </div>
      </div>

      {/* Right Panel - Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedTemplate ? (
          <>
            <div className="px-4 py-3 border-b border-[var(--border-default)] bg-white/50 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-[var(--text-primary)]">{selectedTemplate.name}</h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  {selectedTemplate.description}
                  {hasUnsavedChanges && (
                    <span className="ml-2 text-[var(--warning-dark)]">{t('templates.modified')}</span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportSingle}
                  className="text-xs rounded-md border-[var(--border-default)] hover:bg-[var(--bg-tertiary)] inline-flex items-center gap-1.5"
                >
                  <Download className="h-3 w-3" />
                  <span>{t('common.export')}</span>
                </Button>
                {hasUnsavedChanges && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReset}
                      className="text-xs rounded-md border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] inline-flex items-center gap-1.5"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>{t('common.cancel')}</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={isSaving}
                      className="text-xs rounded-md bg-gradient-to-r from-[var(--accent-500)] to-[var(--accent-600)] hover:from-[var(--accent-600)] hover:to-[var(--accent-700)] text-white shadow-sm inline-flex items-center gap-1.5"
                    >
                      <Save className="h-3 w-3" />
                      <span>{t('common.save')}</span>
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <TemplateEditor
                content={editedContent}
                language={getLanguageFromFilename(selectedTemplate.name)}
                onChange={handleContentChange}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[var(--text-secondary)]">
            {t('templates.selectToEdit')}
          </div>
        )}
      </div>
    </div>
  );
}

function getLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'xml':
      return 'xml';
    case 'json':
      return 'json';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'js':
      return 'javascript';
    case 'md':
      return 'markdown';
    default:
      return 'plaintext';
  }
}
