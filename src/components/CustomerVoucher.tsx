import React from 'react';
import { CustomerVoucherDTO, CustomerVoucherItemDTO } from '../types/voucherTypes';
import { formatCurrency, formatWeight } from '../lib/utils';

interface CustomerVoucherProps {
  dto: CustomerVoucherDTO;
  id?: string;
}

/* ─── Design tokens ─────────────────────────────────────────────────── */
const C = {
  navy:       '#1a2e4a',   // كحلي — خطوط الجدول والرأس
  navyDark:   '#0f1e31',   // كحلي داكن — رأس العمود
  gold:       '#B8860B',   // ذهبي للعنوان الرئيسي
  goldLight:  '#FDF6E3',   // خلفية صف الإجمالي
  goldBorder: '#D4A017',   // إطار ذهبي خفيف
  text:       '#111827',   // نص رئيسي
  textMuted:  '#4B5563',   // نص ثانوي
  bg:         '#ffffff',
  rowAlt:     '#F8FAFE',   // صفوف متبادلة
  border:     '1px solid #1a2e4a',
  borderLight:'1px solid #d1d8e0',
};

/* ─── Shared cell style ──────────────────────────────────────────────── */
const TD = (extra?: React.CSSProperties): React.CSSProperties => ({
  padding: '3px 5px',
  borderRight:  C.border,
  borderBottom: C.border,
  fontSize:     '8.5pt',
  verticalAlign:'middle',
  color:        C.text,
  lineHeight:   1.35,
  ...extra,
});

const TH = (extra?: React.CSSProperties): React.CSSProperties => ({
  ...TD(extra),
  background:  C.navyDark,
  color:       '#ffffff',
  fontWeight:  700,
  textAlign:   'center',
  whiteSpace:  'nowrap' as const,
  fontSize:    '8pt',
  padding:     '4px 5px',
});

/* ─── Column definitions ─────────────────────────────────────────────── */
const COLS = [
  { label: 'م',               width: '4%',  align: 'center' as const },
  { label: 'كود الصنف',       width: '10%', align: 'center' as const },
  { label: 'اسم الصنف',       width: '24%', align: 'right'  as const },
  { label: 'الموديل',         width: '10%', align: 'center' as const },
  { label: 'العيار',          width: '6%',  align: 'center' as const },
  { label: 'القطع',           width: '6%',  align: 'center' as const },
  { label: 'الوزن الصافي جم', width: '13%', align: 'center' as const },
  { label: 'أجرة الجرام',     width: '12%', align: 'center' as const },
  { label: 'إجمالي الأجور',   width: '15%', align: 'center' as const },
];

/* ════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════════════ */
export function CustomerVoucher({ dto, id = 'customer-voucher-a4' }: CustomerVoucherProps) {
  const { identity, items = [], collectionSummary = [] } = dto;
  const isDistribution = dto.type === 'DISTRIBUTE_TO_SHOP';

  /* dates */
  const dateObj = dto.date ? new Date(dto.date) : new Date();
  const fDate   = dateObj.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const fDateLong = dateObj.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  const fTime   = dateObj.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  const logoSrc  = identity.logo_url || '/default-logo.svg';
  const footerTxt = 'سند إلكتروني صادر من النظام، وطباعته أو استلامه يُعدّ اعتمادًا للعملية ولا يحتاج إلى توقيع.';

  /* totals */
  const totalPieces    = items.reduce((s, i) => s + (i.count ?? 0), 0);
  const totalNetWeight = items.reduce((s, i) => s + i.netWeight, 0);
  const totalWages     = items.reduce((s, i) => s + i.totalShopWage, 0);

  /* page wrapper */
  const pageStyle: React.CSSProperties = {
    width:       '210mm',
    minHeight:   '297mm',
    padding:     '8mm 10mm 6mm',
    boxSizing:   'border-box',
    fontFamily:  "'Cairo', 'Noto Kufi Arabic', 'Arial', sans-serif",
    direction:   'rtl',
    color:       C.text,
    background:  C.bg,
    display:     'flex',
    flexDirection:'column',
    gap:         '5mm',
  };

  return (
    <div id={id} style={pageStyle}>

      {/* ══════════════════════════════════════════
          رأس السند
      ══════════════════════════════════════════ */}
      <div style={{ borderBottom: `2px solid ${C.navy}`, paddingBottom: '4mm' }}>

        {/* صف الشعار والمعلومات */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6mm' }}>

          {/* شعار + بيانات النشاط */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <img
              src={logoSrc}
              alt="شعار"
              style={{ height: '18mm', maxWidth: '35mm', objectFit: 'contain', display: 'block', margin: '0 auto 2mm' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div style={{ fontSize: '13pt', fontWeight: 900, color: C.navyDark, lineHeight: 1.2 }}>
              {identity.brand_name}
            </div>
            {identity.activity_description && (
              <div style={{ fontSize: '8.5pt', color: C.textMuted, marginTop: '0.5mm' }}>
                {identity.activity_description}
              </div>
            )}
            <div style={{ fontSize: '8.5pt', fontWeight: 700, color: C.navyDark, marginTop: '0.5mm' }}>
              {identity.distributor_name}
            </div>
          </div>

          {/* بيانات التواصل — يمين */}
          <div style={{ minWidth: '55mm', fontSize: '8pt', color: C.textMuted, lineHeight: 1.7, textAlign: 'right' }}>
            {identity.primary_phone   && <div>هاتف: {identity.primary_phone}</div>}
            {identity.secondary_phone && <div>هاتف: {identity.secondary_phone}</div>}
            {identity.whatsapp_number && <div>واتس: {identity.whatsapp_number}</div>}
            {identity.address         && <div>العنوان: {identity.address}</div>}
          </div>

        </div>

        {/* عنوان السند */}
        <div style={{
          textAlign:    'center',
          marginTop:    '3mm',
          padding:      '2mm 0',
          borderTop:    `1px solid ${C.goldBorder}`,
          borderBottom: `1px solid ${C.goldBorder}`,
        }}>
          <span style={{
            fontSize:   '13pt',
            fontWeight: 900,
            color:      C.gold,
            letterSpacing: '0.5px',
          }}>
            {isDistribution ? 'سند توزيع بضاعة' : 'سند قبض وتحصيل'}
          </span>
        </div>

        {/* معلومات السند */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '3mm', fontSize: '8.5pt' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', padding: '1.5mm 0' }}>
                <InfoRow label="رقم السند" value={dto.voucherNumber} mono />
              </td>
              <td style={{ width: '50%', padding: '1.5mm 0', borderRight: C.borderLight }}>
                <InfoRow label="التاريخ" value={`${fDateLong}  —  ${fTime}`} />
              </td>
            </tr>
            <tr>
              <td style={{ padding: '1.5mm 0' }}>
                <InfoRow label="اسم العميل / المحل" value={dto.customerName} bold />
              </td>
              <td style={{ padding: '1.5mm 0', borderRight: C.borderLight }}>
                {dto.customerPhone && <InfoRow label="هاتف العميل" value={dto.customerPhone} />}
              </td>
            </tr>
            {dto.customerAddress && (
              <tr>
                <td colSpan={2} style={{ padding: '1.5mm 0' }}>
                  <InfoRow label="العنوان" value={dto.customerAddress} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ══════════════════════════════════════════
          جدول الأصناف — سند التوزيع
      ══════════════════════════════════════════ */}
      {isDistribution && items.length > 0 && (
        <div style={{ pageBreakInside: 'auto' }}>
          <table
            style={{
              width:           '100%',
              borderCollapse:  'collapse',
              borderTop:       C.border,
              borderLeft:      C.border,
              tableLayout:     'fixed',
              pageBreakInside: 'auto',
            }}
          >
            {/* رأس الجدول — يتكرر عند تعدد الصفحات */}
            <thead style={{ display: 'table-header-group' }}>
              <tr>
                {COLS.map(col => (
                  <th key={col.label} style={TH({ width: col.width, textAlign: col.align })}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {items.map((item, i) => (
                <tr
                  key={i}
                  style={{
                    background:      i % 2 === 0 ? C.bg : C.rowAlt,
                    pageBreakInside: 'avoid',
                  }}
                >
                  {/* م */}
                  <td style={TD({ textAlign: 'center', fontWeight: 700, color: C.textMuted })}>
                    {i + 1}
                  </td>
                  {/* كود الصنف */}
                  <td style={TD({ textAlign: 'center', fontFamily: 'monospace', fontSize: '8pt', color: C.textMuted })}>
                    {item.modelCode || '—'}
                  </td>
                  {/* اسم الصنف */}
                  <td style={TD({ textAlign: 'right', fontWeight: 600, wordBreak: 'break-word' })}>
                    {item.category || '—'}
                  </td>
                  {/* الموديل */}
                  <td style={TD({ textAlign: 'center', fontFamily: 'monospace', fontSize: '8pt' })}>
                    {item.modelCode || '—'}
                  </td>
                  {/* العيار */}
                  <td style={TD({ textAlign: 'center', fontWeight: 700 })}>
                    {item.karat}
                  </td>
                  {/* القطع */}
                  <td style={TD({ textAlign: 'center', fontFamily: 'monospace' })}>
                    {item.count ?? '—'}
                  </td>
                  {/* الوزن الصافي */}
                  <td style={TD({ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 })}>
                    {formatWeight(item.netWeight)}
                  </td>
                  {/* أجرة الجرام */}
                  <td style={TD({ textAlign: 'center', fontFamily: 'monospace' })}>
                    {formatCurrency(item.shopWagePerGram)}
                  </td>
                  {/* إجمالي الأجور */}
                  <td style={TD({ textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: C.navyDark })}>
                    {formatCurrency(item.totalShopWage)}
                  </td>
                </tr>
              ))}

              {/* ─── صف الإجمالي ─── */}
              <tr style={{ background: C.goldLight, pageBreakInside: 'avoid' }}>
                <td colSpan={5} style={TD({ textAlign: 'center', fontWeight: 900, fontSize: '9pt', color: C.navy, background: C.goldLight, borderTop: `2px solid ${C.goldBorder}` })}>
                  الإجمالي
                </td>
                <td style={TD({ textAlign: 'center', fontFamily: 'monospace', fontWeight: 900, fontSize: '9pt', color: C.navy, background: C.goldLight, borderTop: `2px solid ${C.goldBorder}` })}>
                  {totalPieces > 0 ? totalPieces : '—'}
                </td>
                <td style={TD({ textAlign: 'center', fontFamily: 'monospace', fontWeight: 900, fontSize: '9pt', color: C.navy, background: C.goldLight, borderTop: `2px solid ${C.goldBorder}` })}>
                  {formatWeight(totalNetWeight)}
                </td>
                <td style={TD({ textAlign: 'center', background: C.goldLight, borderTop: `2px solid ${C.goldBorder}` })}>
                  —
                </td>
                <td style={TD({ textAlign: 'center', fontFamily: 'monospace', fontWeight: 900, fontSize: '9.5pt', color: C.navy, background: C.goldLight, borderTop: `2px solid ${C.goldBorder}` })}>
                  {formatCurrency(totalWages)} ر.ي
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ══════════════════════════════════════════
          سند القبض — بنود التحصيل
      ══════════════════════════════════════════ */}
      {!isDistribution && collectionSummary.length > 0 && (
        <div>
          <div style={{
            background:  C.navyDark,
            color:       '#fff',
            padding:     '3px 8px',
            fontSize:    '8.5pt',
            fontWeight:  700,
            borderTop:   C.border,
            borderRight: C.border,
            borderLeft:  C.border,
          }}>
            تفاصيل التحصيل
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', borderLeft: C.border }}>
            <tbody>
              {collectionSummary.map((item, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? C.bg : C.rowAlt }}>
                  <td style={TD({ width: '60%', textAlign: 'right', fontWeight: 600 })}>
                    {item.laborCashAmount       != null && `تحصيل أجور — ${item.paymentMethod === 'تحويل بنكي' ? 'تحويل بنكي' : 'نقدي'}`}
                    {item.scrapGoldWeight       != null && `ذهب كسر — عيار ${item.scrapGoldKarat}`}
                    {item.goldSettlementWeight  != null && 'تسوية ذهب نقدًا'}
                  </td>
                  <td style={TD({ textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: C.navyDark })}>
                    {item.laborCashAmount       != null && `${formatCurrency(item.laborCashAmount)} ر.ي`}
                    {item.scrapGoldWeight       != null && `${formatWeight(item.scrapGoldWeight)} جم`}
                    {item.goldSettlementWeight  != null && `${formatWeight(item.goldSettlementWeight)} جم / ${formatCurrency(item.goldSettlementCash ?? 0)} ر.ي`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ══════════════════════════════════════════
          الملخص المالي
      ══════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5mm', marginTop: '1mm' }}>

        {/* ─ ملخص الأجور ─ */}
        <SummarySection title="ملخص الأجور">
          <SummaryRow label="الرصيد السابق للأجور"
            value={`${formatCurrency(dto.previousLaborBalance ?? 0)} ر.ي`} />
          <SummaryRow label={isDistribution ? 'قيمة هذا السند' : 'المُحصَّل في هذا السند'}
            value={`${formatCurrency(isDistribution ? (dto.totalShopWages ?? 0) : ((dto.previousLaborBalance ?? 0) - (dto.newLaborBalance ?? 0)))} ر.ي`}
            sign={isDistribution ? '+' : '-'} />
          <SummaryRow label="الرصيد المستحق الجديد"
            value={`${formatCurrency(dto.newLaborBalance ?? 0)} ر.ي`}
            bold highlight />
        </SummarySection>

        {/* ─ ملخص الذهب ─ */}
        {dto.previousGoldBalance != null && (
          <SummarySection title={`ملخص الذهب (عيار ${dto.previousGoldKarat ?? 21})`}>
            <SummaryRow label="رصيد الذهب السابق"
              value={`${formatWeight(dto.previousGoldBalance)} جم`} />
            <SummaryRow label={isDistribution ? 'الموزع في هذا السند' : 'المسترجع / الكسر'}
              value={`${formatWeight(isDistribution ? (dto.totalWeight ?? 0) : Math.abs((dto.previousGoldBalance ?? 0) - (dto.newGoldBalance ?? 0)))} جم`}
              sign={isDistribution ? '+' : '-'} />
            <SummaryRow label="رصيد الذهب الجديد"
              value={`${formatWeight(dto.newGoldBalance ?? 0)} جم`}
              bold highlight />
          </SummarySection>
        )}

      </div>

      {/* spacer */}
      <div style={{ flex: 1 }} />

      {/* ══════════════════════════════════════════
          تذييل السند
      ══════════════════════════════════════════ */}
      <div style={{
        borderTop:  `1.5px solid ${C.navy}`,
        paddingTop: '3mm',
        display:    'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize:   '7.5pt',
        color:      C.textMuted,
      }}>
        <span style={{ fontStyle: 'italic', maxWidth: '140mm', lineHeight: 1.4 }}>
          {footerTxt}
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: '7pt', textAlign: 'left', flexShrink: 0 }}>
          {fDate}<br />{dto.voucherNumber}
        </span>
      </div>

    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   مكوّنات مساعدة
════════════════════════════════════════════════════════════════════════ */

function InfoRow({ label, value, mono, bold }: {
  label: string; value: string; mono?: boolean; bold?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '2mm', fontSize: '8.5pt' }}>
      <span style={{ color: C.textMuted, flexShrink: 0, minWidth: '28mm' }}>{label}:</span>
      <span style={{
        fontWeight:        bold ? 800 : 600,
        fontFamily:        mono ? 'monospace' : undefined,
        color:             C.navyDark,
        fontVariantNumeric:'tabular-nums',
      }}>
        {value}
      </span>
    </div>
  );
}

function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: C.border, borderRadius: '1mm', overflow: 'hidden' }}>
      <div style={{
        background:  C.navyDark,
        color:       '#fff',
        padding:     '3px 8px',
        fontSize:    '8pt',
        fontWeight:  700,
      }}>
        {title}
      </div>
      <div style={{ padding: '0' }}>
        {children}
      </div>
    </div>
  );
}

function SummaryRow({ label, value, bold, highlight, sign }: {
  label: string; value: string; bold?: boolean; highlight?: boolean; sign?: '+' | '-';
}) {
  return (
    <div style={{
      display:        'flex',
      justifyContent: 'space-between',
      alignItems:     'center',
      padding:        '3px 8px',
      borderBottom:   C.borderLight,
      background:     highlight ? C.goldLight : undefined,
      fontSize:       '8pt',
    }}>
      <span style={{ color: highlight ? C.navyDark : C.textMuted, fontWeight: highlight ? 700 : 400 }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2mm' }}>
        {sign && (
          <span style={{
            fontSize:   '9pt',
            fontWeight: 800,
            color:      sign === '+' ? '#1d4ed8' : '#b91c1c',
            fontFamily: 'monospace',
          }}>
            {sign}
          </span>
        )}
        <span style={{
          fontFamily:        'monospace',
          fontWeight:        bold ? 900 : 600,
          fontSize:          bold ? '9pt' : '8.5pt',
          color:             highlight ? C.navy : C.navyDark,
          fontVariantNumeric:'tabular-nums',
        }}>
          {value}
        </span>
      </div>
    </div>
  );
}
