import { useState, useEffect } from "react";
import { FileSpreadsheet, RefreshCw, FileDown, DollarSign, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { useSession } from "../context/SessionContext";
import { useKrishvediIncomeStatement } from "../api/queries";
import { PageHeader, Card, EmptyState } from "../components/Layout";
import { formatCurrency, formatPercent } from "../lib/formatters";
import { exportTableToPDF } from "../lib/exportPdf";
import { MonthTabs } from "../components/MonthSelector";

const INCOME_ROWS = [
  { id: "header_trading", label: "TRADING ACCOUNT", type: "section" as const },
  { id: "opening_stock", label: "Opening Stock", type: "detail" as const },
  { id: "purchases", label: "Add: Purchases", type: "detail" as const },
  { id: "consumption", label: "Add: Consumption", type: "detail" as const },
  { id: "total_available", label: "Total Available", type: "subtotal" as const },
  { id: "sales", label: "Less: Sales", type: "detail" as const },
  { id: "closing_stock", label: "Closing Stock", type: "detail" as const },
  { id: "gross_profit", label: "Gross Profit", type: "highlight" as const },
];

const EXPANDABLE_TYPES = ["detail"];

export default function KrishvediIncomeStatementPage() {
  const { sessionId, isLoading: sessionLoading } = useSession();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedView, setSelectedView] = useState<string>("all");
  const [incomeMonth, setIncomeMonth] = useState<string | null>(null);
  const [incomeMonths, setIncomeMonths] = useState<string[]>([]);

  const { data: incomeData, isLoading } = useKrishvediIncomeStatement(sessionId, incomeMonth, refreshKey);

  useEffect(() => {
    if (incomeData?.months) {
      setIncomeMonths(incomeData.months);
    }
  }, [incomeData]);

  const formatMonth = (monthStr: string) => {
    if (!monthStr || monthStr === "NaN" || monthStr === "NaT" || monthStr === "undefined" || monthStr === "null") return "Unknown";
    if (/^\d{4}-\d{1,2}$/.test(monthStr)) {
      const [year, month] = monthStr.split("-");
      const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const idx = parseInt(month) - 1;
      if (idx >= 0 && idx < 12) return `${names[idx]} ${year}`;
    }
    return monthStr;
  };

  const getRowClass = (type: string) => {
    switch (type) {
      case "section": return "bg-gradient-to-r from-gray-800 to-gray-900 text-white font-bold";
      case "subtotal": return "bg-gray-100 font-semibold";
      case "highlight": return "bg-gradient-to-r from-blue-50 to-blue-100 font-semibold";
      case "detail": return "";
      default: return "";
    }
  };

  const hasData = incomeData?.statement && incomeData.statement.length > 0;
  const months = incomeData?.months || [];
  const statement = incomeData?.statement || [];

  const getValue = (id: string) => statement.reduce((sum, s) => sum + (s[id] || 0), 0);
  const getMonthValue = (id: string, month: string) => {
    const data = statement.find((s: any) => s.month === month);
    return data ? data[id] || 0 : 0;
  };

  const getSelectedValue = (id: string) => {
    if (selectedView === "all") {
      return getValue(id);
    }
    return getMonthValue(id, selectedView);
  };

  const handleExport = () => {
    const headers = ["Particulars", ...months.map(formatMonth), "Total"];
    const data = INCOME_ROWS
      .filter(row => row.type !== "section")
      .map(row => {
        const rowData = [row.label];
        months.forEach(m => {
          const val = getMonthValue(row.id, m);
          rowData.push(val !== 0 ? val : "-");
        });
        rowData.push(getValue(row.id));
        return rowData;
      });
    exportTableToPDF("Krishvedi Income Statement", headers, data, `krishvedi-income-${new Date().toISOString().split('T')[0]}`);
  };

  const openingStock = getSelectedValue("opening_stock");
  const purchases = getSelectedValue("purchases");
  const consumption = getSelectedValue("consumption");
  const sales = getSelectedValue("sales");
  const closingStock = getSelectedValue("closing_stock");
  const grossProfit = getSelectedValue("gross_profit");
  const grossProfitPct = sales > 0 ? (grossProfit / sales) * 100 : 0;

  const totalAvailable = openingStock + purchases + consumption;
  const totalUsed = sales + closingStock;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Income Statement"
        description="Trading Account - Gross Profit Analysis"
        actions={
          <div className="flex gap-2">
            <MonthTabs
              months={incomeMonths}
              selected={incomeMonth ?? ""}
              onSelect={setIncomeMonth}
            />
            {hasData && (
              <button onClick={handleExport} className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-lg text-sm">
                <FileDown size={18} /> Export PDF
              </button>
            )}
            <button onClick={() => setRefreshKey(k => k + 1)} className="px-3 py-2 rounded-lg font-medium flex items-center gap-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300 text-sm">
              <RefreshCw size={18} /> Refresh
            </button>
          </div>
        }
      />

      {sessionLoading && (
        <Card>
          <div className="flex items-center justify-center p-12">
            <RefreshCw className="animate-spin mr-3 text-blue-600" size={32} />
            <span className="text-gray-500">Loading session...</span>
          </div>
        </Card>
      )}

      {!sessionLoading && isLoading && (
        <Card>
          <div className="flex items-center justify-center p-12">
            <RefreshCw className="animate-spin mr-3 text-blue-600" size={32} />
            <span className="text-gray-500">Loading data...</span>
          </div>
        </Card>
      )}

      {!sessionLoading && !isLoading && !hasData && (
        <Card>
          <EmptyState 
            icon={<BarChart3 size={64} />} 
            title="No Data Available" 
            description="Please upload data to view the Income Statement"
          />
        </Card>
      )}

      {hasData && (
        <>
          {/* KPI Cards */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">Key Performance Indicators</h3>
              <select 
                value={selectedView}
                onChange={(e) => setSelectedView(e.target.value)}
                className="border border-border rounded-lg px-3 py-1.5 text-sm bg-white"
              >
                <option value="all">All Time</option>
                {months.map(m => (
                  <option key={m} value={m}>{formatMonth(m)}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="text-green-600" size={18} />
                  <span className="text-sm font-semibold text-green-700">Sales</span>
                </div>
                <p className="text-xl font-bold text-text-primary">{formatCurrency(sales)}</p>
              </div>
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="text-red-600" size={18} />
                  <span className="text-sm font-semibold text-red-700">Purchases</span>
                </div>
                <p className="text-xl font-bold text-text-primary">{formatCurrency(purchases)}</p>
              </div>
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="text-blue-600" size={18} />
                  <span className="text-sm font-semibold text-blue-700">Gross Profit</span>
                </div>
                <p className={`text-xl font-bold ${grossProfit >= 0 ? 'text-success-dark' : 'text-danger'}`}>
                  {formatCurrency(grossProfit)}
                </p>
              </div>
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="text-purple-600" size={18} />
                  <span className="text-sm font-semibold text-purple-700">GP %</span>
                </div>
                <p className={`text-xl font-bold ${grossProfitPct >= 0 ? 'text-purple-600' : 'text-danger'}`}>
                  {formatPercent(grossProfitPct)}
                </p>
              </div>
            </div>
          </Card>

          {/* Income Statement Table */}
          <Card>
            <h3 className="text-lg font-semibold mb-4 px-4 pt-4">Trading Account</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left p-3 border min-w-[200px]">Particulars</th>
                    {months.map((m: string) => (
                      <th key={m} className="text-right p-3 border min-w-[120px]">{formatMonth(m)}</th>
                    ))}
                    <th className="text-right p-3 border bg-gray-200 min-w-[120px]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {INCOME_ROWS.map((row) => (
                    <tr key={row.id} className={getRowClass(row.type)}>
                      <td className="p-3 border">
                        {row.type === "section" ? <span className="font-bold">{row.label}</span> : row.label}
                      </td>
                      {months.map((m: string) => {
                        if (row.type === "section") return <td key={m} className="border"></td>;
                        const val = getMonthValue(row.id, m);
                        return <td key={m} className="p-3 text-right border">{val !== 0 ? formatCurrency(val) : "-"}</td>;
                      })}
                      <td className="p-3 text-right border bg-gray-50 font-semibold">
                        {row.type === "section" ? "" : formatCurrency(getValue(row.id))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}