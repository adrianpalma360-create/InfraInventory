import React from 'react';
import { MachineStatus, PortState } from '../../types/index.js';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'yellow' | 'red' | 'blue' | 'cyan' | 'gray' | 'purple';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'gray',
  size = 'md',
  dot = false,
  className = '',
}) => {
  const variantStyles = {
    green: 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30',
    yellow: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30',
    red: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30',
    blue: 'bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30',
    cyan: 'bg-[#06B6D4]/15 text-[#06B6D4] border-[#06B6D4]/30',
    purple: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    gray: 'bg-[#252D38]/60 text-[#94A3B8] border-[#252D38]',
  };

  const dotColors = {
    green: 'bg-[#22C55E]',
    yellow: 'bg-[#F59E0B]',
    red: 'bg-[#EF4444]',
    blue: 'bg-[#3B82F6]',
    cyan: 'bg-[#06B6D4]',
    purple: 'bg-purple-400',
    gray: 'bg-[#64748B]',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} ${
            variant === 'green' ? 'animate-pulse' : ''
          }`}
        />
      )}
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: MachineStatus }> = ({ status }) => {
  switch (status) {
    case 'ONLINE':
      return (
        <Badge variant="green" dot>
          ONLINE
        </Badge>
      );
    case 'WARNING':
      return (
        <Badge variant="yellow" dot>
          WARNING
        </Badge>
      );
    case 'OFFLINE':
      return (
        <Badge variant="red" dot>
          OFFLINE
        </Badge>
      );
    case 'UNCHECKED':
    default:
      return (
        <Badge variant="gray" dot>
          UNCHECKED
        </Badge>
      );
  }
};

export const PortStateBadge: React.FC<{ state: PortState }> = ({ state }) => {
  switch (state) {
    case 'OPEN':
      return <Badge variant="green" size="sm">OPEN</Badge>;
    case 'FILTERED':
      return <Badge variant="yellow" size="sm">FILTERED</Badge>;
    case 'CLOSED':
      return <Badge variant="red" size="sm">CLOSED</Badge>;
    default:
      return <Badge variant="gray" size="sm">{state}</Badge>;
  }
};
