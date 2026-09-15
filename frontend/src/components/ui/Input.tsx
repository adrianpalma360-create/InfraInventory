import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-[#94A3B8] mb-1.5">
            {label} {props.required && <span className="text-[#EF4444]">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full bg-[#0F141B] border rounded-lg px-3.5 py-2 text-sm text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:ring-1 transition-colors ${
              icon ? 'pl-9' : ''
            } ${
              error
                ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]'
                : 'border-[#252D38] focus:border-[#3B82F6] focus:ring-[#3B82F6]'
            } ${className}`}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-[#EF4444]">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-[#64748B]">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
