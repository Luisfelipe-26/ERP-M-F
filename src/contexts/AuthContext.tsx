import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import api from '../api'

interface User {
  nombre?: string
  rol?: string
  email?: string
  roles?: { id: number; nombre: string }[]
  permisos?: string[]
  [key: string]: any
}

interface AuthContextType {
  token: string | null
  user: User
  login: (accessToken: string, userData: User) => void
  logout: () => void
  isAuthenticated: boolean
  hasPermission: (codigo: string) => boolean
  hasModule: (modulo: string) => boolean
  hasRole: (nombre: string) => boolean
  isAdmin: boolean
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

  // Refresh user data from server on mount and login so permissions stay current
  useEffect(() => {
    if (!token) return
    api.get('/auth/me').then(({ data }) => {
      localStorage.setItem('user', JSON.stringify(data))
      setUser(data)
    }).catch(() => { /* 401 handled by interceptor */ })
  }, [token])

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

  const hasPermission = useCallback((codigo: string) => {
    const perms = user?.permisos || []
    return perms.includes('*') || perms.some(p => p === codigo || p === codigo.split('.').shift() + '.*')
  }, [user])

  const hasModule = useCallback((modulo: string) => {
    const perms = user?.permisos || []
    return perms.includes('*') || perms.some(p => p.startsWith(modulo + '.'))
  }, [user])

  const hasRole = useCallback((nombre: string) => {
    if (user?.rol === nombre) return true
    return (user?.roles || []).some(r => r.nombre === nombre)
  }, [user])

  const isAdmin = hasRole('admin')

  const value: AuthContextType = {
    token,
    user,
    login,
    logout,
    isAuthenticated: !!token,
    hasPermission,
    hasModule,
    hasRole,
    isAdmin,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de un AuthProvider')
  return ctx
}
