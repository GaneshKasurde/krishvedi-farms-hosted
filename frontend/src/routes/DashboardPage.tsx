import { useState } from "react";
import {
  IndianRupee,
  TrendingUp,
  Box,
  Upload,
  TrendingDown,
  FileDown,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import KPICard from "../components/KPICard";
import { PageHeader, EmptyState, Card, CardHeader } from "../components/Layout";
import { TableSkeleton } from "../components/DataTable";
import { BarChartComponent, LineChartComponent, AreaChartComponent, DonutChart, ChartCard } from "../components/Charts";
import { useSession } from "../context/SessionContext";
import { useKrishvediOverview, useKrishvediItems, useKrishvediParties } from "../api/queries";
import { formatCurrency, formatPercent, formatVolume } from "../lib/formatters";
import { exportTableToPDF } from "../lib/exportPdf";
import { formatMonthLabel, MonthTabs } from "../components/MonthSelector";

export default function DashboardPage() {
  const { sessionId, monthsLoaded, selectedMonth, setSelectedMonth, isLoading: sessionLoading } =
    useSession();
  
  const { data: overview, isLoading: overviewLoading } = useKrishvediOverview(sessionId, selectedMonth);
  const { data: itemsData, isLoading: itemsLoading } = useKrishvediItems(sessionId, selectedMonth, "all");
  const { data: partiesData, isLoading: partiesLoading } = useKrishvediParties(sessionId, selectedMonth);

  if (sessionLoading) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Krishvedi Farms Analysis" />
        <div className="flex items-center justify-center h-64">
          <div className="text-text-secondary">Loading session...</div>
        </div>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Krishvedi Farms Analysis" />
        <EmptyState
          icon={<Upload size={48} />}
          title="No data uploaded"
          description="Upload your Excel file to see the dashboard."
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

  const currentKPI = overview?.months?.[0];

  const daySalesData = (overview?.day_sales_data || []).filter((d: any) => {
    if (!selectedMonth) return true;
    return d.month === selectedMonth;
  });
  const profitPieData = overview?.profit_pie_data || [];

  const margin = currentKPI?.sales ? ((currentKPI.gross_profit / currentKPI.sales) * 100).toFixed(1) : "0";

  const topItems = (itemsData?.items ?? [])
    .sort((a: any, b: any) => b.sales - a.sales)
    .slice(0, 5);

  const topParties = (partiesData?.parties ?? [])
    .sort((a: any, b: any) => b.sales - a.sales)
    .slice(0, 5);

  const handleExportItems = () => {
    const headers = ["Item", "Sales", "Purchase"];
    const data = topItems.map(i => [i.item, i.sales, i.purchase]);
    exportTableToPDF("Top Items by Sales", headers, data, `top-items-${selectedMonth || 'all'}`);
  };

  const handleExportParties = () => {
    const headers = ["Party", "Sales", "Profit"];
    const data = topParties.map(p => [p.party, p.sales, p.gross_profit]);
    exportTableToPDF("Top Parties by Sales", headers, data, `top-parties-${selectedMonth || 'all'}`);
  };

  return (
    <div id="dashboard-page">
      <PageHeader
        title="Dashboard"
        description="Krishvedi Farms Analysis"
        actions={
          <div className="flex gap-2">
            {topItems.length > 0 && (
              <div className="relative group">
                <button className="px-3 py-1.5 rounded-lg font-medium flex items-center gap-2 bg-green-500 text-white hover:bg-green-600 text-sm">
                  <FileDown size={16} /> Export
                </button>
                <div className="absolute right-0 mt-1 w-40 bg-white border border-border rounded-lg shadow-lg hidden group-hover:block z-10">
                  <button onClick={handleExportItems} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-text-primary">
                    Items
                  </button>
                  <button onClick={handleExportParties} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-text-primary">
                    Parties
                  </button>
                </div>
              </div>
            )}
            <MonthTabs
              months={monthsLoaded}
              selected={selectedMonth ?? ""}
              onSelect={setSelectedMonth}
            />
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {overviewLoading ? (
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <KPICard key={i} title="" value="" />
            ))}
          </>
        ) : currentKPI ? (
          <>
            <KPICard
              title="Opening Balance"
              value={formatCurrency(currentKPI.opening_balance)}
              subtitle="From previous month"
              icon={<TrendingDown size={20} />}
              iconBg="bg-orange-500"
            />
            <KPICard
              title="Total Sales"
              value={formatCurrency(currentKPI.sales)}
              subtitle={`${currentKPI.unique_parties} parties`}
              icon={<IndianRupee size={20} />}
              iconBg="bg-primary"
            />
            <KPICard
              title="Total Purchase"
              value={formatCurrency(currentKPI.purchases)}
              subtitle={`${formatVolume(currentKPI.consumption)} consumed`}
              icon={<TrendingDown size={20} />}
              iconBg="bg-danger"
            />
            <KPICard
              title="Gross Profit"
              value={formatCurrency(currentKPI.gross_profit)}
              subtitle={`${margin}% margin`}
              icon={<TrendingUp size={20} />}
              iconBg="bg-success"
            />
            <KPICard
              title="Closing Balance"
              value={formatCurrency(currentKPI.closing_balance)}
              subtitle={`${currentKPI.unique_items} items`}
              icon={<Box size={20} />}
              iconBg="bg-info"
            />
          </>
        ) : (
          <>
            <KPICard title="Opening" value="-" subtitle="No data" icon={<TrendingDown size={20} />} iconBg="bg-gray-400" />
            <KPICard title="Sales" value="-" subtitle="No data" icon={<IndianRupee size={20} />} iconBg="bg-gray-400" />
            <KPICard title="Purchase" value="-" subtitle="No data" icon={<TrendingDown size={20} />} iconBg="bg-gray-400" />
            <KPICard title="Profit" value="-" subtitle="No data" icon={<TrendingUp size={20} />} iconBg="bg-gray-400" />
            <KPICard title="Balance" value="-" subtitle="No data" icon={<Box size={20} />} iconBg="bg-gray-400" />
          </>
        )}
      </div>

      {/* Charts Row 1 - Individual Expandable ChartCards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Top 5 Parties by Gross Profit">
          {profitPieData.length > 0 ? (
            <div className="h-64 flex items-center justify-center">
              <DonutChart
                data={profitPieData.map((p: any) => ({
                  name: String(p.party).substring(0, 12),
                  value: p.profit,
                }))}
                colors={["#1cc88a", "#4e73df", "#f6c23e", "#e74a3b", "#36b9cc"]}
              />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-text-secondary">No profit data</div>
          )}
        </ChartCard>

        <ChartCard title="Day-wise Sales Trend">
          {daySalesData.length > 0 ? (
            <div className="h-64 w-full">
              <AreaChartComponent
                height={240}
                data={daySalesData.map((d: any) => ({
                  name: d.day.toString(),
                  sales: d.sales,
                }))}
                areas={[{ key: "sales", name: "Daily Sales", color: "#36b9cc" }]}
              />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-text-secondary">No data</div>
          )}
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {itemsData?.items && itemsData.items.length > 0 && (
          <ChartCard title="Top Items - Sales Share">
            <div className="h-64 w-full">
              <BarChartComponent
                height={240}
                data={topItems.map((i: any) => ({
                  name: String(i.item).substring(0, 12),
                  sales: i.sales,
                }))}
                bars={[{ key: "sales", name: "Sales", color: "#1cc88a" }]}
              />
            </div>
          </ChartCard>
        )}
        {partiesData?.parties && partiesData.parties.length > 0 && (
          <ChartCard title="Top Parties - Sales Share">
            <div className="h-64 w-full">
              <BarChartComponent
                height={240}
                data={topParties.map((p: any) => ({
                  name: String(p.party).substring(0, 12),
                  sales: p.sales,
                }))}
                bars={[{ key: "sales", name: "Sales", color: "#4e73df" }]}
              />
            </div>
          </ChartCard>
        )}
      </div>

      {/* Matrix Tables - Without Expand */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <Card>
          <CardHeader title="Top 5 Items by Sales" />
          {itemsLoading ? (
            <div className="p-3">
              <TableSkeleton rows={5} cols={3} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-text-secondary uppercase bg-gray-50">
                      Item
                    </th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold text-text-secondary uppercase bg-gray-50">
                      Sales
                    </th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold text-text-secondary uppercase bg-gray-50">
                      Purchase
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topItems.map((item: any) => (
                    <tr
                      key={item.item}
                      className="border-b border-border/50 hover:bg-gray-50/50"
                    >
                      <td className="px-3 py-2 text-xs font-medium text-text-primary">
                        {item.item}
                      </td>
                      <td className="px-3 py-2 text-xs text-right text-text-primary">
                        {formatCurrency(item.sales)}
                      </td>
                      <td className="px-3 py-2 text-xs text-right text-text-primary">
                        {formatCurrency(item.purchase)}
                      </td>
                    </tr>
                  ))}
                  {topItems.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-center text-xs text-text-secondary">
                        No item data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Top 5 Parties by Sales" />
          {partiesLoading ? (
            <div className="p-3">
              <TableSkeleton rows={5} cols={3} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-text-secondary uppercase bg-gray-50">
                      Party
                    </th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold text-text-secondary uppercase bg-gray-50">
                      Sales
                    </th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold text-text-secondary uppercase bg-gray-50">
                      Profit
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topParties.map((party: any) => (
                    <tr
                      key={party.party}
                      className="border-b border-border/50 hover:bg-gray-50/50"
                    >
                      <td className="px-3 py-2 text-xs font-medium text-text-primary">
                        {party.party}
                      </td>
                      <td className="px-3 py-2 text-xs text-right text-text-primary">
                        {formatCurrency(party.sales)}
                      </td>
                      <td className="px-3 py-2 text-xs text-right">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            party.gross_profit >= 0
                              ? "bg-success/10 text-success-dark"
                              : "bg-danger/10 text-danger"
                          }`}
                        >
                          {formatCurrency(party.gross_profit)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {topParties.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-center text-xs text-text-secondary">
                        No party data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}