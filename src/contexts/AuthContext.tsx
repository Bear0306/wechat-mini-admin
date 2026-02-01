import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'

const STORAGE_KEY = 'admin_token'
const INACTIVITY_MS = 60 * 60 * 1000 // 1 hour

type AuthContextValue = {
  token: string | null
  login: (t: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY))
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setToken(null)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const resetInactivityTimer = useCallback(() => {
    if (!token) return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(logout, INACTIVITY_MS)
  }, [token, logout])

  const login = useCallback((t: string) => {
    localStorage.setItem(STORAGE_KEY, t)
    setToken(t)
  }, [])

  useEffect(() => {
    if (!token) return
    resetInactivityTimer()
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach((e) => window.addEventListener(e, resetInactivityTimer))
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetInactivityTimer))
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [token, resetInactivityTimer])

  useEffect(() => {
    const onLogout = () => logout()
    window.addEventListener('admin-logout', onLogout)
    return () => window.removeEventListener('admin-logout', onLogout)
  }, [logout])

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
