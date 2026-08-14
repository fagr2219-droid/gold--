import React, { useState, useEffect, useRef } from 'react';
import { useVoucherSettings } from '../lib/useVoucherSettings';
import {
  Save, X, Eye, Upload, Trash2, Phone, MapPin, FileText,
  Printer, Loader2, CheckCircle, AlertCircle, Building2, User
} from 'lucide-react';
import { VoucherSettings, DEFAULT_VOUCHER_SETTINGS } from '../types/voucherTypes';
import { cn } from '../lib/utils';

export default function VoucherSettingsPage() {
  const {
    settings, loading, saving, error, saveSuccess, usingCache,
    saveSettings, uploadLogo, deleteLogo,
  } = useVoucherSettings();

  const [form, setForm] = useState<VoucherSettings>({ ...DEFAULT_VOUCHER_SETTINGS });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showPreviewA4, setShowPreviewA4] = useState(false);
  const [showPreview58, setShowPreview58] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) {
      setForm({ ...settings });
      setLogoPreview(settings.logo_url ?? null);
      setIsDirty(false);
    }
  }, [settings]);

  const handleChange = (field: keyof VoucherSettings, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      alert('نوع الملف غير مدعوم. استخدم PNG أو JPG أو WebP أو SVG');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('حجم الملف يتجاوز 2 MB');
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setIsDirty(true);
  };

  const handleDeleteLogo = async () => {
    if (!confirm('حذف الشعار الحالي والعودة للشعار الافتراضي؟')) return;
    await deleteLogo();
    setLogoFile(null);
    setLogoPreview(null);
    setForm(prev => ({ ...prev, logo_url: null }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    let finalLogoUrl = form.logo_url ?? null;

    // Upload new logo if selected
    if (logoFile) {
      setUploadingLogo(true);
      const url = await uploadLogo(logoFile);
      setUploadingLogo(false);
      if (!url) return; // uploadLogo sets error
      finalLogoUrl = url;
      setLogoFile(null);
    }

    const updated: VoucherSettings = { ...form, logo_url: finalLogoUrl };
    await saveSettings(updated);
    setIsDirty(false);
  };

  const handleCancel = () => {
    if (settings) {
      setForm({ ...settings });
      setLogoPreview(settings.logo_url ?? null);
      setLogoFile(null);
      setIsDirty(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#E49A0A] animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">جاري تحميل إعدادات السند...</p>
        </div>
      </div>
    );
  }

  const currentLogo = logoPreview ?? '/default-logo.svg';

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-16" dir="rtl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FileText className="w-7 h-7 text-[#E49A0A]" />
          بياناتي وهوية السند
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          تُعرض هذه البيانات تلقائياً في رأس كل سند يُصدر للعملاء
        </p>
      </div>

      {/* Cache Warning */}
      {usingCache && (
        <div className="p-3 rounded-xl flex items-center gap-2 text-sm bg-amber-50 border border-amber-200 text-amber-800">
          <AlertCircle className="w-4 h-4 shrink-0" />
          يتم استخدام آخر هوية محفوظة على هذا الجهاز — تعذّر الاتصال بالخادم
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl flex items-center gap-2 text-sm bg-red-50 border border-red-200 text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Success */}
      {saveSuccess && (
        <div className="p-3 rounded-xl flex items-center gap-2 text-sm bg-green-50 border border-green-200 text-green-700">
          <CheckCircle className="w-4 h-4 shrink-0" />
          تم حفظ البيانات بنجاح في Supabase ✅
        </div>
      )}

      {/* Logo Section */}
      <div className="card-base p-5 space-y-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
          <Building2 className="w-4 h-4 text-[#E49A0A]" />
          شعار البراند
        </h3>
        <div className="flex items-center gap-5">
          <div className="w-24 h-24 rounded-2xl border-2 border-[#DDE4EC] bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
            <img
              src={currentLogo}
              alt="شعار البراند"
              className="w-full h-full object-contain p-1"
              onError={(e) => { (e.target as HTMLImageElement).src = '/default-logo.svg'; }}
            />
          </div>
          <div className="space-y-2 flex-1">
            <p className="text-xs text-slate-500">PNG، JPG، WebP، SVG — بحد أقصى 2 MB</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0F1B33] text-white text-xs font-bold hover:bg-[#091225] transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                {logoPreview && logoPreview !== '/default-logo.svg' ? 'استبدال الشعار' : 'رفع شعار'}
              </button>
              {logoPreview && logoPreview !== '/default-logo.svg' && (
                <button
                  onClick={handleDeleteLogo}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors border border-red-200 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  حذف والعودة للافتراضي
                </button>
              )}
            </div>
            {logoFile && (
              <p className="text-xs text-emerald-600 font-medium">✅ تم اختيار: {logoFile.name} — احفظ لرفعه</p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleLogoSelect}
            />
          </div>
        </div>
      </div>

      {/* Identity Fields */}
      <div className="card-base p-5 space-y-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
          <User className="w-4 h-4 text-[#E49A0A]" />
          هوية الموزع والبراند
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="اسم الموزع *" value={form.distributor_name}
            onChange={v => handleChange('distributor_name', v)} required />
          <Field label="اسم البراند *" value={form.brand_name}
            onChange={v => handleChange('brand_name', v)} required />
          <Field label="وصف النشاط" value={form.activity_description ?? ''}
            onChange={v => handleChange('activity_description', v)} className="sm:col-span-2" />
        </div>
      </div>

      {/* Contact Fields */}
      <div className="card-base p-5 space-y-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
          <Phone className="w-4 h-4 text-[#E49A0A]" />
          بيانات التواصل
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="رقم الهاتف الأول" value={form.primary_phone ?? ''}
            onChange={v => handleChange('primary_phone', v)} placeholder="اختياري" />
          <Field label="رقم الهاتف الثاني" value={form.secondary_phone ?? ''}
            onChange={v => handleChange('secondary_phone', v)} placeholder="اختياري" />
          <Field label="رقم واتساب" value={form.whatsapp_number ?? ''}
            onChange={v => handleChange('whatsapp_number', v)} placeholder="اختياري" />
          <Field label="العنوان" value={form.address ?? ''}
            onChange={v => handleChange('address', v)} placeholder="اختياري" />
        </div>
      </div>

      {/* Voucher Footer & Print Size */}
      <div className="card-base p-5 space-y-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
          <Printer className="w-4 h-4 text-[#E49A0A]" />
          إعدادات السند والطباعة
        </h3>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">ملاحظة تذييل السند</label>
          <textarea
            value={form.footer_note ?? ''}
            onChange={e => handleChange('footer_note', e.target.value)}
            placeholder="مثال: سند إلكتروني صادر من النظام ولا يحتاج إلى توقيع."
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl border border-[#DDE4EC] text-sm focus:outline-none focus:ring-2 focus:ring-[#E49A0A]/40 resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">مقاس الطباعة الافتراضي</label>
          <div className="flex gap-3">
            {(['A4', '58mm'] as const).map(size => (
              <button
                key={size}
                onClick={() => { handleChange('default_paper_size', size); }}
                className={cn(
                  'flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all cursor-pointer',
                  form.default_paper_size === size
                    ? 'bg-[#0F1B33] text-white border-[#0F1B33]'
                    : 'bg-white text-slate-600 border-[#DDE4EC] hover:border-[#C88918]'
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleSave}
          disabled={saving || uploadingLogo || !isDirty}
          className="flex items-center gap-2 px-5 py-3 rounded-xl btn-gold text-sm disabled:opacity-50 cursor-pointer"
        >
          {(saving || uploadingLogo) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {uploadingLogo ? 'جاري رفع الشعار...' : saving ? 'جاري الحفظ...' : 'حفظ البيانات'}
        </button>
        {isDirty && (
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-[#DDE4EC] text-sm text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            <X className="w-4 h-4" />
            إلغاء التغييرات
          </button>
        )}
        <button
          onClick={() => setShowPreviewA4(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[#DDE4EC] text-sm text-slate-600 hover:bg-slate-50 cursor-pointer"
        >
          <Eye className="w-4 h-4 text-[#E49A0A]" />
          معاينة A4
        </button>
        <button
          onClick={() => setShowPreview58(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[#DDE4EC] text-sm text-slate-600 hover:bg-slate-50 cursor-pointer"
        >
          <Printer className="w-4 h-4 text-[#E49A0A]" />
          معاينة 58mm
        </button>
      </div>

      {/* Preview Modals */}
      {showPreviewA4 && (
        <VoucherPreviewDemo
          settings={form}
          logoUrl={currentLogo}
          type="A4"
          onClose={() => setShowPreviewA4(false)}
        />
      )}
      {showPreview58 && (
        <VoucherPreviewDemo
          settings={form}
          logoUrl={currentLogo}
          type="58mm"
          onClose={() => setShowPreview58(false)}
        />
      )}
    </div>
  );
}

// Simple field component
function Field({
  label, value, onChange, placeholder, required, className
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-bold text-slate-600 mb-1.5">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? label}
        required={required}
        className="w-full px-3 py-2.5 rounded-xl border border-[#DDE4EC] text-sm focus:outline-none focus:ring-2 focus:ring-[#E49A0A]/40"
      />
    </div>
  );
}

// Demo preview using current form values
function VoucherPreviewDemo({
  settings, logoUrl, type, onClose
}: {
  settings: VoucherSettings; logoUrl: string; type: 'A4' | '58mm'; onClose: () => void;
}) {
  const is58 = type === '58mm';
  return (
    <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4 overflow-y-auto">
      <div className={cn(
        'bg-white rounded-lg shadow-2xl overflow-hidden my-auto',
        is58 ? 'w-[58mm]' : 'w-[210mm] min-h-[150mm]'
      )}>
        <div className="bg-slate-900 text-white p-2 flex justify-between items-center no-print">
          <span className="text-xs font-bold">معاينة {type}</span>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="bg-[#E49A0A] text-[#091225] px-3 py-1 rounded text-xs font-bold cursor-pointer"
            >طباعة</button>
            <button onClick={onClose} className="text-slate-300 hover:text-white cursor-pointer">✕</button>
          </div>
        </div>
        <div className={cn('text-right p-4 font-sans text-slate-900', is58 ? 'text-[9px] p-2' : 'text-sm')} dir="rtl">
          <div className="text-center border-b border-slate-300 pb-3 mb-3">
            <img src={logoUrl} alt="شعار" className={cn('mx-auto mb-2', is58 ? 'w-10 h-10' : 'w-16 h-16')}
              onError={e => { (e.target as HTMLImageElement).src = '/default-logo.svg'; }} />
            <div className={cn('font-black text-[#0F1B33]', is58 ? 'text-[11px]' : 'text-base')}>
              {settings.brand_name}
            </div>
            <div className={cn('text-slate-600', is58 ? 'text-[9px]' : 'text-xs')}>
              {settings.activity_description}
            </div>
            <div className={cn('font-bold', is58 ? 'text-[9px]' : 'text-xs')}>
              {settings.distributor_name}
            </div>
            {settings.primary_phone && (
              <div className={cn('text-slate-600', is58 ? 'text-[9px]' : 'text-xs')}>
                📞 {settings.primary_phone}
              </div>
            )}
          </div>
          <div className="text-center">
            <div className={cn('font-bold border border-slate-300 rounded p-2 inline-block', is58 ? 'text-[10px]' : 'text-sm')}>
              سند توزيع بضاعة — نموذج معاينة
            </div>
          </div>
          <div className={cn('mt-4 text-center text-slate-400 italic', is58 ? 'text-[8px]' : 'text-xs')}>
            {settings.footer_note || 'سند إلكتروني صادر من النظام ولا يحتاج إلى توقيع.'}
          </div>
        </div>
      </div>
    </div>
  );
}
