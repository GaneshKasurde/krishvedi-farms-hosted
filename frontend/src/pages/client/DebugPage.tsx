import { useState, useEffect } from 'react'
import api from '../../api'

export default function DebugPage() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/dashboard/debug-data')
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.detail || err.message))
  }, [])

  if (error) return <div className="p-4 bg-red-50 text-red-600">Error: {error}</div>
  if (!data) return <div className="p-4">Loading...</div>

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Debug Data</h1>
      <div className="bg-white p-4 rounded shadow">
        <p>Total Records: {data.total_records}</p>
        <p>Categories: {data.categories?.join(', ')}</p>
      </div>
      <div className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
        <pre>{JSON.stringify(data.sample_records, null, 2)}</pre>
      </div>
    </div>
  )
}