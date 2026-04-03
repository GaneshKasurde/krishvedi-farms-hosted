import { useState } from "react";
import { Users, TrendingUp, DollarSign, FileDown } from "lucide-react";
import { useSession } from "../context/SessionContext";
import { useKrishvediParties } from "../api/queries";
import { PageHeader, Card, CardHeader, EmptyState } from "../components/Layout";
import { formatCurrency, formatVolume } from "../lib/formatters";
import { MonthTabs } from "../components/MonthSelector";
import { exportTableToPDF, exportPageToPDF } from "../lib/exportPdf";

export default function PartiesPage() {
  const { sessionId, monthsLoaded, selectedMonth, setSelectedMonth, isLoading: sessionLoading } = useSession();
  const { data: partiesData, isLoading } = useKrishvediParties(sessionId, selectedMonth);

  if (sessionLoading || !sessionId) {
    return (
      <div>
        <PageHeader title="Parties" description="Party-wise analysis" />
        <div className="flex items-center justify-center h-64">
          <div className="text-text-secondary">Loading...</div>
        </div>
      </div>
    );
  }

  const parties = partiesData?.parties || [];
  
  const totalSales = parties.reduce((sum: number, p: any) => sum + (p.sales || 0), 0);
  const totalProfit = parties.reduce((sum: number, p: any) => sum + (p.gross_profit || 0), 0);
  const totalQty = parties.reduce((sum: number, p: any) => sum + (p.qty || 0), 0);
  const avgProfitMargin = totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : "0";

  const topParties = parties.slice(0, 5);

  const handleExportAll = () => {
    const headers = ["Party", "Sales", "Qty Sold", "Profit", "Margin %"];
    const data = parties.map(p => {
      const margin = p.sales > 0 ? ((p.gross_profit || 0) / p.sales * 100).toFixed(1) : "0";
      return [
        p.party,
        p.sales,
        p.qty || 0,
        p.gross_profit || 0,
        margin
      ];
    });
    exportTableToPDF("All Parties Report", headers, data, `all-parties-${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPagePDF = () => {
    const headers = ["Metric", "Value"];
    const data = [
      { Metric: "Total Sales", Value: totalSales },
      { Metric: "Total Parties", Value: parties.length },
      { Metric: "Gross Profit", Value: totalProfit },
      { Metric: "Total Qty", Value: totalQty },
      { Metric: "Profit Margin", Value: `${avgProfitMargin}%` },
    ];
    exportPageToPDF("Parties Page", selectedMonth || "All", headers, data);
  };

  return (
    <div id="parties-page-content">
      <PageHeader
        title="Parties Analysis"
        description="Party-wise sales and profit analysis"
        actions={
          <div className="flex gap-2">
            {parties.length > 0 && (
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
          <div className="p-3 bg-blue-100 rounded-xl mb-3">
            <Users className="text-blue-600" size={24} />
          </div>
          <p className="text-sm font-medium text-text-secondary mb-1">Total Parties</p>
          <p className="text-xl font-bold text-text-primary">{parties.length}</p>
        </Card>
        <Card className="p-5 flex flex-col items-center justify-center text-center min-h-[100px]">
          <div className="p-3 bg-purple-100 rounded-xl mb-3">
            <TrendingUp className="text-purple-600" size={24} />
          </div>
          <p className="text-sm font-medium text-text-secondary mb-1">Gross Profit</p>
          <p className="text-xl font-bold text-text-primary">{formatCurrency(totalProfit)}</p>
        </Card>
        <Card className="p-5 flex flex-col items-center justify-center text-center min-h-[100px]">
          <div className="p-3 bg-orange-100 rounded-xl mb-3">
            <DollarSign className="text-orange-600" size={24} />
          </div>
          <p className="text-sm font-medium text-text-secondary mb-1">Profit Margin</p>
          <p className="text-xl font-bold text-text-primary">{avgProfitMargin}%</p>
        </Card>
      </div>

      {/* Full Parties Matrix Table */}
      <Card>
        <CardHeader title="All Parties Matrix" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase bg-gray-50">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase bg-gray-50">Party</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase bg-gray-50">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase bg-gray-50">Total Sales</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase bg-gray-50">Gross Profit</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase bg-gray-50">Margin %</th>
                </tr>
              </thead>
              <tbody>
                {parties.map((party: any, idx: number) => {
                  const margin = party.sales > 0 ? ((party.gross_profit || 0) / party.sales * 100).toFixed(1) : "0";
                  return (
                    <tr key={idx} className="border-b border-border/50 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-text-secondary">{idx + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-text-primary">{party.party}</td>
                      <td className="px-4 py-3 text-sm text-right text-text-primary">{formatVolume(party.qty)}</td>
                      <td className="px-4 py-3 text-sm text-right text-text-primary">{formatCurrency(party.sales)}</td>
                      <td className="px-4 py-3 text-sm text-right text-text-primary">{formatCurrency(party.gross_profit || 0)}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className={parseFloat(margin) >= 0 ? "text-success-dark" : "text-danger"}>
                          {margin}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {parties.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-text-secondary">No data</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
    </div>
  );
}
