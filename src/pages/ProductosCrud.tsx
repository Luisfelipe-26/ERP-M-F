import { useEffect, useState } from 'react'
import api from '../api'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, Package, Search, AlertTriangle, Tag } from 'lucide-react'

const UNIDADES = ['L','Kg','unidad','g','mL']
const fmt = n => `RD$ ${Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`
const fmtN = (n, dec = 2) => Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: dec, maximumFractionDigits: dec })

const StockBadge = ({ stock, minimo }) => {
  if (stock === 0) return <span style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>Sin stock</span>
  if (minimo > 0 && stock <= minimo) return <span style={{ background: '#fef9c3', color: '#854d0e', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>Bajo mínimo</span>
  return <span style={{ background: '#dcfce7', color: '#166534', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>OK</span>
}

const empty = {
  id_prod: '', producto: '', tipo: '', unidad: 'L',
  costo_unitario: '', stock_actual: 0, stock_minimo: 0,
  stock_maximo: '', proveedor: '', concentracion: '',
  es_inventariable: true
}

export default function ProductosCrud() {
  const [items, setItems] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [buscar, setBuscar] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroStock, setFiltroStock] = useState('todos')
  const [saving, setSaving] = useState(false)
  const [tipos, setTipos] = useState([])
  const [proveedoresLista, setProveedoresLista] = useState([])
  const [showTiposManager, setShowTiposManager] = useState(false)
  const [nuevoTipo, setNuevoTipo] = useState('')
  const [editingTipo, setEditingTipo] = useState(null)
  const [editTipoNombre, setEditTipoNombre] = useState('')

  useEffect(() => { load(); loadTipos(); loadProveedores() }, [])

  async function loadTipos() {
    try { const { data } = await api.get('/tipos-producto'); setTipos(data) }
    catch { /* fallback: tipos stays empty */ }
  }

  async function loadProveedores() {
    try { const { data } = await api.get('/proveedores'); setProveedoresLista(data) }
    catch { /* fallback */ }
  }

  async function crearTipo() {
    if (!nuevoTipo.trim()) return
    try {
      await api.post('/tipos-producto', { nombre: nuevoTipo.trim().toUpperCase() })
      toast.success(`Tipo "${nuevoTipo.trim().toUpperCase()}" creado`)
      setNuevoTipo('')
      loadTipos()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al crear tipo') }
  }

  async function updateTipo(id) {
    if (!editTipoNombre.trim()) return
    try {
      await api.put(`/tipos-producto/${id}`, { nombre: editTipoNombre.trim().toUpperCase() })
      toast.success('Tipo actualizado')
      setEditingTipo(null)
      loadTipos(); load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  async function deleteTipo(id, nombre) {
    if (!confirm(`¿Eliminar tipo "${nombre}"?`)) return
    try {
      const { data } = await api.delete(`/tipos-producto/${id}`)
      toast.success(data.message || 'Tipo eliminado')
      loadTipos()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  async function load() {
    try {
      const { data } = await api.get('/inventario/articulos')
      setItems(data)
    } catch { toast.error('Error al cargar productos') }
  }

  async function openNew() {
    try { const { data } = await api.get('/inventario/articulos/next-id'); setForm({ ...empty, id_prod: data.next_id }) }
    catch { setForm(empty) }
    setEditing(null); setModal(true)
  }

  function openEdit(p) {
    setForm({
      id_prod: p.id_prod, producto: p.producto, tipo: p.tipo || '',
      unidad: p.unidad || 'L', costo_unitario: p.costo_unitario || '',
      stock_actual: p.stock_actual || 0, stock_minimo: p.stock_minimo || 0,
      stock_maximo: p.stock_maximo || '', proveedor: p.proveedor || '',
      concentracion: p.concentracion || '',
      es_inventariable: p.es_inventariable !== false
    })
    setEditing(p.id_prod); setModal(true)
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        costo_unitario: Number(form.costo_unitario) || null,
        stock_actual: Number(form.stock_actual),
        stock_minimo: Number(form.stock_minimo),
        stock_maximo: form.stock_maximo ? Number(form.stock_maximo) : null,
      }
      if (editing) await api.put(`/inventario/articulos/${editing}`, payload)
      else await api.post('/inventario/articulos', payload)
      toast.success(editing ? 'Producto actualizado' : 'Producto creado')
      setModal(false); load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  async function del(id_prod) {
    if (!confirm('¿Desactivar este producto?')) return
    try { await api.delete(`/inventario/articulos/${id_prod}`); toast.success('Producto desactivado'); load() }
    catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  const filtered = items.filter(p => {
    const txt = buscar.toLowerCase()
    const matchTxt = !txt || p.producto.toLowerCase().includes(txt) || p.id_prod.toLowerCase().includes(txt) || (p.proveedor || '').toLowerCase().includes(txt)
    const matchTipo = !filtroTipo || p.tipo === filtroTipo
    const matchStock = filtroStock === 'todos' || (filtroStock === 'bajo' && p.bajo_minimo) || (filtroStock === 'sin' && p.stock_actual === 0) || (filtroStock === 'ok' && !p.bajo_minimo && p.stock_actual > 0)
    return matchTxt && matchTipo && matchStock
  })

  const totalValor = filtered.reduce((s, p) => s + (p.valor_inventario || 0), 0)
  const bajosMinimo = items.filter(p => p.bajo_minimo).length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#111827' }}>
            <Package size={22} style={{ verticalAlign: 'text-bottom', marginRight: 8 }} />
            Productos
          </h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>
            {items.length} productos activos · Valor total: <strong style={{ color: '#166534' }}>{fmt(totalValor)}</strong>
            {bajosMinimo > 0 && <span style={{ marginLeft: 12, color: '#dc2626' }}>⚠ {bajosMinimo} bajo mínimo</span>}
          </p>
        </div>
        <button className="btn-primary" onClick={openNew}><Plus size={16} /> Nuevo Producto</button>
        <button className="btn-secondary" onClick={() => setShowTiposManager(!showTiposManager)} style={{ marginLeft: 8 }}>
          <Tag size={14} /> {showTiposManager ? 'Cerrar Tipos' : 'Gestionar Tipos'}
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input className="input" style={{ paddingLeft: 30 }} placeholder="Buscar producto, ID o proveedor..." value={buscar} onChange={e => setBuscar(e.target.value)} />
        </div>
        <select className="select" style={{ width: 180 }} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          {tipos.map(t => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
        </select>
        <select className="select" style={{ width: 150 }} value={filtroStock} onChange={e => setFiltroStock(e.target.value)}>
          <option value="todos">Todo el stock</option>
          <option value="bajo">Bajo mínimo</option>
          <option value="sin">Sin stock</option>
          <option value="ok">Stock OK</option>
        </select>
      </div>

      {/* Tipos Manager */}
      {showTiposManager && (
        <div className="card" style={{ marginBottom: 14, border: '2px solid #bfdbfe' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e40af' }}>
              <Tag size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Tipos de Producto ({tipos.length})
            </h3>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input className="input" style={{ flex: 1 }} placeholder="Nombre del nuevo tipo..." value={nuevoTipo}
              onChange={e => setNuevoTipo(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), crearTipo())} />
            <button className="btn-primary" onClick={crearTipo} disabled={!nuevoTipo.trim()}>
              <Plus size={14} /> Crear Tipo
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {tipos.map(t => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '6px 12px'
              }}>
                {editingTipo === t.id ? (
                  <>
                    <input className="input" style={{ width: 140, padding: '4px 8px', fontSize: 12 }}
                      value={editTipoNombre} onChange={e => setEditTipoNombre(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && updateTipo(t.id)} autoFocus />
                    <button className="btn-primary" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => updateTipo(t.id)}>OK</button>
                    <button className="btn-secondary" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => setEditingTipo(null)}>✕</button>
                  </>
                ) : (
                  <>
                    <span style={{ fontWeight: 600, fontSize: 13, color: '#1e40af' }}>{t.nombre}</span>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>
                      ({items.filter(p => p.tipo === t.nombre).length})
                    </span>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#6b7280' }}
                      onClick={() => { setEditingTipo(t.id); setEditTipoNombre(t.nombre) }} title="Editar">
                      <Edit2 size={12} />
                    </button>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#dc2626' }}
                      onClick={() => deleteTipo(t.id, t.nombre)} title="Eliminar">
                      <Trash2 size={12} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts */}
      {bajosMinimo > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={15} color="#dc2626" />
          <span style={{ fontSize: 13, color: '#991b1b', fontWeight: 500 }}>
            Stock bajo mínimo: {items.filter(p => p.bajo_minimo).map(p => p.producto).join(', ')}
          </span>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Producto</th><th>Tipo</th><th>Unidad</th>
              <th style={{ textAlign: 'right' }}>Stock</th>
              <th style={{ textAlign: 'right' }}>Mínimo</th>
              <th style={{ textAlign: 'right' }}>C. Prom.</th>
              <th style={{ textAlign: 'right' }}>Valor Inv.</th>
              <th style={{ textAlign: 'center' }}>Estado</th>
              <th>Proveedor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id_prod}>
                <td><span style={{ fontWeight: 700, color: '#166534' }}>{p.id_prod}</span></td>
                <td>
                  <div style={{ fontWeight: 600, color: '#111827' }}>{p.producto}</div>
                  {p.concentracion && <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.concentracion}</div>}
                </td>
                <td><span className="badge badge-blue" style={{ fontSize: 10 }}>{p.tipo || '—'}</span></td>
                <td>
                  {p.es_inventariable === false
                    ? <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 6, padding: '2px 6px', fontSize: 10, fontWeight: 700 }}>🔧 Servicio</span>
                    : <span style={{ fontSize: 12 }}>{p.unidad || '—'}</span>
                  }
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: p.stock_actual === 0 ? '#dc2626' : p.bajo_minimo ? '#b45309' : '#111827' }}>
                  {fmtN(p.stock_actual)}
                </td>
                <td style={{ textAlign: 'right', color: '#9ca3af', fontSize: 12 }}>{fmtN(p.stock_minimo)}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(p.costo_promedio)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: '#166534' }}>{fmt(p.valor_inventario)}</td>
                <td style={{ textAlign: 'center' }}><StockBadge stock={p.stock_actual} minimo={p.stock_minimo} /></td>
                <td style={{ fontSize: 12, color: '#6b7280' }}>{p.proveedor || '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-secondary" style={{ padding: '4px 8px' }} onClick={() => openEdit(p)}><Edit2 size={13} /></button>
                    <button className="btn-danger" style={{ padding: '4px 8px' }} onClick={() => del(p.id_prod)}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={11} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No hay productos</td></tr>
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr style={{ background: '#f9fafb', fontWeight: 700 }}>
                <td colSpan={7} style={{ padding: '10px 16px', color: '#6b7280', fontSize: 12 }}>TOTAL ({filtered.length} productos)</td>
                <td style={{ padding: '10px 16px', textAlign: 'right', color: '#166534', fontSize: 15 }}>{fmt(totalValor)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 620 }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>{editing ? 'Editar Producto' : 'Nuevo Producto'}</h2>
            <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>ID Producto *</label>
                <input className="input" value={form.id_prod} onChange={e => setForm({ ...form, id_prod: e.target.value })} required disabled={!!editing} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Tipo</label>
                <select className="select" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                  <option value="">Seleccionar...</option>
                  {tipos.map(t => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 22 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={form.es_inventariable} onChange={e => setForm({ ...form, es_inventariable: e.target.checked })} />
                  {form.es_inventariable ? '📦 Inventariable' : '🔧 Servicio'}
                </label>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Nombre del Producto *</label>
                <input className="input" value={form.producto} onChange={e => setForm({ ...form, producto: e.target.value })} required />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Unidad de Medida</label>
                <select className="select" value={form.unidad} onChange={e => setForm({ ...form, unidad: e.target.value })}>
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Precio Lista (RD$)</label>
                <input className="input" type="number" step="0.01" min="0" value={form.costo_unitario} onChange={e => setForm({ ...form, costo_unitario: e.target.value })} />
              </div>
              {!editing && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Stock Inicial</label>
                  <input className="input" type="number" step="0.01" min="0" value={form.stock_actual} onChange={e => setForm({ ...form, stock_actual: e.target.value })} />
                </div>
              )}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Stock Mínimo</label>
                <input className="input" type="number" step="0.01" min="0" value={form.stock_minimo} onChange={e => setForm({ ...form, stock_minimo: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Stock Máximo</label>
                <input className="input" type="number" step="0.01" min="0" value={form.stock_maximo} onChange={e => setForm({ ...form, stock_maximo: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Concentración</label>
                <input className="input" value={form.concentracion} onChange={e => setForm({ ...form, concentracion: e.target.value })} placeholder="25%, 48%..." />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Proveedor</label>
                <select className="select" value={form.proveedor} onChange={e => setForm({ ...form, proveedor: e.target.value })}>
                  <option value="">Seleccionar...</option>
                  {proveedoresLista.map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
