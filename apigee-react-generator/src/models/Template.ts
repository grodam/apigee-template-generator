export type TemplateCategory = 'policies' | 'pom' | 'proxy' | 'linting' | 'cicd' | 'other';

export interface TemplateFile {
  id: string;
  name: string;
  path: string;
  content: string;
  category: TemplateCategory;
  isModified: boolean;
  source: 'file' | 'inline';
  description?: string;
}

export interface TemplateTreeNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  category?: TemplateCategory;
  children?: TemplateTreeNode[];
  template?: TemplateFile;
}

export interface TemplateExport {
  version: string;
  exportDate: string;
  templates: TemplateFile[];
}

export const TEMPLATE_CATEGORIES: Record<TemplateCategory, { label: string; description: string }> = {
  policies: {
    label: 'Policies',
    description: 'Apigee policy XML templates (AM, BA, EV, FC, LC, PC)'
  },
  pom: {
    label: 'POM Files',
    description: 'Maven project configuration files'
  },
  proxy: {
    label: 'Proxy Configuration',
    description: 'Apigee proxy, proxies, and targets XML templates'
  },
  linting: {
    label: 'Linting',
    description: 'Spectral and custom linting rules'
  },
  cicd: {
    label: 'CI/CD',
    description: 'Azure Pipelines and Git configuration'
  },
  other: {
    label: 'Other',
    description: 'README, Maven settings, and other files'
  }
};
