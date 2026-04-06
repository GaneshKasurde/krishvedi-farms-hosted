import React, { createContext, useContext, useState, useEffect } from 'react'

interface AuthUser {
  username: string
  role: string
  company_id?: number
  token: string
}

interface AuthContextType {
  user: AuthUser | null
  login: (data: AuthUser) => void
  logout: () => void
  isAdmin: boolean
  isClient: boolean
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('auth_user')
    if (stored) setUser(JSON.parse(stored))
  }, [])

  const login = (data: AuthUser) => {
    localStorage.setItem('token', data.token)
    localStorage.setItem('auth_user', JSON.stringify(data))
    setUser(data)
  }

  const logout = () => {
    localStorage.clear()
    setUser(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{
      user, login, logout,
      isAdmin: user?.role === 'admin',
      isClient: user?.role === 'client'
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)