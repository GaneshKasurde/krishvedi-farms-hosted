import axios from 'axios'
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8006'
const api = axios.create({ baseURL: API_URL })
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
api.interceptors.response.use(r => r, error => {
  if (error.response?.status === 401) {
    localStorage.clear()
    window.location.href = '/login'
  }
  return Promise.reject(error)
})
export default api