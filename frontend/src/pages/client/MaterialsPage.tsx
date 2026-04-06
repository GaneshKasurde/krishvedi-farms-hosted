import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../../api'
import { useMonth } from './ClientLayout'

interface ItemData {
  item: string
  sales: number
  purchase: number
  gross_profit: number
  quantity: number
}

const formatLakhs = (value: number) => (value / 100000).toFixed(2) + ' L'

export default function MaterialsPage() {
  const { month, setMonth } = useMonth()
  const [items, setItems] = useState<ItemData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [months, setMonths] = useState<string[]>([])

  useEffect(() => {
    fetchItems()
  }, [month])

  const fetchItems = async () => {
    setLoading(true)
    try {
      const [itemsRes, overviewRes] = await Promise.all([
        api.get(`/api/dashboard/items?month=${month}`),
        api.get('/api/dashboard/overview')
      ])
      setItems(itemsRes.data)
      setMonths(overviewRes.data.months || [])
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>
  if (error) return <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">{error}</div>

  const topItems = items.slice(0, 15)
  const totalSales = items.reduce((sum, i) => sum + i.sales, 0)
  const totalPurchase = items.reduce((sum, i) => sum + i.purchase, 0)
  const totalGP = items.reduce((sum, i) => sum + i.gross_profit, 0)
  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Materials Analysis</h1>
        <select value={month} onChange={(e) => setMonth(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg">
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Top Materials by Sales</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={topItems}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="item" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => (v / 100000).toFixed(1) + 'L'} />
            <Tooltip formatter={(value: number) => '₹ ' + formatLakhs(value)} />
            <Bar dataKey="sales" fill="#10b981" name="Sales" />
            <Bar dataKey="purchase" fill="#f59e0b" name="Purchase" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Material</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Sales</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Purchase</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Gross Profit</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Quantity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-800">{item.item}</td>
                <td className="px-4 py-3 text-sm text-gray-600 text-right">₹ {formatLakhs(item.sales)}</td>
                <td className="px-4 py-3 text-sm text-gray-600 text-right">₹ {formatLakhs(item.purchase)}</td>
                <td className="px-4 py-3 text-sm text-gray-600 text-right">₹ {formatLakhs(item.gross_profit)}</td>
                <td className="px-4 py-3 text-sm text-gray-600 text-right">{item.quantity.toFixed(0)}</td>
              </tr>
            ))}
              </tbody>
            <tfoot className="bg-gray-100 font-semibold">
              <tr>
                <td className="px-4 py-3 text-gray-800">Total</td>
                <td className="px-4 py-3 text-gray-800 text-right">₹ {formatLakhs(totalSales)}</td>
                <td className="px-4 py-3 text-gray-800 text-right">₹ {formatLakhs(totalPurchase)}</td>
                <td className="px-4 py-3 text-gray-800 text-right">₹ {formatLakhs(totalGP)}</td>
                <td className="px-4 py-3 text-gray-800 text-right">{totalQty.toFixed(0)}</td>
              </tr>
            </tfoot>
          </table>
      </div>
    </div>
  )
}