import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  RotateCcw, 
  History, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  ShieldCheck,
  FileJson,
  Calendar,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useAppStore } from '../lib/useAppStore';
import { BackupSnapshot } from '../lib/storage';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSeedConfirm?: () => void;
}

export function BackupRestoreModal({ isOpen, onClose, onOpenSeedConfirm }: BackupRestoreModalProps) {
  const { 
    getSnapshots, 
    restoreSnapshot, 
    exportBackup, 
    importBackup, 
    undoPreDemoSeed,
    workshops,
    shops,
    inventory,
    transactions
  } = useAppStore();

  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);
  const [activeTab, setActiveTab] = useState<'RESTORE' | 'EXPORT' | 'IMPORT'>('RESTORE');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSnapshots(getSnapshots());
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExport = async () => {
    try {
      setIsProcessing(true);
      const jsonString = await exportBackup();
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `aurum_gold_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMessage({ text: 'تم تصدير وحفظ ملف النسخة الاحتياطية بنجاح على جهازك.', type: 'success' });
    } catch (e: any) {
      setStatusMessage({ text: 'فشل التصدير: ' + (e?.message || 'خطأ غير معروف'), type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsProcessing(true);
        const content = event.target?.result as string;
        const result = await importBackup(content);
        if (result.success) {
          setStatusMessage({ 
            text: `تم استرجاع البيانات بنجاح! (${result.counts.workshops} ورش، ${result.counts.shops} محلات، ${result.counts.inventory} دفعات مخزون، ${result.counts.transactions} حركات).`, 
            type: 'success' 
          });
          setSnapshots(getSnapshots());
        } else {
          setStatusMessage({ text: result.message, type: 'error' });
        }
      } catch (err: any) {
        setStatusMessage({ text: 'فشل قراءة الملف: ' + err.message, type: 'error' });
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
  };

  const handleRestoreSnapshot = async (snapId: string) => {
    try {
      setIsProcessing(true);
      const success = await restoreSnapshot(snapId);
      if (success) {
        setStatusMessage({ text: 'تم استرجاع النسخة المحددة بنجاح!', type: 'success' });
        setSnapshots(getSnapshots());
      } else {
        setStatusMessage({ text: 'تعذر استرجاع النسخة المحددة', type: 'error' });
      }
    } catch (e: any) {
      setStatusMessage({ text: 'خطأ أثناء الاسترجاع: ' + e.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickUndoPreDemo = async () => {
    try {
      setIsProcessing(true);
      const success = await undoPreDemoSeed();
      if (success) {
        setStatusMessage({ text: 'تم التراجع واسترجاع بياناتك السابقة بنجاح!', type: 'success' });
        setSnapshots(getSnapshots());
      } else {
        setStatusMessage({ text: 'لم يتم العثور على نسخة سابقة مسجلة في المتصفح.', type: 'error' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const preDemoSnapshot = snapshots.find(s => s.isPreDemoSeed);

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#091225]/70 backdrop-blur-xs" 
        onClick={onClose} 
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl z-10 overflow-hidden border border-[#DDE4EC] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#0F1B33] text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF7E5] text-[#C88918] flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">مركز إدارة واسترجاع البيانات والنسخ الاحتياطي</h3>
              <p className="text-[11px] text-slate-300">
                استرجاع بياناتك السابقة، تصدير ملفات الأمان، وإدارة النسخ التلقائية
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Database Summary Bar */}
        <div className="bg-[#F8FAFC] border-b border-[#DDE4EC] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-700">
          <div className="flex items-center gap-1.5 text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>البيانات الحالية بالنظام:</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="bg-white px-2 py-0.5 rounded-lg border border-slate-200">{workshops.length} ورش</span>
            <span className="bg-white px-2 py-0.5 rounded-lg border border-slate-200">{shops.length} محلات</span>
            <span className="bg-white px-2 py-0.5 rounded-lg border border-slate-200">{inventory.length} دفعة مخزون</span>
            <span className="bg-white px-2 py-0.5 rounded-lg border border-slate-200">{transactions.length} حركة</span>
          </div>
        </div>

        {/* Status Alert */}
        {statusMessage && (
          <div className={`m-4 mb-0 p-3 rounded-2xl border flex items-center gap-2.5 text-xs font-bold ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-blue-50 text-blue-900 border-blue-200'
          }`}>
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-[#DDE4EC] px-4 pt-3 gap-2 bg-[#F3F6FA] shrink-0">
          <button
            onClick={() => setActiveTab('RESTORE')}
            className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'RESTORE'
                ? 'border-[#E49A0A] text-[#091225]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>سجل النسخ التلقائية ({snapshots.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('EXPORT')}
            className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'EXPORT'
                ? 'border-[#E49A0A] text-[#091225]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير نسخة (JSON)</span>
          </button>

          <button
            onClick={() => setActiveTab('IMPORT')}
            className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'IMPORT'
                ? 'border-[#E49A0A] text-[#091225]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>استيراد ملف نسخة</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: RESTORE FROM SNAPSHOTS */}
          {activeTab === 'RESTORE' && (
            <div className="space-y-3.5">
              {/* Emergency Undo Pre-Demo Banner */}
              {preDemoSnapshot && (
                <div className="bg-[#FFF7E5] border-2 border-[#E49A0A] rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#E49A0A] text-[#091225] flex items-center justify-center font-bold shrink-0 mt-0.5">
                        <RotateCcw className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#091225]">
                          توجد نسخة احتياطية محفوظة قبل تحميل البيانات التجريبية!
                        </h4>
                        <p className="text-xs text-slate-700 mt-1">
                          تم التقاط نسخة أمان تلقائياً بتاريخ ({new Date(preDemoSnapshot.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}) تضم:
                          <span className="font-bold mr-1">
                            {preDemoSnapshot.counts.workshops} ورش، {preDemoSnapshot.counts.shops} محلات، {preDemoSnapshot.counts.inventory} دفعة، {preDemoSnapshot.counts.transactions} حركة.
                          </span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleQuickUndoPreDemo}
                      disabled={isProcessing}
                      className="bg-[#0F1B33] hover:bg-[#091225] text-white px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#E49A0A]" />
                      <span>استرجاع بياناتي الآن</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700">النسخ الاحتياطية التلقائية المحفوظة في المتصفح</h4>
                <span className="text-[11px] text-slate-500">يحفظ النظام نسخاً قبل أي استبدال أو تعديل</span>
              </div>

              {snapshots.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-xs">
                  <History className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
                  <p>لا توجد نسخ احتياطية مسجلة بعد في ذاكرة المتصفح.</p>
                  <p className="text-[10px] text-slate-400 mt-1">يتم إنشاء النسخ تلقائياً عند إضافة حركات أو قبل تحميل البيانات التجريبية.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {snapshots.map((snap) => {
                    const dateObj = new Date(snap.createdAt);
                    const formattedDate = dateObj.toLocaleDateString('ar-YE', { year: 'numeric', month: 'short', day: 'numeric' });
                    const formattedTime = dateObj.toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' });

                    return (
                      <div 
                        key={snap.id} 
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          snap.isPreDemoSeed 
                            ? 'bg-amber-50/70 border-amber-300' 
                            : 'bg-white border-[#DDE4EC] hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            snap.isPreDemoSeed ? 'bg-[#E49A0A] text-[#091225]' : 'bg-slate-100 text-slate-700'
                          }`}>
                            <History className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900">{snap.label}</span>
                              {snap.isPreDemoSeed && (
                                <span className="px-2 py-0.5 rounded-md bg-[#FFF7E5] text-[#C88918] border border-[#E49A0A]/40 text-[10px] font-bold">
                                  قبل التجريبي
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-1 font-mono">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {formattedDate} - {formattedTime}
                              </span>
                              <span>•</span>
                              <span className="font-bold text-slate-700">
                                {snap.counts.workshops} ورش | {snap.counts.shops} محلات | {snap.counts.inventory} مخزون | {snap.counts.transactions} حركات
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRestoreSnapshot(snap.id)}
                          disabled={isProcessing}
                          className="self-end sm:self-auto py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-[#DDE4EC] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
                        >
                          <RotateCcw className="w-3 h-3 text-[#C88918]" />
                          <span>استرجاع هذه النسخة</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXPORT JSON */}
          {activeTab === 'EXPORT' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-950 space-y-2">
                <div className="font-bold text-sm flex items-center gap-2 text-blue-900">
                  <Download className="w-4 h-4 text-blue-700" />
                  <span>تصدير نسخة احتياطية كاملة إلى ملف</span>
                </div>
                <p className="text-blue-800 leading-relaxed">
                  يسمح لك تصدير النسخة الاحتياطية بحفظ كامل بيانات الورش، المحلات، أوزان المخزون، والسندات المحاسبية في ملف آمن (`.json`) يمكنك الاحتفاظ به على جهازك أو نقله لجهاز آخر.
                </p>
              </div>

              <div className="card-base p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <FileJson className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-900">ملف قاعدة البيانات الشامل</h5>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {workshops.length} ورش، {shops.length} محلات، {inventory.length} دفعات، {transactions.length} حركة
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleExport}
                  disabled={isProcessing}
                  className="btn-gold px-5 py-2.5 text-xs flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center"
                >
                  <Download className="w-4 h-4" />
                  <span>تنزيل ملف النسخة الاحتياطية</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: IMPORT JSON */}
          {activeTab === 'IMPORT' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-950 space-y-2">
                <div className="font-bold text-sm flex items-center gap-2 text-amber-900">
                  <Upload className="w-4 h-4 text-amber-700" />
                  <span>استيراد واسترجاع من ملف نسخة احتياطية</span>
                </div>
                <p className="text-amber-800 leading-relaxed">
                  اختر ملف النسخة الاحتياطية (`.json`) الذي قمت بتصديره سابقاً. سيتم استرجاع كافة السجلات بدقة متناهية، كما سيتم أخذ نسخة أمان احتياطية تلقائية من بياناتك الحالية قبل الاستبدال.
                </p>
              </div>

              <div className="border-2 border-dashed border-[#DDE4EC] rounded-2xl p-6 text-center hover:border-[#E49A0A] transition-colors bg-[#F8FAFC]">
                <input 
                  type="file" 
                  accept=".json" 
                  id="backup-file-input"
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
                <label 
                  htmlFor="backup-file-input"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#C88918] flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-[#0F1B33] block">اضغط لاختيار ملف النسخة الاحتياطية (.json)</span>
                    <span className="text-[10px] text-slate-500">أو اسحب الملف وأفلته هنا</span>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#DDE4EC] bg-[#F8FAFC] flex justify-between items-center shrink-0">
          {onOpenSeedConfirm && (
            <button
              onClick={() => {
                onClose();
                onOpenSeedConfirm();
              }}
              className="text-xs text-slate-600 hover:text-[#0F1B33] font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C88918]" />
              <span>تحميل بيانات تجريبية</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer transition-colors ml-auto"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
