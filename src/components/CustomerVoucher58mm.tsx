import React from 'react';
import { CustomerVoucherDTO } from '../types/voucherTypes';
import { formatCurrency, formatWeight } from '../lib/utils';

interface CustomerVoucher58mmProps {
  dto: CustomerVoucherDTO;
  id?: string;
  logoDataUrl?: string | null;
}

export function CustomerVoucher58mm({ dto, id = 'customer-voucher-58mm', logoDataUrl }: CustomerVoucher58mmProps) {
  const { identity, items = [], collectionSummary = [] } = dto;
  const isDistribution = dto.type === 'DISTRIBUTE_TO_SHOP';

  const dateObj    = dto.date ? new Date(dto.date) : new Date();
  const fDate      = dateObj.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const fTime      = dateObj.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  const logoSrc    = logoDataUrl || identity.logo_url || '/default-logo.svg';
  const footerTxt  = identity.footer_note || 'سند إلكتروني — استلامه اعتماد للعملية';

  /* إجماليات */
  const totalPieces    = items.reduce((s, i) => s + (i.count ?? 0), 0);
  const totalNetWeight = items.reduce((s, i) => s + i.netWeight, 0);
  const totalWages     = items.reduce((s, i) => s + i.totalShopWage, 0);

  /* الأنماط */
  const page: React.CSSProperties = {
    width:      '54mm',
    fontFamily: "'Tajawal', 'Cairo', 'Arial', sans-serif",
    fontSize:   '8.5pt',
    lineHeight: 1.45,
    direction:  'rtl',
    color:      '#000',
    background: '#fff',
    padding:    '2mm',
    boxSizing:  'border-box',
  };

  const dashed: React.CSSProperties = {
    borderTop:  '1px dashed #444',
    margin:     '2mm 0',
  };

  const dotted: React.CSSProperties = {
    borderTop:  '1px dotted #888',
    margin:     '1.5mm 0',
  };

  return (
    <div id={id} dir="rtl" style={page}>

      {/* ── رأس السند ── */}
      <div style={{ textAlign: 'center', marginBottom: '2mm' }}>
        <img
          src={logoSrc}
          alt="شعار"
          style={{ width: '10mm', height: '10mm', objectFit: 'contain', display: 'block', margin: '0 auto 1mm' }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div style={{ fontWeight: 900, fontSize: '9.5pt' }}>{identity.brand_name}</div>
        {identity.activity_description && (
          <div style={{ fontSize: '7.5pt', color: '#444' }}>{identity.activity_description}</div>
        )}
        <div style={{ fontSize: '7.5pt' }}>{identity.distributor_name}</div>
        {identity.primary_phone && (
          <div style={{ fontSize: '7.5pt' }}>☎ {identity.primary_phone}</div>
        )}
      </div>

      <div style={dashed} />

      {/* ── عنوان السند ── */}
      <div style={{ textAlign: 'center', fontWeight: 900, fontSize: '9.5pt', marginBottom: '1.5mm' }}>
        {isDistribution ? 'سند توزيع بضاعة' : 'سند قبض وتحصيل'}
      </div>

      {/* ── بيانات السند ── */}
      <ThRow label="رقم السند" value={dto.voucherNumber} mono />
      <ThRow label="التاريخ"   value={`${fDate}  ${fTime}`} />
      <ThRow label="العميل"    value={dto.customerName} bold />
      {dto.customerPhone && <ThRow label="الهاتف" value={dto.customerPhone} />}

      <div style={dashed} />

      {/* ── سند التوزيع — كل صنف على شكل مجموعة أسطر ── */}
      {isDistribution && items.map((item, i) => (
        <div key={i} style={{ marginBottom: '2mm', fontSize: '8pt' }}>

          {/* اسم الصنف والموديل */}
          <div style={{ fontWeight: 700, marginBottom: '0.5mm' }}>
            {item.category}
            {item.modelCode ? `  (${item.modelCode})` : ''}
          </div>

          {/* تفاصيل الصنف */}
          <ThRow label="العيار"        value={`${item.karat}`} />
          {item.count != null && (
            <ThRow label="عدد القطع"   value={`${item.count}`} />
          )}
          <ThRow label="الوزن الصافي"  value={`${formatWeight(item.netWeight)} جم`} mono />
          <ThRow label="أجرة الجرام"   value={`${formatCurrency(item.shopWagePerGram)} ر.ي`} mono />
          <ThRow label="إجمالي الأجور" value={`${formatCurrency(item.totalShopWage)} ر.ي`} mono bold />

          {i < items.length - 1 && <div style={dotted} />}
        </div>
      ))}

      {/* ── سند القبض ── */}
      {!isDistribution && collectionSummary.map((item, i) => (
        <div key={i} style={{ marginBottom: '1.5mm', fontSize: '8pt' }}>
          {item.laborCashAmount      != null && (
            <ThRow label={`تحصيل أجور (${item.paymentMethod})`}
              value={`${formatCurrency(item.laborCashAmount)} ر.ي`} bold mono />
          )}
          {item.scrapGoldWeight      != null && (
            <ThRow label={`ذهب كسر (عيار ${item.scrapGoldKarat})`}
              value={`${formatWeight(item.scrapGoldWeight)} جم`} bold mono />
          )}
          {item.goldSettlementWeight != null && (
            <ThRow label="تسوية ذهب نقدًا"
              value={`${formatWeight(item.goldSettlementWeight)} جم`} bold mono />
          )}
        </div>
      ))}

      <div style={dashed} />

      {/* ── إجماليات (توزيع) ── */}
      {isDistribution && (
        <>
          {totalPieces > 0 && (
            <ThRow label="إجمالي القطع"   value={`${totalPieces}`} bold />
          )}
          <ThRow label="إجمالي الوزن الصافي" value={`${formatWeight(totalNetWeight)} جم`} bold mono />
          <ThRow label="إجمالي الأجور"        value={`${formatCurrency(totalWages)} ر.ي`}  bold mono />
          <div style={dotted} />
        </>
      )}

      {/* ── أرصدة الأجور ── */}
      <ThRow label="رصيد الأجور السابق" value={`${formatCurrency(dto.previousLaborBalance ?? 0)} ر.ي`} />
      {isDistribution && (
        <ThRow label="قيمة السند"        value={`+ ${formatCurrency(dto.totalShopWages ?? 0)} ر.ي`} />
      )}
      <ThRow label="الرصيد الجديد للأجور" value={`${formatCurrency(dto.newLaborBalance ?? 0)} ر.ي`} bold mono />

      {/* ── أرصدة الذهب ── */}
      {dto.previousGoldBalance != null && (
        <>
          <div style={dotted} />
          <ThRow label={`رصيد ذهب سابق (${dto.previousGoldKarat})`}
            value={`${formatWeight(dto.previousGoldBalance)} جم`} />
          {isDistribution && (
            <ThRow label="الموزع في السند"
              value={`+ ${formatWeight(dto.totalWeight ?? 0)} جم`} />
          )}
          <ThRow label="رصيد الذهب الجديد"
            value={`${formatWeight(dto.newGoldBalance ?? 0)} جم`} bold mono />
        </>
      )}

      {/* ── تذييل ── */}
      <div style={{ ...dashed }} />
      <div style={{ textAlign: 'center', fontSize: '7pt', color: '#555', lineHeight: 1.4 }}>
        {footerTxt}
      </div>
    </div>
  );
}

/* ── مكوّن صف ── */
function ThRow({ label, value, bold, mono }: {
  label: string; value: string; bold?: boolean; mono?: boolean;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5mm' }}>
      <span style={{ color: '#444', fontSize: '8pt', flexShrink: 0 }}>{label}:</span>
      <span style={{
        fontWeight:        bold ? 700 : undefined,
        fontFamily:        mono ? 'monospace' : undefined,
        fontVariantNumeric:'tabular-nums',
        textAlign:         'left',
        paddingRight:      '1mm',
      }}>
        {value}
      </span>
    </div>
  );
}
