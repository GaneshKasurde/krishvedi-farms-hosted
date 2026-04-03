import { useState } from "react";
import { FileSpreadsheet, CheckCircle, AlertCircle, RefreshCw, ChevronRight, X, FileDown, TrendingUp, TrendingDown, AlertTriangle, DollarSign, BarChart3 } from "lucide-react";
import { useSession } from "../context/SessionContext";
import { useIncomeStatement, useExpenseDetailsMulti } from "../api/queries";
import { PageHeader, Card, EmptyState } from "../components/Layout";
import { formatCurrency } from "../lib/formatters";
import { exportTableToPDF } from "../lib/exportPdf";

const TAX_RATE = 0.25168;

const INCOME_ROWS = [
  { id: "header_income", label: "INCOME", type: "section" as const },
  { id: "revenue", label: "Sales / Revenue", type: "detail" as const, section: "revenue" },
  { id: "opening_inventory", label: "Revenue Opening Inventory", type: "manual" as const },
  { id: "other_income", label: "Other Income", type: "detail" as const, section: "other_income" },
  { id: "total_income", label: "Total Income", type: "subtotal" as const },
  
  { id: "header_expenses", label: "EXPENSES", type: "section" as const },
  { id: "purchases", label: "Purchases", type: "detail" as const, section: "purchases" },
  { id: "cogs", label: "Cost of Goods Sold (COGS)", type: "manual" as const },
  { id: "direct_expenses", label: "Direct Expenses", type: "detail" as const, section: "direct_expenses" },
  { id: "total_direct_expenses", label: "Total Direct Expenses", type: "subtotal" as const },
  { id: "indirect_expenses", label: "Indirect Expenses", type: "detail" as const, section: "indirect_expenses" },
  { id: "total_expenses", label: "Total Expenses", type: "subtotal" as const },
  
  { id: "ebitda", label: "EBITDA / PBITDA", type: "highlight" as const },
  { id: "depreciation", label: "Depreciation", type: "auto" as const },
  { id: "ebit", label: "EBIT / PBIT", type: "highlight" as const },
  { id: "interest", label: "Interest Expense", type: "auto" as const },
  { id: "pbt", label: "Profit Before Tax (PBT)", type: "highlight" as const },
  { id: "tax", label: "Tax (25.168%)", type: "calculated" as const },
  { id: "pat", label: "Profit After Tax (PAT)", type: "total" as const },
];

const EXPANDABLE_TYPES = ["detail"];

export default function IncomeStatementPage() {
  const { sessionId, isLoading: sessionLoading } = useSession();
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedRow, setExpandedRow] = useState<{ rowId: string; months: string[]; section: string } | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [showDebug, setShowDebug] = useState(false);

  const { data: incomeData, isLoading, refetch } = useIncomeStatement(sessionId, null, refreshKey);

  const { data: detailsData, isLoading: detailsLoading } = useExpenseDetailsMulti(
    sessionId,
    expandedRow?.months || [],
    expandedRow?.section || null
  );

  const toggleMonth = (month: string) => {
    if (expandedRow) {
      const newMonths = expandedRow.months.includes(month)
        ? expandedRow.months.filter(m => m !== month)
        : [...expandedRow.months, month];
      if (newMonths.length > 0) {
        setExpandedRow({ ...expandedRow, months: newMonths });
      }
    }
  };

  const getRowClass = (type: string) => {
    switch (type) {
      case "section": return "bg-gradient-to-r from-gray-800 to-gray-900 text-white font-bold";
      case "subtotal": return "bg-gray-100 font-semibold";
      case "total": return "bg-gradient-to-r from-green-100 to-green-200 font-bold text-green-900";
      case "highlight": return "bg-gradient-to-r from-blue-50 to-blue-100 font-semibold";
      case "manual": return "bg-yellow-50";
      case "auto": return "bg-purple-50";
      case "calculated": return "bg-orange-50";
      default: return "";
    }
  };

  const formatMonth = (monthStr: string) => {
    if (!monthStr || monthStr === "NaN" || monthStr === "NaT" || monthStr === "undefined" || monthStr === "null") return "Unknown";
    
    // Handle "2024-01" format (YYYY-MM)
    if (/^\d{4}-\d{1,2}$/.test(monthStr)) {
      const [year, month] = monthStr.split("-");
      const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthIndex = parseInt(month) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${names[monthIndex]} ${year}`;
      }
    }
    
    // Handle "2024-01-01" format (YYYY-MM-DD)
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(monthStr)) {
      const [year, month] = monthStr.split("-");
      const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthIndex = parseInt(month) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${names[monthIndex]} ${year}`;
      }
    }
    
    // Return as-is if format doesn't match
    return monthStr;
  };

  const hasData = incomeData?.statement && incomeData.statement.length > 0;
  const months = incomeData?.months || [];
  const statement = incomeData?.statement || [];

  const recalc = (data: any) => {
    const revenue = data?.revenue || 0;
    const other_income = data?.other_income || 0;
    const total_income = data?.total_income || (revenue + other_income);
    const purchases = data?.purchases || 0;
    const cogs = data?.cogs || 0;
    const direct_expenses = data?.direct_expenses || 0;
    const total_direct_expenses = data?.total_direct_expenses || (purchases + cogs + direct_expenses);
    const indirect_expenses = data?.indirect_expenses || 0;
    const total_expenses = data?.total_expenses || (total_direct_expenses + indirect_expenses);
    const ebitda = data?.ebitda || (total_income - total_expenses);
    const depreciation = data?.depreciation || 0;
    const ebit = data?.ebit || (ebitda - depreciation);
    const interest = data?.interest || 0;
    const pbt = data?.pbt || (ebit - interest);
    const tax = data?.tax || (pbt > 0 ? pbt * TAX_RATE : 0);
    const pat = data?.pat || (pbt - tax);
    return { revenue, other_income, total_income, purchases, cogs, direct_expenses, total_direct_expenses, indirect_expenses, total_expenses, ebitda, depreciation, ebit, interest, pbt, tax, pat };
  };

  const getValue = (id: string) => statement.reduce((sum, s) => sum + (recalc(s)[id] || 0), 0);
  const getMonthValue = (id: string, month: string) => {
    const data = statement.find((s: any) => s.month === month);
    return data ? recalc(data)[id] || 0 : 0;
  };

  const getSelectedValue = (id: string) => {
    if (selectedMonth === "all") {
      return getValue(id);
    }
    return getMonthValue(id, selectedMonth);
  };

  const handleExportIncomeStatement = () => {
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
    
    exportTableToPDF("Income Statement", headers, data, `income-statement-${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportDetail = () => {
    if (!detailsData || !expandedRow) return;
    
    const title = `${INCOME_ROWS.find(r => r.id === expandedRow.rowId)?.label || expandedRow.section} - ${expandedRow.months.map(formatMonth).join(", ")}`;
    const headers = detailsData.columns || [];
    const data = detailsData.data || [];
    
    exportTableToPDF(title, headers, data, `${expandedRow.section}-${expandedRow.months.join("-")}-${new Date().toISOString().split('T')[0]}`);
  };

  const revenue = getSelectedValue("revenue");
  const totalExpenses = getSelectedValue("total_expenses");
  const ebitda = getSelectedValue("ebitda");
  const pat = getSelectedValue("pat");
  const totalIncome = getSelectedValue("total_income");
  const grossProfit = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? ((pat / totalIncome) * 100).toFixed(1) : "0";
  const expenseRatio = revenue > 0 ? ((totalExpenses / revenue) * 100).toFixed(1) : "0";
  const ebitdaMargin = revenue > 0 ? ((ebitda / revenue) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Income Statement"
        description="Profit & Loss Overview"
        actions={
          <div className="flex gap-2">
            {hasData && (
              <button 
                onClick={handleExportIncomeStatement}
                className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-lg"
              >
                <FileDown size={18} /> Export PDF
              </button>
            )}
            <button onClick={() => refetch()} className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300">
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
            description="Please upload data files to view the Income Statement"
          />
        </Card>
      )}

      {showDebug && incomeData && (
        <Card className="bg-gray-900 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Debug Info</h3>
            <button onClick={() => setShowDebug(false)} className="text-white/70 hover:text-white">Close</button>
          </div>
          <div className="space-y-2 text-sm font-mono">
            <div>
              <span className="text-green-400">Raw months from API:</span>
              <pre className="bg-black/30 p-2 rounded mt-1 overflow-auto">{JSON.stringify(incomeData.months, null, 2)}</pre>
            </div>
            <div>
              <span className="text-green-400">Statement data:</span>
              <pre className="bg-black/30 p-2 rounded mt-1 overflow-auto max-h-60">{JSON.stringify(incomeData.statement, null, 2)}</pre>
            </div>
          </div>
        </Card>
      )}

      {hasData && (
        <>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">Key Performance Indicators</h3>
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
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
                  <span className="text-sm font-semibold text-green-700">Revenue</span>
                </div>
                <p className="text-xl font-bold text-text-primary">{formatCurrency(revenue)}</p>
              </div>
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="text-red-600" size={18} />
                  <span className="text-sm font-semibold text-red-700">Expenses</span>
                </div>
                <p className="text-xl font-bold text-text-primary">{formatCurrency(totalExpenses)}</p>
              </div>
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="text-blue-600" size={18} />
                  <span className="text-sm font-semibold text-blue-700">EBITDA</span>
                </div>
                <p className={`text-xl font-bold ${ebitda >= 0 ? 'text-success-dark' : 'text-danger'}`}>
                  {formatCurrency(ebitda)}
                </p>
              </div>
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="text-purple-600" size={18} />
                  <span className="text-sm font-semibold text-purple-700">PAT</span>
                </div>
                <p className={`text-xl font-bold ${pat >= 0 ? 'text-text-primary' : 'text-danger'}`}>
                  {formatCurrency(pat)}
                </p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-6">
            <Card>
              <h3 className="text-lg font-semibold mb-4">Income Statement</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left p-3 border w-10"></th>
                      <th className="text-left p-3 border min-w-[250px]">Particulars</th>
                      {months.map((m: string) => <th key={m} className="text-right p-3 border min-w-[150px]">{formatMonth(m)}</th>)}
                      <th className="text-right p-3 border bg-gray-200 min-w-[150px]">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {INCOME_ROWS.map((row) => (
                      <tr key={row.id} className={getRowClass(row.type)}>
                        <td className="p-2 border text-center">
                          {EXPANDABLE_TYPES.includes(row.type) && months.length > 0 && (
                            <button
                              onClick={() => setExpandedRow({
                                rowId: row.id,
                                months: [months[0]],
                                section: row.section || row.id
                              })}
                              className="p-1 hover:bg-white/50 rounded transition-colors"
                              title="View details"
                            >
                              <ChevronRight size={16} />
                            </button>
                          )}
                        </td>
                        <td className="p-3 border">{row.type === "section" ? <span className="font-bold">{row.label}</span> : row.label}</td>
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
          </div>
        </>
      )}

      {expandedRow && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <div>
                <h3 className="text-xl font-bold">{INCOME_ROWS.find(r => r.id === expandedRow.rowId)?.label || expandedRow.section}</h3>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {months.slice(0, 3).map((m) => (
                    <button
                      key={m}
                      onClick={() => toggleMonth(m)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        expandedRow.months.includes(m) 
                          ? 'bg-white text-blue-700 shadow-lg' 
                          : 'bg-blue-500 text-white hover:bg-blue-400'
                      }`}
                    >
                      {formatMonth(m)}
                    </button>
                  ))}
                  {months.length > 3 && (
                    <select
                      value=""
                      onChange={(e) => toggleMonth(e.target.value)}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500 text-white hover:bg-blue-400 cursor-pointer"
                    >
                      <option value="" disabled>More...</option>
                      {months.slice(3).map((m) => (
                        <option key={m} value={m}>{formatMonth(m)}</option>
                      ))}
                    </select>
                  )}
                  {expandedRow.months.length > 1 && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500 text-white shadow-lg">
                      Comparing {expandedRow.months.length} months
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleExportDetail}
                  className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 bg-green-500 text-white hover:bg-green-600 shadow-lg"
                >
                  <FileDown size={18} /> Export
                </button>
                <div className="text-right">
                  <p className="text-xs text-blue-200">Total</p>
                  <p className="text-xl font-bold">{formatCurrency(detailsData?.total || 0)}</p>
                </div>
                <button onClick={() => setExpandedRow(null)} className="p-2 hover:bg-blue-500 rounded-lg transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {detailsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw className="animate-spin mr-3 text-blue-600" size={32} />
                  <span className="text-gray-500">Loading data...</span>
                </div>
              ) : detailsData && detailsData.data && detailsData.data.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-inner bg-gray-50">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-100 to-gray-200 sticky top-0">
                        <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-300 sticky left-0 bg-gray-100 z-10 shadow-sm">#</th>
                        {detailsData.columns?.map((col: string) => (
                          <th key={col} className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-300 whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {detailsData.data.map((row: any, idx: number) => {
                        const isHighPct = row["% of Sales"] && row["% of Sales"] > 2;
                        return (
                          <tr 
                            key={idx} 
                            className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors ${isHighPct ? '!bg-red-50' : ''}`}
                          >
                            <td className="px-4 py-3 border-b border-gray-100 text-gray-400 sticky left-0 bg-inherit z-10">{idx + 1}</td>
                            {detailsData.columns?.map((col: string) => {
                              const isPctCol = col === "% of Sales";
                              const val = row[col];
                              const numVal = typeof val === 'number' ? val : 0;
                              return (
                                <td key={col} className={`px-4 py-3 border-b border-gray-100 ${isHighPct && isPctCol ? '!text-red-600 !font-bold' : ''}`}>
                                  {typeof val === 'number' ? (
                                    isPctCol ? (
                                      <span className={`font-medium ${isHighPct ? 'text-red-600 font-bold' : 'text-gray-800'}`}>
                                        {val.toFixed(2)}%
                                      </span>
                                    ) : col === "Qty" ? (
                                      <span className="font-medium text-gray-800">{numVal.toLocaleString()}</span>
                                    ) : (
                                      <span className="font-medium text-gray-800">{formatCurrency(numVal)}</span>
                                    )
                                  ) : (
                                    <span className="text-gray-700">{val || '-'}</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gradient-to-r from-blue-100 to-blue-200 font-bold">
                        <td className="px-4 py-3 border-t-2 border-blue-300 text-blue-800 sticky left-0 bg-blue-100 z-10 shadow-sm">Total</td>
                        {detailsData.columns?.map((col: string) => {
                          if (col === "% of Sales") {
                            return <td key={col} className="px-4 py-3 border-t-2 border-blue-300"><span className="text-blue-800">100%</span></td>;
                          }
                          if (col === "Qty") {
                            const totalQty = detailsData.data.reduce((sum: number, row: any) => sum + (row["Qty"] || 0), 0);
                            return <td key={col} className="px-4 py-3 border-t-2 border-blue-300"><span className="text-blue-800">{totalQty.toLocaleString()}</span></td>;
                          }
                          return <td key={col} className="px-4 py-3 border-t-2 border-blue-300"><span className="text-blue-800">{formatCurrency(detailsData.total || 0)}</span></td>;
                        })}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <FileSpreadsheet size={64} className="mb-4 opacity-50" />
                  <p className="text-lg">No data for selected month(s)</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
              <p className="text-sm text-gray-500">{detailsData?.data?.length || 0} records</p>
              {detailsData?.total_sales > 0 && (
                <p className="text-sm text-gray-500">Total Sales: {formatCurrency(detailsData.total_sales)}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
