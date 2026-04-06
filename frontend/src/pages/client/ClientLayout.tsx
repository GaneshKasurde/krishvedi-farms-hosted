import { useState, createContext, useContext, useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const MonthContext = createContext<{ month: string; setMonth: (m: string) => void }>({} as any)

export const useMonth = () => useContext(MonthContext)

export default function ClientLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [month, setMonth] = useState('All')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('selected_month')
    if (stored) setMonth(stored)
  }, [])

  const handleMonthChange = (m: string) => {
    setMonth(m)
    localStorage.setItem('selected_month', m)
  }

  const navItems = [
    { path: '/dashboard', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { path: '/dashboard/items', label: 'Items', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { path: '/dashboard/parties', label: 'Parties', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { path: '/dashboard/income', label: 'Income Statement', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
    { path: '/dashboard/trends', label: 'Trends', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
    { path: '/dashboard/analysis', label: 'Analysis', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { path: '/dashboard/materials', label: 'Materials', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { path: '/dashboard/grades', label: 'Grades', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { path: '/dashboard/customers', label: 'Customers', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { path: '/dashboard/debug', label: 'Debug', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
  ]

  return (
    <MonthContext.Provider value={{ month, setMonth: handleMonthChange }}>
      <div className="min-h-screen bg-gray-50 flex">
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-emerald-700 to-green-700 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300`}>
          <div className="flex items-center justify-between p-4 border-b border-emerald-600">
            <h1 className="text-xl font-bold text-white">Krishvedi Portal</h1>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="p-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${location.pathname === item.path ? 'bg-white/20 text-white' : 'text-emerald-100 hover:bg-white/10'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        <div className="flex-1 flex flex-col">
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <button onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <h2 className="text-lg font-semibold text-gray-800">{user?.username}</h2>
              </div>
              <button onClick={logout} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50">
                Logout
              </button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-8">
            <Outlet />
          </main>
        </div>

        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}
      </div>
    </MonthContext.Provider>
  )
}