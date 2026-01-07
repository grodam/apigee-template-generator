import { TEMPLATE_BASE_PATH } from '../../utils/constants';

export class TemplateLoader {
  private cache: Map<string, string> = new Map();

  async load(templatePath: string): Promise<string> {
    if (this.cache.has(templatePath)) {
      return this.cache.get(templatePath)!;
    }

    const fullPath = `${TEMPLATE_BASE_PATH}/${templatePath}`;

    try {
      const response = await fetch(fullPath);
      if (!response.ok) {
        throw new Error(`Failed to load template: ${fullPath}`);
      }

      const content = await response.text();
      this.cache.set(templatePath, content);
      return content;
    } catch (error) {
      console.error(`Error loading template ${fullPath}:`, error);
      throw error;
    }
  }

  async loadMultiple(templatePaths: string[]): Promise<Map<string, string>> {
    const templates = new Map<string, string>();

    await Promise.all(
      templatePaths.map(async (path) => {
        const content = await this.load(path);
        templates.set(path, content);
      })
    );

    return templates;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
