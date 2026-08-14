import React from 'react';
import { CustomerVoucherDTO } from '../types/voucherTypes';
import { formatCurrency, formatWeight } from '../lib/utils';

interface CustomerVoucher58mmProps {
  dto: CustomerVoucherDTO;
  id?: string;
}

export function CustomerVoucher58mm({ dto, id = 'customer-voucher-58mm' }: CustomerVoucher58mmProps) {
  const { identity, items = [], collectionSummary = [] } = dto;
  const isDistribution = dto.type === 'DISTRIBUTE_TO_SHOP';

  const formattedDate = dto.date
    ? new Date(dto.date).toLocaleDateString('ar-EG', {
        year: 'numeric', month: '2-digit', day: '2-digit',
      })
    : '';

  const footerNote = identity.footer_note || 'سند إلكتروني لا يحتاج توقيع';
  const logoSrc = identity.logo_url || '/default-logo.svg';

  const dotLine = '─'.repeat(28);

  return (
    <div
      id={id}
      dir="rtl"
      style={{
        width: '54mm',
        fontFamily: "'Tajawal', 'Arial', sans-serif",
        fontSize: '9.5pt',
        lineHeight: 1.4,
        color: '#000',
        background: '#fff',
        padding: '2mm',
        boxSizing: 'border-box',
      }}
    >
      {/* Logo + Brand */}
      <div style={{ textAlign: 'center', borderBottom: '1px dashed #333', paddingBottom: '2mm', marginBottom: '2mm' }}>
        <img
          src={logoSrc}
          alt="شعار"
          style={{ width: '12mm', height: '12mm', objectFit: 'contain', margin: '0 auto 1mm' }}
          onError={e => { (e.target as HTMLImageElement).src = '/default-logo.svg'; }}
        />
        <div style={{ fontWeight: 900, fontSize: '10pt' }}>{identity.brand_name}</div>
        <div style={{ fontSize: '8pt', color: '#444' }}>{identity.distributor_name}</div>
        {identity.primary_phone && (
          <div style={{ fontSize: '8pt' }}>📞 {identity.primary_phone}</div>
        )}
      </div>

      {/* Voucher type & number */}
      <div style={{ textAlign: 'center', fontWeight: 900, fontSize: '10pt', marginBottom: '1.5mm' }}>
        {isDistribution ? 'سند توزيع' : 'سند قبض'}
      </div>

      {/* Meta */}
      <div style={{ fontSize: '8.5pt', marginBottom: '2mm' }}>
        <Row label="رقم السند" value={dto.voucherNumber} mono />
        <Row label="التاريخ" value={formattedDate} />
        <Row label="العميل" value={dto.customerName} bold />
      </div>

      <div style={{ borderTop: '1px dashed #333', marginBottom: '2mm' }} />

      {/* Distribution Items */}
      {isDistribution && items.map((item, i) => (
        <div key={i} style={{ marginBottom: '2mm', fontSize: '8.5pt' }}>
          <div style={{ fontWeight: 700 }}>{item.category} ({item.modelCode}) — عيار {item.karat}</div>
          <Row label="الوزن الصافي" value={`${formatWeight(item.netWeight)} جم`} mono />
          {item.count != null && <Row label="القطع" value={`${item.count}`} />}
          <Row label="أجرة الجرام" value={`${formatCurrency(item.shopWagePerGram)} ر.ي`} mono />
          <Row label="إجمالي الأجور" value={`${formatCurrency(item.totalShopWage)} ر.ي`} bold mono />
          {i < items.length - 1 && <div style={{ borderTop: '1px dotted #aaa', margin: '1.5mm 0' }} />}
        </div>
      ))}

      {/* Collection Items */}
      {!isDistribution && collectionSummary.map((item, i) => (
        <div key={i} style={{ marginBottom: '1.5mm', fontSize: '8.5pt' }}>
          {item.laborCashAmount != null && (
            <Row label={`تحصيل (${item.paymentMethod})`} value={`${formatCurrency(item.laborCashAmount)} ر.ي`} bold mono />
          )}
          {item.scrapGoldWeight != null && (
            <Row label={`كسر عيار ${item.scrapGoldKarat}`} value={`${formatWeight(item.scrapGoldWeight)} جم`} bold mono />
          )}
        </div>
      ))}

      <div style={{ borderTop: '1px dashed #333', marginBottom: '2mm' }} />

      {/* Summary */}
      {isDistribution && (
        <>
          {dto.totalWeight != null && <Row label="إجمالي الوزن" value={`${formatWeight(dto.totalWeight)} جم`} bold />}
          {dto.totalPieces != null && dto.totalPieces > 0 && <Row label="إجمالي القطع" value={`${dto.totalPieces} قطعة`} />}
          {dto.totalShopWages != null && <Row label="إجمالي الأجور" value={`${formatCurrency(dto.totalShopWages)} ر.ي`} bold />}
          <div style={{ borderTop: '1px dashed #333', margin: '1.5mm 0' }} />
        </>
      )}

      {/* Balances */}
      {dto.previousLaborBalance != null && (
        <>
          <Row label="رصيد أجور سابق" value={`${formatCurrency(dto.previousLaborBalance)} ر.ي`} />
          <Row label="رصيد أجور جديد" value={`${formatCurrency(dto.newLaborBalance ?? 0)} ر.ي`} bold />
        </>
      )}
      {dto.previousGoldBalance != null && (
        <>
          <Row label={`ذهب سابق (${dto.previousGoldKarat})`} value={`${formatWeight(dto.previousGoldBalance)} جم`} />
          <Row label={`ذهب جديد (${dto.previousGoldKarat})`} value={`${formatWeight(dto.newGoldBalance ?? 0)} جم`} bold />
        </>
      )}

      {/* Footer */}
      <div style={{ borderTop: '1px dashed #333', marginTop: '2mm', paddingTop: '1.5mm', textAlign: 'center', fontSize: '7.5pt', color: '#555' }}>
        {footerNote}
      </div>
    </div>
  );
}

function Row({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5mm' }}>
      <span style={{ color: '#555' }}>{label}:</span>
      <span style={{
        fontWeight: bold ? 700 : undefined,
        fontFamily: mono ? 'monospace' : undefined,
      }}>
        {value}
      </span>
    </div>
  );
}
