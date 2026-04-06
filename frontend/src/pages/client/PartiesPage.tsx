import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../../api'
import { useMonth } from './ClientLayout'
import { formatLakhs, formatNumber } from '../../utils/format'

interface Party {
  party: string
  sales: number
  purchase: number
  gross_profit: number
}

export default function PartiesPage() {
  const { month, setMonth } = useMonth()
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [months, setMonths] = useState<string[]>([])

  useEffect(() => {
    fetchParties()
  }, [month])

  const fetchParties = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/api/dashboard/parties?month=${month}`)
      setParties(res.data)
      const overviewRes = await api.get('/api/dashboard/overview')
      setMonths(overviewRes.data.months || [])
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load parties')
    } finally {
      setLoading(false)
    }
  }

  const topParties = parties.slice(0, 10)
  const totalSales = parties.reduce((sum, p) => sum + p.sales, 0)
  const totalPurchase = parties.reduce((sum, p) => sum + p.purchase, 0)
  const totalGP = parties.reduce((sum, p) => sum + p.gross_profit, 0)

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>
  if (error) return <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">{error}</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Parties Analysis</h1>
        <select value={month} onChange={(e) => setMonth(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Parties by Sales</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={topParties}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="party" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => (v / 100000).toFixed(1) + 'L'} />
            <Tooltip formatter={(value: number) => '₹ ' + formatLakhs(value)} />
            <Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} name="Sales" />
            <Bar dataKey="purchase" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Purchase" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Party Name</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sales</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Purchase</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross Profit</th>
              </tr>
            </thead>
              <tbody className="divide-y divide-gray-100">
                {parties.map((party, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-800 font-medium">{party.party}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right">₹ {formatNumber(party.sales)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right">₹ {formatNumber(party.purchase)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right">₹ {formatNumber(party.gross_profit)}</td>
                  </tr>
                ))}
                </tbody>
                <tfoot className="bg-gray-100 font-semibold">
                  <tr>
                    <td className="px-6 py-3 text-gray-800">Total</td>
                    <td className="px-6 py-3 text-gray-800 text-right">₹ {formatNumber(totalSales)}</td>
                    <td className="px-6 py-3 text-gray-800 text-right">₹ {formatNumber(totalPurchase)}</td>
                    <td className="px-6 py-3 text-gray-800 text-right">₹ {formatNumber(totalGP)}</td>
                  </tr>
                </tfoot>
            </table>
        </div>
      </div>
    </div>
  )
}