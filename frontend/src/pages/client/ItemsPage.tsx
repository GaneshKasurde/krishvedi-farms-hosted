import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import api from '../../api'
import { useMonth } from './ClientLayout'
import { formatLakhs, formatNumber } from '../../utils/format'

interface Item {
  item: string
  sales: number
  purchase: number
  gross_profit: number
  quantity: number
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export default function ItemsPage() {
  const { month, setMonth } = useMonth()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [months, setMonths] = useState<string[]>([])

  useEffect(() => {
    fetchItems()
  }, [month])

  const fetchItems = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/api/dashboard/items?month=${month}`)
      setItems(res.data)
      const overviewRes = await api.get('/api/dashboard/overview')
      setMonths(overviewRes.data.months || [])
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load items')
    } finally {
      setLoading(false)
    }
  }

  const topItems = items.slice(0, 10)
  const pieData = items.slice(0, 8).map(i => ({ name: i.item, value: i.sales }))
  const totalSales = items.reduce((sum, i) => sum + i.sales, 0)
  const totalPurchase = items.reduce((sum, i) => sum + i.purchase, 0)
  const totalGP = items.reduce((sum, i) => sum + i.gross_profit, 0)
  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0)

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>
  if (error) return <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">{error}</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Items Analysis</h1>
        <select value={month} onChange={(e) => setMonth(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Items by Sales</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topItems} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => (v / 100000).toFixed(1) + 'L'} />
              <YAxis dataKey="item" type="category" width={100} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: number) => '₹ ' + formatLakhs(value)} />
              <Bar dataKey="sales" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Sales Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(value: number) => '₹ ' + formatLakhs(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sales</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Purchase</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross Profit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-800 font-medium">{item.item}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-right">₹ {formatNumber(item.sales)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-right">₹ {formatNumber(item.purchase)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-right">₹ {formatNumber(item.gross_profit)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 text-right">{item.quantity.toFixed(0)}</td>
                </tr>
              ))}
              </tbody>
              <tfoot className="bg-gray-100 font-semibold">
                <tr>
                  <td className="px-6 py-3 text-gray-800">Total</td>
                  <td className="px-6 py-3 text-gray-800 text-right">₹ {formatNumber(totalSales)}</td>
                  <td className="px-6 py-3 text-gray-800 text-right">₹ {formatNumber(totalPurchase)}</td>
                  <td className="px-6 py-3 text-gray-800 text-right">₹ {formatNumber(totalGP)}</td>
                  <td className="px-6 py-3 text-gray-800 text-right">{totalQty.toFixed(0)}</td>
                </tr>
              </tfoot>
            </table>
        </div>
      </div>
    </div>
  )
}