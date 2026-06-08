import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleLogin = async () => {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ou password incorretos.')
    } else {
      navigate('/admin')
    }

    setLoading(false)
  }

  const inputStyle = {
    borderColor: 'var(--gold-light)',
    border: '1px solid var(--gold-light)',
  }

  const handleFocus = (e) => {
    e.target.style.borderColor = 'var(--gold)'
    e.target.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.15)'
  }

  const handleBlur = (e) => {
    e.target.style.borderColor = 'var(--gold-light)'
    e.target.style.boxShadow = 'none'
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ backgroundColor: 'var(--cream)' }}
    >
      <div className="w-full" style={{ maxWidth: '420px' }}>

        {/* Cabeçalho */}
        <div className="text-center mb-10">
          <h1 className="text-3xl mb-1" style={{ color: 'var(--gold)' }}>
            Do Luxo à Mesa
          </h1>
          <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--gray-mid)' }}>
            Área Privada
          </p>
        </div>

        {/* Card */}
        <div
          className="bg-white rounded-2xl p-8 flex flex-col gap-5"
          style={{ boxShadow: '0 2px 24px rgba(0,0,0,0.07)' }}
        >
          <h2 className="text-xl text-center" style={{ color: 'var(--charcoal)' }}>
            Entrar
          </h2>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--charcoal)' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all duration-200 bg-white"
              style={inputStyle}
              placeholder="o teu email"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--charcoal)' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all duration-200 bg-white"
              style={inputStyle}
              placeholder="••••••••"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>

          {/* Erro */}
          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          {/* Botão */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 rounded-full text-sm text-white transition-all duration-200 mt-2"
            style={{ backgroundColor: loading ? 'var(--gold-light)' : 'var(--gold)' }}
          >
            {loading ? 'A entrar...' : 'Entrar'}
          </button>
        </div>

        {/* Rodapé */}
        <p className="text-center text-xs mt-6 tracking-widest uppercase" style={{ color: 'var(--gold-light)' }}>
          Planeamento · Personalização · Organização · Detalhes
        </p>

      </div>
    </div>
  )
}