import React from 'react';
import { CustomerVoucherDTO } from '../types/voucherTypes';
import { formatCurrency, formatWeight } from '../lib/utils';

interface CustomerVoucherProps {
  dto: CustomerVoucherDTO;
  id?: string;
}

export function CustomerVoucher({ dto, id = 'customer-voucher-a4' }: CustomerVoucherProps) {
  const { identity, items = [], collectionSummary = [] } = dto;
  const isDistribution = dto.type === 'DISTRIBUTE_TO_SHOP';

  const formattedDate = dto.date
    ? new Date(dto.date).toLocaleDateString('ar-EG', {
        year: 'numeric', month: '2-digit', day: '2-digit',
      })
    : '';
  const formattedTime = dto.date
    ? new Date(dto.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    : '';

  const footerNote = identity.footer_note || 'سند إلكتروني صادر من النظام ولا يحتاج إلى توقيع.';
  const logoSrc = identity.logo_url || '/default-logo.svg';

  /* ─── shared style tokens ─── */
  const S = {
    page:      { width: '210mm', minHeight: '297mm', padding: '12mm 14mm', boxSizing: 'border-box' as const, fontSize: '10pt', fontFamily: 'Cairo, Tajawal, Arial, sans-serif', direction: 'rtl' as const, color: '#1a1a2e', background: '#fff', display: 'flex', flexDirection: 'column' as const },
    gold:      '#C88918',
    dark:      '#0F1B33',
    muted:     '#667085',
    border:    '1px solid #E2E8F0',
    borderGold:'1.5px solid #E49A0A',
    mono:      { fontFamily: "'Courier New', monospace", fontVariantNumeric: 'tabular-nums' as const },
  };

  return (
    <div id={id} style={S.page}>

      {/* ══════════ HEADER ══════════ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8mm', paddingBottom: '6mm', borderBottom: `2.5px solid ${S.dark}`, marginBottom: '7mm' }}>
        <img src={logoSrc} alt="شعار"
          style={{ width: '20mm', height: '20mm', objectFit: 'contain', flexShrink: 0, borderRadius: '3mm' }}
          onError={e => { (e.target as HTMLImageElement).src = '/default-logo.svg'; }} />
        <div style={{ flex: 1, textAlign: 'right' }}>
          <div style={{ fontSize: '16pt', fontWeight: 900, color: S.dark, letterSpacing: '-0.3px' }}>
            {identity.brand_name}
          </div>
          {identity.activity_description && (
            <div style={{ fontSize: '9pt', color: S.muted, marginTop: '1mm' }}>
              {identity.activity_description}
            </div>
          )}
          <div style={{ fontSize: '10pt', fontWeight: 700, marginTop: '1mm', color: '#333' }}>
            {identity.distributor_name}
          </div>
        </div>
        {/* Contact pills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5mm', alignItems: 'flex-start', fontSize: '8.5pt', color: '#444' }}>
          {identity.primary_phone && <span>📞 {identity.primary_phone}</span>}
          {identity.secondary_phone && <span>📞 {identity.secondary_phone}</span>}
          {identity.whatsapp_number && <span>💬 {identity.whatsapp_number}</span>}
          {identity.address && <span>📍 {identity.address}</span>}
        </div>
      </div>

      {/* ══════════ TITLE BANNER ══════════ */}
      <div style={{ textAlign: 'center', marginBottom: '6mm' }}>
        <div style={{
          display: 'inline-block',
          background: S.dark,
          color: '#fff',
          padding: '2.5mm 14mm',
          borderRadius: '6mm',
          fontSize: '13pt',
          fontWeight: 900,
          letterSpacing: '0.5px',
        }}>
          {isDistribution ? 'سند توزيع بضاعة' : 'سند قبض وتحصيل'}
        </div>
      </div>

      {/* ══════════ META INFO GRID ══════════ */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '2.5mm', marginBottom: '7mm',
        background: '#F8FAFC', borderRadius: '4mm', padding: '5mm 6mm',
        border: S.border,
      }}>
        <MetaBlock label="رقم السند" value={dto.voucherNumber} accent />
        <MetaBlock label="التاريخ" value={`${formattedDate}  ${formattedTime}`} />
        <MetaBlock label="اسم العميل / المحل" value={dto.customerName} bold />
        {dto.customerPhone && <MetaBlock label="الهاتف" value={dto.customerPhone} />}
        {dto.customerAddress && (
          <div style={{ gridColumn: '1 / -1' }}>
            <MetaBlock label="العنوان" value={dto.customerAddress} />
          </div>
        )}
      </div>

      {/* ══════════ DISTRIBUTION ITEMS TABLE ══════════ */}
      {isDistribution && items.length > 0 && (
        <div style={{ marginBottom: '7mm', borderRadius: '3mm', overflow: 'hidden', border: S.border }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
            <thead>
              <tr style={{ background: S.dark, color: '#fff' }}>
                {['الصنف', 'الموديل', 'العيار', 'الوزن الصافي', 'القطع', 'أجرة الجرام', 'إجمالي الأجور'].map(h => (
                  <th key={h} style={{ padding: '3mm 3.5mm', textAlign: 'right', fontWeight: 700, fontSize: '8.5pt', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#F8FAFC', borderBottom: '1px solid #EEF2F8' }}>
                  <td style={{ padding: '3mm 3.5mm', fontWeight: 600 }}>{item.category || '—'}</td>
                  <td style={{ padding: '3mm 3.5mm', ...S.mono, color: '#555' }}>{item.modelCode || '—'}</td>
                  <td style={{ padding: '3mm 3.5mm', fontWeight: 700, textAlign: 'center' }}>{item.karat}</td>
                  <td style={{ padding: '3mm 3.5mm', ...S.mono, fontWeight: 800, color: S.gold, textAlign: 'center' }}>
                    {formatWeight(item.netWeight)} جم
                  </td>
                  <td style={{ padding: '3mm 3.5mm', ...S.mono, textAlign: 'center' }}>{item.count ?? '—'}</td>
                  <td style={{ padding: '3mm 3.5mm', ...S.mono, textAlign: 'center', color: '#555' }}>
                    {formatCurrency(item.shopWagePerGram)}
                  </td>
                  <td style={{ padding: '3mm 3.5mm', ...S.mono, fontWeight: 800, textAlign: 'center', color: S.dark }}>
                    {formatCurrency(item.totalShopWage)} ر.ي
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ══════════ COLLECTION ITEMS ══════════ */}
      {!isDistribution && collectionSummary.length > 0 && (
        <div style={{ marginBottom: '7mm', border: S.border, borderRadius: '3mm', overflow: 'hidden' }}>
          <div style={{ background: S.dark, color: '#fff', padding: '2.5mm 4mm', fontWeight: 700, fontSize: '9pt' }}>
            تفاصيل التحصيل
          </div>
          {collectionSummary.map((item, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '2.5mm 4mm', background: i % 2 === 0 ? '#fff' : '#F8FAFC',
              borderBottom: '1px solid #EEF2F8', fontSize: '9.5pt',
            }}>
              {item.laborCashAmount != null && (
                <>
                  <span style={{ color: '#555' }}>تحصيل أجور — {item.paymentMethod === 'TRANSFER' ? 'تحويل بنكي' : 'نقدي'}</span>
                  <span style={{ ...S.mono, fontWeight: 800, color: '#16a34a' }}>{formatCurrency(item.laborCashAmount)} ر.ي</span>
                </>
              )}
              {item.scrapGoldWeight != null && (
                <>
                  <span style={{ color: '#555' }}>ذهب كسر — عيار {item.scrapGoldKarat}</span>
                  <span style={{ ...S.mono, fontWeight: 800, color: S.gold }}>{formatWeight(item.scrapGoldWeight)} جم</span>
                </>
              )}
              {item.goldSettlementWeight != null && (
                <>
                  <span style={{ color: '#555' }}>تسوية ذهب نقدًا</span>
                  <span style={{ ...S.mono, fontWeight: 800 }}>
                    {formatWeight(item.goldSettlementWeight)} جم / {formatCurrency(item.goldSettlementCash ?? 0)} ر.ي
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ══════════ SUMMARY BOX ══════════ */}
      <div style={{ marginBottom: '7mm', border: S.borderGold, borderRadius: '4mm', overflow: 'hidden' }}>
        <div style={{ background: S.gold, color: '#fff', padding: '2.5mm 5mm', fontWeight: 900, fontSize: '9.5pt' }}>
          ملخص السند
        </div>
        <div style={{ padding: '4mm 5mm', background: '#FFFBF0' }}>
          {/* Main totals */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3mm', marginBottom: '4mm' }}>
            {isDistribution && dto.totalWeight != null && (
              <SummaryCard label="إجمالي الوزن الصافي" value={`${formatWeight(dto.totalWeight)} جم`} />
            )}
            {isDistribution && dto.totalPieces != null && dto.totalPieces > 0 && (
              <SummaryCard label="إجمالي القطع" value={`${dto.totalPieces} قطعة`} />
            )}
            {isDistribution && dto.totalShopWages != null && (
              <SummaryCard label="إجمالي الأجور المطلوبة" value={`${formatCurrency(dto.totalShopWages)} ر.ي`} highlight />
            )}
          </div>
          {/* Balance movement */}
          <div style={{ borderTop: `1px dashed ${S.gold}`, paddingTop: '3mm' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '2mm', alignItems: 'center', fontSize: '9pt' }}>
              <BalanceCol label="الرصيد السابق (أجور)" value={`${formatCurrency(dto.previousLaborBalance ?? 0)} ر.ي`} />
              <div style={{ textAlign: 'center', color: S.muted, fontSize: '8pt' }}>
                {isDistribution ? `＋ ${formatCurrency(dto.totalShopWages ?? 0)} ر.ي` : ''}
              </div>
              <BalanceCol label="الرصيد الجديد (أجور)" value={`${formatCurrency(dto.newLaborBalance ?? 0)} ر.ي`} bold />
            </div>
            {dto.previousGoldBalance != null && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '2mm', alignItems: 'center', marginTop: '2mm', fontSize: '9pt' }}>
                <BalanceCol label={`رصيد الذهب السابق (${dto.previousGoldKarat})`} value={`${formatWeight(dto.previousGoldBalance)} جم`} />
                <div style={{ textAlign: 'center', color: S.muted, fontSize: '8pt' }}>
                  {isDistribution ? `＋ ${formatWeight(dto.totalWeight ?? 0)} جم` : ''}
                </div>
                <BalanceCol label={`رصيد الذهب الجديد (${dto.previousGoldKarat})`} value={`${formatWeight(dto.newGoldBalance ?? 0)} جم`} bold />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* ══════════ FOOTER ══════════ */}
      <div style={{ borderTop: '1px solid #DDE4EC', paddingTop: '4mm', textAlign: 'center', fontSize: '8pt', color: '#999', marginTop: '6mm' }}>
        {footerNote}
      </div>
    </div>
  );
}

/* ─── Helper sub-components ─── */
function MetaBlock({ label, value, accent, bold }: { label: string; value: string; accent?: boolean; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5mm' }}>
      <span style={{ fontSize: '7.5pt', color: '#999', fontWeight: 600 }}>{label}</span>
      <span style={{
        fontFamily: accent ? "'Courier New', monospace" : undefined,
        fontWeight: (accent || bold) ? 800 : 500,
        fontSize: accent ? '10.5pt' : '9.5pt',
        color: accent ? '#0F1B33' : '#222',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </span>
    </div>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      background: highlight ? '#0F1B33' : '#fff',
      border: highlight ? 'none' : '1px solid #E2E8F0',
      borderRadius: '3mm', padding: '2.5mm 3mm', textAlign: 'center',
    }}>
      <div style={{ fontSize: '7.5pt', color: highlight ? 'rgba(255,255,255,0.7)' : '#888', marginBottom: '1mm' }}>{label}</div>
      <div style={{ fontFamily: "'Courier New', monospace", fontWeight: 800, fontSize: '10pt', fontVariantNumeric: 'tabular-nums', color: highlight ? '#FFD700' : '#0F1B33' }}>
        {value}
      </div>
    </div>
  );
}

function BalanceCol({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: '7.5pt', color: '#888' }}>{label}</div>
      <div style={{ fontFamily: "'Courier New', monospace", fontWeight: bold ? 800 : 500, fontSize: '9.5pt', fontVariantNumeric: 'tabular-nums', color: bold ? '#0F1B33' : '#555' }}>
        {value}
      </div>
    </div>
  );
}
