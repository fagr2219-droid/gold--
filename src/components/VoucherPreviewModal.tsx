import React, { useState, useEffect, useCallback } from 'react';
import { CustomerVoucher } from './CustomerVoucher';
import { CustomerVoucher58mm } from './CustomerVoucher58mm';
import { CustomerVoucher200x100 } from './CustomerVoucher200x100';
import { CustomerVoucherDTO } from '../types/voucherTypes';
import { useVoucherSettings } from '../lib/useVoucherSettings';
import {
  fetchLogoAsDataUrl,
  printVoucherInIframe,
  generateVoucherPdf,
} from '../lib/voucherPrintUtils';
import {
  X, Download, Share2, Printer, Loader2, AlertCircle, CheckCircle, Archive
} from 'lucide-react';
import { cn } from '../lib/utils';

interface VoucherPreviewModalProps {
  transactionId: string;
  dto: CustomerVoucherDTO;
  onClose: () => void;
}

type ViewType = 'A4' | '58mm' | '200x100';

const VIEW_ID_MAP: Record<ViewType, string> = {
  A4:       'customer-voucher-a4',
  '58mm':   'customer-voucher-58mm',
  '200x100':'customer-voucher-200x100',
};

export function VoucherPreviewModal({ transactionId, dto, onClose }: VoucherPreviewModalProps) {
  const { archivePdf, getPdfRecord, getArchivedPdfUrl, getIdentitySnapshot } = useVoucherSettings();

  const [viewType, setViewType] = useState<ViewType>('A4');
  const [generating, setGenerating] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

  // ─── تحويل الشعار إلى data URL عند الفتح ───
  useEffect(() => {
    (async () => {
      const url = dto.identity.logo_url;
      if (url && !url.startsWith('data:')) {
        const dataUrl = await fetchLogoAsDataUrl(url);
        setLogoDataUrl(dataUrl);
      } else if (url) {
        setLogoDataUrl(url);
      }
    })();
  }, [dto.identity.logo_url]);

  // ─── فحص الأرشفة عند الفتح ───
  useEffect(() => {
    (async () => {
      const record = await getPdfRecord(transactionId);
      if (record) setIsArchived(true);
    })();
  }, [transactionId, getPdfRecord]);

  // ═══════════════════════════════════════
  //  تنزيل PDF — ملف مستقل بدون window.print
  // ═══════════════════════════════════════
  const handleDownload = useCallback(async () => {
    setGenerating(true);
    setStatusMsg({ type: 'info', text: 'جاري إنشاء PDF...' });
    try {
      const blob = await generateVoucherPdf(VIEW_ID_MAP[viewType], logoDataUrl);
      if (!blob) throw new Error('فشل إنشاء PDF');

      const customerName = dto.customerName.replace(/\s+/g, '-').replace(/[^a-zA-Z\u0621-\u064A0-9-]/g, '');
      const voucherNum = dto.voucherNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
      const filename = `سند-${customerName}-${voucherNum}.pdf`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMsg({ type: 'success', text: 'تم تنزيل السند بنجاح.' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'فشل إنشاء PDF: ' + err.message });
    } finally {
      setGenerating(false);
    }
  }, [viewType, logoDataUrl, dto]);

  // ═══════════════════════════════════════
  //  طباعة — iframe مستقل بدون PDF
  // ═══════════════════════════════════════
  const handlePrint = useCallback(() => {
    printVoucherInIframe(VIEW_ID_MAP[viewType]);
  }, [viewType]);

  // ═══════════════════════════════════════
  //  أرشفة PDF
  // ═══════════════════════════════════════
  const handleArchive = useCallback(async () => {
    if (isArchived) {
      setStatusMsg({ type: 'info', text: 'السند مؤرشف مسبقاً.' });
      return;
    }
    setArchiving(true);
    setStatusMsg({ type: 'info', text: 'جاري الأرشفة...' });
    try {
      const blob = await generateVoucherPdf(VIEW_ID_MAP[viewType], logoDataUrl);
      if (!blob) throw new Error('فشل إنشاء PDF');

      const snapshot = getIdentitySnapshot();
      const path = await archivePdf(transactionId, dto.voucherNumber, blob, snapshot);
      if (path) {
        setIsArchived(true);
        setStatusMsg({ type: 'success', text: '✅ تم أرشفة السند.' });
      } else {
        throw new Error('فشل حفظ الأرشيف');
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'فشل الأرشفة: ' + err.message });
    } finally {
      setArchiving(false);
    }
  }, [isArchived, viewType, logoDataUrl, transactionId, dto, archivePdf, getIdentitySnapshot]);

  // ═══════════════════════════════════════
  //  مشاركة PDF
  // ═══════════════════════════════════════
  const handleShare = useCallback(async () => {
    setGenerating(true);
    setStatusMsg({ type: 'info', text: 'جاري إنشاء PDF للمشاركة...' });
    try {
      const blob = await generateVoucherPdf(VIEW_ID_MAP[viewType], logoDataUrl);
      if (!blob) throw new Error('فشل إنشاء PDF');

      // أرشفة أولاً إذا لم تتم
      if (!isArchived) {
        const snapshot = getIdentitySnapshot();
        const path = await archivePdf(transactionId, dto.voucherNumber, blob, snapshot);
        if (path) setIsArchived(true);
      }

      const customerName = dto.customerName.replace(/\s+/g, '-');
      const filename = `سند-${customerName}-${dto.voucherNumber}.pdf`;
      const file = new File([blob], filename, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
        setStatusMsg({ type: 'info', text: 'تم تنزيل السند — يمكنك إرساله يدوياً.' });
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setStatusMsg({ type: 'error', text: 'فشل المشاركة: ' + err.message });
      }
    } finally {
      setGenerating(false);
    }
  }, [viewType, logoDataUrl, isArchived, transactionId, dto, archivePdf, getIdentitySnapshot]);

  // ═══════════════════════════════════════
  //  الواجهة
  // ═══════════════════════════════════════
  return (
    <div className="fixed inset-0 bg-black/60 z-[300] flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl my-4 overflow-hidden border border-slate-200">

        {/* ─── شريط الأدوات — كحلي ─── */}
        <div className="bg-[#0F1B33] text-white p-3 flex items-center justify-between flex-wrap gap-2 no-print">
          <span className="text-sm font-bold flex items-center gap-2">
            <span className="text-[#E49A0A]">سند العميل</span>
            <span className="text-slate-400 text-xs font-mono">#{dto.voucherNumber}</span>
          </span>

          {/* تبديل المقاس */}
          <div className="flex bg-white/10 rounded-lg p-0.5 text-xs">
            {(['A4', '200x100', '58mm'] as ViewType[]).map(t => (
              <button
                key={t}
                onClick={() => setViewType(t)}
                className={cn(
                  'px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer',
                  viewType === t ? 'bg-[#E49A0A] text-[#091225]' : 'text-slate-300 hover:text-white'
                )}
              >
                {t === '200x100' ? '20×10سم' : t}
              </button>
            ))}
          </div>

          {/* الأزرار */}
          <div className="flex gap-1.5 flex-wrap">
            {isArchived ? (
              <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold px-2 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <Archive className="w-3.5 h-3.5" />
                مؤرشف
              </span>
            ) : (
              <ActionBtn
                onClick={handleArchive}
                loading={archiving}
                icon={<Archive className="w-4 h-4" />}
                label="أرشفة"
                className="bg-[#1a2e4a] hover:bg-[#0F1B33] border border-slate-500"
              />
            )}
            <ActionBtn
              onClick={handleDownload}
              loading={generating}
              icon={<Download className="w-4 h-4" />}
              label="تنزيل PDF"
              className="bg-[#E49A0A] text-[#091225] hover:bg-[#C88918]"
            />
            <ActionBtn
              onClick={handleShare}
              loading={false}
              icon={<Share2 className="w-4 h-4" />}
              label="مشاركة"
              className="bg-[#1a2e4a] hover:bg-[#0F1B33] border border-slate-500"
            />
            <ActionBtn
              onClick={handlePrint}
              loading={false}
              icon={<Printer className="w-4 h-4" />}
              label={viewType === 'A4' ? 'طباعة A4' : viewType === '200x100' ? 'طباعة 20×10' : 'طباعة 58mm'}
              className="bg-slate-600 hover:bg-slate-500"
            />
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── رسائل الحالة ─── */}
        {statusMsg && (
          <div className={cn(
            'flex items-center gap-2 px-4 py-2 text-xs font-medium no-print border-b',
            statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
            statusMsg.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' :
            'bg-blue-50 text-blue-700 border-blue-100'
          )}>
            {statusMsg.type === 'success' ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> :
             statusMsg.type === 'error' ? <AlertCircle className="w-3.5 h-3.5 shrink-0" /> :
             <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
            {statusMsg.text}
          </div>
        )}

        {/* ─── محتوى المعاينة — خلفية بيضاء ─── */}
        <div className={cn(
          'overflow-auto flex justify-center bg-white border-t border-slate-100',
          viewType === '58mm' ? 'p-4' : 'p-6'
        )}>
          {/* A4 */}
          <div className={cn(viewType !== 'A4' && 'hidden')}>
            <div className="shadow-sm border border-slate-200 rounded overflow-hidden">
              <CustomerVoucher dto={dto} id="customer-voucher-a4" logoDataUrl={logoDataUrl} />
            </div>
          </div>

          {/* 200×100mm */}
          <div className={cn(viewType !== '200x100' && 'hidden')}>
            <div className="shadow-sm border border-slate-200 rounded overflow-hidden inline-block">
              <CustomerVoucher200x100 dto={dto} id="customer-voucher-200x100" logoDataUrl={logoDataUrl} />
            </div>
          </div>

          {/* 58mm */}
          <div className={cn(viewType !== '58mm' && 'hidden')}>
            <div className="shadow-sm border border-slate-200 rounded overflow-hidden inline-block">
              <CustomerVoucher58mm dto={dto} id="customer-voucher-58mm" logoDataUrl={logoDataUrl} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── زر فعل ───
function ActionBtn({
  onClick, loading, icon, label, className
}: {
  onClick: () => void; loading: boolean; icon: React.ReactNode; label: string; className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-white disabled:opacity-50',
        className
      )}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {label}
    </button>
  );
}
