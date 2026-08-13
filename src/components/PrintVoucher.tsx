import React from 'react';
import { cn, formatCurrency, formatWeight, formatApprox } from '../lib/utils';
import { Printer, X } from 'lucide-react';

interface PrintVoucherProps {
  title: string;
  type: 'Thermal80' | 'Thermal58' | 'A4';
  data: any;
  onClose: () => void;
}

export function PrintVoucher({ title, type, data, onClose }: PrintVoucherProps) {
  const [printCopyType, setPrintCopyType] = React.useState<'WORKSHOP' | 'INTERNAL'>('WORKSHOP');
  const isThermal58 = type === 'Thermal58';
  const isThermal80 = type === 'Thermal80';
  const isThermal = isThermal58 || isThermal80;

  const items = data.items || [];
  const isCollection = Boolean(data.collectionItems && data.collectionItems.length > 0) || data.type === 'COLLECT_FROM_SHOP';
  const isWorkshopReturn = data.type === 'RETURN_TO_WORKSHOP';
  const collectionItems = data.collectionItems || [];

  const totalGross = items.reduce((s: number, i: any) => s + (i.grossWeight || i.grossWeightOnReturn || i.weight || 0), 0);
  const totalNet = items.reduce((s: number, i: any) => s + (i.certifiedWeightByWorkshop || i.actualNetWeightOnReturn || i.netWeight || i.weight || 0), 0);
  const totalDifference = items.reduce((s: number, i: any) => s + (i.weightDifference || 0), 0);
  const totalRoundingDiff = items.reduce((s: number, i: any) => s + (i.roundingDifference || 0), 0);

  // Filter scrap items and cash gold settlement items
  const scrapItems = collectionItems.filter((i: any) => i.type === 'SCRAP_GOLD');
  const settlementItems = collectionItems.filter((i: any) => i.type === 'CASH_GOLD_SETTLEMENT');
  const thirdPartyItems = collectionItems.filter((i: any) => i.type === 'THIRD_PARTY_SETTLEMENT');

  // Format date cleanly
  const formattedDate = data.date ? new Date(data.date).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }) : '';

  return (
    <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-2 sm:p-4 overflow-y-auto backdrop-blur-xs">
      <div className={cn(
        "bg-white shadow-2xl relative transition-all duration-300 rounded-lg overflow-hidden my-auto",
        isThermal58 ? "w-[58mm] max-w-full" : isThermal80 ? "w-[80mm] max-w-full" : "w-[210mm] min-h-[297mm]"
      )}>
        {/* Print & Close Action Header */}
        <div className="no-print bg-slate-900 text-white p-2.5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold">
              {isCollection ? 'سند قبض' : isWorkshopReturn ? 'سند مرتجع للورشة' : title}
            </span>
            {isWorkshopReturn && (
              <div className="flex bg-slate-800 rounded p-0.5 text-[10px]">
                <button 
                  onClick={() => setPrintCopyType('WORKSHOP')}
                  className={cn("px-2 py-0.5 rounded font-bold transition-all", printCopyType === 'WORKSHOP' ? "bg-amber-500 text-slate-950" : "text-slate-300")}
                >
                  نسخة الورشة
                </button>
                <button 
                  onClick={() => setPrintCopyType('INTERNAL')}
                  className={cn("px-2 py-0.5 rounded font-bold transition-all", printCopyType === 'INTERNAL' ? "bg-amber-500 text-slate-950" : "text-slate-300")}
                >
                  نسخة داخلية
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => window.print()} 
              className="bg-amber-500 text-slate-950 px-3 py-1 rounded text-xs font-bold flex items-center gap-1 hover:bg-amber-400 cursor-pointer active:scale-95 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              طباعة
            </button>
            <button 
              onClick={onClose} 
              className="bg-slate-800 text-slate-300 hover:text-white p-1 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div id="print-area" className={cn(
          "text-right font-sans text-slate-950 bg-white",
          isThermal58 ? "p-2 text-[10px] leading-tight" :
          isThermal80 ? "p-3.5 text-[11px] leading-snug" :
          "p-10 text-sm leading-normal"
        )} dir="rtl">
          {/* Header */}
          <div className="text-center border-b border-slate-950 pb-2 mb-2.5">
            <h1 className={cn("font-bold", isThermal ? "text-xs" : "text-base")}>
              {data.companyName || 'مؤسسة الذهب والمجوهرات'}
            </h1>
            <p className={cn("font-bold text-slate-900 mt-0.5", isThermal ? "text-xs" : "text-sm")}>
              {isCollection ? 'سند قبض' : isWorkshopReturn ? `سند مرتجع للورشة (${printCopyType === 'WORKSHOP' ? 'نسخة الورشة' : 'نسخة الحسابات الداخلية'})` : title}
            </p>
            {data.workshopDocNo && (
              <p className="text-[10px] text-slate-700 mt-0.5">رقم سند الصرف الأصلي: {data.workshopDocNo}</p>
            )}
          </div>

          {/* Metadata */}
          <div className="space-y-1 mb-2.5 text-[10px] border-b border-slate-300 pb-2">
            <div className="flex justify-between">
              <span className="text-slate-700 font-medium">رقم السند:</span>
              <span className="font-mono font-bold">{data.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700 font-medium">التاريخ:</span>
              <span className="font-mono">{formattedDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700 font-medium">{isWorkshopReturn ? 'الورشة:' : 'المحل:'}</span>
              <span className="font-bold text-slate-950">{data.entityName || '---'}</span>
            </div>
            {data.recipientName && (
              <div className="flex justify-between">
                <span className="text-slate-700 font-medium">مستلم الورشة:</span>
                <span className="font-bold text-slate-950">{data.recipientName}</span>
              </div>
            )}
            {data.referenceId && (
              <div className="flex justify-between">
                <span className="text-slate-700 font-medium">سند مرجعي:</span>
                <span className="font-mono">{data.referenceId}</span>
              </div>
            )}
          </div>

          {/* Workshop Return Specialized Content */}
          {isWorkshopReturn ? (
            <div className="space-y-3 mb-3 text-[10px]">
              {/* Return Items Table */}
              <table className="w-full text-right border-collapse text-[10px]">
                <thead>
                  <tr className="border-b-2 border-slate-900">
                    <th className="py-1">الصنف والموديل</th>
                    <th className="py-1">العيار</th>
                    <th className="py-1">قائم</th>
                    <th className="py-1">المعتمد</th>
                    <th className="py-1">القطع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item: any, i: number) => {
                    const gross = item.grossWeight || item.grossWeightOnReturn || 0;
                    const certWeight = item.certifiedWeightByWorkshop || item.actualNetWeightOnReturn || item.netWeight || 0;
                    return (
                      <tr key={i} className="align-top">
                        <td className="py-1 font-medium">
                          {item.category} <span className="opacity-70 text-[9px]">({item.modelCode})</span>
                          {item.itemCondition && (
                            <div className="text-[9px] text-slate-500 font-normal">الحالة: {item.itemCondition}</div>
                          )}
                        </td>
                        <td className="py-1 font-bold">{item.karat}</td>
                        <td className="py-1 font-mono">{formatWeight(gross)}</td>
                        <td className="py-1 font-mono font-bold text-slate-950">{formatWeight(certWeight)} جم</td>
                        <td className="py-1 font-mono">{item.count ?? item.returnedPiecesCount ?? '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Reasons & Weight Diff */}
              {items[0] && (
                <div className="bg-slate-50 border border-slate-200 rounded p-2 space-y-1">
                  {items[0].workshopReturnReasonText && (
                    <div className="flex justify-between">
                      <span className="text-slate-600 font-medium">سبب الإرجاع:</span>
                      <span className="font-bold text-slate-900">{items[0].workshopReturnReasonText}</span>
                    </div>
                  )}
                  {items[0].weightDifference !== 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">فرق الوزن:</span>
                      <span className="font-mono font-bold">{formatWeight(items[0].weightDifference)} جم</span>
                    </div>
                  )}
                </div>
              )}

              {/* Labor Treatment Card */}
              <div className="border border-slate-300 rounded p-2 space-y-1.5">
                <div className="font-bold text-slate-950 border-b border-slate-200 pb-1 text-[11px] flex justify-between">
                  <span>معالجة أجور التصنيع</span>
                  <span className="font-normal text-[10px] text-slate-600">
                    {data.laborTreatment === 'CANCEL_FULL' ? 'إلغاء كامل الأجور' :
                     data.laborTreatment === 'CANCEL_PARTIAL' ? 'إلغاء جزئي للأجور' : 'الأجور مستمرة مستحقة'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>الأجور الملغاة من رصيد الورشة:</span>
                  <span className="font-mono font-bold text-emerald-800">
                    {formatCurrency(data.cancelledLaborTotal || 0)} ر.ي
                  </span>
                </div>
                {(data.keptLaborTotal || 0) > 0 && (
                  <div className="flex justify-between text-slate-700">
                    <span>الأجور المستمرة مستحقة للورشة:</span>
                    <span className="font-mono font-bold text-amber-800">
                      {formatCurrency(data.keptLaborTotal || 0)} ر.ي
                    </span>
                  </div>
                )}
                {printCopyType === 'INTERNAL' && items[0]?.originalCostOfReturnedPart && (
                  <div className="flex justify-between text-slate-500 border-t border-dashed border-slate-200 pt-1 text-[9px]">
                    <span>التكلفة الأصلية للجزء المرتجع:</span>
                    <span className="font-mono">{formatCurrency(items[0].originalCostOfReturnedPart)} ر.ي</span>
                  </div>
                )}
              </div>

              {/* Balances Before & After */}
              {data.balancesBefore && data.balancesAfter && (
                <div className="border border-slate-300 rounded p-2 space-y-1.5">
                  <div className="font-bold text-slate-950 border-b border-slate-200 pb-1 text-[11px]">
                    أثر السند على حساب الورشة
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="space-y-0.5">
                      <span className="text-slate-600 block font-medium">رصيد الذهب (عيار {items[0]?.karat || 21}):</span>
                      <div className="flex justify-between text-slate-500 font-mono text-[9px]">
                        <span>قبل:</span> <span>{formatWeight(data.balancesBefore.goldBalances?.[items[0]?.karat || 21] || 0)} جم</span>
                      </div>
                      <div className="flex justify-between font-bold font-mono text-slate-950">
                        <span>بعد:</span> <span>{formatWeight(data.balancesAfter.goldBalances?.[items[0]?.karat || 21] || 0)} جم</span>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-slate-600 block font-medium">رصيد الأجور:</span>
                      <div className="flex justify-between text-slate-500 font-mono text-[9px]">
                        <span>قبل:</span> <span>{formatCurrency(data.balancesBefore.laborBalance || 0)} ر.ي</span>
                      </div>
                      <div className="flex justify-between font-bold font-mono text-slate-950">
                        <span>بعد:</span> <span>{formatCurrency(data.balancesAfter.laborBalance || 0)} ر.ي</span>
                      </div>
                    </div>
                  </div>

                  {data.isPrepaidCredit && (
                    <div className="mt-1 p-1 bg-amber-50 rounded border border-amber-200 text-amber-900 text-[9px] font-bold">
                      تنبيه: للموزع رصيد دائن لدى الورشة
                      {data.creditGoldDueFromWorkshop ? ` (${formatWeight(data.creditGoldDueFromWorkshop)} جم ذهب مستحق)` : ''}
                      {data.creditLaborDueFromWorkshop ? ` (${formatCurrency(data.creditLaborDueFromWorkshop)} ر.ي أجور مستردة)` : ''}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : isCollection ? (
            <div className="space-y-2.5 mb-3 text-[10px]">
              {/* 1. تحصيل الأجور */}
              {data.totalLaborCash > 0 && (
                <div className="border border-slate-300 rounded p-2">
                  <div className="font-bold text-slate-950 border-b border-slate-200 pb-1 mb-1.5 text-[11px]">
                    تحصيل الأجور
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between font-bold text-slate-950">
                      <span>المبلغ المستلم:</span>
                      <span className="font-mono">{formatCurrency(data.totalLaborCash)} ر.ي</span>
                    </div>
                    {data.balancesBefore && (
                      <div className="flex justify-between text-slate-700">
                        <span>الرصيد السابق:</span>
                        <span className="font-mono">{formatCurrency(data.balancesBefore.laborBalance)} ر.ي</span>
                      </div>
                    )}
                    {data.balancesAfter && (
                      <div className="flex justify-between font-bold text-slate-950 border-t border-dashed border-slate-300 pt-1">
                        <span>الرصيد المتبقي:</span>
                        <span className="font-mono">{formatCurrency(data.balancesAfter.laborBalance)} ر.ي</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 2. الكسر */}
              {scrapItems.length > 0 && (
                <div className="border border-slate-300 rounded p-2">
                  <div className="font-bold text-slate-950 border-b border-slate-200 pb-1 mb-1.5 text-[11px]">
                    الكسر
                  </div>
                  <div className="space-y-1.5">
                    {scrapItems.map((item: any, idx: number) => (
                      <div key={idx} className={cn("space-y-1", idx > 0 && "border-t border-dashed border-slate-200 pt-1.5")}>
                        <div className="flex justify-between">
                          <span className="text-slate-700">الوزن المستلم:</span>
                          <span className="font-mono font-bold">{formatWeight(item.actualScrapWeight)} جم</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-700">العيار:</span>
                          <span className="font-bold">{item.declaredScrapKarat || item.dueKarat || 21}</span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-950">
                          <span>الوزن المعتمد:</span>
                          <span className="font-mono">{formatWeight(item.certifiedEquivalentWeight || item.actualScrapWeight)} جم</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. تسوية ذهب */}
              {settlementItems.length > 0 && (
                <div className="border border-slate-300 rounded p-2">
                  <div className="font-bold text-slate-950 border-b border-slate-200 pb-1 mb-1.5 text-[11px]">
                    تسوية ذهب
                  </div>
                  <div className="space-y-1.5">
                    {settlementItems.map((item: any, idx: number) => (
                      <div key={idx} className={cn("space-y-1", idx > 0 && "border-t border-dashed border-slate-200 pt-1.5")}>
                        <div className="flex justify-between">
                          <span className="text-slate-700">الوزن المسوى:</span>
                          <span className="font-mono font-bold">{formatWeight(item.settledGoldWeight)} جم عيار {item.dueKarat || 21}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-700">سعر الجرام:</span>
                          <span className="font-mono">{formatApprox(item.goldPricePerGram)} ر.ي</span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-950 border-t border-dashed border-slate-300 pt-0.5">
                          <span>المبلغ المستلم:</span>
                          <span className="font-mono">{formatCurrency(item.goldSettlementCashAmount)} ر.ي</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. طرف ثالث */}
              {thirdPartyItems.length > 0 && (
                <div className="border border-slate-300 rounded p-2">
                  <div className="font-bold text-slate-950 border-b border-slate-200 pb-1 mb-1.5 text-[11px]">
                    طرف ثالث ({thirdPartyItems.map((t: any) => t.thirdPartyName).filter(Boolean).join('، ') || 'تسوية'})
                  </div>
                  <div className="space-y-1">
                    {thirdPartyItems.map((item: any, idx: number) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-700">الوزن المسوى:</span>
                          <span className="font-mono font-bold">{formatWeight(item.settledGoldWeight || item.actualScrapWeight)} جم</span>
                        </div>
                        {item.goldSettlementCashAmount > 0 && (
                          <div className="flex justify-between font-bold text-slate-950">
                            <span>المبلغ:</span>
                            <span className="font-mono">{formatCurrency(item.goldSettlementCashAmount)} ر.ي</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. رصيد الذهب */}
              {data.balancesBefore && data.balancesAfter && (
                <div className="border border-slate-300 rounded p-2">
                  <div className="font-bold text-slate-950 border-b border-slate-200 pb-1 mb-1.5 text-[11px]">
                    رصيد الذهب
                  </div>
                  <div className="space-y-1.5">
                    {[18, 21, 22, 24].map((k: any) => {
                      const before = data.balancesBefore.goldBalances?.[k] || 0;
                      const after = data.balancesAfter.goldBalances?.[k] || 0;
                      if (before === 0 && after === 0) return null;
                      return (
                        <div key={k} className="space-y-0.5 font-mono text-[10px]">
                          <div className="text-slate-600 font-sans font-bold text-[9px]">عيار {k}:</div>
                          <div className="flex justify-between text-slate-700">
                            <span>قبل:</span>
                            <span>{formatWeight(before)} جم</span>
                          </div>
                          <div className="flex justify-between font-bold text-slate-950">
                            <span>بعد:</span>
                            <span>{formatWeight(after)} جم</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Standard Items Table for workshop/distribution/returns */
            items.length > 0 && (
              <div className="mb-3">
                <table className="w-full text-right border-collapse text-[10px]">
                  <thead>
                    <tr className="border-b-2 border-slate-900">
                      <th className="py-1">الصنف</th>
                      <th className="py-1">العيار</th>
                      <th className="py-1">قائم</th>
                      <th className="py-1">صافي</th>
                      <th className="py-1 text-left">أجرة/جم</th>
                      <th className="py-1 text-left">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {items.map((item: any, i: number) => {
                      const gross = item.grossWeight || item.weight || 0;
                      const net = item.netWeight || item.weight || 0;
                      const wage = item.totalShopWage ?? item.totalWorkshopWage ?? 0;
                      const wagePerGram = item.finalShopWagePerGram || item.derivedWorkshopWagePerGram || item.distributionLaborPrice || item.workshopLaborPrice || 0;

                      return (
                        <tr key={i} className="align-top">
                          <td className="py-1 font-medium">{item.category} <span className="opacity-70 text-[9px]">({item.modelCode})</span></td>
                          <td className="py-1 font-bold">{item.karat}</td>
                          <td className="py-1 font-mono">{formatWeight(gross)}</td>
                          <td className="py-1 font-mono font-bold">{formatWeight(net)}</td>
                          <td className="py-1 font-mono text-left">{formatApprox(wagePerGram)}</td>
                          <td className="py-1 font-mono font-bold text-left">{formatCurrency(wage)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Items Summary */}
                <div className="mt-2.5 pt-2 border-t border-dashed border-slate-300 space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-slate-600">إجمالي الوزن القائم:</span>
                    <span className="font-mono font-bold">{formatWeight(totalGross)} جم</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-900">إجمالي الوزن الصافي:</span>
                    <span className="font-mono font-bold">{formatWeight(totalNet)} جم</span>
                  </div>
                  {totalDifference > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>إجمالي الفصوص/الأحجار:</span>
                      <span className="font-mono">{formatWeight(totalDifference)} جم</span>
                    </div>
                  )}
                  {totalRoundingDiff !== 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>فرق التقريب:</span>
                      <span className="font-mono">{totalRoundingDiff > 0 ? `+${totalRoundingDiff}` : totalRoundingDiff} ر.ي</span>
                    </div>
                  )}
                </div>

                {/* Total Financial Section for standard items */}
                <div className="mt-3 pt-2 border-t-2 border-slate-900">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-bold text-slate-900">إجمالي الأجور:</span>
                    <span className="text-sm font-mono font-bold">{formatCurrency(data.cashAmount || 0)} <small className="text-[10px] font-normal">ر.ي</small></span>
                  </div>
                </div>
              </div>
            )
          )}

          {/* Notes */}
          {data.notes && (
            <div className="mt-2 text-[10px] text-slate-800 bg-slate-50 p-1.5 rounded border border-slate-200">
              <span className="font-bold">ملاحظات: </span>{data.notes}
            </div>
          )}

          {/* Signatures */}
          <div className="mt-5 pt-3 border-t border-slate-300 flex justify-between text-[10px] text-slate-700">
            <span>توقيع الموزع: ....................</span>
            <span>توقيع المستلم: ....................</span>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .no-print { display: none !important; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            padding: 0;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}

