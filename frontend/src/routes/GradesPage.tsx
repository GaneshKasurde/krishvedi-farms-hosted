import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { Layers, Upload } from "lucide-react";
import DataTable, { TableSkeleton } from "../components/DataTable";
import {
  BarChartComponent,
  DonutChart,
  ChartCard,
  ChartSkeleton,
} from "../components/Charts";
import { PageHeader, EmptyState, Card, CardHeader } from "../components/Layout";
import { MonthTabs } from "../components/MonthSelector";
import { useSession } from "../context/SessionContext";
import { useGradeProfitability } from "../api/queries";
import {
  formatCurrency,
  formatPercent,
  formatVolume,
  formatIndianNumber,
} from "../lib/formatters";
import type { GradeProfitability } from "../types/analysis";

const columnHelper = createColumnHelper<GradeProfitability>();

export default function GradesPage() {
  const { sessionId, monthsLoaded, selectedMonth, setSelectedMonth } =
    useSession();
  const { data, isLoading } = useGradeProfitability(sessionId, selectedMonth);

  const columns = useMemo<ColumnDef<GradeProfitability, any>[]>(
    () => [
      columnHelper.accessor("grade", {
        header: "Grade",
        cell: (info) => (
          <span className="font-medium">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("volume", {
        header: "Volume Sold",
        cell: (info) => formatVolume(info.getValue()),
      }),
      columnHelper.accessor("revenue", {
        header: "Revenue",
        cell: (info) => formatCurrency(info.getValue()),
      }),
      columnHelper.accessor("cost", {
        header: "Cost",
        cell: (info) => formatCurrency(info.getValue()),
      }),
      columnHelper.accessor("margin", {
        header: "Margin",
        cell: (info) => {
          const val = info.getValue();
          return (
            <span className={val < 0 ? "text-danger font-medium" : ""}>
              {formatCurrency(val)}
            </span>
          );
        },
      }),
      columnHelper.accessor("margin_per_m3", {
        header: "Margin/m\u00B3",
        cell: (info) => {
          const val = info.getValue();
          return (
            <span className={val < 0 ? "text-danger font-medium" : ""}>
              {formatCurrency(val)}
            </span>
          );
        },
      }),
      columnHelper.accessor("profit_pct", {
        header: "Profit %",
        cell: (info) => {
          const val = info.getValue();
          return (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                val >= 20
                  ? "bg-success/10 text-success-dark"
                  : val >= 0
                  ? "bg-warning/10 text-warning-dark"
                  : "bg-danger/10 text-danger"
              }`}
            >
              {formatPercent(val)}
            </span>
          );
        },
      }),
    ],
    []
  );

  if (!sessionId) {
    return (
      <div>
        <PageHeader title="Grade Profitability" />
        <EmptyState
          icon={<Upload size={48} />}
          title="No data uploaded"
          description="Upload your data files to view grade-wise profitability analysis."
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

  const grades = data?.grades ?? [];

  // Bar chart data: Revenue vs Cost by grade
  const barData = grades
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    .map((g) => ({
      grade: g.grade,
      Revenue: g.revenue,
      Cost: g.cost,
    }));

  // Pie chart data: Volume share
  const pieData = grades
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 8)
    .map((g) => ({
      name: g.grade,
      value: g.volume,
    }));

  return (
    <div>
      <PageHeader
        title="Grade Profitability"
        description="Revenue, cost, and margin analysis per RMC grade"
        actions={
          <MonthTabs
            months={monthsLoaded}
            selected={selectedMonth ?? ""}
            onSelect={setSelectedMonth}
          />
        }
      />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {isLoading ? (
          <>
            <ChartSkeleton />
            <ChartSkeleton />
          </>
        ) : (
          <>
            <ChartCard title="Revenue vs Cost by Grade">
              {barData.length > 0 ? (
                <BarChartComponent
                  data={barData}
                  xKey="grade"
                  bars={[
                    { key: "Revenue", name: "Revenue", color: "#4e73df" },
                    { key: "Cost", name: "Cost", color: "#e74a3b" },
                  ]}
                  height={320}
                />
              ) : (
                <p className="text-sm text-text-secondary text-center py-12">
                  No data
                </p>
              )}
            </ChartCard>

            <ChartCard title="Volume Share by Grade">
              {pieData.length > 0 ? (
                <DonutChart
                  data={pieData}
                  height={320}
                  formatValue={(v) => formatVolume(v)}
                />
              ) : (
                <p className="text-sm text-text-secondary text-center py-12">
                  No data
                </p>
              )}
            </ChartCard>
          </>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardHeader
          title="Grade-wise Profitability"
          actions={
            <span className="text-xs text-text-secondary">
              {grades.length} grades
            </span>
          }
        />
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={8} cols={7} />
          </div>
        ) : (
          <>
            <DataTable data={grades} columns={columns} />
            {grades.length > 0 && (
              <div className="border-t border-border bg-gray-50 px-5 py-3 flex items-center justify-between font-semibold text-sm">
                <span className="text-text-primary">Total ({grades.length} grades)</span>
                <div className="flex items-center gap-8">
                  <span className="text-text-secondary">{formatVolume(grades.reduce((s, g) => s + g.volume, 0))}</span>
                  <span className="text-text-primary w-32 text-right">{formatCurrency(grades.reduce((s, g) => s + g.revenue, 0))}</span>
                  <span className="text-text-primary w-32 text-right">{formatCurrency(grades.reduce((s, g) => s + g.cost, 0))}</span>
                  <span className={`w-32 text-right ${grades.reduce((s, g) => s + g.margin, 0) < 0 ? 'text-danger' : 'text-text-primary'}`}>{formatCurrency(grades.reduce((s, g) => s + g.margin, 0))}</span>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
