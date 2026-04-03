import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { Factory, Upload, Box, Layers, BarChart3 } from "lucide-react";
import DataTable, { TableSkeleton } from "../components/DataTable";
import KPICard, { KPICardSkeleton } from "../components/KPICard";
import { PageHeader, EmptyState, Card, CardHeader } from "../components/Layout";
import { MonthTabs } from "../components/MonthSelector";
import { useSession } from "../context/SessionContext";
import { useProductionAnalysis } from "../api/queries";
import { formatIndianNumber, formatVolume } from "../lib/formatters";
import type { ProductionAnalysis } from "../types/analysis";

const columnHelper = createColumnHelper<ProductionAnalysis>();

// Known material columns in order
const MATERIAL_COLS = [
  "Cem",
  "FlyAsh",
  "GGBS",
  "Silica",
  "10mm",
  "20mm",
  "CSand",
  "CSand.1",
  "WTR1",
  "Admix1",
  "Admix 2",
];

export default function ProductionPage() {
  const { sessionId, monthsLoaded, selectedMonth, setSelectedMonth } =
    useSession();
  const { data, isLoading } = useProductionAnalysis(sessionId, selectedMonth);

  const productions = data?.productions ?? [];

  // Find which material columns are actually present in the data
  const activeMaterials = useMemo(() => {
    const materialSet = new Set<string>();
    productions.forEach((p) => {
      Object.keys(p.material_per_m3).forEach((k) => {
        if (p.material_per_m3[k] > 0) materialSet.add(k);
      });
    });
    return MATERIAL_COLS.filter((m) => materialSet.has(m));
  }, [productions]);

  const columns = useMemo<ColumnDef<ProductionAnalysis, any>[]>(
    () => [
      columnHelper.accessor("grade", {
        header: "Grade",
        cell: (info) => (
          <span className="font-medium">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("batches", {
        header: "Batches",
        cell: (info) => formatIndianNumber(info.getValue()),
      }),
      columnHelper.accessor("volume", {
        header: "Total Volume",
        cell: (info) => formatVolume(info.getValue()),
      }),
      columnHelper.accessor("avg_batch_size", {
        header: "Avg Batch Size",
        cell: (info) => formatIndianNumber(info.getValue(), 2) + " m\u00B3",
      }),
      ...activeMaterials.map((mat) =>
        columnHelper.display({
          id: `mat_${mat}`,
          header: `${mat}/m\u00B3`,
          cell: ({ row }) => {
            const val = row.original.material_per_m3[mat];
            return val != null ? formatIndianNumber(val, 2) : "-";
          },
        })
      ),
    ],
    [activeMaterials]
  );

  if (!sessionId) {
    return (
      <div>
        <PageHeader title="Production Summary" />
        <EmptyState
          icon={<Upload size={48} />}
          title="No data uploaded"
          description="Upload your data files to view production analysis."
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

  // Summary KPIs
  const totalBatches = productions.reduce((s, p) => s + p.batches, 0);
  const totalVolume = productions.reduce((s, p) => s + p.volume, 0);
  const avgBatchSize =
    totalBatches > 0 ? totalVolume / totalBatches : 0;

  return (
    <div>
      <PageHeader
        title="Production Summary"
        description="Batch production and material consumption per grade"
        actions={
          <MonthTabs
            months={monthsLoaded}
            selected={selectedMonth ?? ""}
            onSelect={setSelectedMonth}
          />
        }
      />

      {/* Summary KPIs */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <KPICard
            title="Total Batches"
            value={formatIndianNumber(totalBatches)}
            subtitle={`${productions.length} grades produced`}
            icon={<BarChart3 size={20} />}
            iconBg="bg-primary"
          />
          <KPICard
            title="Total Volume"
            value={formatVolume(totalVolume, 0)}
            icon={<Box size={20} />}
            iconBg="bg-success"
          />
          <KPICard
            title="Avg Batch Size"
            value={formatIndianNumber(avgBatchSize, 2) + " m\u00B3"}
            icon={<Layers size={20} />}
            iconBg="bg-info"
          />
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader
          title="Grade-wise Production"
          actions={
            <span className="text-xs text-text-secondary">
              {productions.length} grades
            </span>
          }
        />
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={8} cols={8} />
          </div>
        ) : (
          <>
            <DataTable data={productions} columns={columns} />
            {productions.length > 0 && (
              <div className="border-t border-border bg-gray-50 px-5 py-3 flex items-center justify-between font-semibold text-sm">
                <span className="text-text-primary">Total ({productions.length} grades)</span>
                <div className="flex items-center gap-6">
                  <span className="text-text-secondary">{productions.reduce((s, p) => s + p.batches, 0)} batches</span>
                  <span className="text-text-primary">{formatVolume(totalVolume, 0)} m³</span>
                  <span className="text-text-secondary">{formatIndianNumber(avgBatchSize, 2)} m³ avg</span>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
