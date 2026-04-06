import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api'

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setMessage('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      // Upload to temp session or direct
      await api.post('/api/admin/upload-temp', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setMessage('File uploaded successfully!')
      setTimeout(() => navigate('/dashboard'), 1500)
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) {
      setFile(f)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Upload Excel Data</h2>
          
          {message && (
            <div className={`mb-4 p-3 rounded-lg ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message}
            </div>
          )}

          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-emerald-400 cursor-pointer"
            onClick={() => document.getElementById('fileInput')?.click()}
          >
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <span className="text-gray-700">{file.name}</span>
                <button onClick={(e) => { e.stopPropagation(); setFile(null) }} className="text-red-500">✕</button>
              </div>
            ) : (
              <>
                <div className="text-4xl mb-2">📁</div>
                <p className="text-gray-600">Drag & drop Excel file here</p>
                <p className="text-sm text-gray-400">or click to browse</p>
              </>
            )}
            <input
              id="fileInput"
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full mt-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  )
}