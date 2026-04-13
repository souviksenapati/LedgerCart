import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LoadingSpinner } from '../components/UI'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      const msg = err.response?.data?.detail
      if (msg) {
        setError(msg)
      } else {
        setError('Unable to connect to the server. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm">
        {/* Logo / brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500 mb-4">
            <span className="text-white font-bold text-2xl">LC</span>
          </div>
          <h1 className="text-white text-xl font-semibold">LedgerCart Platform Console</h1>
          <p className="text-slate-400 text-sm mt-1">Internal operations — authorised staff only</p>
        </div>

        {/* Form card */}
        <div className="bg-slate-800 rounded-2xl p-8 shadow-xl border border-slate-700">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2.5
                           text-white text-sm placeholder-slate-500 focus:outline-none
                           focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
                placeholder="platform@ledgercart.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2.5
                           text-white text-sm placeholder-slate-500 focus:outline-none
                           focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-900/30 rounded-lg px-3 py-2 border border-red-800">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg
                         bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600
                         active:bg-amber-700 transition-colors disabled:opacity-50
                         disabled:cursor-not-allowed focus:outline-none focus:ring-2
                         focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-800"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          LedgerCart Platform Console &bull; Internal use only
        </p>
      </div>
    </div>
  )
}
