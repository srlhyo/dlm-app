import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import FormEntryPage from './pages/FormEntryPage'
import FormPage from './pages/FormPage'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'
import ProtectedRoute from './components/ProtectedRoute'
import BriefingPage from './pages/BriefingPage'
import MaintenancePage from './pages/MaintenancePage'
import EnvBanner from './components/EnvBanner'

// Lê as variáveis de ambiente
const isLocked = import.meta.env.VITE_SITE_LOCKED === 'true'
const isDev = import.meta.env.VITE_APP_ENV === 'development'

function App() {
  // Se o site estiver trancado, mostra SÓ a página de manutenção —
  // o formulário e o admin ficam completamente inacessíveis.
  if (isLocked) {
    return <MaintenancePage />
  }

  return (
    <BrowserRouter>
      {/* Faixa de ambiente de teste (só aparece em desenvolvimento) */}
      {isDev && <EnvBanner />}

      <Routes>
        <Route path="/" element={<FormEntryPage />} />
        <Route path="/formulario" element={<FormPage />} />
        <Route path="/admin/login" element={<LoginPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route path="/briefing/:id" element={<BriefingPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App