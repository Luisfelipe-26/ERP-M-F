import { useEffect, useState } from 'react'
import api from '../api'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2 } from 'lucide-react'

const empty = { id_act: '', actividad: '', tipo: '', unidad_rendimiento: 'ha', kpi_principal: '', tarifa_jornada: '', tarifa_ajuste: '' }
const TIPOS = ['Nutricion', 'Sanidad', 'Riego', 'Labor']
const tipoBadge = { Nutricion: 'badge-green', Sanidad: 'badge-blue', Riego: 'badge-blue', Labor: 'badge-yellow' }

export default function Actividades() {
  const [items, setItems] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)

  useEffect(() => { load() }, [])
  async function load() {
    try {
      const { data } = await api.get('/actividades')
      setItems(data)
    } catch { toast.error('Error al cargar actividades') }
  }

  async function openNew() {
    try { const { data } = await api.get('/actividades/next-id'); setForm({ ...empty, id_act: data.next_id }) }
    catch { setForm(empty) }
    setEditing(null); setModal(true)
  }
  function openEdit(a) { setForm({ ...a, tarifa_jornada: a.tarifa_jornada ?? '', tarifa_ajuste: a.tarifa_ajuste ?? '' }); setEditing(a.id_act); setModal(true) }

  async function save(e) {
    e.preventDefault()
    try {
      const payload = { ...form, tarifa_jornada: Number(form.tarifa_jornada) || null, tarifa_ajuste: Number(form.tarifa_ajuste) || null }
      if (editing) await api.put(`/actividades/${editing}`, payload)
      else await api.post('/actividades', payload)
      toast.success(editing ? 'Actividad actualizada' : 'Actividad creada')
      setModal(false); load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  async function del(id) {
    if (!confirm('¿Eliminar actividad?')) return
    await api.delete(`/actividades/${id}`)
    toast.success('Actividad eliminada'); load()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#111827' }}>Actividades</h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>{items.length} actividades registradas</p>
        </div>
        <button className="btn-primary" onClick={openNew}><Plus size={16} /> Nueva Actividad</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr><th>ID</th><th>Actividad</th><th>Tipo</th><th>Unidad</th><th>Tarifa Jornada</th><th>Tarifa Ajuste</th><th></th></tr>
          </thead>
          <tbody>
            {items.map(a => (
              <tr key={a.id_act}>
                <td><span style={{ fontWeight: 700, color: '#166534' }}>{a.id_act}</span></td>
                <td style={{ fontWeight: 500 }}>{a.actividad}</td>
                <td><span className={`badge ${tipoBadge[a.tipo] || 'badge-gray'}`}>{a.tipo || '—'}</span></td>
                <td>{a.unidad_rendimiento || '—'}</td>
                <td>{a.tarifa_jornada ? `RD$ ${a.tarifa_jornada}` : '—'}</td>
                <td>{a.tarifa_ajuste ? `RD$ ${a.tarifa_ajuste}` : '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-secondary" onClick={() => openEdit(a)}><Edit2 size={13} /></button>
                    <button className="btn-danger" onClick={() => del(a.id_act)}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No hay actividades</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>{editing ? 'Editar Actividad' : 'Nueva Actividad'}</h2>
            <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>ID Actividad *</label>
                <input className="input" value={form.id_act} onChange={e => setForm({ ...form, id_act: e.target.value })} required disabled={!!editing} placeholder="A-001" />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Nombre de Actividad *</label>
                <input className="input" value={form.actividad} onChange={e => setForm({ ...form, actividad: e.target.value })} required />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Tipo</label>
                <select className="select" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                  <option value="">Seleccionar...</option>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Unidad Rendimiento</label>
                <select className="select" value={form.unidad_rendimiento} onChange={e => setForm({ ...form, unidad_rendimiento: e.target.value })}>
                  <option value="ha">Hectáreas (ha)</option><option value="arboles">Árboles</option><option value="unidad">Unidad</option><option value="m3">m³</option><option value="turno">Turno</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Tarifa Jornada (RD$)</label>
                <input className="input" type="number" step="0.01" min="0" value={form.tarifa_jornada} onChange={e => setForm({ ...form, tarifa_jornada: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Tarifa Ajuste (RD$)</label>
                <input className="input" type="number" step="0.01" min="0" value={form.tarifa_ajuste} onChange={e => setForm({ ...form, tarifa_ajuste: e.target.value })} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>KPI Principal</label>
                <input className="input" value={form.kpi_principal || ''} onChange={e => setForm({ ...form, kpi_principal: e.target.value })} />
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
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
