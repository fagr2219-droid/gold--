import React from 'react';
import { CustomerVoucherDTO } from '../types/voucherTypes';
import { formatCurrency, formatWeight } from '../lib/utils';

interface CustomerVoucherProps {
  dto: CustomerVoucherDTO;
  id?: string; // for html2canvas targeting
}

export function CustomerVoucher({ dto, id = 'customer-voucher-a4' }: CustomerVoucherProps) {
  const { identity, items = [], collectionSummary = [] } = dto;
  const isDistribution = dto.type === 'DISTRIBUTE_TO_SHOP';

  const formattedDate = dto.date
    ? new Date(dto.date).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const footerNote =
    identity.footer_note || 'سند إلكتروني صادر من النظام ولا يحتاج إلى توقيع.';

  const logoSrc = identity.logo_url || '/default-logo.svg';

  return (
    <div
      id={id}
      dir="rtl"
      className="bg-white text-slate-900 font-sans"
      style={{ width: '210mm', minHeight: '297mm', padding: '10mm', boxSizing: 'border-box', fontSize: '11pt' }}
    >
      {/* ========== HEADER ========== */}
      <div style={{ borderBottom: '2px solid #0F1B33', paddingBottom: '6mm', marginBottom: '6mm' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6mm' }}>
          {/* Logo */}
          <img
            src={logoSrc}
            alt="شعار"
            style={{ width: '22mm', height: '22mm', objectFit: 'contain', flexShrink: 0 }}
            onError={(e) => { (e.target as HTMLImageElement).src = '/default-logo.svg'; }}
          />
          {/* Brand Info */}
          <div style={{ flex: 1, textAlign: 'right' }}>
            <div style={{ fontSize: '15pt', fontWeight: 900, color: '#0F1B33' }}>
              {identity.brand_name}
            </div>
            {identity.activity_description && (
              <div style={{ fontSize: '9pt', color: '#555', marginTop: '1mm' }}>
                {identity.activity_description}
              </div>
            )}
            <div style={{ fontSize: '10pt', fontWeight: 700, marginTop: '1mm' }}>
              {identity.distributor_name}
            </div>
            <div style={{ fontSize: '9pt', color: '#444', marginTop: '1mm', display: 'flex', gap: '4mm', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {identity.primary_phone && <span>📞 {identity.primary_phone}</span>}
              {identity.secondary_phone && <span>📞 {identity.secondary_phone}</span>}
              {identity.whatsapp_number && <span>💬 {identity.whatsapp_number}</span>}
              {identity.address && <span>📍 {identity.address}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ========== VOUCHER TITLE & META ========== */}
      <div style={{ textAlign: 'center', marginBottom: '5mm' }}>
        <div style={{
          display: 'inline-block',
          border: '1.5px solid #0F1B33',
          borderRadius: '4px',
          padding: '2mm 8mm',
          fontSize: '13pt',
          fontWeight: 900,
          color: '#0F1B33',
        }}>
          {isDistribution ? 'سند توزيع بضاعة' : 'سند قبض وتحصيل'}
        </div>
      </div>

      {/* Voucher Meta */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '2mm 6mm',
        fontSize: '9.5pt',
        marginBottom: '5mm',
        padding: '3mm',
        background: '#F8FAFC',
        borderRadius: '3mm',
        border: '1px solid #DDE4EC',
      }}>
        <MetaRow label="رقم السند" value={dto.voucherNumber} mono />
        <MetaRow label="التاريخ" value={formattedDate} mono />
        <MetaRow label="اسم العميل / المحل" value={dto.customerName} bold />
        {dto.customerPhone && <MetaRow label="الهاتف" value={dto.customerPhone} />}
        {dto.customerAddress && <MetaRow label="العنوان" value={dto.customerAddress} className="col-span-2" />}
      </div>

      {/* ========== DISTRIBUTION ITEMS TABLE ========== */}
      {isDistribution && items.length > 0 && (
        <div style={{ marginBottom: '5mm' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt' }}>
            <thead>
              <tr style={{ background: '#0F1B33', color: 'white' }}>
                {['الصنف', 'الموديل', 'العيار', 'الوزن الصافي', 'القطع', 'أجرة الجرام', 'إجمالي الأجور'].map(h => (
                  <th key={h} style={{ padding: '2mm 3mm', textAlign: 'right', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#FFF' : '#F8FAFC', borderBottom: '1px solid #DDE4EC' }}>
                  <td style={{ padding: '2mm 3mm', fontWeight: 600 }}>{item.category}</td>
                  <td style={{ padding: '2mm 3mm', fontFamily: 'monospace' }}>{item.modelCode}</td>
                  <td style={{ padding: '2mm 3mm', fontWeight: 700 }}>{item.karat}</td>
                  <td style={{ padding: '2mm 3mm', fontFamily: 'monospace', fontWeight: 700, color: '#C88918' }}>
                    {formatWeight(item.netWeight)} جم
                  </td>
                  <td style={{ padding: '2mm 3mm', fontFamily: 'monospace' }}>
                    {item.count ?? '—'}
                  </td>
                  <td style={{ padding: '2mm 3mm', fontFamily: 'monospace' }}>
                    {formatCurrency(item.shopWagePerGram)}
                  </td>
                  <td style={{ padding: '2mm 3mm', fontFamily: 'monospace', fontWeight: 700 }}>
                    {formatCurrency(item.totalShopWage)} ر.ي
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ========== COLLECTION ITEMS ========== */}
      {!isDistribution && collectionSummary.length > 0 && (
        <div style={{ marginBottom: '5mm', padding: '3mm', border: '1px solid #DDE4EC', borderRadius: '3mm' }}>
          <div style={{ fontWeight: 700, fontSize: '10pt', marginBottom: '3mm', color: '#0F1B33' }}>
            تفاصيل التحصيل
          </div>
          {collectionSummary.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5mm 0', borderBottom: '1px solid #F0F0F0', fontSize: '9.5pt' }}>
              {item.laborCashAmount != null && (
                <>
                  <span style={{ color: '#555' }}>تحصيل أجور {item.paymentMethod}</span>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{formatCurrency(item.laborCashAmount)} ر.ي</span>
                </>
              )}
              {item.scrapGoldWeight != null && (
                <>
                  <span style={{ color: '#555' }}>ذهب كسر عيار {item.scrapGoldKarat}</span>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{formatWeight(item.scrapGoldWeight)} جم</span>
                </>
              )}
              {item.goldSettlementWeight != null && (
                <>
                  <span style={{ color: '#555' }}>تسوية ذهب</span>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                    {formatWeight(item.goldSettlementWeight)} جم / {formatCurrency(item.goldSettlementCash ?? 0)} ر.ي
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ========== SUMMARY ========== */}
      <div style={{ marginBottom: '5mm' }}>
        <div style={{
          border: '1.5px solid #E49A0A',
          borderRadius: '3mm',
          padding: '4mm',
          background: '#FFF7E5',
        }}>
          <div style={{ fontWeight: 900, fontSize: '10pt', color: '#0F1B33', marginBottom: '3mm', borderBottom: '1px solid #E49A0A', paddingBottom: '2mm' }}>
            ملخص السند
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2mm', fontSize: '9.5pt' }}>
            {isDistribution && dto.totalWeight != null && (
              <SummaryRow label="إجمالي الوزن الصافي" value={`${formatWeight(dto.totalWeight)} جم`} />
            )}
            {isDistribution && dto.totalPieces != null && dto.totalPieces > 0 && (
              <SummaryRow label="إجمالي القطع" value={`${dto.totalPieces} قطعة`} />
            )}
            {isDistribution && dto.totalShopWages != null && (
              <SummaryRow label="إجمالي الأجور المطلوبة" value={`${formatCurrency(dto.totalShopWages)} ر.ي`} bold />
            )}
          </div>
          {/* Balance summary */}
          <div style={{ marginTop: '3mm', paddingTop: '3mm', borderTop: '1px solid #E49A0A', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2mm', fontSize: '9pt' }}>
            <SummaryRow label="الرصيد السابق (أجور)" value={`${formatCurrency(dto.previousLaborBalance ?? 0)} ر.ي`} />
            <SummaryRow label="الحركة" value={isDistribution ? `+ ${formatCurrency(dto.totalShopWages ?? 0)} ر.ي` : '—'} />
            <SummaryRow label="الرصيد الجديد (أجور)" value={`${formatCurrency(dto.newLaborBalance ?? 0)} ر.ي`} bold />
            {dto.previousGoldBalance != null && (
              <>
                <SummaryRow label={`رصيد الذهب السابق (${dto.previousGoldKarat})`} value={`${formatWeight(dto.previousGoldBalance)} جم`} />
                <SummaryRow label="الحركة" value={isDistribution ? `+ ${formatWeight(dto.totalWeight ?? 0)} جم` : '—'} />
                <SummaryRow label={`رصيد الذهب الجديد (${dto.previousGoldKarat})`} value={`${formatWeight(dto.newGoldBalance ?? 0)} جم`} bold />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ========== FOOTER ========== */}
      <div style={{ marginTop: 'auto', borderTop: '1px solid #DDE4EC', paddingTop: '4mm', textAlign: 'center', fontSize: '8.5pt', color: '#888' }}>
        {footerNote}
      </div>
    </div>
  );
}

function MetaRow({ label, value, mono, bold, className }: {
  label: string; value: string; mono?: boolean; bold?: boolean; className?: string;
}) {
  return (
    <div className={className} style={{ display: 'flex', gap: '2mm', alignItems: 'flex-start' }}>
      <span style={{ color: '#666', minWidth: '28mm', flexShrink: 0 }}>{label}:</span>
      <span style={{ fontFamily: mono ? 'monospace' : undefined, fontWeight: bold ? 700 : undefined }}>
        {value}
      </span>
    </div>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5mm' }}>
      <span style={{ color: '#666', fontSize: '8.5pt' }}>{label}</span>
      <span style={{ fontFamily: 'monospace', fontWeight: bold ? 700 : undefined, color: bold ? '#0F1B33' : undefined }}>
        {value}
      </span>
    </div>
  );
}
