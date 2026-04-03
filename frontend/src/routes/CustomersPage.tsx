import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { Users, Upload, ChevronRight, ChevronDown } from "lucide-react";
import DataTable, { TableSkeleton } from "../components/DataTable";
import {
  BarChartComponent,
  ChartCard,
  ChartSkeleton,
} from "../components/Charts";
import { PageHeader, EmptyState, Card, CardHeader } from "../components/Layout";
import { MonthTabs } from "../components/MonthSelector";
import { useSession } from "../context/SessionContext";
import { useCustomerAnalysis } from "../api/queries";
import {
  formatCurrency,
  formatPercent,
  formatVolume,
} from "../lib/formatters";
import type { CustomerAnalysis } from "../types/analysis";

const columnHelper = createColumnHelper<CustomerAnalysis>();

export default function CustomersPage() {
  const { sessionId, monthsLoaded, selectedMonth, setSelectedMonth } =
    useSession();
  const { data, isLoading } = useCustomerAnalysis(sessionId, selectedMonth);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (partyName: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [partyName]: !prev[partyName],
    }));
  };

  const columns = useMemo<ColumnDef<CustomerAnalysis, any>[]>(
    () => [
      columnHelper.display({
        id: "expand",
        header: "",
        cell: ({ row }) => (
          <button
            onClick={() => toggleRow(row.original.party_name)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            {expandedRows[row.original.party_name] ? (
              <ChevronDown size={16} className="text-text-secondary" />
            ) : (
              <ChevronRight size={16} className="text-text-secondary" />
            )}
          </button>
        ),
        size: 40,
      }),
      columnHelper.accessor("party_name", {
        header: "Customer",
        cell: (info) => (
          <span className="font-medium">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("grades", {
        header: "Grades",
        cell: (info) => {
          const grades = info.getValue();
          return (
            <div className="flex flex-wrap gap-1">
              {grades.slice(0, 3).map((g: string) => (
                <span
                  key={g}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary"
                >
                  {g}
                </span>
              ))}
              {grades.length > 3 && (
                <span className="text-[10px] text-text-secondary">
                  +{grades.length - 3} more
                </span>
              )}
            </div>
          );
        },
        enableSorting: false,
      }),
      columnHelper.accessor("volume", {
        header: "Volume",
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
    [expandedRows]
  );

  if (!sessionId) {
    return (
      <div>
        <PageHeader title="Customer Analysis" />
        <EmptyState
          icon={<Upload size={48} />}
          title="No data uploaded"
          description="Upload your data files to view customer analysis."
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

  const customers = data?.customers ?? [];

  // Top customers bar chart
  const barData = customers
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    .map((c) => ({
      customer: c.party_name.length > 20 ? c.party_name.slice(0, 20) + "..." : c.party_name,
      Revenue: c.revenue,
      Cost: c.cost,
    }));

  return (
    <div>
      <PageHeader
        title="Customer Analysis"
        description="Revenue and profitability by customer"
        actions={
          <MonthTabs
            months={monthsLoaded}
            selected={selectedMonth ?? ""}
            onSelect={setSelectedMonth}
          />
        }
      />

      {/* Chart */}
      <div className="mb-6">
        {isLoading ? (
          <ChartSkeleton height={350} />
        ) : (
          <ChartCard title="Top Customers by Revenue">
            {barData.length > 0 ? (
              <BarChartComponent
                data={barData}
                xKey="customer"
                bars={[
                  { key: "Revenue", name: "Revenue", color: "#4e73df" },
                  { key: "Cost", name: "Cost", color: "#e74a3b" },
                ]}
                height={350}
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
          title="Customer-wise Analysis"
          actions={
            <span className="text-xs text-text-secondary">
              {customers.length} customers
            </span>
          }
        />
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={10} cols={8} />
          </div>
        ) : (
          <>
            <DataTable
              data={customers}
              columns={columns}
              renderSubComponent={({ row }) => (
                <ExpandedGrades customer={row} />
              )}
            />
            {/* Render expanded rows manually below each row via CSS */}
            {customers.map(
              (c) =>
                expandedRows[c.party_name] && (
                  <div
                    key={c.party_name + "-detail"}
                    className="bg-gray-50 border-b border-border px-8 py-3"
                  >
                    <p className="text-xs font-semibold text-text-secondary uppercase mb-2">
                      Grades purchased by {c.party_name}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {c.grades.map((g) => (
                        <span
                          key={g}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white border border-border text-text-primary"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                )
            )}
            {customers.length > 0 && (
              <div className="border-t border-border bg-gray-50 px-5 py-3 flex items-center justify-between font-semibold text-sm">
                <span className="text-text-primary">Total ({customers.length} customers)</span>
                <div className="flex items-center gap-8">
                  <span className="text-text-secondary">{formatVolume(customers.reduce((s, c) => s + c.volume, 0))}</span>
                  <span className="text-text-primary w-32 text-right">{formatCurrency(customers.reduce((s, c) => s + c.revenue, 0))}</span>
                  <span className="text-text-primary w-24 text-right">{formatCurrency(customers.reduce((s, c) => s + c.cost, 0))}</span>
                  <span className={`w-24 text-right ${customers.reduce((s, c) => s + c.margin, 0) < 0 ? 'text-danger' : 'text-text-primary'}`}>{formatCurrency(customers.reduce((s, c) => s + c.margin, 0))}</span>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

function ExpandedGrades({ customer }: { customer: CustomerAnalysis }) {
  return (
    <div className="bg-gray-50 px-8 py-3">
      <p className="text-xs font-semibold text-text-secondary uppercase mb-2">
        Grades purchased
      </p>
      <div className="flex flex-wrap gap-2">
        {customer.grades.map((g) => (
          <span
            key={g}
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white border border-border text-text-primary"
          >
            {g}
          </span>
        ))}
      </div>
    </div>
  );
}
