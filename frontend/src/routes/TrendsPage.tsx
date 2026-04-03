import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { TrendingUp, Upload } from "lucide-react";
import {
  LineChartComponent,
  ChartCard,
  ChartSkeleton,
  COLORS,
} from "../components/Charts";
import { PageHeader, EmptyState, Card, CardHeader } from "../components/Layout";
import { TableSkeleton } from "../components/DataTable";
import { useSession } from "../context/SessionContext";
import { useOverview, useTrends } from "../api/queries";
import {
  formatCurrency,
  formatPercent,
  formatVolume,
} from "../lib/formatters";
import { formatMonthLabel } from "../components/MonthSelector";

export default function TrendsPage() {
  const { sessionId, monthsLoaded } = useSession();
  const { data: overview, isLoading: overviewLoading } = useOverview(sessionId);
  const { data: trends, isLoading: trendsLoading } = useTrends(sessionId);

  const isLoading = overviewLoading || trendsLoading;

  if (!sessionId) {
    return (
      <div>
        <PageHeader title="Trends" />
        <EmptyState
          icon={<Upload size={48} />}
          title="No data uploaded"
          description="Upload your data files to view trends."
        />
        <div className="flex justify-center mt-4">
          <Link
            to="/"
            className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            Go to Upload
          </Link>
        </div>
      </div>
    );
  }

  if (monthsLoaded.length < 2) {
    return (
      <div>
        <PageHeader
          title="Trends"
          description="Multi-month trend analysis"
        />
        <EmptyState
          icon={<TrendingUp size={48} />}
          title="Multiple months required"
          description="Upload data for at least 2 months to see trend analysis. Go to the Upload page to add more months."
        />
        <div className="flex justify-center mt-4">
          <Link
            to="/"
            className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            Upload More Data
          </Link>
        </div>
      </div>
    );
  }

  const allMonths = overview?.months ?? [];

  // Revenue/Cost/Margin trend data from overview
  const kpiTrendData = allMonths.map((m) => ({
    month: formatMonthLabel(m.month),
    Revenue: m.total_revenue,
    Cost: m.total_cost,
    Margin: m.total_margin,
  }));

  // Volume trend
  const volumeTrendData = allMonths.map((m) => ({
    month: formatMonthLabel(m.month),
    Volume: m.total_volume,
  }));

  // Margin % trend
  const marginPctData = allMonths.map((m) => ({
    month: formatMonthLabel(m.month),
    "Profit %": m.profit_pct,
  }));

  // Grade-wise trends from the trends API
  const trendSeries = trends?.series ?? [];

  // Build grade-specific trend chart data
  const gradeNames = trendSeries.map((s) => s.name);
  const gradeChartData = useMemo(() => {
    if (trendSeries.length === 0) return [];
    // Get all unique months from the first series
    const months = trendSeries[0]?.data.map((d) => d.month) ?? [];
    return months.map((month) => {
      const point: Record<string, unknown> = {
        month: formatMonthLabel(month),
      };
      trendSeries.forEach((series) => {
        const dp = series.data.find((d) => d.month === month);
        point[series.name] = dp?.value ?? 0;
      });
      return point;
    });
  }, [trendSeries]);

  return (
    <div>
      <PageHeader
        title="Trends"
        description="Multi-month performance trends"
      />

      {/* Revenue/Cost/Margin Line Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {isLoading ? (
          <>
            <ChartSkeleton />
            <ChartSkeleton />
          </>
        ) : (
          <>
            <ChartCard title="Revenue, Cost & Margin Trend">
              <LineChartComponent
                data={kpiTrendData}
                xKey="month"
                lines={[
                  { key: "Revenue", name: "Revenue", color: "#4e73df" },
                  { key: "Cost", name: "Cost", color: "#e74a3b" },
                  { key: "Margin", name: "Margin", color: "#1cc88a" },
                ]}
              />
            </ChartCard>

            <ChartCard title="Volume Trend">
              <LineChartComponent
                data={volumeTrendData}
                xKey="month"
                lines={[
                  { key: "Volume", name: "Volume (m\u00B3)", color: "#36b9cc" },
                ]}
                formatTooltip={(v) => formatVolume(v)}
              />
            </ChartCard>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {isLoading ? (
          <>
            <ChartSkeleton />
            <ChartSkeleton />
          </>
        ) : (
          <>
            <ChartCard title="Profit % Trend">
              <LineChartComponent
                data={marginPctData}
                xKey="month"
                lines={[
                  { key: "Profit %", name: "Profit %", color: "#f6c23e" },
                ]}
                formatTooltip={(v) => formatPercent(v)}
              />
            </ChartCard>

            {gradeChartData.length > 0 && gradeNames.length > 0 && (
              <ChartCard title="Grade-wise Revenue Trend">
                <LineChartComponent
                  data={gradeChartData}
                  xKey="month"
                  lines={gradeNames.slice(0, 8).map((name, i) => ({
                    key: name,
                    name: name,
                    color: COLORS[i % COLORS.length],
                  }))}
                />
              </ChartCard>
            )}
          </>
        )}
      </div>

      {/* Month Comparison Table */}
      <Card>
        <CardHeader title="Month-over-Month Comparison" />
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={5} cols={monthsLoaded.length + 1} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-text-secondary uppercase bg-gray-50">
                    Metric
                  </th>
                  {allMonths.map((m) => (
                    <th
                      key={m.month}
                      className="px-5 py-3 text-right text-xs font-semibold text-text-secondary uppercase bg-gray-50"
                    >
                      {formatMonthLabel(m.month)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <ComparisonRow
                  label="Total Revenue"
                  months={allMonths}
                  getValue={(m) => formatCurrency(m.total_revenue)}
                />
                <ComparisonRow
                  label="Total Cost"
                  months={allMonths}
                  getValue={(m) => formatCurrency(m.total_cost)}
                />
                <ComparisonRow
                  label="Gross Margin"
                  months={allMonths}
                  getValue={(m) => formatCurrency(m.total_margin)}
                />
                <ComparisonRow
                  label="Profit %"
                  months={allMonths}
                  getValue={(m) => formatPercent(m.profit_pct)}
                />
                <ComparisonRow
                  label="Total Volume"
                  months={allMonths}
                  getValue={(m) => formatVolume(m.total_volume, 0)}
                />
                <ComparisonRow
                  label="Revenue/m\u00B3"
                  months={allMonths}
                  getValue={(m) => formatCurrency(m.avg_revenue_per_m3)}
                />
                <ComparisonRow
                  label="Cost/m\u00B3"
                  months={allMonths}
                  getValue={(m) => formatCurrency(m.avg_cost_per_m3)}
                />
                <ComparisonRow
                  label="Margin/m\u00B3"
                  months={allMonths}
                  getValue={(m) => formatCurrency(m.avg_margin_per_m3)}
                />
                <ComparisonRow
                  label="Unique Grades"
                  months={allMonths}
                  getValue={(m) => String(m.unique_grades)}
                />
                <ComparisonRow
                  label="Unique Customers"
                  months={allMonths}
                  getValue={(m) => String(m.unique_customers)}
                />
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

interface MonthKPI {
  month: string;
  total_revenue: number;
  total_cost: number;
  total_margin: number;
  total_volume: number;
  avg_revenue_per_m3: number;
  avg_cost_per_m3: number;
  avg_margin_per_m3: number;
  profit_pct: number;
  unique_grades: number;
  unique_customers: number;
}

function ComparisonRow({
  label,
  months,
  getValue,
}: {
  label: string;
  months: MonthKPI[];
  getValue: (m: MonthKPI) => string;
}) {
  return (
    <tr className="border-b border-border/50 hover:bg-gray-50/50">
      <td className="px-5 py-3 text-sm font-medium text-text-primary">
        {label}
      </td>
      {months.map((m) => (
        <td
          key={m.month}
          className="px-5 py-3 text-sm text-right text-text-primary"
        >
          {getValue(m)}
        </td>
      ))}
    </tr>
  );
}
