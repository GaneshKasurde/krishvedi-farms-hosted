import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../../api'
import { useMonth } from './ClientLayout'

interface PartyData {
  party: string
  sales: number
  purchase: number
  gross_profit: number
}

const formatLakhs = (value: number) => (value / 100000).toFixed(2) + ' L'

export default function CustomersPage() {
  const { month, setMonth } = useMonth()
  const [parties, setParties] = useState<PartyData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [months, setMonths] = useState<string[]>([])

  useEffect(() => {
    fetchData()
  }, [month])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [partiesRes, overviewRes] = await Promise.all([
        api.get(`/api/dashboard/parties?month=${month}`),
        api.get('/api/dashboard/overview')
      ])
      setParties(partiesRes.data)
      setMonths(overviewRes.data.months || [])
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>
  if (error) return <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">{error}</div>

  const topCustomers = parties.slice(0, 15)
  const totalSales = parties.reduce((sum, p) => sum + p.sales, 0)
  const totalPurchase = parties.reduce((sum, p) => sum + p.purchase, 0)
  const totalGP = parties.reduce((sum, p) => sum + p.gross_profit, 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Customers</h1>
        <select value={month} onChange={(e) => setMonth(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg">
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Top Customers by Sales</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={topCustomers}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="party" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => (v / 100000).toFixed(1) + 'L'} />
            <Tooltip formatter={(value: number) => '₹ ' + formatLakhs(value)} />
            <Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Customer</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Total Sales</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Total Purchase</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Gross Profit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {parties.map((party, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-800 font-medium">{party.party}</td>
                <td className="px-4 py-3 text-sm text-gray-600 text-right">₹ {formatLakhs(party.sales)}</td>
                <td className="px-4 py-3 text-sm text-gray-600 text-right">₹ {formatLakhs(party.purchase)}</td>
                <td className="px-4 py-3 text-sm text-gray-600 text-right">₹ {formatLakhs(party.gross_profit)}</td>
              </tr>
            ))}
              </tbody>
            <tfoot className="bg-gray-100 font-semibold">
              <tr>
                <td className="px-4 py-3 text-gray-800">Total</td>
                <td className="px-4 py-3 text-gray-800 text-right">₹ {formatLakhs(totalSales)}</td>
                <td className="px-4 py-3 text-gray-800 text-right">₹ {formatLakhs(totalPurchase)}</td>
                <td className="px-4 py-3 text-gray-800 text-right">₹ {formatLakhs(totalGP)}</td>
              </tr>
            </tfoot>
          </table>
      </div>
    </div>
  )
}