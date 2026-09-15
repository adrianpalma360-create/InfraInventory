import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'cyan';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0B0F14] disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs gap-1.5',
    md: 'px-3.5 py-2 text-sm gap-2',
    lg: 'px-4.5 py-2.5 text-base gap-2.5',
  };

  const variantClasses = {
    primary:
      'bg-[#3B82F6] hover:bg-[#2563EB] text-white border border-[#3B82F6]/50 shadow-sm focus:ring-[#3B82F6]',
    secondary:
      'bg-[#1A212B] hover:bg-[#252D38] text-[#F1F5F9] border border-[#252D38] focus:ring-[#94A3B8]',
    cyan: 'bg-[#06B6D4] hover:bg-[#0891B2] text-[#0B0F14] font-semibold border border-[#06B6D4] shadow-sm focus:ring-[#06B6D4]',
    danger:
      'bg-[#EF4444] hover:bg-[#DC2626] text-white border border-[#EF4444]/50 shadow-sm focus:ring-[#EF4444]',
    ghost:
      'bg-transparent hover:bg-[#1A212B] text-[#94A3B8] hover:text-[#F1F5F9] border border-transparent focus:ring-[#64748B]',
    outline:
      'bg-transparent hover:bg-[#151B23] text-[#F1F5F9] border border-[#252D38] hover:border-[#3B82F6]/50 focus:ring-[#3B82F6]',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        icon
      )}
      {children}
    </button>
  );
};
