import React from 'react';
import { APP_CONFIG } from '../../config/appConfig.js';
import { Info } from 'lucide-react';
import { NavigationTab } from './Sidebar.js';

interface FooterProps {
  onSelectTab?: (tab: NavigationTab) => void;
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ onSelectTab, className = '' }) => {
  return (
    <footer
      className={`border-t border-[#252D38]/80 bg-[#0F141B]/95 py-2.5 px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#64748B] select-none transition-colors ${className}`}
    >
      {/* Left: App Name & Copyright */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-[#94A3B8] tracking-tight">
          {APP_CONFIG.APP_NAME}
        </span>
        <span className="text-[#252D38] hidden sm:inline">&bull;</span>
        <span className="hidden sm:inline text-[#94A3B8]">
          {APP_CONFIG.APP_COPYRIGHT}
        </span>
      </div>

      {/* Right: Author & About link */}
      <div className="flex items-center gap-3">
        <span className="text-[#64748B] hidden md:flex items-center gap-1">
          Desarrollado por <span className="text-[#94A3B8] font-medium">{APP_CONFIG.APP_AUTHOR}</span>
        </span>

        {onSelectTab && (
          <button
            onClick={() => onSelectTab('about')}
            className="flex items-center gap-1 text-[#94A3B8] hover:text-[#06B6D4] transition-colors py-0.5 px-1.5 rounded hover:bg-[#151B23]"
            title="Información y Acerca de la plataforma"
          >
            <Info className="w-3.5 h-3.5 text-[#06B6D4]" />
            <span className="font-medium">Acerca de</span>
          </button>
        )}
      </div>
    </footer>
  );
};

export default Footer;
