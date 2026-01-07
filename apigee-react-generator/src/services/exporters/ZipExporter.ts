import JSZip from 'jszip';
import type { GeneratedProject } from '../../models/GeneratedProject';

export class ZipExporter {
  async export(project: GeneratedProject): Promise<Blob> {
    const zip = new JSZip();

    // Créer la structure de dossiers
    const rootFolder = zip.folder(project.rootDir);

    if (!rootFolder) {
      throw new Error('Failed to create root folder');
    }

    // Ajouter tous les fichiers
    for (const [filePath, content] of project.files) {
      rootFolder.file(filePath, content);
    }

    // Générer le ZIP
    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 9
      }
    });

    return blob;
  }

  download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async exportAndDownload(project: GeneratedProject): Promise<void> {
    const blob = await this.export(project);
    const filename = `${project.rootDir}.zip`;
    this.download(blob, filename);
  }
}
