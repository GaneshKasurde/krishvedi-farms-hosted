interface MonthSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export default function MonthSelector({
  value,
  onChange,
  label = "Month",
}: MonthSelectorProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-semibold text-text-primary mb-2">
          {label}
        </label>
      )}
      <input
        type="month"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
      />
    </div>
  );
}

interface MonthTabsProps {
  months: string[];
  selected: string;
  onSelect: (month: string) => void;
}

export function MonthTabs({ months, selected, onSelect }: MonthTabsProps) {
  if (months.length <= 1) return null;

  return (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
      {months.map((month) => (
        <button
          key={month}
          onClick={() => onSelect(month)}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            selected === month
              ? "bg-white text-primary shadow-sm"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          {formatMonthLabel(month)}
        </button>
      ))}
    </div>
  );
}

export function formatMonthLabel(month: string): string {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1);
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}
