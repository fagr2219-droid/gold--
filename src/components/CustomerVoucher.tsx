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

  const dateObj = dto.date ? new Date(dto.date) : new Date();
  const formattedDate = dateObj.toLocaleDateString('ar-EG', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const formattedTime = dateObj.toLocaleTimeString('ar-EG', {
    hour: '2-digit', minute: '2-digit',
  });
  const formattedDateShort = dateObj.toLocaleDateString('ar-EG', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });

  const footerNote = identity.footer_note || 'سند إلكتروني صادر من النظام ولا يحتاج إلى توقيع.';
  const logoSrc = identity.logo_url || '/default-logo.svg';

  /* ─── style tokens ─── */
  const gold   = '#B8860B';
  const goldLt = '#D4A017';
  const dark   = '#0D1B2A';
  const muted  = '#6B7280';
  const border = '1px solid #E5E7EB';

  return (
    <div
      id={id}
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '0',
        boxSizing: 'border-box' as const,
        fontSize: '10pt',
        fontFamily: 'Cairo, Tajawal, Arial, sans-serif',
        direction: 'rtl' as const,
        color: dark,
        background: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column' as const,
        position: 'relative' as const,
      }}
    >

      {/* ══ TOP GOLD ACCENT BAR ══ */}
      <div style={{
        height: '6mm',
        background: `linear-gradient(90deg, ${dark} 0%, ${goldLt} 50%, ${dark} 100%)`,
        flexShrink: 0,
      }} />

      {/* ══ HEADER ══ */}
      <div style={{
        background: dark,
        padding: '6mm 10mm',
        display: 'flex',
        alignItems: 'center',
        gap: '6mm',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          width: '18mm', height: '18mm', flexShrink: 0,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '3mm',
          border: `1.5px solid ${goldLt}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          <img
            src={logoSrc}
            alt="شعار"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onError={e => { (e.target as HTMLImageElement).src = '/default-logo.svg'; }}
          />
        </div>

        {/* Brand info */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '17pt', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.2 }}>
            {identity.brand_name}
          </div>
          {identity.activity_description && (
            <div style={{ fontSize: '9pt', color: `${goldLt}`, marginTop: '1mm', fontWeight: 600 }}>
              {identity.activity_description}
            </div>
          )}
          <div style={{ fontSize: '9.5pt', color: 'rgba(255,255,255,0.7)', marginTop: '1mm' }}>
            {identity.distributor_name}
          </div>
        </div>

        {/* Contact info */}
        <div style={{
          display: 'flex', flexDirection: 'column' as const, gap: '1.5mm',
          fontSize: '8pt', color: 'rgba(255,255,255,0.75)',
          textAlign: 'left',
        }}>
          {identity.primary_phone && <span>📞 {identity.primary_phone}</span>}
          {identity.secondary_phone && <span>📞 {identity.secondary_phone}</span>}
          {identity.whatsapp_number && <span>💬 {identity.whatsapp_number}</span>}
          {identity.address && <span>📍 {identity.address}</span>}
        </div>
      </div>

      {/* ══ VOUCHER TYPE BANNER ══ */}
      <div style={{
        background: `linear-gradient(135deg, ${goldLt}18 0%, ${goldLt}08 100%)`,
        borderBottom: `2px solid ${goldLt}40`,
        padding: '4mm 10mm',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3mm' }}>
          <div style={{
            background: isDistribution ? dark : '#065F46',
            color: '#fff',
            padding: '1.5mm 6mm',
            borderRadius: '20mm',
            fontSize: '12pt',
            fontWeight: 900,
            letterSpacing: '0.3px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          }}>
            {isDistribution ? '📤 سند توزيع بضاعة' : '📥 سند قبض وتحصيل'}
          </div>
        </div>

        {/* Date Badge */}
        <div style={{
          background: '#fff',
          border: `2px solid ${goldLt}`,
          borderRadius: '3mm',
          padding: '2mm 5mm',
          textAlign: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}>
          <div style={{ fontSize: '7pt', color: muted, fontWeight: 700, marginBottom: '0.5mm' }}>
            📅 تاريخ السند
          </div>
          <div style={{ fontSize: '11pt', fontWeight: 900, color: dark, fontFamily: 'Cairo, sans-serif' }}>
            {formattedDate}
          </div>
          <div style={{ fontSize: '8pt', color: muted, marginTop: '0.3mm', fontFamily: 'monospace' }}>
            {formattedTime}
          </div>
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div style={{ padding: '7mm 10mm', flex: 1, display: 'flex', flexDirection: 'column' as const, gap: '6mm' }}>

        {/* ── META INFO ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '3mm',
          background: '#F9FAFB',
          borderRadius: '3.5mm',
          padding: '5mm',
          border: border,
        }}>
          <MetaBlock label="رقم السند" value={dto.voucherNumber} accent />
          <MetaBlock label="التاريخ" value={formattedDateShort} />
          <MetaBlock label="الوقت" value={formattedTime} />
          <div style={{ gridColumn: '1 / -1', borderTop: border, paddingTop: '3mm', marginTop: '1mm' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: dto.customerPhone ? '2fr 1fr' : '1fr',
              gap: '3mm',
            }}>
              <MetaBlock label="اسم العميل / المحل" value={dto.customerName} bold />
              {dto.customerPhone && <MetaBlock label="الهاتف" value={dto.customerPhone} />}
              {dto.customerAddress && <MetaBlock label="العنوان" value={dto.customerAddress} />}
            </div>
          </div>
        </div>

        {/* ── DISTRIBUTION ITEMS TABLE ── */}
        {isDistribution && items.length > 0 && (
          <div style={{ borderRadius: '3mm', overflow: 'hidden', border: border }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
              <thead>
                <tr style={{ background: dark, color: '#fff' }}>
                  {['الصنف', 'الموديل', 'العيار', 'الوزن الصافي', 'القطع', 'أجرة الجرام', 'إجمالي الأجور'].map(h => (
                    <th key={h} style={{
                      padding: '3mm 3.5mm',
                      textAlign: 'right',
                      fontWeight: 700,
                      fontSize: '8.5pt',
                      whiteSpace: 'nowrap' as const,
                      borderBottom: `2px solid ${goldLt}`,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} style={{
                    background: i % 2 === 0 ? '#fff' : '#F9FAFB',
                    borderBottom: '1px solid #F0F0F0',
                  }}>
                    <td style={{ padding: '3mm 3.5mm', fontWeight: 700 }}>{item.category || '—'}</td>
                    <td style={{ padding: '3mm 3.5mm', fontFamily: 'monospace', color: '#555' }}>{item.modelCode || '—'}</td>
                    <td style={{ padding: '3mm 3.5mm', fontWeight: 800, textAlign: 'center' as const }}>
                      <span style={{
                        background: `${goldLt}20`,
                        color: '#92400E',
                        borderRadius: '8px',
                        padding: '1px 5px',
                        fontSize: '8.5pt',
                      }}>
                        {item.karat}
                      </span>
                    </td>
                    <td style={{ padding: '3mm 3.5mm', fontFamily: 'monospace', fontWeight: 800, color: gold, textAlign: 'center' as const }}>
                      {formatWeight(item.netWeight)} جم
                    </td>
                    <td style={{ padding: '3mm 3.5mm', fontFamily: 'monospace', textAlign: 'center' as const }}>{item.count ?? '—'}</td>
                    <td style={{ padding: '3mm 3.5mm', fontFamily: 'monospace', textAlign: 'center' as const, color: '#555' }}>
                      {formatCurrency(item.shopWagePerGram)}
                    </td>
                    <td style={{ padding: '3mm 3.5mm', fontFamily: 'monospace', fontWeight: 900, textAlign: 'center' as const, color: dark }}>
                      {formatCurrency(item.totalShopWage)} ر.ي
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── COLLECTION ITEMS ── */}
        {!isDistribution && collectionSummary.length > 0 && (
          <div style={{ borderRadius: '3mm', overflow: 'hidden', border: border }}>
            <div style={{
              background: '#065F46',
              color: '#fff',
              padding: '2.5mm 5mm',
              fontWeight: 800,
              fontSize: '9.5pt',
              display: 'flex',
              alignItems: 'center',
              gap: '2mm',
            }}>
              📋 تفاصيل التحصيل
            </div>
            {collectionSummary.map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '3mm 5mm',
                background: i % 2 === 0 ? '#fff' : '#F0FDF4',
                borderBottom: '1px solid #E5E7EB',
                fontSize: '10pt',
              }}>
                {item.laborCashAmount != null && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2mm' }}>
                      <span style={{ color: '#065F46', fontSize: '12pt' }}>💵</span>
                      <span style={{ color: '#374151', fontWeight: 600 }}>
                        تحصيل أجور — {item.paymentMethod === 'TRANSFER' ? 'تحويل بنكي' : 'نقدي'}
                      </span>
                    </div>
                    <span style={{ fontFamily: 'monospace', fontWeight: 900, color: '#16A34A', fontSize: '11pt' }}>
                      {formatCurrency(item.laborCashAmount)} ر.ي
                    </span>
                  </>
                )}
                {item.scrapGoldWeight != null && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2mm' }}>
                      <span style={{ fontSize: '12pt' }}>🥇</span>
                      <span style={{ color: '#374151', fontWeight: 600 }}>
                        ذهب كسر — عيار {item.scrapGoldKarat}
                      </span>
                    </div>
                    <span style={{ fontFamily: 'monospace', fontWeight: 900, color: gold, fontSize: '11pt' }}>
                      {formatWeight(item.scrapGoldWeight)} جم
                    </span>
                  </>
                )}
                {item.goldSettlementWeight != null && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2mm' }}>
                      <span style={{ fontSize: '12pt' }}>🔄</span>
                      <span style={{ color: '#374151', fontWeight: 600 }}>تسوية ذهب نقدًا</span>
                    </div>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '10pt' }}>
                      {formatWeight(item.goldSettlementWeight)} جم / {formatCurrency(item.goldSettlementCash ?? 0)} ر.ي
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── SUMMARY BOX ── */}
        <div style={{
          borderRadius: '4mm',
          overflow: 'hidden',
          border: `1.5px solid ${goldLt}80`,
          boxShadow: `0 2px 8px ${goldLt}20`,
        }}>
          <div style={{
            background: `linear-gradient(90deg, ${dark} 0%, #1a3252 100%)`,
            color: '#fff',
            padding: '3mm 5mm',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontWeight: 900, fontSize: '10pt', display: 'flex', alignItems: 'center', gap: '2mm' }}>
              📊 ملخص السند
            </span>
            <span style={{
              background: `${goldLt}30`,
              color: goldLt,
              fontSize: '8pt',
              padding: '1mm 3mm',
              borderRadius: '10mm',
              fontWeight: 700,
            }}>
              {isDistribution ? 'سند توزيع' : 'سند قبض'}
            </span>
          </div>

          <div style={{ padding: '5mm', background: `linear-gradient(135deg, #FFFDF0 0%, #FFF9E6 100%)` }}>
            {/* Main totals */}
            {isDistribution && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3mm', marginBottom: '5mm' }}>
                {dto.totalWeight != null && (
                  <SummaryCard label="إجمالي الوزن الصافي" value={`${formatWeight(dto.totalWeight)} جم`} icon="⚖️" />
                )}
                {dto.totalPieces != null && dto.totalPieces > 0 && (
                  <SummaryCard label="إجمالي القطع" value={`${dto.totalPieces} قطعة`} icon="💎" />
                )}
                {dto.totalShopWages != null && (
                  <SummaryCard label="إجمالي الأجور المطلوبة" value={`${formatCurrency(dto.totalShopWages)} ر.ي`} icon="💰" highlight />
                )}
              </div>
            )}

            {/* Balance movement */}
            <div style={{ borderTop: `1.5px dashed ${goldLt}50`, paddingTop: '4mm' }}>
              {/* Labor balance row */}
              <div style={{ marginBottom: '3mm' }}>
                <div style={{ fontSize: '8pt', color: muted, fontWeight: 700, marginBottom: '2mm', textAlign: 'center' }}>
                  حركة رصيد الأجور
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '2mm', alignItems: 'center' }}>
                  <BalanceCol label="الرصيد السابق" value={`${formatCurrency(dto.previousLaborBalance ?? 0)} ر.ي`} />
                  <div style={{
                    textAlign: 'center',
                    background: isDistribution ? '#EFF6FF' : '#F0FDF4',
                    border: `1px solid ${isDistribution ? '#BFDBFE' : '#BBF7D0'}`,
                    borderRadius: '3mm',
                    padding: '1.5mm 3mm',
                    fontSize: '8.5pt',
                    fontWeight: 800,
                    color: isDistribution ? '#1D4ED8' : '#166534',
                    minWidth: '20mm',
                    whiteSpace: 'nowrap' as const,
                  }}>
                    {isDistribution
                      ? `＋ ${formatCurrency(dto.totalShopWages ?? 0)}`
                      : `－ ${formatCurrency((dto.previousLaborBalance ?? 0) - (dto.newLaborBalance ?? 0))}`
                    }
                  </div>
                  <BalanceCol label="الرصيد الجديد" value={`${formatCurrency(dto.newLaborBalance ?? 0)} ر.ي`} bold highlight />
                </div>
              </div>

              {/* Gold balance row */}
              {dto.previousGoldBalance != null && (
                <div style={{ marginTop: '3mm' }}>
                  <div style={{ fontSize: '8pt', color: muted, fontWeight: 700, marginBottom: '2mm', textAlign: 'center' }}>
                    حركة رصيد الذهب (عيار {dto.previousGoldKarat})
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '2mm', alignItems: 'center' }}>
                    <BalanceCol label="الرصيد السابق" value={`${formatWeight(dto.previousGoldBalance)} جم`} />
                    <div style={{
                      textAlign: 'center',
                      background: isDistribution ? '#EFF6FF' : '#FEF3C7',
                      border: `1px solid ${isDistribution ? '#BFDBFE' : '#FDE68A'}`,
                      borderRadius: '3mm',
                      padding: '1.5mm 3mm',
                      fontSize: '8.5pt',
                      fontWeight: 800,
                      color: isDistribution ? '#1D4ED8' : '#92400E',
                      minWidth: '20mm',
                      whiteSpace: 'nowrap' as const,
                    }}>
                      {isDistribution
                        ? `＋ ${formatWeight(dto.totalWeight ?? 0)} جم`
                        : `－ ${formatWeight((dto.previousGoldBalance ?? 0) - (dto.newGoldBalance ?? 0))} جم`
                      }
                    </div>
                    <BalanceCol label="الرصيد الجديد" value={`${formatWeight(dto.newGoldBalance ?? 0)} جم`} bold />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Signature area */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6mm',
          marginTop: '4mm',
          paddingTop: '4mm',
          borderTop: border,
        }}>
          <SignatureLine label="توقيع المسلِّم" />
          <SignatureLine label="توقيع المستلم" />
        </div>

      </div>

      {/* ══ FOOTER ══ */}
      <div style={{
        background: '#F9FAFB',
        borderTop: `1px solid #E5E7EB`,
        padding: '3mm 10mm',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '8pt',
        color: muted,
        flexShrink: 0,
      }}>
        <span>{footerNote}</span>
        <span style={{ fontFamily: 'monospace', fontSize: '7.5pt' }}>
          {formattedDateShort} · {dto.voucherNumber}
        </span>
      </div>

      {/* ══ BOTTOM ACCENT BAR ══ */}
      <div style={{
        height: '3mm',
        background: `linear-gradient(90deg, ${dark} 0%, ${goldLt} 50%, ${dark} 100%)`,
        flexShrink: 0,
      }} />

    </div>
  );
}

/* ─── Helper components ─── */
function MetaBlock({ label, value, accent, bold }: {
  label: string; value: string; accent?: boolean; bold?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.8mm' }}>
      <span style={{ fontSize: '7.5pt', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' as const }}>{label}</span>
      <span style={{
        fontFamily: accent ? "'Courier New', monospace" : undefined,
        fontWeight: (accent || bold) ? 800 : 500,
        fontSize: accent ? '10.5pt' : '9.5pt',
        color: accent ? '#0D1B2A' : '#1F2937',
        fontVariantNumeric: 'tabular-nums' as const,
      }}>
        {value}
      </span>
    </div>
  );
}

function SummaryCard({ label, value, highlight, icon }: {
  label: string; value: string; highlight?: boolean; icon?: string;
}) {
  return (
    <div style={{
      background: highlight ? '#0D1B2A' : '#fff',
      border: highlight ? 'none' : '1.5px solid #E5E7EB',
      borderRadius: '3mm',
      padding: '3mm 4mm',
      textAlign: 'center',
      boxShadow: highlight ? '0 4px 12px rgba(13,27,42,0.3)' : '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      {icon && <div style={{ fontSize: '14pt', marginBottom: '1mm' }}>{icon}</div>}
      <div style={{ fontSize: '7pt', color: highlight ? 'rgba(255,255,255,0.6)' : '#6B7280', marginBottom: '1mm', fontWeight: 700 }}>{label}</div>
      <div style={{
        fontFamily: "'Courier New', monospace",
        fontWeight: 900,
        fontSize: highlight ? '11pt' : '10pt',
        fontVariantNumeric: 'tabular-nums' as const,
        color: highlight ? '#FFD700' : '#0D1B2A',
      }}>
        {value}
      </div>
    </div>
  );
}

function BalanceCol({ label, value, bold, highlight }: {
  label: string; value: string; bold?: boolean; highlight?: boolean;
}) {
  return (
    <div style={{
      background: highlight ? '#FFF9E6' : '#fff',
      border: highlight ? '1.5px solid #D4A01760' : '1px solid #E5E7EB',
      borderRadius: '2.5mm',
      padding: '2.5mm 3.5mm',
      textAlign: 'right' as const,
    }}>
      <div style={{ fontSize: '7.5pt', color: '#9CA3AF', marginBottom: '0.5mm' }}>{label}</div>
      <div style={{
        fontFamily: "'Courier New', monospace",
        fontWeight: bold ? 900 : 500,
        fontSize: bold ? '10.5pt' : '9.5pt',
        fontVariantNumeric: 'tabular-nums' as const,
        color: highlight ? '#92400E' : bold ? '#0D1B2A' : '#555',
      }}>
        {value}
      </div>
    </div>
  );
}

function SignatureLine({ label }: { label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ height: '10mm', borderBottom: '1px solid #D1D5DB', marginBottom: '2mm' }} />
      <div style={{ fontSize: '8pt', color: '#6B7280', fontWeight: 600 }}>{label}</div>
    </div>
  );
}
