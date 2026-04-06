import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts'
import api from '../../api'
import { useMonth } from './ClientLayout'
import { formatLakhs, formatNumber } from '../../utils/format'

interface OverviewData {
  total_sales: number
  total_purchase: number
  total_gross_profit: number
  gp_percentage: number
  months: string[]
  monthly_sales: { month: string; sales: number }[]
  monthly_purchase: { month: string; purchase: number }[]
}

export default function OverviewPage() {
  const { month, setMonth } = useMonth()
  const [data, setData] = useState<OverviewData | null>(null)
  const [incomeData, setIncomeData] = useState<{gross_profit: number; gross_profit_percentage: number} | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [month])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [overviewRes, incomeRes] = await Promise.all([
        api.get(`/api/dashboard/overview?month=${month}`),
        api.get(`/api/dashboard/income-statement?month=${month}`)
      ])
      setData(overviewRes.data)
      setIncomeData(incomeRes.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const exportPDF = () => {
    window.print()
  }

  const chartData = (data?.monthly_sales || []).map((s) => {
    const p = (data?.monthly_purchase || []).find(p => p.month === s.month)
    return { month: s.month, sales: s.sales, purchase: p?.purchase || 0 }
  })

  const totalSales = (data?.monthly_sales || []).reduce((sum, m) => sum + m.sales, 0)
  const totalPurchase = (data?.monthly_purchase || []).reduce((sum, m) => sum + m.purchase, 0)

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>
  if (error) return <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">{error}</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Overview Dashboard</h1>
        <div className="flex items-center gap-4">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            {data?.months.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <button onClick={exportPDF} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
            Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-blue-500">
          <p className="text-sm text-gray-500 mb-1">Total Sales</p>
          <p className="text-2xl font-bold text-gray-800">₹ {formatNumber(data?.total_sales || 0)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-orange-500">
          <p className="text-sm text-gray-500 mb-1">Total Purchase</p>
          <p className="text-2xl font-bold text-gray-800">₹ {formatNumber(data?.total_purchase || 0)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-green-500">
          <p className="text-sm text-gray-500 mb-1">Gross Profit</p>
          <p className="text-2xl font-bold text-gray-800">₹ {formatNumber(incomeData?.gross_profit || 0)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-purple-500">
          <p className="text-sm text-gray-500 mb-1">GP %</p>
          <p className="text-2xl font-bold text-gray-800">{incomeData?.gross_profit_percentage || 0}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Sales Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => (v / 100000).toFixed(1) + 'L'} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => '₹ ' + formatLakhs(value)} />
              <Legend />
              <Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} name="Sales" />
              <Bar dataKey="purchase" fill="#f97316" radius={[4, 4, 0, 0]} name="Purchase" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-2 flex justify-between text-sm text-gray-600 border-t pt-2">
            <span>Total Sales: <strong>₹ {formatLakhs(totalSales)}</strong></span>
            <span>Total Purchase: <strong>₹ {formatLakhs(totalPurchase)}</strong></span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Sales vs Purchase Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => (v / 100000).toFixed(1) + 'L'} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => '₹ ' + formatLakhs(value)} />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} name="Sales" />
              <Line type="monotone" dataKey="purchase" stroke="#f97316" strokeWidth={2} name="Purchase" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}