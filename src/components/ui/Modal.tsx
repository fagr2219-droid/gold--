import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  actions?: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  maxWidth = '2xl',
  actions
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-180">
      {/* Opaque Dark Backdrop */}
      <div 
        className="fixed inset-0 bg-[#091225]/60 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Container */}
      <div className={cn(
        "relative w-full bg-white rounded-t-3xl sm:rounded-3xl max-h-[92vh] sm:max-h-[88vh] flex flex-col modal-box z-10 overflow-hidden border border-[#DDE4EC] animate-in slide-in-from-bottom-3 sm:zoom-in-95 duration-180",
        maxWidthClasses[maxWidth]
      )}>
        {/* Handle for Mobile Drag Hint */}
        <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Header with High-Contrast Navy/Gold or Clean Neutral */}
        <div className="p-4 sm:p-5 bg-[#0F1B33] text-white flex justify-between items-center shrink-0 border-b border-white/10">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-10 h-10 rounded-xl bg-[#FFF7E5] text-[#C88918] flex items-center justify-center font-bold shrink-0 shadow-xs">
                {icon}
              </div>
            )}
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white tracking-tight">{title}</h3>
              {subtitle && <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">{subtitle}</p>}
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {children}
        </div>

        {/* Footer Actions if provided */}
        {actions && (
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-[#DDE4EC] flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-2.5 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
