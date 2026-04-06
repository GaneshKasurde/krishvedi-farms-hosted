import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../api'

interface Company {
  id: number
  name: string
}

export default function UploadData() {
  const [searchParams] = useSearchParams()
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<number | ''>(Number(searchParams.get('company')) || '')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchCompanies()
  }, [])

  const fetchCompanies = async () => {
    try {
      const res = await api.get('/api/admin/companies')
      setCompanies(res.data)
    } catch (err) {
      console.error('Failed to fetch companies', err)
    }
  }

  const handleUpload = async () => {
    if (!selectedCompany || !file) {
      setError('Please select a company and file')
      return
    }

    setUploading(true)
    setError('')
    setMessage('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await api.post(`/api/admin/companies/${selectedCompany}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setMessage(res.data.message)
      setFile(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      setFile(droppedFile)
      setError('')
    } else {
      setError('Please upload an Excel file (.xlsx or .xls)')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <button onClick={() => navigate('/admin')} className="text-white hover:text-emerald-200">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold">Upload Company Data</h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Select Company & Upload Excel</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-600 text-sm">{message}</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Company</label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">-- Select Company --</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-emerald-400 transition-colors"
            >
              {file ? (
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-700 font-medium">{file.name}</span>
                  <button onClick={() => setFile(null)} className="text-red-500 hover:text-red-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <>
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-gray-600 mb-2">Drag & drop your Excel file here</p>
                  <p className="text-sm text-gray-400">or</p>
                  <label className="mt-4 inline-block px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 cursor-pointer">
                    Browse Files
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                </>
              )}
            </div>

            <button
              onClick={handleUpload}
              disabled={uploading || !selectedCompany || !file}
              className="w-full py-3 px-4 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload Data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}