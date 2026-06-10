import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const navigate = useNavigate()

  const validate = () => {
    const e = {}
    if (!email.trim()) e.email = 'Introduz o teu endereço de email'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Endereço de email inválido'
    if (!password.trim()) e.password = 'Introduz a tua password'
    return e
  }

  const handleLogin = async () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }

    setLoading(true)
    setErrors({})

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setErrors({ general: 'Email ou password incorretos. Tenta novamente.' })
    } else {
      navigate('/admin')
    }
    setLoading(false)
  }

  const inputWrapperStyle = (hasError) => ({
    display: 'flex', alignItems: 'center',
    border: `1px solid ${hasError ? '#F87171' : 'var(--gold-light)'}`,
    borderRadius: '10px', backgroundColor: 'white',
    overflow: 'hidden', transition: 'all 0.2s',
    boxShadow: hasError ? '0 0 0 3px rgba(248,113,113,0.1)' : 'none',
  })

  const iconStyle = {
    width: '44px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', alignSelf: 'stretch',
    borderRight: '1px solid var(--gold-light)',
    backgroundColor: '#FBF7EF', fontSize: '15px', flexShrink: 0
  }

  const inputStyle = {
    flex: 1, border: 'none', outline: 'none',
    padding: '12px 14px', fontSize: '13px',
    fontFamily: 'Inter, sans-serif', color: 'var(--charcoal)',
    backgroundColor: 'white'
  }

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: 'var(--cream)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Cabeçalho */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            fontSize: 'clamp(22px, 5vw, 32px)',
            color: 'var(--gold)', fontFamily: 'Playfair Display, serif',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            margin: '0 0 6px 0', lineHeight: 1.1
          }}>
            Do Luxo à Mesa
          </h1>
          <p style={{
            fontSize: '10px', color: 'var(--gold)',
            textTransform: 'uppercase', letterSpacing: '0.28em',
            margin: '0 0 16px 0'
          }}>
            by Luxury Events
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
            <div style={{ height: '1px', flex: 1, maxWidth: '60px', backgroundColor: 'var(--gold-light)' }} />
            <p style={{ fontSize: '11px', color: 'var(--charcoal)', textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0, fontWeight: '500' }}>
              Área Privada
            </p>
            <div style={{ height: '1px', flex: 1, maxWidth: '60px', backgroundColor: 'var(--gold-light)' }} />
          </div>
        </div>

        {/* Card */}
        <div style={{
          backgroundColor: 'white', borderRadius: '20px',
          overflow: 'hidden', boxShadow: '0 8px 48px rgba(0,0,0,0.08)'
        }}>

          {/* Corpo */}
          <div style={{ padding: '32px 28px 24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

              {/* Email */}
              <div>
                <label style={{
                  fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: errors.email ? '#EF4444' : 'var(--charcoal)',
                  display: 'block', marginBottom: '6px'
                }}>
                  Email {errors.email && <span style={{ color: '#EF4444' }}>*</span>}
                </label>
                <div style={inputWrapperStyle(!!errors.email)}>
                  <div style={iconStyle}>✉️</div>
                  <input
                    type="email"
                    value={email}
                    placeholder="o teu email"
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (errors.email) setErrors(p => ({ ...p, email: null }))
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    style={inputStyle}
                  />
                </div>
                {errors.email && (
                  <p style={{ fontSize: '12px', color: '#EF4444', margin: '5px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ⚠ {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label style={{
                  fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: errors.password ? '#EF4444' : 'var(--charcoal)',
                  display: 'block', marginBottom: '6px'
                }}>
                  Password {errors.password && <span style={{ color: '#EF4444' }}>*</span>}
                </label>
                <div style={inputWrapperStyle(!!errors.password)}>
                  <div style={iconStyle}>🔒</div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    placeholder="••••••••"
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (errors.password) setErrors(p => ({ ...p, password: null }))
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={{
                      padding: '0 14px', background: 'none', border: 'none',
                      cursor: 'pointer', fontSize: '15px', color: 'var(--gray-mid)'
                    }}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {errors.password && (
                  <p style={{ fontSize: '12px', color: '#EF4444', margin: '5px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ⚠ {errors.password}
                  </p>
                )}
              </div>

              {/* Erro geral */}
              {errors.general && (
                <div style={{
                  backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
                  borderRadius: '8px', padding: '10px 14px'
                }}>
                  <p style={{ fontSize: '13px', color: '#DC2626', margin: 0 }}>
                    ⚠ {errors.general}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer creme */}
          <div style={{
            backgroundColor: '#FBF7EF', borderTop: '1px solid #F0E6D0',
            padding: '16px 28px', display: 'flex', justifyContent: 'flex-end'
          }}>
            <button
              onClick={handleLogin}
              disabled={loading}
              style={{
                padding: '11px 36px', borderRadius: '999px',
                fontSize: '11px', fontWeight: '600',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                backgroundColor: loading ? 'var(--gold-light)' : 'var(--gold)',
                color: 'white', border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: loading ? 'none' : '0 4px 16px rgba(201,168,76,0.4)'
              }}
            >
              {loading ? 'A entrar...' : 'Entrar →'}
            </button>
          </div>
        </div>

        {/* Rodapé */}
        <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
          <div style={{ height: '1px', width: '40px', backgroundColor: 'var(--gold-light)' }} />
          <p style={{ fontSize: '10px', color: 'var(--gold-light)', textTransform: 'uppercase', letterSpacing: '0.18em', margin: 0 }}>
            Planeamos cada detalhe. Criamos memórias inesquecíveis.
          </p>
          <div style={{ height: '1px', width: '40px', backgroundColor: 'var(--gold-light)' }} />
        </div>

      </div>
    </div>
  )
}