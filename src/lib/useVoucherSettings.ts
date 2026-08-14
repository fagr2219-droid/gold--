import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';
import {
  VoucherSettings,
  VoucherIdentitySnapshot,
  VoucherPdfRecord,
  DEFAULT_VOUCHER_SETTINGS,
} from '../types/voucherTypes';

const LOCAL_CACHE_KEY = 'aurum_voucher_settings_cache';

function toIdentitySnapshot(s: VoucherSettings): VoucherIdentitySnapshot {
  return {
    distributor_name: s.distributor_name,
    brand_name: s.brand_name,
    activity_description: s.activity_description,
    logo_url: s.logo_url ?? null,
    primary_phone: s.primary_phone ?? null,
    secondary_phone: s.secondary_phone ?? null,
    whatsapp_number: s.whatsapp_number ?? null,
    address: s.address ?? null,
    footer_note: s.footer_note ?? null,
  };
}

export function useVoucherSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<VoucherSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [usingCache, setUsingCache] = useState(false);

  // Track if we have a confirmed Supabase record
  const hasDbRecord = useRef(false);

  const loadFromCache = useCallback((): VoucherSettings | null => {
    try {
      const raw = localStorage.getItem(LOCAL_CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  const saveToCache = useCallback((s: VoucherSettings) => {
    try {
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(s));
    } catch {}
  }, []);

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setUsingCache(false);

    try {
      const { data, error: fetchError } = await supabase
        .from('voucher_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // Real error (not "no rows")
        throw fetchError;
      }

      if (data) {
        hasDbRecord.current = true;
        const s = data as VoucherSettings;
        setSettings(s);
        saveToCache(s);
      } else {
        // No record yet – use defaults
        hasDbRecord.current = false;
        const defaults = { ...DEFAULT_VOUCHER_SETTINGS };
        setSettings(defaults);
        saveToCache(defaults);
      }
    } catch (err: any) {
      // Fallback to cache if offline
      const cached = loadFromCache();
      if (cached) {
        setSettings(cached);
        setUsingCache(true);
      } else {
        setSettings({ ...DEFAULT_VOUCHER_SETTINGS });
      }
      setError('تعذّر الاتصال بالخادم، يتم استخدام آخر هوية محفوظة.');
    }

    setLoading(false);
  }, [user, loadFromCache, saveToCache]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = useCallback(async (updated: VoucherSettings): Promise<boolean> => {
    if (!user) return false;
    setSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      const payload = {
        ...updated,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };
      delete (payload as any).id;
      delete (payload as any).created_at;

      const { error: upsertError } = await supabase
        .from('voucher_settings')
        .upsert({ ...payload, user_id: user.id }, {
          onConflict: 'user_id',
        });

      if (upsertError) throw upsertError;

      hasDbRecord.current = true;
      setSettings(updated);
      saveToCache(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      return true;
    } catch (err: any) {
      setError('فشل الحفظ: ' + (err?.message || 'خطأ غير معروف'));
      return false;
    } finally {
      setSaving(false);
    }
  }, [user, saveToCache]);

  // Upload logo to Supabase Storage
  const uploadLogo = useCallback(async (file: File): Promise<string | null> => {
    if (!user) return null;

    // Validate file
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      setError('نوع الملف غير مدعوم. استخدم PNG أو JPG أو WebP أو SVG');
      return null;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('حجم الملف يتجاوز 2 MB');
      return null;
    }

    const ext = file.name.split('.').pop();
    const path = `${user.id}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('brand-assets')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setError('فشل رفع الشعار: ' + uploadError.message);
      return null;
    }

    const { data } = supabase.storage.from('brand-assets').getPublicUrl(path);
    return data?.publicUrl ?? null;
  }, [user]);

  // Delete logo
  const deleteLogo = useCallback(async (): Promise<boolean> => {
    if (!user || !settings?.logo_url) return false;
    const ext = settings.logo_url.split('.').pop()?.split('?')[0] ?? 'png';
    const path = `${user.id}/logo.${ext}`;
    await supabase.storage.from('brand-assets').remove([path]);
    return true;
  }, [user, settings]);

  // Get PDF archive record for a transaction
  const getPdfRecord = useCallback(async (transactionId: string): Promise<VoucherPdfRecord | null> => {
    if (!user) return null;
    const { data } = await supabase
      .from('voucher_pdfs')
      .select('*')
      .eq('user_id', user.id)
      .eq('transaction_id', transactionId)
      .single();
    return data as VoucherPdfRecord | null;
  }, [user]);

  // Archive PDF
  const archivePdf = useCallback(async (
    transactionId: string,
    voucherNumber: string,
    pdfBlob: Blob,
    identityAtIssue: VoucherIdentitySnapshot,
  ): Promise<string | null> => {
    if (!user) return null;

    // Check if already archived
    const existing = await getPdfRecord(transactionId);
    if (existing) return existing.storage_path;

    const path = `${user.id}/${voucherNumber.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('voucher-pdfs')
      .upload(path, pdfBlob, { contentType: 'application/pdf', upsert: false });

    if (uploadError && uploadError.message !== 'The resource already exists') {
      console.error('Archive PDF error:', uploadError);
      return null;
    }

    // Save record
    await supabase.from('voucher_pdfs').upsert({
      user_id: user.id,
      transaction_id: transactionId,
      voucher_number: voucherNumber,
      storage_path: path,
      identity_snapshot: identityAtIssue,
    }, { onConflict: 'user_id,transaction_id' });

    return path;
  }, [user, getPdfRecord]);

  // Get signed URL for archived PDF
  const getArchivedPdfUrl = useCallback(async (storagePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from('voucher-pdfs')
      .createSignedUrl(storagePath, 3600); // 1 hour
    if (error) return null;
    return data?.signedUrl ?? null;
  }, []);

  const getIdentitySnapshot = useCallback((): VoucherIdentitySnapshot => {
    const s = settings ?? DEFAULT_VOUCHER_SETTINGS;
    return toIdentitySnapshot(s);
  }, [settings]);

  return {
    settings,
    loading,
    saving,
    error,
    saveSuccess,
    usingCache,
    fetchSettings,
    saveSettings,
    uploadLogo,
    deleteLogo,
    getPdfRecord,
    archivePdf,
    getArchivedPdfUrl,
    getIdentitySnapshot,
  };
}
