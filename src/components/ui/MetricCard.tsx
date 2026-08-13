import React from 'react';
import { cn } from '../../lib/utils';

export type CardLevel = 'prominent' | 'standard' | 'subtle';

interface MetricCardProps {
  level?: CardLevel;
  title: string;
  value: string | React.ReactNode;
  unit?: string;
  subValue?: string | React.ReactNode;
  icon?: React.ReactNode;
  colorType?: 'gold' | 'blue' | 'green' | 'red' | 'purple' | 'navy';
  breakdown?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  badge?: React.ReactNode;
}

export function MetricCard({
  level = 'standard',
  title,
  value,
  unit,
  subValue,
  icon,
  colorType = 'gold',
  breakdown,
  onClick,
  className,
  badge
}: MetricCardProps) {
  const isClickable = Boolean(onClick);

  // Icon background colors by accounting semantic
  const iconBgMap = {
    gold: 'bg-[#FFF7E5] text-[#C88918] border border-[#E49A0A]/30',
    blue: 'bg-[#EEF4FF] text-[#2864DC] border border-[#2864DC]/20',
    green: 'bg-[#EAFBF4] text-[#07875F] border border-[#07875F]/20',
    red: 'bg-[#FFF0F0] text-[#D64545] border border-[#D64545]/20',
    purple: 'bg-[#F5F3FF] text-[#7C3AED] border border-[#7C3AED]/20',
    navy: 'bg-slate-100 text-[#0F1B33] border border-slate-200'
  };

  const valueColorMap = {
    gold: 'text-[#091225]',
    blue: 'text-[#2864DC]',
    green: 'text-[#07875F]',
    red: 'text-[#D64545]',
    purple: 'text-[#7C3AED]',
    navy: 'text-[#0F1B33]'
  };

  if (level === 'prominent') {
    return (
      <div 
        onClick={onClick}
        className={cn(
          "card-prominent p-4 sm:p-5 flex flex-col justify-between space-y-3 transition-all duration-180 relative overflow-hidden",
          isClickable && "cursor-pointer hover:shadow-lg hover:border-[#C88918] active:scale-[0.99]",
          className
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-[#C88918] uppercase tracking-wider block">
                {title}
              </span>
              {badge}
            </div>
            {subValue && (
              <p className="text-[11px] text-slate-600 mt-0.5 font-medium line-clamp-1">{subValue}</p>
            )}
          </div>
          {icon && (
            <div className={cn("p-2 rounded-xl shrink-0", iconBgMap[colorType])}>
              {icon}
            </div>
          )}
        </div>

        <div className="flex items-baseline gap-1.5 pt-1" dir="ltr">
          <span className={cn("text-2xl sm:text-3xl font-black font-mono tracking-tight", valueColorMap[colorType])}>
            {value}
          </span>
          {unit && (
            <span className="text-xs font-bold text-slate-600">{unit}</span>
          )}
        </div>

        {breakdown && (
          <div className="pt-2.5 border-t border-[#E49A0A]/30">
            {breakdown}
          </div>
        )}
      </div>
    );
  }

  if (level === 'subtle') {
    return (
      <div className={cn("card-subtle p-3 space-y-1", className)}>
        <div className="text-[10px] font-bold text-[#667085]">{title}</div>
        <div className="text-sm font-mono font-bold text-[#101828]" dir="ltr">
          {value} {unit && <small className="text-[10px] text-slate-500 font-normal">{unit}</small>}
        </div>
      </div>
    );
  }

  // Standard Card
  return (
    <div 
      onClick={onClick}
      className={cn(
        "card-base p-4 sm:p-5 flex flex-col justify-between space-y-3",
        isClickable && "card-interactive",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <span className="text-xs font-bold text-[#667085] block">{title}</span>
          {badge}
        </div>
        {icon && (
          <div className={cn("p-2 rounded-xl shrink-0", iconBgMap[colorType])}>
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1.5" dir="ltr">
        <span className={cn("text-xl sm:text-2xl font-bold font-mono tracking-tight", valueColorMap[colorType])}>
          {value}
        </span>
        {unit && (
          <span className="text-xs font-bold text-slate-500">{unit}</span>
        )}
      </div>

      {subValue && (
        <p className="text-[11px] text-[#667085] leading-relaxed line-clamp-1 border-t border-[#DDE4EC]/60 pt-2">{subValue}</p>
      )}

      {breakdown && (
        <div className="pt-2 border-t border-[#DDE4EC]">
          {breakdown}
        </div>
      )}
    </div>
  );
}
