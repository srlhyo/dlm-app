import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ProtectedRoute({ children }) {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Ainda a verificar sessão
  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--cream)' }}>
        <p className="text-sm" style={{ color: 'var(--gray-mid)' }}>A verificar sessão...</p>
      </div>
    )
  }

  // Sem sessão → redireciona para login
  if (!session) return <Navigate to="/admin/login" />

  // Com sessão → mostra o conteúdo protegido
  return children
}