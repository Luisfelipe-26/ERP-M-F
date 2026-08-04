import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api'
import { Leaf } from 'lucide-react'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)'
    }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '0 16px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
          }}>
            <Leaf size={36} color="white" />
          </div>
          <h1 style={{ color: 'white', fontSize: 28, fontWeight: 700, margin: '0 0 4px' }}>CORVUS ERP</h1>
          <p style={{ color: '#86efac', fontSize: 14, margin: 0 }}>Sistema de Gestión de Finca</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'white', borderRadius: 20, padding: 32,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          <h2 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 600, color: '#111827' }}>
            Iniciar Sesión
          </h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Correo electrónico
              </label>
              <input
                className="input"
                type="email"
                placeholder="correo@ejemplo.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Contraseña
              </label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 8, padding: '12px', borderRadius: 12, border: 'none',
                background: loading ? '#9ca3af' : '#166534', color: 'white',
                fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s'
              }}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}
