import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api'

interface Company {
  id: number
  name: string
  slug: string
  created_at: string
  client_count: number
  has_data: boolean
  last_upload: string | null
  users: { id: number; username: string }[]
}

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'companies' | 'upload'>('companies')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await api.get('/api/admin/companies')
        if (!cancelled) setCompanies(res.data)
      } catch (err: any) {
        if (!cancelled) setError(err.response?.data?.detail || 'Failed to fetch')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this company and all its data?')) return
    try {
      await api.delete(`/api/admin/companies/${id}`)
      const res = await api.get('/api/admin/companies')
      setCompanies(res.data)
    } catch (err) {
      alert('Failed to delete company')
    }
  }

  const handleUpload = (companyId: number) => {
    navigate(`/admin/upload?company=${companyId}`)
  }

  const companiesWithData = companies.filter(c => c.has_data).length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold">Admin Portal - Krishvedi</h1>
              <p className="text-xs text-emerald-100">Multi-Tenant Management</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-emerald-100">{user?.username}</span>
            <button onClick={logout} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-emerald-500">
            <p className="text-sm text-gray-500 mb-1">Total Companies</p>
            <p className="text-3xl font-bold text-gray-800">{companies.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <p className="text-sm text-gray-500 mb-1">Companies with Data</p>
            <p className="text-3xl font-bold text-gray-800">{companiesWithData}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-teal-500">
            <p className="text-sm text-gray-500 mb-1">Total Clients</p>
            <p className="text-3xl font-bold text-gray-800">{companies.reduce((acc, c) => acc + c.client_count, 0)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('companies')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'companies' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Companies
              </button>
              <button
                onClick={() => navigate('/admin/upload')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'upload' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Upload Data
              </button>
            </nav>
          </div>

          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-800">Company List</h2>
              <button
                onClick={() => navigate('/admin/companies/new')}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Create New Company</span>
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : error ? (
              <div className="text-center py-12 text-red-500">{error}</div>
            ) : companies.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <p className="text-gray-500">No companies yet. Create your first company!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
                      <th className="pb-3 font-medium">Company Name</th>
                      <th className="pb-3 font-medium">Client Username</th>
                      <th className="pb-3 font-medium">Has Data</th>
                      <th className="pb-3 font-medium">Last Upload</th>
                      <th className="pb-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((company) => (
                      <tr key={company.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 font-medium text-gray-800">{company.name}</td>
                        <td className="py-4 text-gray-600">{company.users[0]?.username || '-'}</td>
                        <td className="py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${company.has_data ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {company.has_data ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="py-4 text-gray-600 text-sm">
                          {company.last_upload ? new Date(company.last_upload).toLocaleDateString() : '-'}
                        </td>
                        <td className="py-4 text-right space-x-2">
                          <button
                            onClick={() => handleUpload(company.id)}
                            className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 text-sm"
                          >
                            Upload
                          </button>
                          <button
                            onClick={() => handleDelete(company.id)}
                            className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}