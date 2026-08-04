import { useEffect, useState } from 'react'
import api from '../api'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, ArrowDown, ArrowUp, AlertTriangle, Search } from 'lucide-react'

const empty = { id_prod: '', producto: '', tipo: '', unidad: 'L', costo_unitario: '', stock_actual: 0, stock_minimo: 0, proveedor: '', concentracion: '' }

const TIPOS = ['FERTILIZANTE', 'FUNGICIDAS', 'INSECTICIDAS', 'HERBICIDA', 'BIOESTIMULANTE', 'PBZ', 'REGULADOR HORMONAL', 'OTRO']

const fmt = n => `RD$ ${Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`

export default function Productos() {
  const [items, setItems] = useState([])
  const [modal, setModal] = useState(false)
  const [movModal, setMovModal] = useState(null)
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [movForm, setMovForm] = useState({ tipo: 'entrada', cantidad: '', referencia: '', observacion: '' })
  const [filtroTipo, setFiltroTipo] = useState('')
  const [buscar, setBuscar] = useState('')

  useEffect(() => { load() }, [])
  async function load() {
    try {
      const { data } = await api.get('/productos')
      setItems(data)
    } catch { toast.error('Error al cargar productos') }
  }

  function openNew() { setForm(empty); setEditing(null); setModal(true) }
  function openEdit(p) { setForm({ ...p }); setEditing(p.id_prod); setModal(true) }
  function openMov(p) { setMovModal(p); setMovForm({ tipo: 'entrada', cantidad: '', referencia: '', observacion: '' }) }

  async function save(e) {
    e.preventDefault()
    try {
      const payload = { ...form, costo_unitario: Number(form.costo_unitario) || null, stock_actual: Number(form.stock_actual), stock_minimo: Number(form.stock_minimo) }
      if (editing) await api.put(`/productos/${editing}`, payload)
      else await api.post('/productos', payload)
      toast.success(editing ? 'Producto actualizado' : 'Producto creado')
      setModal(false); load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  async function registrarMov(e) {
    e.preventDefault()
    try {
      await api.post(`/productos/${movModal.id_prod}/movimiento`, { ...movForm, cantidad: Number(movForm.cantidad) })
      toast.success(`${movForm.tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada`)
      setMovModal(null); load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  async function del(id) {
    if (!confirm('¿Eliminar producto?')) return
    await api.delete(`/productos/${id}`)
    toast.success('Producto eliminado'); load()
  }

  const filtered = items.filter(p =>
    (!filtroTipo || p.tipo === filtroTipo) &&
    (!buscar || p.producto.toLowerCase().includes(buscar.toLowerCase()) || p.id_prod.toLowerCase().includes(buscar.toLowerCase()) || (p.proveedor || '').toLowerCase().includes(buscar.toLowerCase()))
  )
  const bajosStock = items.filter(p => p.stock_minimo > 0 && p.stock_actual <= p.stock_minimo)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#111827' }}>Inventario de Productos</h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>{items.length} productos · {bajosStock.length} con stock bajo</p>
        </div>
        <button className="btn-primary" onClick={openNew}><Plus size={16} /> Nuevo Producto</button>
      </div>

      {bajosStock.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={16} color="#dc2626" />
          <span style={{ fontSize: 13, color: '#991b1b' }}>Stock bajo: {bajosStock.map(p => p.producto).join(', ')}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input className="input" style={{ paddingLeft: 30 }} placeholder="Buscar producto, ID o proveedor..." value={buscar} onChange={e => setBuscar(e.target.value)} />
        </div>
        <select className="select" style={{ width: 200 }} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr><th>ID</th><th>Producto</th><th>Tipo</th><th>Unidad</th><th>Costo Unit.</th><th>Stock</th><th>Stock Mín.</th><th>Proveedor</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const bajo = p.stock_minimo > 0 && p.stock_actual <= p.stock_minimo
              return (
                <tr key={p.id_prod}>
                  <td><span style={{ fontWeight: 700, color: '#166534' }}>{p.id_prod}</span></td>
                  <td style={{ fontWeight: 500 }}>{p.producto}</td>
                  <td><span className="badge badge-blue" style={{ fontSize: 11 }}>{p.tipo || '—'}</span></td>
                  <td>{p.unidad}</td>
                  <td>{p.costo_unitario ? fmt(p.costo_unitario) : '—'}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: bajo ? '#dc2626' : '#166534' }}>
                      {p.stock_actual} {p.unidad}
                    </span>
                    {bajo && <AlertTriangle size={12} color="#dc2626" style={{ marginLeft: 4 }} />}
                  </td>
                  <td>{p.stock_minimo || '—'}</td>
                  <td style={{ fontSize: 12, color: '#6b7280' }}>{p.proveedor || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-secondary" onClick={() => openMov(p)} title="Registrar movimiento"><ArrowDown size={13} color="#166534" /></button>
                      <button className="btn-secondary" onClick={() => openEdit(p)}><Edit2 size={13} /></button>
                      <button className="btn-danger" onClick={() => del(p.id_prod)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No hay productos</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Producto */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>{editing ? 'Editar Producto' : 'Nuevo Producto'}</h2>
            <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>ID Producto *</label>
                <input className="input" value={form.id_prod} required disabled />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Nombre del Producto *</label>
                <input className="input" value={form.producto} onChange={e => setForm({ ...form, producto: e.target.value })} required />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Tipo</label>
                <select className="select" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                  <option value="">Seleccionar...</option>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Unidad</label>
                <select className="select" value={form.unidad} onChange={e => setForm({ ...form, unidad: e.target.value })}>
                  <option value="L">Litros (L)</option><option value="Kg">Kilogramos (Kg)</option><option value="unidad">Unidad</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Costo Unitario (RD$)</label>
                <input className="input" type="number" step="0.01" value={form.costo_unitario} onChange={e => setForm({ ...form, costo_unitario: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Stock Actual</label>
                <input className="input" type="number" step="0.01" value={form.stock_actual} onChange={e => setForm({ ...form, stock_actual: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Stock Mínimo</label>
                <input className="input" type="number" step="0.01" value={form.stock_minimo} onChange={e => setForm({ ...form, stock_minimo: e.target.value })} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Proveedor</label>
                <input className="input" value={form.proveedor || ''} onChange={e => setForm({ ...form, proveedor: e.target.value })} />
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Movimiento */}
      {movModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setMovModal(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>Movimiento de Inventario</h2>
            <p style={{ margin: '0 0 20px', color: '#6b7280', fontSize: 13 }}>{movModal.producto} · Stock actual: {movModal.stock_actual} {movModal.unidad}</p>
            <form onSubmit={registrarMov} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Tipo de Movimiento</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['entrada', 'salida'].map(t => (
                    <button key={t} type="button" onClick={() => setMovForm({ ...movForm, tipo: t })}
                      style={{
                        flex: 1, padding: '8px', borderRadius: 10, border: `2px solid ${movForm.tipo === t ? (t === 'entrada' ? '#166534' : '#dc2626') : '#e5e7eb'}`,
                        background: movForm.tipo === t ? (t === 'entrada' ? '#dcfce7' : '#fee2e2') : 'white',
                        color: movForm.tipo === t ? (t === 'entrada' ? '#166534' : '#dc2626') : '#6b7280',
                        cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                      }}>
                      {t === 'entrada' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Cantidad ({movModal.unidad}) *</label>
                <input className="input" type="number" step="0.01" min="0.01" value={movForm.cantidad} onChange={e => setMovForm({ ...movForm, cantidad: e.target.value })} required />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Referencia (OT / Factura)</label>
                <input className="input" value={movForm.referencia} onChange={e => setMovForm({ ...movForm, referencia: e.target.value })} placeholder="Ej: OT-100, FAC-001" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Observación</label>
                <input className="input" value={movForm.observacion} onChange={e => setMovForm({ ...movForm, observacion: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setMovModal(null)}>Cancelar</button>
                <button type="submit" className="btn-primary">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
