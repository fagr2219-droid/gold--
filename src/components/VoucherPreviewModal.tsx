import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CustomerVoucher } from './CustomerVoucher';
import { CustomerVoucher58mm } from './CustomerVoucher58mm';
import { CustomerVoucher200x100 } from './CustomerVoucher200x100';
import { CustomerVoucherDTO, VoucherIdentitySnapshot } from '../types/voucherTypes';
import { useVoucherSettings } from '../lib/useVoucherSettings';
import {
  X, Download, Share2, Printer, Loader2, AlertCircle, CheckCircle, Archive
} from 'lucide-react';
import { cn } from '../lib/utils';

interface VoucherPreviewModalProps {
  /** Raw transaction ID */
  transactionId: string;
  /** Pre-built DTO (supply from parent using buildDistributionVoucherDTO etc.) */
  dto: CustomerVoucherDTO;
  onClose: () => void;
}

export function VoucherPreviewModal({ transactionId, dto, onClose }: VoucherPreviewModalProps) {
  const { archivePdf, getPdfRecord, getArchivedPdfUrl, getIdentitySnapshot } = useVoucherSettings();

  const [viewType, setViewType] = useState<'A4' | '58mm' | '200x100'>('A4');
  const [generating, setGenerating] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [archivedUrl, setArchivedUrl] = useState<string | null>(null);
  const [isArchived, setIsArchived] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const voucher58Ref = useRef<HTMLDivElement>(null);

  // Check if already archived on mount
  useEffect(() => {
    (async () => {
      const record = await getPdfRecord(transactionId);
      if (record) {
        setIsArchived(true);
        const url = await getArchivedPdfUrl(record.storage_path);
        setArchivedUrl(url);
      }
    })();
  }, [transactionId, getPdfRecord, getArchivedPdfUrl]);

  // Generate PDF using html2canvas + jsPDF
  const generatePdf = useCallback(async (): Promise<Blob | null> => {
    setGenerating(true);
    setStatusMsg({ type: 'info', text: 'جاري إنشاء PDF...' });
    try {
      const [html2canvas, { jsPDF }] = await Promise.all([
        import('html2canvas').then(m => m.default),
        import('jspdf'),
      ]);

      let targetId = 'customer-voucher-a4';
      if (viewType === '200x100') targetId = 'customer-voucher-200x100';
      if (viewType === '58mm') targetId = 'customer-voucher-58mm';

      const el = document.getElementById(targetId);
      if (!el) throw new Error('لم يتم العثور على عنصر السند');

      const canvas = await html2canvas(el, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: el.scrollWidth,
        height: el.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      
      let orientation: 'p' | 'l' = 'p';
      let format: string | number[] = 'a4';

      if (viewType === '200x100') {
        orientation = 'l';
        format = [200, 100];
      } else if (viewType === '58mm') {
        orientation = 'p';
        // Calculate height based on ratio for 58mm
        const ratio = canvas.height / canvas.width;
        format = [58, 58 * ratio];
      }

      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: format,
      });

      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      
      // For A4 we might need multi-page, for others usually single page fits.
      if (viewType !== 'A4') {
         pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
      } else {
        const ratio = canvas.height / canvas.width;
        const imgW = pdfW;
        const imgH = pdfW * ratio;
        if (imgH <= pdfH) {
          pdf.addImage(imgData, 'PNG', 0, 0, imgW, imgH);
        } else {
          // Multi-page
          let yPos = 0;
          while (yPos < imgH) {
            if (yPos > 0) pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, -yPos, imgW, imgH);
            yPos += pdfH;
          }
        }
      }

      const blob = pdf.output('blob');
      setPdfBlob(blob);
      setStatusMsg(null);
      return blob;
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'فشل إنشاء PDF: ' + err.message });
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  const getOrGeneratePdf = useCallback(async (): Promise<Blob | null> => {
    // Generate fresh PDF based on current viewType always
    return await generatePdf();
  }, [generatePdf, viewType]);

  // Download PDF
  const handleDownload = async () => {
    const blob = await getOrGeneratePdf();
    if (!blob) return;

    const customerName = dto.customerName.replace(/\s+/g, '-').replace(/[^a-zA-Z\u0621-\u064A0-9-]/g, '');
    const voucherNum = dto.voucherNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
    const filename = `سند-توزيع-${customerName}-${voucherNum}.pdf`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMsg({ type: 'success', text: 'تم تنزيل السند، يمكنك إرساله للعميل.' });
  };

  // Archive + get URL (for re-use)
  const handleArchive = async (): Promise<Blob | null> => {
    if (isArchived && archivedUrl) {
      setStatusMsg({ type: 'info', text: 'السند مؤرشف مسبقاً.' });
      return pdfBlob;
    }
    setArchiving(true);
    const blob = await getOrGeneratePdf();
    if (!blob) { setArchiving(false); return null; }

    const snapshot = getIdentitySnapshot();
    const path = await archivePdf(transactionId, dto.voucherNumber, blob, snapshot);
    if (path) {
      setIsArchived(true);
      const url = await getArchivedPdfUrl(path);
      setArchivedUrl(url);
      setStatusMsg({ type: 'success', text: '✅ تم أرشفة السند في Supabase Storage.' });
    } else {
      setStatusMsg({ type: 'error', text: 'فشل أرشفة السند.' });
    }
    setArchiving(false);
    return blob;
  };

  // Share PDF (mobile Web Share API)
  const handleShare = async () => {
    let blob = await getOrGeneratePdf();
    if (!blob) return;

    // Archive first if not archived
    if (!isArchived) blob = (await handleArchive()) ?? blob;

    const customerName = dto.customerName.replace(/\s+/g, '-');
    const filename = `سند-${customerName}-${dto.voucherNumber}.pdf`;
    const file = new File([blob], filename, { type: 'application/pdf' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename });
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          setStatusMsg({ type: 'error', text: 'فشل المشاركة.' });
        }
      }
    } else {
      // Fallback: download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      setStatusMsg({ type: 'info', text: 'تم تنزيل السند — يمكنك إرساله للعميل يدوياً.' });
    }
  };

  // Print Generic
  const handlePrint = () => {
    const printClass = viewType === 'A4' ? 'printing-a4' 
                     : viewType === '200x100' ? 'printing-200x100' 
                     : 'printing-58mm';
    document.body.classList.add(printClass);
    window.print();
    setTimeout(() => document.body.classList.remove(printClass), 1000);
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-[300] flex items-start justify-center overflow-y-auto p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-4 overflow-hidden">
        {/* Toolbar */}
        <div className="bg-[#0F1B33] text-white p-3 flex items-center justify-between flex-wrap gap-2 no-print">
          <span className="text-sm font-bold flex items-center gap-2">
            <span className="text-[#E49A0A]">سند العميل</span>
            <span className="text-slate-400 text-xs font-mono">#{dto.voucherNumber}</span>
          </span>

          {/* View toggle */}
          <div className="flex bg-white/10 rounded-xl p-0.5 text-xs">
            {(['A4', '200x100', '58mm'] as const).map(t => (
              <button
                key={t}
                onClick={() => setViewType(t)}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer',
                  viewType === t ? 'bg-[#E49A0A] text-[#091225]' : 'text-slate-300 hover:text-white'
                )}
              >
                {t === '200x100' ? '20×10سم' : t}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {isArchived && (
              <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold px-2 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <Archive className="w-3.5 h-3.5" />
                مؤرشف
              </span>
            )}
            {!isArchived && (
              <ActionBtn
                onClick={handleArchive}
                loading={archiving}
                icon={<Archive className="w-4 h-4" />}
                label="أرشفة"
                className="bg-purple-600 hover:bg-purple-500"
              />
            )}
            <ActionBtn
              onClick={handleDownload}
              loading={generating && !pdfBlob}
              icon={<Download className="w-4 h-4" />}
              label="تنزيل PDF"
              className="bg-[#E49A0A] text-[#091225] hover:bg-[#C88918]"
            />
            <ActionBtn
              onClick={handleShare}
              loading={false}
              icon={<Share2 className="w-4 h-4" />}
              label="مشاركة"
              className="bg-emerald-600 hover:bg-emerald-500"
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
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm no-print',
            statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' :
            statusMsg.type === 'error' ? 'bg-red-50 text-red-700' :
            'bg-blue-50 text-blue-700'
          )}>
            {statusMsg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> :
             statusMsg.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> :
             <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
            {statusMsg.text}
          </div>
        )}

        {/* Content */}
        <div className={cn(
          'overflow-auto bg-slate-100 flex justify-center p-6',
          viewType === '58mm' ? 'p-4' : 'p-8'
        )}>
          {/* A4 Voucher */}
          <div className={cn(viewType !== 'A4' && 'hidden', 'voucher-a4-wrapper')}>
            <div className="shadow-xl rounded overflow-hidden">
              <CustomerVoucher dto={dto} id="customer-voucher-a4" />
            </div>
          </div>

          {/* 200×100mm Voucher */}
          <div className={cn(viewType !== '200x100' && 'hidden')}>
            <div className="shadow-xl rounded overflow-hidden inline-block">
              <CustomerVoucher200x100 dto={dto} id="customer-voucher-200x100" />
            </div>
          </div>

          {/* 58mm Voucher */}
          <div className={cn(viewType !== '58mm' && 'hidden', 'voucher-58mm-wrapper')} ref={voucher58Ref}>
            <div className="shadow-xl rounded overflow-hidden inline-block" id="customer-voucher-58mm-wrapper">
              <CustomerVoucher58mm dto={dto} id="customer-voucher-58mm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({
  onClick, loading, icon, label, className
}: {
  onClick: () => void;
  loading: boolean;
  icon: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-white disabled:opacity-50',
        className
      )}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {label}
    </button>
  );
}
