export interface GeneratedProject {
  rootDir: string;
  files: Map<string, string>;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  content?: string;
}
