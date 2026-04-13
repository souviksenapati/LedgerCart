import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore session on mount
  useEffect(() => {
    const token = sessionStorage.getItem('console_token')
    if (!token) {
      setLoading(false)
      return
    }
    authAPI
      .me()
      .then((res) => setUser(res.data))
      .catch(() => {
        sessionStorage.removeItem('console_token')
        sessionStorage.removeItem('console_user')
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password })
    const { access_token, user: userData } = res.data
    sessionStorage.setItem('console_token', access_token)
    sessionStorage.setItem('console_user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }

  const logout = () => {
    sessionStorage.removeItem('console_token')
    sessionStorage.removeItem('console_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
