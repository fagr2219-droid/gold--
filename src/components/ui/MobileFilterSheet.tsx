import React from 'react';
import { Filter, X, RotateCcw } from 'lucide-react';
import { Modal } from './Modal';

interface MobileFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onReset?: () => void;
  activeCount?: number;
  title?: string;
  children: React.ReactNode;
}

export function MobileFilterSheet({
  isOpen,
  onClose,
  onReset,
  activeCount = 0,
  title = 'تصفية البيانات',
  children
}: MobileFilterSheetProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={activeCount > 0 ? `${activeCount} فلاتر نشطة` : 'تخصيص شروط العرض'}
      icon={<Filter className="w-5 h-5 text-[#C88918]" />}
      maxWidth="md"
      actions={
        <div className="flex w-full gap-2">
          {onReset && (
            <button
              onClick={() => {
                onReset();
                onClose();
              }}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              إعادة ضبط
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl btn-gold text-xs font-bold flex items-center justify-center cursor-pointer"
          >
            تطبيق الفلاتر
          </button>
        </div>
      }
    >
      <div className="space-y-4 py-1">
        {children}
      </div>
    </Modal>
  );
}
