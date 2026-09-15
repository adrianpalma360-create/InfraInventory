import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary';
  hover?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'primary',
  hover = false,
  onClick,
}) => {
  const bgClass = variant === 'primary' ? 'bg-[#151B23]' : 'bg-[#1A212B]';
  const hoverClass = hover
    ? 'hover:border-[#3B82F6]/50 hover:bg-[#1A212B] transition-all duration-200 cursor-pointer'
    : '';

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-[#252D38] ${bgClass} p-5 ${hoverClass} ${className}`}
    >
      {children}
    </div>
  );
};
