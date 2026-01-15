import React from 'react';

interface AppIconProps {
  className?: string;
}

export const AppIcon: React.FC<AppIconProps> = ({ className = "h-5 w-5" }) => (
  <svg
    viewBox="0 0 512 512"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ shapeRendering: 'geometricPrecision' }}
  >
    <defs>
      <linearGradient id="appIconAccentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f59e0b"/>
        <stop offset="100%" stopColor="#d97706"/>
      </linearGradient>
    </defs>

    {/* Background hexagon */}
    <polygon
      points="256,20 461,135 461,377 256,492 51,377 51,135"
      fill="none"
      stroke="currentColor"
      strokeWidth="8"
      opacity="0.2"
    />

    {/* Inner hexagon outline */}
    <polygon
      points="256,80 401,165 401,347 256,432 111,347 111,165"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      opacity="0.15"
    />

    {/* Network lines */}
    <g stroke="currentColor" strokeWidth="4" opacity="0.25">
      <line x1="111" y1="256" x2="401" y2="256"/>
      <line x1="256" y1="80" x2="256" y2="256"/>
      <line x1="256" y1="80" x2="401" y2="165"/>
      <line x1="256" y1="80" x2="111" y2="165"/>
      <line x1="256" y1="432" x2="256" y2="256"/>
      <line x1="256" y1="432" x2="401" y2="347"/>
      <line x1="256" y1="432" x2="111" y2="347"/>
      <line x1="111" y1="165" x2="111" y2="347"/>
      <line x1="401" y1="165" x2="401" y2="347"/>
      <line x1="111" y1="165" x2="256" y2="256"/>
      <line x1="401" y1="165" x2="256" y2="256"/>
      <line x1="111" y1="347" x2="256" y2="256"/>
      <line x1="401" y1="347" x2="256" y2="256"/>
    </g>

    {/* Accent lines */}
    <g stroke="url(#appIconAccentGrad)" strokeWidth="6" strokeLinecap="round">
      <line x1="256" y1="80" x2="401" y2="165"/>
      <line x1="401" y1="165" x2="401" y2="256"/>
      <line x1="401" y1="256" x2="256" y2="256"/>
      <line x1="256" y1="256" x2="111" y2="347"/>
      <line x1="111" y1="347" x2="256" y2="432"/>
    </g>

    {/* Network nodes */}
    <g fill="currentColor">
      <circle cx="256" cy="256" r="20" fill="url(#appIconAccentGrad)"/>
      <circle cx="256" cy="80" r="14"/>
      <circle cx="256" cy="432" r="14"/>
      <circle cx="111" cy="165" r="12"/>
      <circle cx="401" cy="165" r="12"/>
      <circle cx="111" cy="347" r="12"/>
      <circle cx="401" cy="347" r="12"/>
      <circle cx="111" cy="256" r="10"/>
      <circle cx="401" cy="256" r="10" fill="url(#appIconAccentGrad)"/>
    </g>
  </svg>
);
