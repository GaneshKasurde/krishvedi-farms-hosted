import { useState } from "react";
import { Package, TrendingUp, TrendingDown, FileDown } from "lucide-react";
import { useSession } from "../context/SessionContext";
import { useKrishvediItems } from "../api/queries";
import { PageHeader, Card, CardHeader, EmptyState } from "../components/Layout";
import { formatCurrency, formatVolume } from "../lib/formatters";
import { MonthTabs } from "../components/MonthSelector";
import { exportTableToPDF, exportPageToPDF } from "../lib/exportPdf";

export default function ItemsPage() {
  const { sessionId, monthsLoaded, selectedMonth, setSelectedMonth, isLoading: sessionLoading } = useSession();
  const { data: itemsData, isLoading } = useKrishvediItems(sessionId, selectedMonth, "all");

  if (sessionLoading || !sessionId) {
    return (
      <div>
        <PageHeader title="Items" description="Item-wise analysis" />
        <div className="flex items-center justify-center h-64">
          <div className="text-text-secondary">Loading...</div>
        </div>
      </div>
    );
  }

  const items = itemsData?.items || [];
  
  const totalSales = items.reduce((sum: number, i: any) => sum + (i.sales || 0), 0);
  const totalPurchase = items.reduce((sum: number, i: any) => sum + (i.purchase || 0), 0);
  const totalQtyIn = items.reduce((sum: number, i: any) => sum + (i.qty_in || 0), 0);
  const totalQtyOut = items.reduce((sum: number, i: any) => sum + (i.qty_out || 0), 0);
  const grossProfit = totalSales - totalPurchase;

  const topItems = items.slice(0, 5);

  const handleExportAll = () => {
    const headers = ["Item", "Sales", "Purchase", "Qty In", "Qty Out", "Profit", "Margin %"];
    const data = items.map(i => {
      const margin = i.sales > 0 ? ((i.gross_profit || 0) / i.sales * 100).toFixed(1) : "0";
      return [
        i.item,
        i.sales,
        i.purchase,
        i.qty_in || 0,
        i.qty_out || 0,
        i.gross_profit || 0,
        margin
      ];
    });
    exportTableToPDF("All Items Report", headers, data, `all-items-${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPagePDF = () => {
    const headers = ["Metric", "Value"];
    const data = [
      { Metric: "Total Sales", Value: totalSales },
      { Metric: "Total Purchase", Value: totalPurchase },
      { Metric: "Gross Profit", Value: grossProfit },
      { Metric: "Total Qty In", Value: totalQtyIn },
      { Metric: "Total Qty Out", Value: totalQtyOut },
    ];
    exportPageToPDF("Items Page", selectedMonth || "All", headers, data);
  };

  return (
    <div id="items-page-content">
      <PageHeader
        title="Items Analysis"
        description="Item-wise sales and purchase analysis"
        actions={
          <div className="flex gap-2">
            {items.length > 0 && (
              <div className="relative group">
                <button className="px-3 py-1.5 rounded-lg font-medium flex items-center gap-2 bg-green-500 text-white hover:bg-green-600 text-sm">
                  <FileDown size={16} /> Export
                </button>
                <div className="absolute right-0 mt-1 w-40 bg-white border border-border rounded-lg shadow-lg hidden group-hover:block z-10">
                  <button onClick={handleExportPagePDF} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-text-primary">
                    This Page PDF
                  </button>
                  <button onClick={handleExportAll} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-text-primary">
                    All Data
                  </button>
                </div>
              </div>
            )}
            <MonthTabs months={monthsLoaded} selected={selectedMonth ?? ""} onSelect={setSelectedMonth} />
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-5 flex flex-col items-center justify-center text-center min-h-[100px]">
          <div className="p-3 bg-green-100 rounded-xl mb-3">
            <TrendingUp className="text-green-600" size={24} />
          </div>
          <p className="text-sm font-medium text-text-secondary mb-1">Total Sales</p>
          <p className="text-xl font-bold text-text-primary">{formatCurrency(totalSales)}</p>
        </Card>
        <Card className="p-5 flex flex-col items-center justify-center text-center min-h-[100px]">
          <div className="p-3 bg-red-100 rounded-xl mb-3">
            <TrendingDown className="text-red-600" size={24} />
          </div>
          <p className="text-sm font-medium text-text-secondary mb-1">Total Purchase</p>
          <p className="text-xl font-bold text-text-primary">{formatCurrency(totalPurchase)}</p>
        </Card>
        <Card className="p-5 flex flex-col items-center justify-center text-center min-h-[100px]">
          <div className="p-3 bg-blue-100 rounded-xl mb-3">
            <TrendingUp className="text-blue-600" size={24} />
          </div>
          <p className="text-sm font-medium text-text-secondary mb-1">Gross Profit</p>
          <p className="text-xl font-bold text-text-primary">{formatCurrency(grossProfit)}</p>
        </Card>
        <Card className="p-5 flex flex-col items-center justify-center text-center min-h-[100px]">
          <div className="p-3 bg-purple-100 rounded-xl mb-3">
            <Package className="text-purple-600" size={24} />
          </div>
          <p className="text-sm font-medium text-text-secondary mb-1">Total Items</p>
          <p className="text-xl font-bold text-text-primary">{items.length}</p>
        </Card>
      </div>

      {/* Full Items Matrix Table */}
      <Card>
        <CardHeader title="All Items Matrix" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase bg-gray-50">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase bg-gray-50">Item</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase bg-gray-50">Total Sales</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase bg-gray-50">Gross Profit</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase bg-gray-50">Margin %</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, idx: number) => {
                  const margin = item.sales > 0 ? ((item.gross_profit || 0) / item.sales * 100).toFixed(1) : "0";
                  return (
                    <tr key={idx} className="border-b border-border/50 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-text-secondary">{idx + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-text-primary">{item.item}</td>
                      <td className="px-4 py-3 text-sm text-right text-text-primary">{formatCurrency(item.sales)}</td>
                      <td className="px-4 py-3 text-sm text-right text-text-primary">{formatCurrency(item.gross_profit || 0)}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className={parseFloat(margin) >= 0 ? "text-success-dark" : "text-danger"}>
                          {margin}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-text-secondary">No data</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
    </div>
  );
}