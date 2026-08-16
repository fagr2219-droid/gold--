import React from 'react';
import { CustomerVoucherDTO } from '../types/voucherTypes';
import { formatCurrency, formatWeight } from '../lib/utils';

interface CustomerVoucherProps {
  dto: CustomerVoucherDTO;
  id?: string;
  logoDataUrl?: string | null;
}

/* ═══════════════════════════════════════════════
   CustomerVoucher — A4  (سند محاسبي رسمي — أبيض وأسود)
   نفس روح تصميم 58mm: بدون ألوان، خطوط واضحة فقط
═══════════════════════════════════════════════ */
export function CustomerVoucher({ dto, id = 'customer-voucher-a4', logoDataUrl }: CustomerVoucherProps) {
  const { identity, items = [], collectionSummary = [] } = dto;
  const isDistribution = dto.type === 'DISTRIBUTE_TO_SHOP';

  /* تواريخ */
  const dateObj   = dto.date ? new Date(dto.date) : new Date();
  const fDate     = dateObj.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const fDateFull = dateObj.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long',   day: 'numeric' });
  const fTime     = dateObj.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  const logoSrc = logoDataUrl || identity.logo_url || '/default-logo.svg';
  const footerTxt = 'سند إلكتروني صادر من النظام، وطباعته أو استلامه يُعدّ اعتمادًا للعملية ولا يحتاج إلى توقيع.';

  /* إجماليات */
  const totalPieces = items.reduce((s, i) => s + (i.count ?? 0), 0);
  const totalWeight = items.reduce((s, i) => s + i.netWeight, 0);
  const totalWages  = items.reduce((s, i) => s + i.totalShopWage, 0);

  /* ─── أنماط مشتركة ─── */
  const page: React.CSSProperties = {
    width:       '194mm',
    maxWidth:    '194mm',
    padding:     '6mm 0 5mm',
    boxSizing:   'border-box',
    fontFamily:  "'Cairo', 'Noto Kufi Arabic', Arial, sans-serif",
    direction:   'rtl',
    color:       '#111',
    background:  '#fff',
    margin:      '0 auto',
    fontSize:    '9.5pt',
  };

  const hdivider: React.CSSProperties = { borderBottom: '1.5px solid #111', margin: '0' };
  const sdivider: React.CSSProperties = { borderBottom: '1px solid #555',   margin: '0' };
  const ddivider: React.CSSProperties = { borderBottom: '1px dashed #999',  margin: '0' };

  const thStyle: React.CSSProperties = {
    padding:     '3px 5px',
    border:      '1px solid #111',
    textAlign:   'center',
    fontWeight:  700,
    fontSize:    '8.5pt',
    background:  '#f0f0f0',
    whiteSpace:  'nowrap',
  };

  const tdStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
    padding:    '3px 5px',
    border:     '1px solid #555',
    fontSize:   '8.5pt',
    verticalAlign: 'middle',
    ...extra,
  });

  return (
    <div id={id} style={page}>

      {/* ════════════════════════════
          رأس السند — بدون خلفية
      ════════════════════════════ */}
      <div className="voucher-header" style={{ textAlign: 'center', paddingBottom: '3mm', marginBottom: '3mm' }}>
        <img
          src={logoSrc}
          alt="شعار"
          style={{ height: '18mm', maxWidth: '30mm', objectFit: 'contain', display: 'block', margin: '0 auto 2mm' }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div style={{ fontSize: '14pt', fontWeight: 900, lineHeight: 1.2 }}>
          {identity.brand_name}
        </div>
        {identity.activity_description && (
          <div style={{ fontSize: '9pt', color: '#333', marginTop: '0.5mm' }}>
            {identity.activity_description}
          </div>
        )}
        <div style={{ fontSize: '9pt', fontWeight: 700, marginTop: '0.5mm' }}>
          {identity.distributor_name}
        </div>
        {/* معلومات التواصل */}
        <div style={{ fontSize: '8pt', color: '#444', marginTop: '1mm', lineHeight: 1.6 }}>
          {[identity.primary_phone, identity.secondary_phone].filter(Boolean).map((p, i) => (
            <span key={i} style={{ marginLeft: '4mm' }}>هاتف: {p}</span>
          ))}
          {identity.whatsapp_number && <span style={{ marginLeft: '4mm' }}>واتس: {identity.whatsapp_number}</span>}
          {identity.address && <span>العنوان: {identity.address}</span>}
        </div>
      </div>

      <div style={hdivider} />

      {/* ════════════════════════════
          عنوان السند
      ════════════════════════════ */}
      <div style={{ textAlign: 'center', padding: '1.5mm 0' }}>
        <span style={{ fontSize: '13pt', fontWeight: 900, letterSpacing: '0.5px' }}>
          {isDistribution ? 'سند توزيع بضاعة' : 'سند قبض وتحصيل'}
        </span>
      </div>

      <div style={hdivider} />

      {/* ════════════════════════════
          بيانات السند
      ════════════════════════════ */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
        <tbody>
          <tr>
            <td style={{ padding: '1.5mm 0', width: '33%' }}>
              <span style={{ color: '#555' }}>رقم السند: </span>
              <strong style={{ fontFamily: 'monospace' }}>{dto.voucherNumber}</strong>
            </td>
            <td style={{ padding: '1.5mm 0', width: '33%', textAlign: 'center' }}>
              <span style={{ color: '#555' }}>التاريخ: </span>
              <strong>{fDateFull}</strong>
            </td>
            <td style={{ padding: '1.5mm 0', width: '33%', textAlign: 'left' }}>
              <span style={{ color: '#555' }}>الوقت: </span>
              <strong style={{ fontFamily: 'monospace' }}>{fTime}</strong>
            </td>
          </tr>
          <tr>
            <td colSpan={2} style={{ padding: '1.5mm 0' }}>
              <span style={{ color: '#555' }}>اسم العميل / المحل: </span>
              <strong style={{ fontSize: '10pt' }}>{dto.customerName}</strong>
            </td>
            <td style={{ padding: '1.5mm 0', textAlign: 'left' }}>
              {dto.customerPhone && (
                <>
                  <span style={{ color: '#555' }}>الهاتف: </span>
                  <strong style={{ fontFamily: 'monospace' }}>{dto.customerPhone}</strong>
                </>
              )}
            </td>
          </tr>
          {dto.customerAddress && (
            <tr>
              <td colSpan={3} style={{ padding: '1.5mm 0' }}>
                <span style={{ color: '#555' }}>العنوان: </span>
                <strong>{dto.customerAddress}</strong>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={sdivider} />

      {/* ════════════════════════════
          جدول الأصناف — سند التوزيع
      ════════════════════════════ */}
      {isDistribution && items.length > 0 && (
        <div>
          <table
            style={{
              width:          '100%',
              borderCollapse: 'collapse',
              tableLayout:    'fixed',
              pageBreakInside:'auto',
            }}
          >
            <thead style={{ display: 'table-header-group' }}>
              <tr>
                <th style={{ ...thStyle, width: '4%'  }}>م</th>
                <th style={{ ...thStyle, width: '10%' }}>كود الصنف</th>
                <th style={{ ...thStyle, width: '24%' }}>اسم الصنف</th>
                <th style={{ ...thStyle, width: '10%' }}>الموديل</th>
                <th style={{ ...thStyle, width: '6%'  }}>العيار</th>
                <th style={{ ...thStyle, width: '6%'  }}>القطع</th>
                <th style={{ ...thStyle, width: '13%' }}>الوزن الصافي جم</th>
                <th style={{ ...thStyle, width: '12%' }}>أجرة الجرام</th>
                <th style={{ ...thStyle, width: '15%' }}>إجمالي الأجور</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} style={{ pageBreakInside: 'avoid' }}>
                  <td style={tdStyle({ textAlign: 'center', color: '#555' })}>{i + 1}</td>
                  <td style={tdStyle({ textAlign: 'center', fontFamily: 'monospace', fontSize: '8pt' })}>{item.modelCode || '—'}</td>
                  <td style={tdStyle({ textAlign: 'right', fontWeight: 600, wordBreak: 'break-word' })}>{item.category || '—'}</td>
                  <td style={tdStyle({ textAlign: 'center', fontFamily: 'monospace', fontSize: '8pt' })}>{item.modelCode || '—'}</td>
                  <td style={tdStyle({ textAlign: 'center', fontWeight: 700 })}>{item.karat}</td>
                  <td style={tdStyle({ textAlign: 'center', fontFamily: 'monospace' })}>{item.count ?? '—'}</td>
                  <td style={tdStyle({ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 })}>{formatWeight(item.netWeight)}</td>
                  <td style={tdStyle({ textAlign: 'center', fontFamily: 'monospace' })}>{formatCurrency(item.shopWagePerGram)}</td>
                  <td style={tdStyle({ textAlign: 'center', fontFamily: 'monospace', fontWeight: 800 })}>{formatCurrency(item.totalShopWage)}</td>
                </tr>
              ))}

              {/* صف الإجمالي */}
              <tr style={{ fontWeight: 900, background: '#f5f5f5' }}>
                <td colSpan={5} style={tdStyle({ textAlign: 'center', fontWeight: 900, fontSize: '9pt', borderTop: '2px solid #111' })}>
                  الإجمالي
                </td>
                <td style={tdStyle({ textAlign: 'center', fontFamily: 'monospace', fontWeight: 900, borderTop: '2px solid #111' })}>
                  {totalPieces > 0 ? totalPieces : '—'}
                </td>
                <td style={tdStyle({ textAlign: 'center', fontFamily: 'monospace', fontWeight: 900, borderTop: '2px solid #111' })}>
                  {formatWeight(totalWeight)}
                </td>
                <td style={tdStyle({ textAlign: 'center', borderTop: '2px solid #111' })}>—</td>
                <td style={tdStyle({ textAlign: 'center', fontFamily: 'monospace', fontWeight: 900, fontSize: '9.5pt', borderTop: '2px solid #111' })}>
                  {formatCurrency(totalWages)} ر.ي
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ════════════════════════════
          سند القبض — بنود التحصيل
      ════════════════════════════ */}
      {!isDistribution && collectionSummary.length > 0 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: '9pt', marginBottom: '1mm', borderBottom: '1px solid #555', paddingBottom: '1mm' }}>
            تفاصيل التحصيل
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {collectionSummary.map((item, i) => (
                <tr key={i}>
                  <td style={tdStyle({ width: '60%', textAlign: 'right', fontWeight: 600 })}>
                    {item.laborCashAmount      != null && `تحصيل أجور — ${item.paymentMethod}`}
                    {item.scrapGoldWeight      != null && `ذهب كسر — عيار ${item.scrapGoldKarat}`}
                    {item.goldSettlementWeight != null && 'تسوية ذهب نقدًا'}
                  </td>
                  <td style={tdStyle({ textAlign: 'center', fontFamily: 'monospace', fontWeight: 800 })}>
                    {item.laborCashAmount      != null && `${formatCurrency(item.laborCashAmount)} ر.ي`}
                    {item.scrapGoldWeight      != null && `${formatWeight(item.scrapGoldWeight)} جم`}
                    {item.goldSettlementWeight != null && `${formatWeight(item.goldSettlementWeight)} جم / ${formatCurrency(item.goldSettlementCash ?? 0)} ر.ي`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={ddivider} />

      {/* ════════════════════════════
          الملخص المالي — صفوف نص فقط
      ════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5mm' }}>

        {/* ─ ملخص الأجور ─ */}
        <div>
          <div style={{ fontWeight: 700, borderBottom: '1px solid #555', paddingBottom: '1mm', marginBottom: '1.5mm', fontSize: '9pt' }}>
            ملخص الأجور
          </div>
          <FinRow label="الرصيد السابق للأجور"
            value={`${formatCurrency(dto.previousLaborBalance ?? 0)} ر.ي`} />
          <FinRow label={isDistribution ? 'قيمة هذا السند' : 'المُحصَّل'}
            value={`${isDistribution ? '+' : '−'} ${formatCurrency(
              isDistribution
                ? (dto.totalShopWages ?? 0)
                : Math.abs((dto.previousLaborBalance ?? 0) - (dto.newLaborBalance ?? 0))
            )} ر.ي`} />
          <div style={{ borderTop: '1px solid #555', marginTop: '1mm', paddingTop: '1mm' }}>
            <FinRow label="الرصيد المستحق الجديد"
              value={`${formatCurrency(dto.newLaborBalance ?? 0)} ر.ي`} bold />
          </div>
        </div>

        {/* ─ ملخص الذهب ─ */}
        {dto.previousGoldBalance != null && (
          <div>
            <div style={{ fontWeight: 700, borderBottom: '1px solid #555', paddingBottom: '1mm', marginBottom: '1.5mm', fontSize: '9pt' }}>
              ملخص الذهب (عيار {dto.previousGoldKarat ?? 21})
            </div>
            <FinRow label="رصيد الذهب السابق"
              value={`${formatWeight(dto.previousGoldBalance)} جم`} />
            <FinRow label={isDistribution ? 'الموزع في السند' : 'المرتجع / الكسر'}
              value={`${isDistribution ? '+' : '−'} ${formatWeight(
                isDistribution
                  ? (dto.totalWeight ?? 0)
                  : Math.abs((dto.previousGoldBalance ?? 0) - (dto.newGoldBalance ?? 0))
              )} جم`} />
            <div style={{ borderTop: '1px solid #555', marginTop: '1mm', paddingTop: '1mm' }}>
              <FinRow label="رصيد الذهب الجديد"
                value={`${formatWeight(dto.newGoldBalance ?? 0)} جم`} bold />
            </div>
          </div>
        )}

      </div>

      {/* ════════════════════════════
          تذييل السند
      ════════════════════════════ */}
      <div style={{ borderTop: '1.5px solid #111', paddingTop: '2.5mm', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '7.5pt', color: '#555', fontStyle: 'italic', maxWidth: '145mm', lineHeight: 1.5 }}>
          {footerTxt}
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: '7pt', color: '#777', textAlign: 'left', flexShrink: 0 }}>
          {fDate}<br />{dto.voucherNumber}
        </span>
      </div>

    </div>
  );
}

/* ─── مكوّن صف مالي ─── */
function FinRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{
      display:        'flex',
      justifyContent: 'space-between',
      alignItems:     'baseline',
      marginBottom:   '1mm',
      fontSize:       '8.5pt',
    }}>
      <span style={{ color: '#444' }}>{label}:</span>
      <span style={{
        fontFamily:         'monospace',
        fontWeight:         bold ? 900 : 600,
        fontVariantNumeric: 'tabular-nums',
        color:              bold ? '#111' : '#222',
      }}>
        {value}
      </span>
    </div>
  );
}
