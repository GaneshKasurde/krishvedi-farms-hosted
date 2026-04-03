import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  IndianRupee,
  TrendingUp,
  Box,
  Upload,
  TrendingDown,
  FileDown,
} from "lucide-react";
import { useHostedOverview, useHostedItems, useHostedParties, useHostedUpload, useReportStatus } from "../api/hosted_queries";
import { formatCurrency } from "../lib/formatters";
import { DonutChart, BarChartComponent, ChartCard } from "../components/Charts";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: reportStatus, isLoading: statusLoading } = useReportStatus();
  const { data: overview, isLoading: overviewLoading } = useHostedOverview(null);
  const { data: itemsData, isLoading: itemsLoading } = useHostedItems("all");
  const { data: partiesData, isLoading: partiesLoading } = useHostedParties("all");
  const uploadMutation = useHostedUpload();

  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      await uploadMutation.mutateAsync({ file });
      // Refresh data
      window.location.reload();
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // If no data, show upload prompt
  if (!reportStatus?.has_data && !statusLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Upload className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No Report Data</h2>
          <p className="text-gray-500 mb-6">Upload an Excel file to view the dashboard</p>
          
          <label className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg cursor-pointer transition">
            <Upload size={20} />
            <span>Upload Excel File</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
          {uploading && <p className="mt-4 text-gray-500">Uploading...</p>}
        </div>
      </div>
    );
  }

  const currentKPI = overview?.monthly?.[0];

  if (overviewLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!currentKPI) {
    return <div>No data available</div>;
  }

  const margin = currentKPI.sales ? ((currentKPI.gross_profit / currentKPI.sales) * 100).toFixed(1) : "0";

  const topItems = (itemsData?.items ?? [])
    .sort((a: any, b: any) => (b.sales || 0) - (a.sales || 0))
    .slice(0, 5);

  const topParties = (partiesData?.parties ?? [])
    .sort((a: any, b: any) => (b.sales || 0) - (a.sales || 0))
    .slice(0, 5);

  // Chart data
  const profitPieData = topParties.map((p: any) => ({
    name: String(p.party || "Unknown").substring(0, 12),
    value: p.gross_profit || 0,
  }));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        
        {/* Upload button */}
        <label className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg cursor-pointer transition text-sm">
          <Upload size={16} />
          <span>Update Data</span>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
          <div className="text-gray-500 text-xs uppercase">Opening</div>
          <div className="text-lg font-bold text-gray-800">{formatCurrency(currentKPI.opening_balance)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
          <div className="text-gray-500 text-xs uppercase">Sales</div>
          <div className="text-lg font-bold text-green-600">{formatCurrency(currentKPI.sales)}</div>
          <div className="text-xs text-gray-400">{currentKPI.unique_parties} parties</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
          <div className="text-gray-500 text-xs uppercase">Purchase</div>
          <div className="text-lg font-bold text-red-600">{formatCurrency(currentKPI.purchases)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
          <div className="text-gray-500 text-xs uppercase">Profit</div>
          <div className="text-lg font-bold text-blue-600">{formatCurrency(currentKPI.gross_profit)}</div>
          <div className="text-xs text-gray-400">{margin}% margin</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
          <div className="text-gray-500 text-xs uppercase">Closing</div>
          <div className="text-lg font-bold text-gray-800">{formatCurrency(currentKPI.closing_balance)}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Top Parties by Profit">
          {profitPieData.length > 0 ? (
            <div className="h-64 flex items-center justify-center">
              <DonutChart data={profitPieData} />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">No data</div>
          )}
        </ChartCard>

        <ChartCard title="Top Items by Sales">
          {topItems.length > 0 ? (
            <div className="h-64">
              <BarChartComponent
                height={240}
                data={topItems.map((i: any) => ({
                  name: String(i.item || "Unknown").substring(0, 12),
                  sales: i.sales || 0,
                }))}
                bars={[{ key: "sales", name: "Sales", color: "#1cc88a" }]}
              />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">No data</div>
          )}
        </ChartCard>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-700">Top Items</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left text-gray-500">Item</th>
                <th className="px-4 py-2 text-right text-gray-500">Sales</th>
              </tr>
            </thead>
            <tbody>
              {topItems.map((item: any, i: number) => (
                <tr key={i} className="border-b">
                  <td className="px-4 py-2">{item.item || "Unknown"}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(item.sales || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-700">Top Parties</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left text-gray-500">Party</th>
                <th className="px-4 py-2 text-right text-gray-500">Sales</th>
                <th className="px-4 py-2 text-right text-gray-500">Profit</th>
              </tr>
            </thead>
            <tbody>
              {topParties.map((party: any, i: number) => (
                <tr key={i} className="border-b">
                  <td className="px-4 py-2">{party.party || "Unknown"}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(party.sales || 0)}</td>
                  <td className="px-4 py-2 text-right text-green-600">{formatCurrency(party.gross_profit || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}