import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

interface User {
  nombre?: string
  rol?: string
  email?: string
  [key: string]: any
}

interface AuthContextType {
  token: string | null
  user: User
  login: (accessToken: string, userData: User) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [user, setUser] = useState<User>(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}') as User }
    catch { return {} }
  })

  useEffect(() => {
    function handleForceLogout() {
      setToken(null)
      setUser({})
    }
    window.addEventListener('auth:logout', handleForceLogout)
    return () => window.removeEventListener('auth:logout', handleForceLogout)
  }, [])

  const login = useCallback((accessToken: string, userData: User) => {
    localStorage.setItem('token', accessToken)
    localStorage.setItem('user', JSON.stringify(userData))
    setToken(accessToken)
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser({})
  }, [])

  const value: AuthContextType = { token, user, login, logout, isAuthenticated: !!token }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de un AuthProvider')
  return ctx
}
