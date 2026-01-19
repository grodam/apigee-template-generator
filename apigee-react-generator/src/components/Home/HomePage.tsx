import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModuleCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ icon, title, description, onClick, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative w-[200px] h-[200px] bg-[var(--swiss-white)] flex flex-col items-center justify-center gap-4",
        "shadow-[var(--swiss-shadow-card)] transition-all duration-200 ease-out",
        "hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:scale-[1.02]",
        "focus:outline-none focus:ring-2 focus:ring-[var(--swiss-black)] focus:ring-offset-2",
        disabled && "opacity-60 cursor-not-allowed hover:scale-100 hover:shadow-[var(--swiss-shadow-card)]"
      )}
    >
      {/* Icon container */}
      <div className="w-12 h-12 bg-[var(--swiss-black)] flex items-center justify-center">
        <div className="text-[var(--swiss-white)]">
          {icon}
        </div>
      </div>

      {/* Title */}
      <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--swiss-black)]">
        {title}
      </span>

      {/* Description tooltip - slides from bottom on hover */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 bg-[var(--swiss-black)] text-[var(--swiss-white)] p-4",
        "transform translate-y-full opacity-0 transition-all duration-200 ease-out",
        "group-hover:translate-y-0 group-hover:opacity-100",
        disabled && "group-hover:translate-y-full group-hover:opacity-0"
      )}>
        <p className="text-[10px] leading-relaxed">
          {description}
        </p>
        {disabled && (
          <span className="block mt-2 text-[9px] uppercase tracking-wider text-[var(--swiss-gray-400)]">
            Coming Soon
          </span>
        )}
      </div>
    </button>
  );
};

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const modules = [
    {
      id: 'proxy-generator',
      icon: <Zap className="h-6 w-6" />,
      title: 'PROXY GENERATOR',
      description: 'Create Apigee proxies from OpenAPI specs with full policy configuration',
      route: '/generator',
      disabled: false,
    },
    {
      id: 'kvm-manager',
      icon: <Database className="h-6 w-6" />,
      title: 'KVM MANAGER',
      description: 'Browse and edit Key-Value Maps by environment and proxy',
      route: '/kvm',
      disabled: false,
    },
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center bg-[var(--swiss-bg-canvas)]">
      {/* Title */}
      <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--swiss-gray-400)] mb-12">
        SELECT A MODULE
      </h2>

      {/* Module cards grid */}
      <div className="flex flex-wrap justify-center gap-8">
        {modules.map((module, index) => (
          <div
            key={module.id}
            className="animate-fade-in-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <ModuleCard
              icon={module.icon}
              title={module.title}
              description={module.description}
              onClick={() => !module.disabled && navigate(module.route)}
              disabled={module.disabled}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
