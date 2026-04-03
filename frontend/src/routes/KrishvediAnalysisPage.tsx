import { useState } from "react";
import { TrendingUp, TrendingDown, Package, Users, DollarSign, BarChart3, PieChart, Activity } from "lucide-react";
import { useSession } from "../context/SessionContext";
import { useKrishvediOverview, useKrishvediItems, useKrishvediParties } from "../api/queries";
import { PageHeader, Card, CardHeader } from "../components/Layout";
import { BarChartComponent, AreaChartComponent, DonutChart } from "../components/Charts";
import { formatCurrency, formatVolume } from "../lib/formatters";
import { MonthTabs } from "../components/MonthSelector";

export default function KrishvediAnalysisPage() {
  const { sessionId, monthsLoaded, selectedMonth, setSelectedMonth, isLoading: sessionLoading } = useSession();
  
  const { data: overview } = useKrishvediOverview(sessionId, selectedMonth);
  const { data: itemsData } = useKrishvediItems(sessionId, selectedMonth, "all");
  const { data: partiesData } = useKrishvediParties(sessionId, selectedMonth);

  if (sessionLoading || !sessionId) {
    return (
      <div>
        <PageHeader title="Additional Analysis" description="Deep dive insights" />
        <div className="flex items-center justify-center h-64">
          <div className="text-text-secondary">Loading...</div>
        </div>
      </div>
    );
  }

  const items = itemsData?.items || [];
  const parties = partiesData?.parties || [];
  const allMonths = overview?.all_months || [];

  // Calculate additional metrics
  const totalSales = items.reduce((sum: number, i: any) => sum + (i.sales || 0), 0);
  const totalProfit = items.reduce((sum: number, i: any) => sum + (i.gross_profit || 0), 0);
  const profitMargin = totalSales > 0 ? (totalProfit / totalSales * 100) : 0;

  // Top profitable items
  const topProfitableItems = [...items].sort((a, b) => (b.gross_profit || 0) - (a.gross_profit || 0)).slice(0, 8);
  
  // Top profitable parties
  const topProfitableParties = [...parties].sort((a, b) => (b.gross_profit || 0) - (a.gross_profit || 0)).slice(0, 8);

  // Low performing items (negative margin)
  const lowPerfItems = items.filter((i: any) => (i.gross_profit || 0) < 0).slice(0, 5);

  // Monthly trend data
  const monthlyData = allMonths.map((month: string) => {
    const monthData = overview?.chart_data?.find((d: any) => d.month === month);
    return {
      name: month,
      sales: monthData?.sales || 0,
      profit: monthData ? (monthData.sales - monthData.purchase) : 0,
    };
  });

  // Sales by category (mock - can be enhanced with real data)
  const categoryData = [
    { name: "Vegetables", value: totalSales * 0.4 },
    { name: "Fruits", value: totalSales * 0.3 },
    { name: "Dairy", value: totalSales * 0.2 },
    { name: "Other", value: totalSales * 0.1 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Additional Analysis"
        description="Deep dive insights & analytics"
        actions={
          <MonthTabs months={monthsLoaded} selected={selectedMonth ?? ""} onSelect={setSelectedMonth} />
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Total Revenue</p>
              <p className="text-lg font-bold text-text-primary">{formatCurrency(totalSales)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Gross Profit</p>
              <p className="text-lg font-bold text-text-primary">{formatCurrency(totalProfit)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Profit Margin</p>
              <p className="text-lg font-bold text-text-primary">{profitMargin.toFixed(1)}%</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Package className="text-orange-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Total Items</p>
              <p className="text-lg font-bold text-text-primary">{items.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Row 1: Monthly Trend & Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Monthly Sales & Profit Trend" />
          <div className="h-64">
            <AreaChartComponent
              height={240}
              data={monthlyData}
              areas={[
                { key: "sales", name: "Sales", color: "#1cc88a" },
                { key: "profit", name: "Profit", color: "#4e73df" },
              ]}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Sales by Category" />
          <div className="h-64 flex items-center justify-center">
            <DonutChart
              data={categoryData}
              colors={["#1cc88a", "#4e73df", "#f6c23e", "#e74a3b"]}
            />
          </div>
        </Card>
      </div>

      {/* Row 2: Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Top Profitable Items" />
          <div className="h-64">
            <BarChartComponent
              height={240}
              data={topProfitableItems.map((i: any) => ({
                name: String(i.item).substring(0, 15),
                sales: i.gross_profit || 0,
              }))}
              bars={[{ key: "sales", name: "Profit", color: "#1cc88a" }]}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Top Profitable Parties" />
          <div className="h-64">
            <BarChartComponent
              height={240}
              data={topProfitableParties.map((p: any) => ({
                name: String(p.party).substring(0, 15),
                sales: p.gross_profit || 0,
              }))}
              bars={[{ key: "sales", name: "Profit", color: "#4e73df" }]}
            />
          </div>
        </Card>
      </div>

      {/* Row 3: Low Performance & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Items Needing Attention (Loss)" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary">Item</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-text-secondary">Sales</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-text-secondary">Profit</th>
                </tr>
              </thead>
              <tbody>
                {lowPerfItems.map((item: any, idx: number) => (
                  <tr key={idx} className="border-b border-border/50">
                    <td className="px-3 py-2 text-xs">{item.item}</td>
                    <td className="px-3 py-2 text-xs text-right">{formatCurrency(item.sales)}</td>
                    <td className="px-3 py-2 text-xs text-right text-danger">{formatCurrency(item.gross_profit)}</td>
                  </tr>
                ))}
                {lowPerfItems.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-center text-xs text-text-secondary">No loss items</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Key Insights" />
          <div className="p-4 space-y-3">
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <TrendingUp className="text-green-600 mt-0.5" size={16} />
              <div>
                <p className="text-sm font-medium text-green-800">Top Performer</p>
                <p className="text-xs text-green-700">{topProfitableItems[0]?.item || "N/A"} - {formatCurrency(topProfitableItems[0]?.gross_profit || 0)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <Users className="text-blue-600 mt-0.5" size={16} />
              <div>
                <p className="text-sm font-medium text-blue-800">Top Party</p>
                <p className="text-xs text-blue-700">{topProfitableParties[0]?.party || "N/A"} - {formatCurrency(topProfitableParties[0]?.gross_profit || 0)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
              <Activity className="text-purple-600 mt-0.5" size={16} />
              <div>
                <p className="text-sm font-medium text-purple-800">Overall Health</p>
                <p className="text-xs text-purple-700">{profitMargin >= 10 ? "Excellent" : profitMargin >= 5 ? "Good" : "Needs Improvement"} ({profitMargin.toFixed(1)}% margin)</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}