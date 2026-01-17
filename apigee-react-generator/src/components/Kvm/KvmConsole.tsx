import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKvmStore } from '@/store/useKvmStore';

interface KvmConsoleProps {
  className?: string;
}

export const KvmConsole: React.FC<KvmConsoleProps> = ({ className }) => {
  const { t } = useTranslation();
  const { consoleMessages, clearConsole } = useKvmStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (consoleMessages.length > 0 && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleMessages]);

  const getTimestamp = (): string => {
    return new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className={cn('bg-black text-white font-mono text-[11px] leading-6', className)}>
      {/* Console Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-gray-500 uppercase text-[10px] font-bold tracking-widest">
            {t('kvm.console.title', 'Console Output')}
          </span>
        </div>
        {consoleMessages.length > 0 && (
          <button
            onClick={clearConsole}
            className="text-gray-600 hover:text-gray-400 transition-colors p-1"
            title={t('kvm.console.clear', 'Clear console')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="px-4 py-3 h-[140px] overflow-auto">
        {consoleMessages.length === 0 ? (
          <div className="flex gap-4">
            <span className="text-gray-600 w-16 flex-shrink-0">{getTimestamp()}</span>
            <span className="text-gray-300">
              &gt; {t('kvm.console.ready', 'READY. Enter organization ID and access token to connect.')}
            </span>
          </div>
        ) : (
          <div className="space-y-1">
            {consoleMessages.map((msg, index) => (
              <div key={index} className="flex gap-4">
                <span className="text-gray-600 w-16 flex-shrink-0">{msg.timestamp}</span>
                <span
                  className={cn(
                    msg.type === 'success' && 'text-green-400',
                    msg.type === 'warning' && 'text-yellow-400',
                    msg.type === 'error' && 'text-red-400',
                    msg.type === 'info' && 'text-gray-300'
                  )}
                >
                  &gt; {msg.message}
                </span>
              </div>
            ))}
            {/* Auto-scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Cursor */}
      <div className="px-4 py-2 border-t border-gray-800">
        <span className="text-white animate-pulse">_</span>
      </div>
    </div>
  );
};
