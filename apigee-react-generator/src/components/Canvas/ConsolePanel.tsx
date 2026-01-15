import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Cloud, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConsoleMessage {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface ConsolePanelProps {
  messages: ConsoleMessage[];
  onGenerate: () => void;
  onDownloadZip: () => void;
  onPushToAzure: () => void;
  isGenerating: boolean;
  isPushing: boolean;
  canGenerate: boolean;
  canDownload: boolean;
  canPush: boolean;
}

export const ConsolePanel: React.FC<ConsolePanelProps> = ({
  messages,
  onGenerate,
  onDownloadZip,
  onPushToAzure,
  isGenerating,
  isPushing,
  canGenerate,
  canDownload,
  canPush,
}) => {
  const { t } = useTranslation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added (only if there are messages)
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <section className="max-w-6xl mx-auto px-8 pb-10">
      {/* Section Header - Same style as SwissCard */}
      <div className="bg-[var(--swiss-white)] border-t-2 border-[var(--swiss-black)] swiss-card-shadow px-6 py-5 mb-6">
        <div className="flex items-center gap-6">
          <span className="text-3xl font-black text-[var(--swiss-gray-200)] font-sans">
            05
          </span>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-[var(--swiss-black)]">
              {t('canvas.export.title', 'Export & Deployment')}
            </h2>
            <p className="text-xs text-[var(--swiss-gray-500)] font-mono mt-1">
              {t('canvas.export.subtitle', 'Generate and push your API proxy')}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Generate API */}
        <button
          onClick={onGenerate}
          disabled={!canGenerate || isGenerating}
          className={cn(
            "flex items-center justify-center gap-3 px-6 py-4",
            "text-[10px] font-black uppercase tracking-widest",
            "transition-all duration-150 group",
            canGenerate && !isGenerating
              ? "bg-[var(--swiss-black)] text-[var(--swiss-white)] hover:bg-[var(--swiss-gray-800)]"
              : "bg-[var(--swiss-gray-300)] text-[var(--swiss-white)] cursor-not-allowed"
          )}
        >
          {isGenerating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
          {t('canvas.export.generate', 'Generate API')}
        </button>

        {/* Download ZIP */}
        <button
          onClick={onDownloadZip}
          disabled={!canDownload}
          className={cn(
            "flex items-center justify-center gap-3 px-6 py-4",
            "text-[10px] font-black uppercase tracking-widest",
            "border-2 transition-all duration-150 group",
            canDownload
              ? "bg-[var(--swiss-white)] text-[var(--swiss-black)] border-[var(--swiss-black)] hover:bg-[var(--swiss-black)] hover:text-[var(--swiss-white)]"
              : "bg-[var(--swiss-gray-100)] text-[var(--swiss-gray-400)] border-[var(--swiss-gray-300)] cursor-not-allowed"
          )}
        >
          <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
          {t('canvas.export.downloadZip', 'Download ZIP')}
        </button>

        {/* Push to Azure DevOps */}
        <button
          onClick={onPushToAzure}
          disabled={!canPush || isPushing}
          className={cn(
            "flex items-center justify-center gap-3 px-6 py-4",
            "text-[10px] font-black uppercase tracking-widest",
            "border-2 transition-all duration-150",
            canPush && !isPushing
              ? "bg-[var(--swiss-white)] text-[var(--swiss-black)] border-[var(--swiss-black)] hover:bg-[var(--swiss-black)] hover:text-[var(--swiss-white)]"
              : "bg-[var(--swiss-gray-100)] text-[var(--swiss-gray-400)] border-[var(--swiss-gray-300)] cursor-not-allowed"
          )}
        >
          {isPushing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Cloud className="w-5 h-5" />
          )}
          {t('canvas.export.pushToAzure', 'Push to Azure DevOps')}
        </button>
      </div>

      {/* Console Output */}
      <div className="bg-black text-white font-mono text-[11px] leading-6 p-6 swiss-card-shadow">
        {/* Console Header */}
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-800">
          <span className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-gray-500 uppercase text-[10px] font-bold tracking-widest">
            Console Output
          </span>
        </div>

        {/* Messages */}
        <div className="space-y-1 h-32 overflow-auto">
          {messages.length === 0 ? (
            <div className="flex gap-4">
              <span className="text-gray-600 w-16 flex-shrink-0">
                {new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className="text-gray-300">
                &gt; {t('canvas.console.ready', 'READY FOR CONFIGURATION...')}
              </span>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className="flex gap-4">
                <span className="text-gray-600 w-16 flex-shrink-0">
                  {msg.timestamp}
                </span>
                <span className={cn(
                  msg.type === 'success' && 'text-green-400',
                  msg.type === 'warning' && 'text-yellow-400',
                  msg.type === 'error' && 'text-red-400',
                  msg.type === 'info' && 'text-gray-300'
                )}>
                  &gt; {msg.message}
                </span>
              </div>
            ))
          )}
          {/* Auto-scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Cursor */}
        <div className="mt-4 pt-3 border-t border-gray-800">
          <span className="text-white animate-pulse">_</span>
        </div>
      </div>
    </section>
  );
};
