import { useState, useEffect } from 'react'
import api from '../../api'
import { useMonth } from './ClientLayout'
import { formatNumber } from '../../utils/format'

interface IncomeData {
  opening_balance: number
  purchases: number
  sales: number
  closing_balance: number
  consumption: number
  gross_profit: number
  gross_profit_percentage: number
}

export default function IncomePage() {
  const { month, setMonth } = useMonth()
  const [data, setData] = useState<IncomeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [months, setMonths] = useState<string[]>([])

  useEffect(() => {
    fetchIncome()
  }, [month])

  const fetchIncome = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/api/dashboard/income-statement?month=${month}`)
      setData(res.data)
      const overviewRes = await api.get('/api/dashboard/overview')
      setMonths(overviewRes.data.months || [])
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load income statement')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>
  if (error) return <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">{error}</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Income Statement</h1>
        <select value={month} onChange={(e) => setMonth(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Trading Account</h2>
          <p className="text-sm text-gray-500">{month === 'All' ? 'All Months' : month}</p>
        </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">Debit Side</h3>
                <table className="w-full">
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 text-gray-600">Opening Balance</td>
                      <td className="py-3 text-right text-gray-800 font-medium">₹ {formatNumber(data?.opening_balance || 0)}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 text-gray-600">Purchases</td>
                      <td className="py-3 text-right text-gray-800 font-medium">₹ {formatNumber(data?.purchases || 0)}</td>
                    </tr>
                    <tr className="border-b border-gray-100 bg-emerald-50">
                      <td className="py-3 text-gray-800 font-semibold">Total (Debit)</td>
                      <td className="py-3 text-right text-gray-800 font-bold">₹ {formatNumber((data?.opening_balance || 0) + (data?.purchases || 0))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">Credit Side</h3>
                <table className="w-full">
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 text-gray-600">Sales</td>
                      <td className="py-3 text-right text-gray-800 font-medium">₹ {formatNumber(data?.sales || 0)}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 text-gray-600">Closing Balance</td>
                      <td className="py-3 text-right text-gray-800 font-medium">₹ {formatNumber(data?.closing_balance || 0)}</td>
                    </tr>
                    <tr className="border-b border-gray-100 bg-emerald-50">
                      <td className="py-3 text-gray-800 font-semibold">Total (Credit)</td>
                      <td className="py-3 text-right text-gray-800 font-bold">₹ {formatNumber((data?.sales || 0) + (data?.closing_balance || 0))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-100 rounded-lg border">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Debit:</span>
                  <span className="font-semibold">₹ {formatNumber((data?.opening_balance || 0) + (data?.purchases || 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Credit:</span>
                  <span className="font-semibold">₹ {formatNumber((data?.sales || 0) + (data?.closing_balance || 0))}</span>
                </div>
              </div>
            </div>

          <div className="mt-8 p-6 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Gross Profit</p>
                <p className="text-3xl font-bold text-emerald-600">₹ {formatNumber(data?.gross_profit || 0)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">GP Percentage</p>
                <p className="text-2xl font-bold text-emerald-600">{data?.gross_profit_percentage || 0}%</p>
              </div>
            </div>
          </div>

          {data?.consumption !== 0 && (
            <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800">
                <span className="font-medium">Note:</span> Consumption/Stock Journal entries detected: ₹ {formatNumber(data?.consumption || 0)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}