import { useState } from 'react'
import toast from 'react-hot-toast'
import { X } from 'lucide-react'
import api from '../api'

// Cada usuario cambia su propia contraseña. Las reglas son las del API (auth.problemas_contrasena).
const label: any = { fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }

export default function CambiarContrasena({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ actual: '', nueva: '', confirmar: '' })
  const [saving, setSaving] = useState(false)
  const distinta = form.confirmar !== '' && form.nueva !== form.confirmar

  async function guardar(e: any) {
    e.preventDefault()
    if (form.nueva !== form.confirmar) return toast.error('La confirmación no coincide con la contraseña nueva')
    setSaving(true)
    try {
      await api.post('/auth/cambiar-contrasena', { actual: form.actual, nueva: form.nueva })
      toast.success('Contraseña actualizada. Úsela la próxima vez que inicie sesión.', { duration: 6000 })
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'No se pudo cambiar la contraseña', { duration: 8000 })
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420, width: '95%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Cambiar mi contraseña</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
        </div>
        <form onSubmit={guardar}>
          <div style={{ marginBottom: 12 }}>
            <label style={label}>Contraseña actual *</label>
            <input className="input" type="password" autoComplete="current-password" value={form.actual}
              onChange={e => setForm({ ...form, actual: e.target.value })} required />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={label}>Contraseña nueva *</label>
            <input className="input" type="password" autoComplete="new-password" minLength={10} value={form.nueva}
              onChange={e => setForm({ ...form, nueva: e.target.value })} required />
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#6b7280' }}>
              Mínimo 10 caracteres, con letras y números. Sin su nombre o correo ni palabras obvias (corvus, admin, aguacate, 123456…).
            </p>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={label}>Repita la contraseña nueva *</label>
            <input className="input" type="password" autoComplete="new-password" value={form.confirmar}
              onChange={e => setForm({ ...form, confirmar: e.target.value })} required
              style={{ borderColor: distinta ? '#fca5a5' : undefined }} />
            {distinta && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#b91c1c' }}>No coincide con la contraseña nueva.</p>}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving || distinta}>{saving ? 'Guardando…' : 'Cambiar contraseña'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
