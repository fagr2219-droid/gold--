import React from 'react';
import { CustomerVoucherDTO } from '../types/voucherTypes';
import { formatCurrency, formatWeight } from '../lib/utils';

interface CustomerVoucher200x100Props {
  dto: CustomerVoucherDTO;
  id?: string;
}

/* ═══════════════════════════════════════════════════
   CustomerVoucher200x100 — 200mm × 100mm
   سند مدمج أفقي مشابه للسند الورقي المرجعي
   خلفية بيضاء — خطوط داكنة فقط — بدون ألوان
═══════════════════════════════════════════════════ */
export function CustomerVoucher200x100({ dto, id = 'customer-voucher-200x100' }: CustomerVoucher200x100Props) {
  const { identity, items = [], collectionSummary = [] } = dto;
  const isDistribution = dto.type === 'DISTRIBUTE_TO_SHOP';

  const dateObj = dto.date ? new Date(dto.date) : new Date();
  const fDate   = dateObj.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const fTime   = dateObj.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  const logoSrc = identity.logo_url || '/default-logo.svg';

  const totalPieces = items.reduce((s, i) => s + (i.count ?? 0), 0);
  const totalWeight = items.reduce((s, i) => s + i.netWeight, 0);
  const totalWages  = items.reduce((s, i) => s + i.totalShopWage, 0);

  /* ─── أنماط ─── */
  const page: React.CSSProperties = {
    width:       '200mm',
    minHeight:   '100mm',
    padding:     '3mm 5mm',
    boxSizing:   'border-box',
    fontFamily:  "'Cairo', 'Noto Kufi Arabic', Arial, sans-serif",
    direction:   'rtl',
    color:       '#111',
    background:  '#fff',
    fontSize:    '7.5pt',
    display:     'flex',
    flexDirection:'column',
    gap:         '2mm',
  };

  const thS: React.CSSProperties = {
    padding:    '2px 4px',
    border:     '1px solid #111',
    textAlign:  'center',
    fontWeight: 700,
    fontSize:   '7pt',
    background: '#ebebeb',
    whiteSpace: 'nowrap',
  };

  const tdS = (extra?: React.CSSProperties): React.CSSProperties => ({
    padding:       '1.5px 4px',
    border:        '1px solid #555',
    fontSize:      '7pt',
    verticalAlign: 'middle',
    ...extra,
  });

  const solidLine: React.CSSProperties = { borderBottom: '1.5px solid #111', margin: '0' };
  const thinLine:  React.CSSProperties = { borderBottom: '1px solid #666',   margin: '0' };

  return (
    <div id={id} style={page}>

      {/* ══════════════════════════════
          رأس السند  (ثلاثة أعمدة)
      ══════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '3mm', alignItems: 'center' }}>

        {/* يمين — بيانات التواصل */}
        <div style={{ fontSize: '6.5pt', color: '#333', lineHeight: 1.6 }}>
          {identity.primary_phone   && <div>هاتف: {identity.primary_phone}</div>}
          {identity.secondary_phone && <div>هاتف: {identity.secondary_phone}</div>}
          {identity.whatsapp_number && <div>واتس: {identity.whatsapp_number}</div>}
          {identity.address         && <div>{identity.address}</div>}
        </div>

        {/* وسط — الشعار واسم النشاط */}
        <div style={{ textAlign: 'center' }}>
          <img
            src={logoSrc}
            alt="شعار"
            style={{ height: '12mm', maxWidth: '20mm', objectFit: 'contain', display: 'block', margin: '0 auto 1mm' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div style={{ fontSize: '10pt', fontWeight: 900, whiteSpace: 'nowrap' }}>{identity.brand_name}</div>
          {identity.activity_description && (
            <div style={{ fontSize: '6.5pt', color: '#444' }}>{identity.activity_description}</div>
          )}
          <div style={{ fontSize: '7pt', fontWeight: 700 }}>{identity.distributor_name}</div>
        </div>

        {/* يسار — رقم السند والتاريخ */}
        <div style={{ textAlign: 'left', fontSize: '7pt', lineHeight: 1.7 }}>
          <div><span style={{ color: '#555' }}>الرقم: </span><strong style={{ fontFamily: 'monospace' }}>{dto.voucherNumber}</strong></div>
          <div><span style={{ color: '#555' }}>التاريخ: </span><strong style={{ fontFamily: 'monospace' }}>{fDate}</strong></div>
          <div><span style={{ color: '#555' }}>الوقت: </span><strong style={{ fontFamily: 'monospace' }}>{fTime}</strong></div>
        </div>
      </div>

      <div style={solidLine} />

      {/* عنوان السند + بيانات العميل */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2mm' }}>
        <div style={{ fontSize: '10pt', fontWeight: 900 }}>
          {isDistribution ? 'سند توزيع بضاعة' : 'سند قبض وتحصيل'}
        </div>
        <div style={{ fontSize: '7.5pt', display: 'flex', gap: '5mm' }}>
          <span><span style={{ color: '#555' }}>العميل: </span><strong>{dto.customerName}</strong></span>
          {dto.customerPhone && <span><span style={{ color: '#555' }}>الهاتف: </span><strong style={{ fontFamily: 'monospace' }}>{dto.customerPhone}</strong></span>}
        </div>
      </div>

      <div style={thinLine} />

      {/* ══════════════════════════════
          جدول الأصناف — سند التوزيع
      ══════════════════════════════ */}
      {isDistribution && items.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ ...thS, width: '4%'  }}>م</th>
              <th style={{ ...thS, width: '9%'  }}>الكود</th>
              <th style={{ ...thS, width: '22%' }}>اسم الصنف</th>
              <th style={{ ...thS, width: '9%'  }}>الموديل</th>
              <th style={{ ...thS, width: '6%'  }}>العيار</th>
              <th style={{ ...thS, width: '6%'  }}>القطع</th>
              <th style={{ ...thS, width: '12%' }}>الوزن الصافي جم</th>
              <th style={{ ...thS, width: '11%' }}>أجرة الجرام</th>
              <th style={{ ...thS, width: '21%' }}>إجمالي الأجور ر.ي</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td style={tdS({ textAlign: 'center', color: '#555' })}>{i + 1}</td>
                <td style={tdS({ textAlign: 'center', fontFamily: 'monospace' })}>{item.modelCode || '—'}</td>
                <td style={tdS({ textAlign: 'right', fontWeight: 600, wordBreak: 'break-word' })}>{item.category || '—'}</td>
                <td style={tdS({ textAlign: 'center', fontFamily: 'monospace' })}>{item.modelCode || '—'}</td>
                <td style={tdS({ textAlign: 'center', fontWeight: 700 })}>{item.karat}</td>
                <td style={tdS({ textAlign: 'center', fontFamily: 'monospace' })}>{item.count ?? '—'}</td>
                <td style={tdS({ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 })}>{formatWeight(item.netWeight)}</td>
                <td style={tdS({ textAlign: 'center', fontFamily: 'monospace' })}>{formatCurrency(item.shopWagePerGram)}</td>
                <td style={tdS({ textAlign: 'center', fontFamily: 'monospace', fontWeight: 800 })}>{formatCurrency(item.totalShopWage)}</td>
              </tr>
            ))}
            {/* صف الإجمالي */}
            <tr style={{ background: '#f0f0f0', fontWeight: 900 }}>
              <td colSpan={5} style={tdS({ textAlign: 'center', fontWeight: 900, borderTop: '1.5px solid #111' })}>الإجمالي</td>
              <td style={tdS({ textAlign: 'center', fontFamily: 'monospace', fontWeight: 900, borderTop: '1.5px solid #111' })}>{totalPieces > 0 ? totalPieces : '—'}</td>
              <td style={tdS({ textAlign: 'center', fontFamily: 'monospace', fontWeight: 900, borderTop: '1.5px solid #111' })}>{formatWeight(totalWeight)}</td>
              <td style={tdS({ textAlign: 'center', borderTop: '1.5px solid #111' })}>—</td>
              <td style={tdS({ textAlign: 'center', fontFamily: 'monospace', fontWeight: 900, borderTop: '1.5px solid #111' })}>{formatCurrency(totalWages)} ر.ي</td>
            </tr>
          </tbody>
        </table>
      )}

      {/* سند القبض */}
      {!isDistribution && collectionSummary.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {collectionSummary.map((item, i) => (
              <tr key={i}>
                <td style={tdS({ width: '60%', textAlign: 'right', fontWeight: 600 })}>
                  {item.laborCashAmount      != null && `تحصيل أجور — ${item.paymentMethod}`}
                  {item.scrapGoldWeight      != null && `ذهب كسر — عيار ${item.scrapGoldKarat}`}
                  {item.goldSettlementWeight != null && 'تسوية ذهب نقدًا'}
                </td>
                <td style={tdS({ textAlign: 'center', fontFamily: 'monospace', fontWeight: 800 })}>
                  {item.laborCashAmount      != null && `${formatCurrency(item.laborCashAmount)} ر.ي`}
                  {item.scrapGoldWeight      != null && `${formatWeight(item.scrapGoldWeight)} جم`}
                  {item.goldSettlementWeight != null && `${formatWeight(item.goldSettlementWeight)} جم / ${formatCurrency(item.goldSettlementCash ?? 0)} ر.ي`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={thinLine} />

      {/* ══════════════════════════════
          الملخص المالي — صف أفقي مدمج
      ══════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4mm', fontSize: '7pt' }}>
        {/* الأجور */}
        <div>
          <div style={{ fontWeight: 700, borderBottom: '1px solid #555', paddingBottom: '0.5mm', marginBottom: '1mm' }}>ملخص الأجور</div>
          <MiniRow label="الرصيد السابق" value={`${formatCurrency(dto.previousLaborBalance ?? 0)} ر.ي`} />
          <MiniRow label={isDistribution ? 'قيمة السند' : 'المُحصَّل'}
            value={`${isDistribution ? '+' : '−'} ${formatCurrency(
              isDistribution
                ? (dto.totalShopWages ?? 0)
                : Math.abs((dto.previousLaborBalance ?? 0) - (dto.newLaborBalance ?? 0))
            )} ر.ي`} />
          <MiniRow label="الرصيد الجديد" value={`${formatCurrency(dto.newLaborBalance ?? 0)} ر.ي`} bold />
        </div>
        {/* الذهب */}
        {dto.previousGoldBalance != null && (
          <div>
            <div style={{ fontWeight: 700, borderBottom: '1px solid #555', paddingBottom: '0.5mm', marginBottom: '1mm' }}>
              ملخص الذهب (عيار {dto.previousGoldKarat ?? 21})
            </div>
            <MiniRow label="رصيد سابق" value={`${formatWeight(dto.previousGoldBalance)} جم`} />
            <MiniRow label={isDistribution ? 'الموزع' : 'المرتجع'}
              value={`${isDistribution ? '+' : '−'} ${formatWeight(
                isDistribution
                  ? (dto.totalWeight ?? 0)
                  : Math.abs((dto.previousGoldBalance ?? 0) - (dto.newGoldBalance ?? 0))
              )} جم`} />
            <MiniRow label="رصيد جديد" value={`${formatWeight(dto.newGoldBalance ?? 0)} جم`} bold />
          </div>
        )}
      </div>

      {/* ══════════════════════════════
          تذييل
      ══════════════════════════════ */}
      <div style={{ borderTop: '1.5px solid #111', paddingTop: '1.5mm', fontSize: '6pt', color: '#666', fontStyle: 'italic' }}>
        سند إلكتروني صادر من النظام، وطباعته أو استلامه يُعدّ اعتمادًا للعملية ولا يحتاج إلى توقيع.
      </div>

    </div>
  );
}

/* ─── صف مالي مصغَّر ─── */
function MiniRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5mm', fontSize: '7pt' }}>
      <span style={{ color: '#555' }}>{label}:</span>
      <span style={{ fontFamily: 'monospace', fontWeight: bold ? 900 : 600, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </div>
  );
}
