import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import api from '../../api'
import { useMonth } from './ClientLayout'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
const formatLakhs = (value: number) => (value / 100000).toFixed(2) + ' L'

export default function AnalysisPage() {
  const { month, setMonth } = useMonth()
  const [overview, setOverview] = useState<any>(null)
  const [income, setIncome] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [months, setMonths] = useState<string[]>([])

  useEffect(() => {
    fetchData()
  }, [month])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [overviewRes, itemsRes, incomeRes] = await Promise.all([
        api.get(`/api/dashboard/overview?month=${month}`),
        api.get(`/api/dashboard/items?month=${month}`),
        api.get(`/api/dashboard/income-statement?month=${month}`)
      ])
      setOverview(overviewRes.data)
      setItems(itemsRes.data.slice(0, 10))
      setIncome(incomeRes.data)
      setMonths(overviewRes.data.months || [])
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>
  if (error) return <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">{error}</div>

  const pieData = items.map(i => ({ name: i.item, value: i.sales }))

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Analysis</h1>
        <select value={month} onChange={(e) => setMonth(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg">
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Total Sales</p>
          <p className="text-xl font-bold">₹ {formatLakhs(overview?.total_sales || 0)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Total Purchase</p>
          <p className="text-xl font-bold">₹ {formatLakhs(overview?.total_purchase || 0)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Gross Profit</p>
          <p className="text-xl font-bold text-green-600">₹ {formatLakhs(income?.gross_profit || 0)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">GP %</p>
          <p className="text-xl font-bold text-blue-600">{income?.gross_profit_percentage || 0}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Top Items by Sales</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={items.slice(0, 8)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => (v / 100000).toFixed(1) + 'L'} />
              <YAxis dataKey="item" type="category" width={100} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: number) => '₹ ' + formatLakhs(value)} />
              <Bar dataKey="sales" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Sales Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
                {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(value: number) => '₹ ' + formatLakhs(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}