import { useEffect, useState } from 'react'
import api from '../api'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, Search } from 'lucide-react'

const empty = { id_trab: '', nombre: '', cargo: '', costo_hora: 62.50, observaciones: '' }

export default function Trabajadores() {
  const [items, setItems] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)

  useEffect(() => { load() }, [])
  async function load() {
    try {
      const { data } = await api.get('/trabajadores')
      setItems(data)
    } catch { toast.error('Error al cargar trabajadores') }
  }

  async function openNew() {
    try { const { data } = await api.get('/trabajadores/next-id'); setForm({ ...empty, id_trab: data.next_id }) }
    catch { setForm(empty) }
    setEditing(null); setModal(true)
  }
  function openEdit(t) { setForm(t); setEditing(t.id_trab); setModal(true) }

  async function save(e) {
    e.preventDefault()
    try {
      const payload = { ...form, costo_hora: Number(form.costo_hora) }
      if (editing) await api.put(`/trabajadores/${editing}`, payload)
      else await api.post('/trabajadores', payload)
      toast.success(editing ? 'Trabajador actualizado' : 'Trabajador registrado')
      setModal(false); load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  async function del(id) {
    if (!confirm('¿Eliminar trabajador?')) return
    await api.delete(`/trabajadores/${id}`)
    toast.success('Trabajador eliminado'); load()
  }

  const [buscar, setBuscar] = useState('')
  const cargos = [...new Set(items.map(t => t.cargo).filter(Boolean))]
  const filtered = buscar ? items.filter(t =>
    t.nombre.toLowerCase().includes(buscar.toLowerCase()) ||
    t.id_trab.toLowerCase().includes(buscar.toLowerCase()) ||
    (t.cargo || '').toLowerCase().includes(buscar.toLowerCase())
  ) : items

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#111827' }}>Trabajadores</h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>{items.length} trabajadores activos</p>
        </div>
        <button className="btn-primary" onClick={openNew}><Plus size={16} /> Nuevo Trabajador</button>
      </div>

      <div style={{ position: 'relative', marginBottom: 16, maxWidth: 320 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
        <input className="input" style={{ paddingLeft: 30 }} placeholder="Buscar por nombre, ID o cargo..." value={buscar} onChange={e => setBuscar(e.target.value)} />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr><th>ID</th><th>Nombre</th><th>Cargo</th><th>Costo/Hora</th><th>Observaciones</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.id_trab}>
                <td><span style={{ fontWeight: 700, color: '#166534' }}>{t.id_trab}</span></td>
                <td style={{ fontWeight: 500 }}>{t.nombre}</td>
                <td><span className="badge badge-blue">{t.cargo || '—'}</span></td>
                <td>{t.costo_hora > 0 ? `RD$ ${t.costo_hora}/hr` : 'Por ajuste'}</td>
                <td style={{ color: '#9ca3af', fontSize: 12 }}>{t.observaciones || '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-secondary" onClick={() => openEdit(t)}><Edit2 size={13} /></button>
                    <button className="btn-danger" onClick={() => del(t.id_trab)}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No hay trabajadores registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>{editing ? 'Editar Trabajador' : 'Nuevo Trabajador'}</h2>
            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>ID Trabajador *</label>
                  <input className="input" value={form.id_trab} onChange={e => setForm({ ...form, id_trab: e.target.value })} required disabled={!!editing} placeholder="T-001" />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Nombre completo *</label>
                  <input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Cargo</label>
                  <input className="input" list="cargos-list" value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })} placeholder="Jornalero" />
                  <datalist id="cargos-list">{cargos.map(c => <option key={c} value={c} />)}</datalist>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Costo/Hora (RD$)</label>
                  <input className="input" type="number" step="0.01" min="0" value={form.costo_hora} onChange={e => setForm({ ...form, costo_hora: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Observaciones</label>
                <input className="input" value={form.observaciones || ''} onChange={e => setForm({ ...form, observaciones: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
