import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { validateCode } from '../lib/invites'

function Ornament({ small = false }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      justifyContent: 'center', margin: small ? '4px 0' : '8px 0'
    }}>
      <div style={{ height: '1px', width: small ? '18px' : '40px', backgroundColor: 'var(--gold-light)' }} />
      <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
        <path d="M8 1.5 C6.2 1.5 4.5 3 4.5 5 C4.5 7 6.2 8.5 8 8.5 C9.8 8.5 11.5 7 11.5 5 C11.5 3 9.8 1.5 8 1.5Z" stroke="#C9A84C" strokeWidth="0.7" fill="none"/>
        <path d="M1 5 L4.5 5 M11.5 5 L15 5" stroke="#C9A84C" strokeWidth="0.7"/>
        <circle cx="1" cy="5" r="0.9" fill="#C9A84C"/>
        <circle cx="15" cy="5" r="0.9" fill="#C9A84C"/>
      </svg>
      <div style={{ height: '1px', width: small ? '18px' : '40px', backgroundColor: 'var(--gold-light)' }} />
    </div>
  )
}

export default function FormEntryPage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleSubmit = async () => {
    if (!code.trim()) {
      setError('Introduz o teu código de acesso')
      return
    }
    setLoading(true)
    setError(null)

    const result = await validateCode(code)

    if (!result.valid) {
      setError(result.reason === 'Este código já expirou'
        ? 'Este código já expirou. Contacta Do Luxo à Mesa para mais informações.'
        : 'Código inválido. Verifica o código que recebeste e tenta novamente.')
      setLoading(false)
      return
    }

    // Guarda o convite na sessão e navega para o formulário
    sessionStorage.setItem('dlm_invite', JSON.stringify(result.invite))
    navigate('/formulario')
  }

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: 'var(--cream)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative', overflow: 'hidden'
    }}>

      {/* Flores decorativas simples */}
      <div style={{
        position: 'fixed', top: 0, left: 0, pointerEvents: 'none', zIndex: 0,
        fontSize: '120px', opacity: 0.06, lineHeight: 1,
        fontFamily: 'serif', color: 'var(--gold)',
        userSelect: 'none'
      }}>
        ❀
      </div>

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>

        {/* Cabeçalho */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            fontSize: 'clamp(22px, 5vw, 36px)',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', marginBottom: '6px' }}>
            <div style={{ height: '1px', flex: 1, maxWidth: '60px', backgroundColor: 'var(--gold-light)' }} />
            <p style={{ fontSize: '11px', color: 'var(--charcoal)', textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0, fontWeight: '500' }}>
              Questionário dos Noivos
            </p>
            <div style={{ height: '1px', flex: 1, maxWidth: '60px', backgroundColor: 'var(--gold-light)' }} />
          </div>
          <Ornament small />
        </div>

        {/* Card */}
        <div style={{
          backgroundColor: 'white', borderRadius: '20px',
          overflow: 'hidden', boxShadow: '0 8px 48px rgba(0,0,0,0.08)'
        }}>

          {/* Corpo */}
          <div style={{ padding: '32px 28px 28px' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>💍</div>
              <h2 style={{
                fontSize: '16px', color: 'var(--charcoal)', margin: '0 0 4px 0',
                fontFamily: 'Playfair Display, serif',
                textTransform: 'uppercase', letterSpacing: '0.08em'
              }}>
                Bem-vindos
              </h2>
              <Ornament small />
              <p style={{
                fontSize: '13px', color: 'var(--gray-mid)',
                margin: '8px 0 0', lineHeight: '1.6'
              }}>
                Para aceder ao vosso questionário, introduz o código de acesso que recebeste.
              </p>
            </div>

            {/* Campo do código */}
            <div style={{ marginBottom: '8px' }}>
              <label style={{
                fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em',
                textTransform: 'uppercase', color: error ? '#EF4444' : 'var(--charcoal)',
                display: 'block', marginBottom: '8px'
              }}>
                Código de Acesso
              </label>
              <div style={{
                display: 'flex', alignItems: 'center',
                border: `1.5px solid ${error ? '#F87171' : 'var(--gold-light)'}`,
                borderRadius: '10px', overflow: 'hidden',
                backgroundColor: 'white', transition: 'all 0.2s',
                boxShadow: error ? '0 0 0 3px rgba(248,113,113,0.1)' : 'none'
              }}>
                <div style={{
                  width: '44px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', alignSelf: 'stretch',
                  borderRight: `1px solid ${error ? '#FECACA' : 'var(--gold-light)'}`,
                  backgroundColor: '#FBF7EF', fontSize: '16px', flexShrink: 0
                }}>
                  🔑
                </div>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase())
                    if (error) setError(null)
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="Ex: DLM-X7K9-AB23"
                  maxLength={13}
                  style={{
                    flex: 1, border: 'none', outline: 'none',
                    padding: '13px 14px', fontSize: '15px',
                    fontFamily: 'Inter, sans-serif', letterSpacing: '0.1em',
                    color: 'var(--charcoal)', backgroundColor: 'white',
                    fontWeight: '600'
                  }}
                />
              </div>
              {error && (
                <p style={{ fontSize: '12px', color: '#EF4444', margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ⚠ {error}
                </p>
              )}
            </div>
          </div>

          {/* Footer creme */}
          <div style={{
            backgroundColor: '#FBF7EF', borderTop: '1px solid #F0E6D0',
            padding: '16px 28px', display: 'flex', justifyContent: 'flex-end'
          }}>
            <button
              onClick={handleSubmit}
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
              {loading ? 'A verificar...' : 'Entrar →'}
            </button>
          </div>
        </div>

        {/* Rodapé */}
        <div style={{ marginTop: '20px' }}>
          <Ornament />
          <p style={{
            textAlign: 'center', fontSize: '10px', color: 'var(--gold-light)',
            textTransform: 'uppercase', letterSpacing: '0.18em', margin: '4px 0 0'
          }}>
            Planeamos cada detalhe. Criamos memórias inesquecíveis.
          </p>
        </div>

      </div>
    </div>
  )
}