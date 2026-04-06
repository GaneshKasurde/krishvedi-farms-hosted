import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import api from '../../api'

interface TrendData {
  month: string
  sales: number
  purchase: number
}

const formatLakhs = (value: number) => (value / 100000).toFixed(2) + ' L'

export default function TrendsPage() {
  const [data, setData] = useState<TrendData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchTrends()
  }, [])

  const fetchTrends = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/dashboard/overview?month=All')
      const monthlySales: {month: string; sales: number}[] = res.data.monthly_sales || []
      const monthlyPurchase: {month: string; purchase: number}[] = res.data.monthly_purchase || []
      const combined = monthlySales.map((s: {month: string; sales: number}) => ({
        month: s.month,
        sales: s.sales,
        purchase: monthlyPurchase.find((p: {month: string; purchase: number}) => p.month === s.month)?.purchase || 0
      }))
      setData(combined)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load trends')
    } finally {
      setLoading(false)
    }
  }

  const totalSales = data.reduce((sum, d) => sum + d.sales, 0)
  const totalPurchase = data.reduce((sum, d) => sum + d.purchase, 0)

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>
  if (error) return <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">{error}</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Trends Analysis</h1>
      
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Sales & Purchase Trend</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => (v / 100000).toFixed(1) + 'L'} />
            <Tooltip formatter={(value: number) => '₹ ' + formatLakhs(value)} />
            <Legend />
            <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} name="Sales" />
            <Line type="monotone" dataKey="purchase" stroke="#f97316" strokeWidth={2} name="Purchase" />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-4 flex justify-between text-sm border-t pt-2">
          <span>Total Sales: <strong>₹ {formatLakhs(totalSales)}</strong></span>
          <span>Total Purchase: <strong>₹ {formatLakhs(totalPurchase)}</strong></span>
        </div>
      </div>

      {data.length < 2 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">Upload data for at least 2 months to see trend analysis.</p>
        </div>
      )}
    </div>
  )
}