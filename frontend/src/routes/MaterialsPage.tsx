import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { Package, Upload, AlertTriangle } from "lucide-react";
import DataTable, { TableSkeleton } from "../components/DataTable";
import {
  BarChartComponent,
  ChartCard,
  ChartSkeleton,
} from "../components/Charts";
import { PageHeader, EmptyState, Card, CardHeader } from "../components/Layout";
import { MonthTabs } from "../components/MonthSelector";
import { useSession } from "../context/SessionContext";
import { useMaterialAnalysis } from "../api/queries";
import {
  formatCurrency,
  formatIndianNumber,
} from "../lib/formatters";
import type { MaterialAnalysis } from "../types/analysis";

const columnHelper = createColumnHelper<MaterialAnalysis>();

export default function MaterialsPage() {
  const { sessionId, monthsLoaded, selectedMonth, setSelectedMonth } =
    useSession();
  const { data, isLoading } = useMaterialAnalysis(sessionId, selectedMonth);

  const columns = useMemo<ColumnDef<MaterialAnalysis, any>[]>(
    () => [
      columnHelper.accessor("material", {
        header: "Material",
        cell: (info) => (
          <span className="font-medium">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("purchased_qty", {
        header: "Qty Purchased",
        cell: (info) => formatIndianNumber(info.getValue(), 2),
      }),
      columnHelper.accessor("consumed_qty", {
        header: "Qty Consumed",
        cell: (info) => formatIndianNumber(info.getValue(), 2),
      }),
      columnHelper.accessor("balance_qty", {
        header: "Balance",
        cell: (info) => {
          const val = info.getValue();
          const isDeficit = val < 0;
          return (
            <div className="flex items-center gap-2">
              <span className={isDeficit ? "text-danger font-medium" : ""}>
                {formatIndianNumber(val, 2)}
              </span>
              {isDeficit && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-danger/10 text-danger">
                  <AlertTriangle size={10} className="mr-0.5" />
                  Deficit
                </span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("avg_rate", {
        header: "Avg Rate",
        cell: (info) => formatCurrency(info.getValue(), 2),
      }),
      columnHelper.accessor("avg_landed_rate", {
        header: "Avg Landed Rate",
        cell: (info) => formatCurrency(info.getValue(), 2),
      }),
    ],
    []
  );

  if (!sessionId) {
    return (
      <div>
        <PageHeader title="Raw Materials" />
        <EmptyState
          icon={<Upload size={48} />}
          title="No data uploaded"
          description="Upload your data files to view raw material analysis."
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

  const materials = data?.materials ?? [];

  // Bar chart: Purchased vs Consumed
  const barData = materials.map((m) => ({
    material:
      m.material.length > 12 ? m.material.slice(0, 12) + "..." : m.material,
    Purchased: m.purchased_qty,
    Consumed: m.consumed_qty,
  }));

  const deficitCount = materials.filter((m) => m.balance_qty < 0).length;

  return (
    <div>
      <PageHeader
        title="Raw Materials"
        description="Purchase vs consumption and inventory analysis"
        actions={
          <MonthTabs
            months={monthsLoaded}
            selected={selectedMonth ?? ""}
            onSelect={setSelectedMonth}
          />
        }
      />

      {/* Deficit Alert */}
      {deficitCount > 0 && (
        <div className="bg-danger/5 border border-danger/20 rounded-lg p-4 mb-6 flex items-center gap-3">
          <AlertTriangle size={20} className="text-danger shrink-0" />
          <div>
            <p className="text-sm font-semibold text-danger">
              Stock Deficit Detected
            </p>
            <p className="text-xs text-danger/80">
              {deficitCount} material(s) have consumption exceeding purchases
              this month.
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="mb-6">
        {isLoading ? (
          <ChartSkeleton height={350} />
        ) : (
          <ChartCard title="Purchased vs Consumed Quantities">
            {barData.length > 0 ? (
              <BarChartComponent
                data={barData}
                xKey="material"
                  bars={[
                    { key: "Purchased", name: "Purchased", color: "#4e73df" },
                    { key: "Consumed", name: "Consumed", color: "#f6c23e" },
                  ]}
                height={350}
                formatTooltip={(v) => formatIndianNumber(v, 2)}
              />
            ) : (
              <p className="text-sm text-text-secondary text-center py-12">
                No data
              </p>
            )}
          </ChartCard>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardHeader
          title="Material-wise Analysis"
          actions={
            <span className="text-xs text-text-secondary">
              {materials.length} materials
            </span>
          }
        />
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={10} cols={6} />
          </div>
        ) : (
          <>
            <DataTable data={materials} columns={columns} />
            {materials.length > 0 && (
              <div className="border-t border-border bg-gray-50 px-5 py-3 flex items-center justify-between font-semibold text-sm">
                <span className="text-text-primary">Total ({materials.length} materials)</span>
                <div className="flex items-center gap-8">
                  <span className="text-text-secondary w-24 text-right">{formatIndianNumber(materials.reduce((s, m) => s + m.purchased_qty, 0), 2)}</span>
                  <span className="text-text-secondary w-24 text-right">{formatIndianNumber(materials.reduce((s, m) => s + m.consumed_qty, 0), 2)}</span>
                  <span className={`w-24 text-right ${materials.reduce((s, m) => s + m.balance_qty, 0) < 0 ? 'text-danger' : 'text-text-primary'}`}>{formatIndianNumber(materials.reduce((s, m) => s + m.balance_qty, 0), 2)}</span>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
