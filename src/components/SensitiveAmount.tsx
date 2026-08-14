import React from 'react';

/**
 * SensitiveAmount — يعرض قيمة مالية حساسة أو يخفيها بنقاط حقيقية (لا blur).
 * عند الإخفاء: لا يُرسل الرقم الحقيقي إلى DOM المرئي أو aria.
 */
interface SensitiveAmountProps {
  value: string;          // القيمة المنسّقة جاهزة للعرض
  unit?: string;          // الوحدة مثل "ر.ي" أو "ر.ي/جم"
  visible: boolean;       // هل الوضع "إظهار"؟
  className?: string;     // تنسيق إضافي للعنصر الظاهر
  unitClassName?: string; // تنسيق إضافي للوحدة
  dotCount?: number;      // عدد النقاط عند الإخفاء (افتراضي 6)
}

export function SensitiveAmount({
  value,
  unit,
  visible,
  className = '',
  unitClassName = '',
  dotCount = 6,
}: SensitiveAmountProps) {
  const dots = '•'.repeat(dotCount);

  if (!visible) {
    return (
      <span
        aria-hidden="true"
        className={`font-mono select-none tracking-widest text-slate-400 ${className}`}
      >
        {dots}
        {unit && <small className={`mr-1 ${unitClassName}`}>{unit}</small>}
      </span>
    );
  }

  return (
    <span className={`font-mono ${className}`}>
      {value}
      {unit && <small className={`mr-1 ${unitClassName}`}>{unit}</small>}
    </span>
  );
}
