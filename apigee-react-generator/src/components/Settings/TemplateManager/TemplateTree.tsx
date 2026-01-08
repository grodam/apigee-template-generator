import { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Folder, FileCode, FileText, FileJson } from 'lucide-react';
import type { TemplateTreeNode, TemplateFile } from '@/models/Template';
import { cn } from '@/lib/utils';

interface TemplateTreeProps {
  nodes: TemplateTreeNode[];
  selectedId?: string;
  onSelect: (template: TemplateFile) => void;
}

export function TemplateTree({ nodes, selectedId, onSelect }: TemplateTreeProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    [] // All collapsed by default
  );

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'xml':
        return <FileCode className="h-4 w-4 text-[var(--accent-500)]" />;
      case 'json':
        return <FileJson className="h-4 w-4 text-[var(--mint-500)]" />;
      case 'js':
        return <FileText className="h-4 w-4 text-[var(--warning-light0)]" />;
      case 'yaml':
      case 'yml':
        return <FileText className="h-4 w-4 text-[var(--sky-500)]" />;
      default:
        return <FileText className="h-4 w-4 text-[var(--text-secondary)]" />;
    }
  };

  return (
    <Accordion
      type="multiple"
      value={expandedCategories}
      onValueChange={setExpandedCategories}
      className="space-y-1"
    >
      {nodes.map((node) => (
        <AccordionItem
          key={node.id}
          value={node.id}
          className="border-none"
        >
          <AccordionTrigger className="py-2 px-3 rounded-md hover:bg-[var(--bg-tertiary)] hover:no-underline text-sm font-medium text-[var(--text-primary)] [&[data-state=open]>svg]:rotate-90">
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-[var(--accent-500)]" />
              <span>{node.name}</span>
              <span className="text-xs text-[var(--text-muted)]">
                ({node.children?.length || 0})
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-0 pt-1">
            <div className="ml-2 space-y-0.5">
              {node.children?.map((child) => (
                <button
                  key={child.id}
                  onClick={() => child.template && onSelect(child.template)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors",
                    selectedId === child.id
                      ? "bg-[var(--accent-200)] text-[var(--accent-700)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {getFileIcon(child.name)}
                  <span className="truncate flex-1">{child.name}</span>
                </button>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
