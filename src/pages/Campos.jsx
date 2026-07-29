import { useEffect, useState } from 'react'
import api from '../api'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, MapPin } from 'lucide-react'

const empty = { id_campo: '', bloque: '', nombre: '', area_ha: '', n_plantas: '', variedad: 'Hass', ano_siembra: '', sistema_riego: 'Goteo', etapa: 'E2', suelo: '' }

export default function Campos() {
  const [items, setItems] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const { data } = await api.get('/campos')
      setItems(data)
    } catch { toast.error('Error al cargar campos') }
  }

  async function openNew() {
    try { const { data } = await api.get('/campos/next-id'); setForm({ ...empty, id_campo: data.next_id }) }
    catch { setForm(empty) }
    setEditing(null); setModal(true)
  }
  function openEdit(c) { setForm({ ...c, area_ha: c.area_ha ?? '', n_plantas: c.n_plantas ?? '', ano_siembra: c.ano_siembra ?? '' }); setEditing(c.id_campo); setModal(true) }

  async function save(e) {
    e.preventDefault()
    try {
      const payload = { ...form, area_ha: Number(form.area_ha) || null, n_plantas: Number(form.n_plantas) || null, ano_siembra: Number(form.ano_siembra) || null }
      if (editing) await api.put(`/campos/${editing}`, payload)
      else await api.post('/campos', payload)
      toast.success(editing ? 'Campo actualizado' : 'Campo creado')
      setModal(false); load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  async function del(id_campo) {
    if (!confirm('¿Eliminar campo?')) return
    await api.delete(`/campos/${id_campo}`)
    toast.success('Campo eliminado'); load()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#111827' }}>Campos</h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>{items.length} campos activos</p>
        </div>
        <button className="btn-primary" onClick={openNew}><Plus size={16} /> Nuevo Campo</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Bloque</th><th>Nombre</th><th>Área (ha)</th><th>Plantas</th><th>Variedad</th><th>Etapa</th><th>Sistema Riego</th><th></th>
            </tr>
          </thead>
          <tbody>
            {items.map(c => (
              <tr key={c.id_campo}>
                <td><span style={{ fontWeight: 700, color: '#166534' }}>{c.id_campo}</span></td>
                <td>{c.bloque || '—'}</td>
                <td>{c.nombre || '—'}</td>
                <td>{c.area_ha ?? '—'}</td>
                <td>{c.n_plantas?.toLocaleString() ?? '—'}</td>
                <td>{c.variedad}</td>
                <td><span className={`badge ${c.etapa === 'E1' ? 'badge-blue' : 'badge-green'}`}>{c.etapa || '—'}</span></td>
                <td>{c.sistema_riego || '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-secondary" onClick={() => openEdit(c)}><Edit2 size={13} /></button>
                    <button className="btn-danger" onClick={() => del(c.id_campo)}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No hay campos registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>{editing ? 'Editar Campo' : 'Nuevo Campo'}</h2>
            <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { label: 'ID Campo *', key: 'id_campo', required: true, disabled: !!editing },
                { label: 'Bloque', key: 'bloque' },
                { label: 'Nombre', key: 'nombre' },
                { label: 'Área (ha)', key: 'area_ha', type: 'number' },
                { label: 'N° Plantas', key: 'n_plantas', type: 'number' },
                { label: 'Año Siembra', key: 'ano_siembra', type: 'number' },
                { label: 'Variedad', key: 'variedad' },
                { label: 'Suelo', key: 'suelo' },
              ].map(({ label, key, required, disabled, type }) => (
                <div key={key}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{label}</label>
                  <input className="input" type={type || 'text'} min={type === 'number' ? '0' : undefined} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} required={required} disabled={disabled} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Sistema Riego</label>
                <select className="select" value={form.sistema_riego} onChange={e => setForm({ ...form, sistema_riego: e.target.value })}>
                  <option>Goteo</option><option>Aspersión</option><option>Gravedad</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Etapa</label>
                <select className="select" value={form.etapa} onChange={e => setForm({ ...form, etapa: e.target.value })}>
                  <option value="E1">E1 - Producción</option><option value="E2">E2 - Desarrollo</option>
                </select>
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
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
