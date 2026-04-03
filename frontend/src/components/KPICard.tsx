import type { ReactNode } from "react";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  iconBg?: string;
  trend?: { value: number; label: string };
}

export default function KPICard({
  title,
  value,
  subtitle,
  icon,
  iconBg = "bg-gray-400",
  trend,
}: KPICardProps) {
  return (
    <div
      className="bg-card-bg rounded-xl shadow-sm border border-border p-3 lg:p-4 flex flex-col items-center justify-center card-hover animate-fade-in-up"
      style={{ minHeight: "100px" }}
      role="region"
      aria-label={`${title}: ${value}`}
    >
      {icon && (
        <div
          className={`${iconBg} w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm mb-2`}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0 text-center w-full">
        <p className="text-[10px] lg:text-[11px] font-semibold text-text-secondary uppercase tracking-wider truncate">
          {title}
        </p>
        <p className="text-lg lg:text-xl font-bold text-text-primary mt-0.5 truncate tracking-tight">
          {value}
        </p>
        {subtitle && (
          <p className="text-[10px] lg:text-xs text-text-tertiary mt-0.5 truncate">{subtitle}</p>
        )}
        {trend && (
          <p
            className={`text-xs mt-1.5 font-semibold inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${
              trend.value >= 0
                ? "badge-success"
                : "badge-danger"
            }`}
          >
            {trend.value >= 0 ? "\u25B2" : "\u25BC"}{" "}
            {Math.abs(trend.value).toFixed(1)}% {trend.label}
          </p>
        )}
      </div>
    </div>
  );
}

export function KPICardSkeleton() {
  return (
    <div className="bg-card-bg rounded-xl shadow-sm border border-border p-5 flex items-center gap-4">
      <div className="skeleton w-12 h-12 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-7 w-32" />
        <div className="skeleton h-3 w-20" />
      </div>
    </div>
  );
}
