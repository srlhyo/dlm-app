import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import FormEntryPage from './pages/FormEntryPage'
import FormPage from './pages/FormPage'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'
import ProtectedRoute from './components/ProtectedRoute'
import BriefingPage from './pages/BriefingPage'

function App() {
  return (
    <BrowserRouter>
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