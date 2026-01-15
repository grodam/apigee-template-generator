import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isValidPath, normalizePath } from '../../utils/pathAnalyzer';

interface AuthorizedPathsEditorProps {
  paths: string[];
  onChange: (paths: string[]) => void;
  suggestedPaths?: string[];
  disabled?: boolean;
  placeholder?: string;
}

export const AuthorizedPathsEditor: React.FC<AuthorizedPathsEditorProps> = ({
  paths,
  onChange,
  suggestedPaths = [],
  disabled = false,
  placeholder = '/api/resource/**'
}) => {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input and already selected paths
  const filteredSuggestions = suggestedPaths.filter(
    path => !paths.includes(path) && path.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddPath = (path: string) => {
    const normalizedPath = normalizePath(path.trim());

    if (!normalizedPath) {
      setError(t('validation.pathCannotBeEmpty', 'Path cannot be empty'));
      return;
    }

    if (!isValidPath(normalizedPath)) {
      setError(t('validation.invalidPathFormat', 'Invalid path format. Must start with /'));
      return;
    }

    if (paths.includes(normalizedPath)) {
      setError(t('validation.pathAlreadyAdded', 'Path already added'));
      return;
    }

    setError(null);
    onChange([...paths, normalizedPath]);
    setInputValue('');
    setShowSuggestions(false);
  };

  const handleRemovePath = (pathToRemove: string) => {
    if (disabled) return;
    onChange(paths.filter(p => p !== pathToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      handleAddPath(inputValue);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleInputFocus = () => {
    if (filteredSuggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setError(null);
    if (e.target.value && filteredSuggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleSuggestionClick = (path: string) => {
    handleAddPath(path);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="space-y-2">
      {/* Path Tags */}
      <div className="flex flex-wrap gap-2 min-h-[32px]">
        {paths.map((path) => (
          <span
            key={path}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 text-xs font-mono rounded",
              "bg-[var(--swiss-gray-100)] text-[var(--swiss-gray-700)]",
              "border border-[var(--swiss-gray-200)]",
              disabled && "opacity-50"
            )}
          >
            {path}
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemovePath(path)}
                className="ml-1 hover:text-[var(--swiss-black)] transition-colors"
                aria-label={`Remove ${path}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
      </div>

      {/* Input for adding new paths */}
      {!disabled && (
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={handleInputFocus}
                placeholder={placeholder}
                className={cn(
                  "w-full bg-transparent border-b-2 py-2 text-sm font-mono focus:outline-none",
                  error
                    ? "border-red-500"
                    : "border-[var(--swiss-gray-300)] focus:border-[var(--swiss-black)]"
                )}
              />

              {/* Suggestions dropdown */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-[var(--swiss-white)] border border-[var(--swiss-gray-200)] rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {filteredSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full px-3 py-2 text-left text-sm font-mono hover:bg-[var(--swiss-gray-50)] transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => inputValue.trim() && handleAddPath(inputValue)}
              disabled={!inputValue.trim()}
              className={cn(
                "p-2 rounded transition-colors",
                inputValue.trim()
                  ? "bg-[var(--swiss-black)] text-[var(--swiss-white)] hover:bg-[var(--swiss-gray-800)]"
                  : "bg-[var(--swiss-gray-200)] text-[var(--swiss-gray-400)] cursor-not-allowed"
              )}
              aria-label="Add path"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
              <AlertCircle className="h-3 w-3" />
              {error}
            </div>
          )}
        </div>
      )}

      {/* Help text */}
      <p className="text-[10px] text-[var(--swiss-gray-400)]">
        Use <code className="bg-[var(--swiss-gray-100)] px-1">/**</code> for wildcard matching (e.g., /api/users/**)
      </p>
    </div>
  );
};

export default AuthorizedPathsEditor;
