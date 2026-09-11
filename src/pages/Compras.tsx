import { useEffect, useState, useCallback } from 'react'
import api from '../api'
import toast from 'react-hot-toast'
import {
  Plus, Search, RefreshCw, ShoppingCart, X, Trash2, Eye, ChevronRight, Download, Edit2
} from 'lucide-react'

const fmt = n => `RD$ ${Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-DO') : '—'

const ESTADO_COLORS = {
  Borrador:  { bg: '#f3f4f6', color: '#374151', border: '#d1d5db' },
  Aprobada:  { bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
  Parcial:   { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
  Recibida:  { bg: '#dcfce7', color: '#166534', border: '#86efac' },
  Cerrada:   { bg: '#e0e7ff', color: '#3730a3', border: '#a5b4fc' },
  Cancelada: { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
}

const Badge = ({ estado }) => {
  const c = ESTADO_COLORS[estado] || { bg: '#f3f4f6', color: '#374151', border: '#d1d5db' }
  return <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{estado}</span>
}

const Modal = ({ title, subtitle = '', onClose, children, width = 700 }) => (
  <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="modal" style={{ maxWidth: width, width: '95%', maxHeight: '90vh', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h2>
          {subtitle && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>{subtitle}</p>}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}><X size={18} /></button>
      </div>
      {children}
    </div>
  </div>
)

// ─── Modal Nueva OC ────────────────────────────────────────────────────────
function ModalNuevaOC({ onClose, onDone }) {
  const [nextId, setNextId] = useState('')
  const [productos, setProductos] = useState([])
  const [proveedoresLista, setProveedoresLista] = useState([])
  const [campos, setCampos] = useState([])
  const [dims, setDims] = useState<{ unidades: any[]; deptos: any[]; almacenes: any[] }>({ unidades: [], deptos: [], almacenes: [] })
  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    proveedor_id: '',
    proveedor: '',
    campo_id: '',
    unidad_negocio_id: '',
    departamento_id: '',
    almacen_id: '',
    observaciones: '',
  })
  const [lineas, setLineas] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/ordenes-compra/preview/next-id'),
      api.get('/inventario/articulos'),
      api.get('/proveedores'),
      api.get('/campos'),
      api.get('/contabilidad/unidades-negocio'),
      api.get('/contabilidad/departamentos'),
      api.get('/contabilidad/almacenes'),
    ]).then(([n, p, prov, c, un, dep, alm]) => {
      setNextId(n.data.next_oc_id)
      setProductos(p.data)
      setProveedoresLista(prov.data)
      setCampos(c.data)
      setDims({ unidades: un.data, deptos: dep.data, almacenes: alm.data })
    })
  }, [])

  function addLinea() {
    setLineas([...lineas, { producto_id: '', cantidad: '', precio_unitario: '', descuento_pct: '0', impuesto: 'itbis_18' }])
  }

  function updateLinea(i, key, val) {
    const updated = [...lineas]
    updated[i] = { ...updated[i], [key]: val }
    if (key === 'producto_id') {
      const p = productos.find(p => p.id_prod === val)
      if (p) {
        updated[i].precio_unitario = p.costo_promedio || p.costo_unitario || ''
        updated[i].impuesto = p.impuesto_compra || 'itbis_18'
      }
    }
    setLineas(updated)
  }

  function removeLinea(i) { setLineas(lineas.filter((_, idx) => idx !== i)) }

  function calcSubtotal(l) {
    const cant = Number(l.cantidad) || 0
    const precio = Number(l.precio_unitario) || 0
    const desc = Number(l.descuento_pct) || 0
    return cant * precio * (1 - desc / 100)
  }

  const total = lineas.reduce((s, l) => s + calcSubtotal(l), 0)

  async function submit(e) {
    e.preventDefault()
    if (lineas.length === 0) return toast.error('Agregue al menos una línea')
    const invalid = lineas.some(l => !l.producto_id || !l.cantidad || Number(l.cantidad) <= 0 || !l.precio_unitario)
    if (invalid) return toast.error('Complete todos los campos de cada línea')
    setSaving(true)
    try {
      const { data: result } = await api.post('/ordenes-compra', {
        ...form,
        fecha: form.fecha ? new Date(form.fecha).toISOString() : undefined,
        proveedor_id: form.proveedor_id ? Number(form.proveedor_id) : null,
        proveedor: form.proveedor || null,
        unidad_negocio_id: form.unidad_negocio_id ? Number(form.unidad_negocio_id) : null,
        departamento_id: form.departamento_id ? Number(form.departamento_id) : null,
        almacen_id: form.almacen_id ? Number(form.almacen_id) : null,
        lineas: lineas.map(l => ({
          producto_id: l.producto_id,
          cantidad: Number(l.cantidad),
          precio_unitario: Number(l.precio_unitario),
          descuento_pct: Number(l.descuento_pct) || 0,
          impuesto: l.impuesto || 'itbis_18',
        })),
      })
      toast.success(`Orden de Compra ${result.oc_id || nextId} creada`)
      if (result.alertas_presupuesto?.length) {
        result.alertas_presupuesto.forEach((a: string) => toast(a, { icon: '⚠️', duration: 6000 }))
      }
      onDone()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al crear OC')
    } finally { setSaving(false) }
  }

  return (
    <Modal title="Nueva Orden de Compra" subtitle={`Se asignará el número ${nextId}`} onClose={onClose} width={800}>
      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>N° OC</label>
            <input className="input" value={nextId} disabled style={{ fontWeight: 700, fontSize: 16, color: '#166534', background: '#f0fdf4' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Fecha *</label>
            <input className="input" type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} required />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Proveedor</label>
            <select className="select" value={form.proveedor_id} onChange={e => {
              const pid = e.target.value
              const prov = proveedoresLista.find(p => String(p.id) === pid)
              setForm({ ...form, proveedor_id: pid, proveedor: prov?.nombre || '' })
            }}>
              <option value="">— Seleccionar proveedor —</option>
              {proveedoresLista.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Campo (para servicios)</label>
            <select className="select" value={form.campo_id} onChange={e => setForm({ ...form, campo_id: e.target.value })}>
              <option value="">— Sin asignar —</option>
              {campos.map(c => <option key={c.id_campo} value={c.id_campo}>{c.nombre_campo || c.id_campo}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Unidad de Negocio</label>
            <select className="select" value={form.unidad_negocio_id} onChange={e => setForm({ ...form, unidad_negocio_id: e.target.value })}><option value="">—</option>{dims.unidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}</select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Departamento</label>
            <select className="select" value={form.departamento_id} onChange={e => setForm({ ...form, departamento_id: e.target.value })}><option value="">—</option>{dims.deptos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}</select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Almacén</label>
            <select className="select" value={form.almacen_id} onChange={e => setForm({ ...form, almacen_id: e.target.value })}><option value="">—</option>{dims.almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}</select>
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Observaciones</label>
            <input className="input" value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#166534' }}>Líneas de Compra</h3>
          <button type="button" className="btn-secondary" onClick={addLinea}><Plus size={14} /> Agregar Línea</button>
        </div>

        {lineas.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: 13 }}>Agregue productos a la orden de compra</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lineas.map((l, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 0.7fr 0.9fr 0.6fr 0.9fr 1fr auto', gap: 8, alignItems: 'end' }}>
                <div>
                  {i === 0 && <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Producto</label>}
                  <select className="select" value={l.producto_id} onChange={e => updateLinea(i, 'producto_id', e.target.value)} required>
                    <option value="">Seleccionar...</option>
                    {productos.map(p => <option key={p.id_prod} value={p.id_prod}>{p.producto} ({p.unidad})</option>)}
                  </select>
                </div>
                <div>
                  {i === 0 && <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Cantidad</label>}
                  <input className="input" type="number" step="0.01" min="0.01" value={l.cantidad} onChange={e => updateLinea(i, 'cantidad', e.target.value)} required />
                </div>
                <div>
                  {i === 0 && <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Precio Unit.</label>}
                  <input className="input" type="number" step="0.01" min="0" value={l.precio_unitario} onChange={e => updateLinea(i, 'precio_unitario', e.target.value)} required />
                </div>
                <div>
                  {i === 0 && <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Desc. %</label>}
                  <input className="input" type="number" step="0.5" min="0" max="100" value={l.descuento_pct} onChange={e => updateLinea(i, 'descuento_pct', e.target.value)} />
                </div>
                <div>
                  {i === 0 && <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Impuesto</label>}
                  <select className="select" value={l.impuesto} onChange={e => updateLinea(i, 'impuesto', e.target.value)} style={{ fontSize: 11 }}>
                    <option value="itbis_18">ITBIS 18%</option>
                    <option value="itbis_0">ITBIS 0%</option>
                    <option value="exento">Exento</option>
                  </select>
                </div>
                <div>
                  {i === 0 && <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Subtotal</label>}
                  <input className="input" value={fmt(calcSubtotal(l))} disabled style={{ fontWeight: 700, color: '#166534', background: '#f9fafb' }} />
                </div>
                <button type="button" className="btn-danger" onClick={() => removeLinea(i)} style={{ marginTop: i === 0 ? 18 : 0 }}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, padding: '14px 0', borderTop: '2px solid #e5e7eb' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#166534' }}>Total: {fmt(total)}</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving} style={{ padding: '8px 20px' }}>
              <ShoppingCart size={14} /> {saving ? 'Guardando...' : 'Crear Orden de Compra'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

// ─── Modal Detalle OC ────────────────────────────────────────────────────────
function ModalDetalleOC({ ocId, onClose, onDone }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showRecepcion, setShowRecepcion] = useState(false)
  const [recepcion, setRecepcion] = useState([])
  const [numFactura, setNumFactura] = useState('')
  const [saving, setSaving] = useState(false)
  const [dims, setDims] = useState<{ unidades: any[]; deptos: any[]; almacenes: any[] }>({ unidades: [], deptos: [], almacenes: [] })

  useEffect(() => {
    Promise.all([
      api.get(`/ordenes-compra/${ocId}`),
      api.get('/contabilidad/unidades-negocio'),
      api.get('/contabilidad/departamentos'),
      api.get('/contabilidad/almacenes'),
    ]).then(([oc, un, dep, alm]) => {
      setData(oc.data)
      setDims({ unidades: un.data, deptos: dep.data, almacenes: alm.data })
    }).catch(() => toast.error('Error al cargar'))
      .finally(() => setLoading(false))
  }, [ocId])

  const dimLabel = (type: string, id: number | null) => {
    if (!id) return null
    const list = type === 'unidades' ? dims.unidades : type === 'deptos' ? dims.deptos : dims.almacenes
    return list.find((d: any) => d.id === id)?.nombre || null
  }

  async function cambiarEstado(estado) {
    try {
      await api.put(`/ordenes-compra/${ocId}/estado?estado=${estado}`)
      toast.success(`Estado cambiado a ${estado}`)
      onDone()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error')
    }
  }

  async function aprobarOC() {
    try {
      await api.post(`/ordenes-compra/${ocId}/aprobar`)
      toast.success('OC aprobada — compromiso presupuestario creado')
      onDone()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al aprobar')
    }
  }

  async function cerrarOC() {
    try {
      await api.post(`/ordenes-compra/${ocId}/cerrar`)
      toast.success('OC cerrada')
      onDone()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al cerrar')
    }
  }

  function iniciarRecepcion() {
    setRecepcion(data.lineas.map(l => ({
      linea_id: l.id,
      producto_nombre: l.producto_nombre,
      producto_id: l.producto_id,
      cantidad: l.cantidad,
      ya_recibida: l.cantidad_recibida,
      pendiente: l.cantidad_pendiente,
      unidad: l.unidad,
      precio_unitario: l.precio_unitario,
      cantidad_recibida: l.cantidad_pendiente > 0 ? l.cantidad_pendiente : 0,
    })))
    setShowRecepcion(true)
  }

  async function submitRecepcion(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        num_factura: numFactura || null,
        lineas: recepcion.filter(r => r.cantidad_recibida > 0).map(r => ({
          linea_id: r.linea_id,
          cantidad_recibida: Number(r.cantidad_recibida),
        }))
      }
      const { data: result } = await api.post(`/ordenes-compra/${ocId}/recepcion`, payload)
      const refs = [result.asiento && `Asiento: ${result.asiento}`, result.cxp && `CxP: ${result.cxp}`].filter(Boolean).join(' · ')
      toast.success(`Recepción registrada — Estado: ${result.estado}${refs ? ` · ${refs}` : ''}`)
      onDone()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al registrar recepción')
    } finally { setSaving(false) }
  }

  function updateRecQty(i, val) {
    const updated = [...recepcion]
    updated[i].cantidad_recibida = val
    setRecepcion(updated)
  }

  if (loading) return <Modal title="Cargando..." onClose={onClose}><p style={{ color: '#9ca3af' }}>Cargando detalle...</p></Modal>
  if (!data) return null

  const { orden, lineas } = data
  const totalRecibido = lineas.reduce((s, l) => s + (l.cantidad_recibida * l.precio_unitario), 0)
  const totalPendiente = lineas.reduce((s, l) => s + (l.cantidad_pendiente * l.precio_unitario), 0)

  if (showRecepcion) {
    return (
      <Modal title={`Recepción — ${orden.oc_id}`} subtitle={`${orden.proveedor || ''}`} onClose={() => setShowRecepcion(false)} width={800}>
        <form onSubmit={submitRecepcion}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>N° Factura del Proveedor</label>
              <input className="input" value={numFactura} onChange={e => setNumFactura(e.target.value)} placeholder="Ej: FAC-001234" />
            </div>
            <div style={{ display: 'flex', alignItems: 'end' }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#166534' }}>
                Pendiente: {fmt(totalPendiente)}
              </div>
            </div>
          </div>

          <table className="table" style={{ fontSize: 12, marginBottom: 16 }}>
            <thead>
              <tr>
                <th>Producto</th>
                <th style={{ textAlign: 'right' }}>Pedido</th>
                <th style={{ textAlign: 'right' }}>Ya Recibido</th>
                <th style={{ textAlign: 'right' }}>Pendiente</th>
                <th style={{ textAlign: 'right', width: 120 }}>Recibir Ahora</th>
              </tr>
            </thead>
            <tbody>
              {recepcion.map((r, i) => (
                <tr key={r.linea_id} style={{ opacity: r.pendiente <= 0 ? 0.4 : 1 }}>
                  <td style={{ fontWeight: 600 }}>{r.producto_nombre} <span style={{ color: '#9ca3af', fontSize: 10 }}>({r.producto_id})</span></td>
                  <td style={{ textAlign: 'right' }}>{r.cantidad} {r.unidad}</td>
                  <td style={{ textAlign: 'right', color: '#166534', fontWeight: 700 }}>{r.ya_recibida} {r.unidad}</td>
                  <td style={{ textAlign: 'right', color: r.pendiente > 0 ? '#b45309' : '#166534', fontWeight: 700 }}>{r.pendiente} {r.unidad}</td>
                  <td style={{ textAlign: 'right' }}>
                    <input className="input" type="number" step="0.01" min="0" max={r.pendiente}
                      value={r.cantidad_recibida} onChange={e => updateRecQty(i, e.target.value)}
                      disabled={r.pendiente <= 0}
                      style={{ width: 100, textAlign: 'right', fontWeight: 700, color: '#166534' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary" onClick={() => setShowRecepcion(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving} style={{ background: '#166534' }}>
              {saving ? 'Registrando...' : '✓ Registrar Recepción'}
            </button>
          </div>
        </form>
      </Modal>
    )
  }

  return (
    <Modal title={`Orden de Compra ${orden.oc_id}`} subtitle={`${orden.proveedor || 'Sin proveedor'} · ${fmtDate(orden.fecha)}`} onClose={onClose} width={800}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Estado', value: <Badge estado={orden.estado} /> },
          { label: 'Total Estimado', value: fmt(orden.total_estimado), color: '#111827' },
          { label: 'Recibido', value: fmt(totalRecibido), color: '#166534' },
          { label: 'Pendiente', value: fmt(totalPendiente), color: '#b45309' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#f9fafb', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: color || '#111827' }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ overflowX: 'auto' }}>
      <table className="table" style={{ fontSize: 12, marginBottom: 20 }}>
        <thead>
          <tr>
            <th>Producto</th>
            <th style={{ textAlign: 'right' }}>Cantidad</th>
            <th style={{ textAlign: 'right' }}>Recibida</th>
            <th style={{ textAlign: 'right' }}>Pendiente</th>
            <th style={{ textAlign: 'right' }}>Precio Unit.</th>
            <th style={{ textAlign: 'right' }}>Desc.%</th>
            <th>Impuesto</th>
            <th style={{ textAlign: 'right' }}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {lineas.map(l => (
            <tr key={l.id}>
              <td style={{ fontWeight: 600 }}>{l.producto_nombre} <span style={{ color: '#9ca3af', fontSize: 10 }}>({l.producto_id})</span></td>
              <td style={{ textAlign: 'right' }}>{l.cantidad} {l.unidad}</td>
              <td style={{ textAlign: 'right', color: '#166534', fontWeight: 700 }}>{l.cantidad_recibida} {l.unidad}</td>
              <td style={{ textAlign: 'right', color: l.cantidad_pendiente > 0 ? '#b45309' : '#166534', fontWeight: 700 }}>
                {l.cantidad_pendiente} {l.unidad}
              </td>
              <td style={{ textAlign: 'right' }}>{fmt(l.precio_unitario)}</td>
              <td style={{ textAlign: 'right', color: (l.descuento_pct || 0) > 0 ? '#dc2626' : '#9ca3af' }}>{l.descuento_pct || 0}%</td>
              <td style={{ fontSize: 10, color: '#6b7280' }}>{l.impuesto === 'itbis_18' ? 'ITBIS 18%' : l.impuesto === 'exento' ? 'Exento' : l.impuesto || 'ITBIS 18%'}</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(l.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {orden.observaciones && (
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
          <strong>Observaciones:</strong> {orden.observaciones}
        </div>
      )}

      {data.compromiso && (
        <div style={{ background: data.compromiso.estado === 'activo' ? '#fef9c3' : data.compromiso.estado === 'ejecutado' ? '#dcfce7' : '#f3f4f6', border: `1px solid ${data.compromiso.estado === 'activo' ? '#fde047' : data.compromiso.estado === 'ejecutado' ? '#86efac' : '#d1d5db'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
          <span style={{ fontSize: 15 }}>📋</span>
          <span style={{ fontWeight: 700, color: '#374151' }}>Compromiso Presupuestario</span>
          <span style={{ color: '#6b7280' }}>{fmt(data.compromiso.monto)}</span>
          <span style={{ marginLeft: 'auto', background: data.compromiso.estado === 'activo' ? '#fef9c3' : data.compromiso.estado === 'ejecutado' ? '#dcfce7' : '#fee2e2', color: data.compromiso.estado === 'activo' ? '#854d0e' : data.compromiso.estado === 'ejecutado' ? '#166534' : '#991b1b', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{data.compromiso.estado}</span>
        </div>
      )}

      {data.asiento_contable && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
          <span>📒</span>
          <span style={{ fontWeight: 700, color: '#1e40af' }}>Asiento: {data.asiento_contable.numero}</span>
          <span style={{ color: '#6b7280' }}>{data.asiento_contable.fecha} · {fmt(data.asiento_contable.total_debe)}</span>
          <span style={{ marginLeft: 'auto', background: '#dcfce7', color: '#166534', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{data.asiento_contable.estado}</span>
        </div>
      )}

      {data.cuentas_por_pagar?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 6 }}>Cuentas por Pagar</div>
          {data.cuentas_por_pagar.map((c: any) => (
            <div key={c.numero} style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: 8, padding: '8px 14px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
              <span style={{ fontWeight: 700, color: '#854d0e' }}>{c.numero}</span>
              {c.num_factura && <span style={{ color: '#6b7280' }}>Fact: {c.num_factura}</span>}
              <span style={{ color: '#374151' }}>{fmt(c.total)}</span>
              <span style={{ color: c.saldo > 0 ? '#b45309' : '#166534', fontWeight: 600 }}>Saldo: {fmt(c.saldo)}</span>
              <span style={{ marginLeft: 'auto', background: c.estado === 'pagada' ? '#dcfce7' : c.estado === 'pendiente' ? '#fef9c3' : '#fee2e2', color: c.estado === 'pagada' ? '#166534' : c.estado === 'pendiente' ? '#854d0e' : '#991b1b', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{c.estado}</span>
            </div>
          ))}
        </div>
      )}

      {(orden.num_factura || orden.campo_id || orden.unidad_negocio_id || orden.departamento_id || orden.almacen_id) && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          {orden.num_factura && (
            <div style={{ background: '#eff6ff', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#1e40af' }}>
              <strong>Factura:</strong> {orden.num_factura}
            </div>
          )}
          {orden.campo_id && (
            <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#166534' }}>
              <strong>Campo:</strong> {orden.campo_id}
            </div>
          )}
          {dimLabel('unidades', orden.unidad_negocio_id) && (
            <div style={{ background: '#eff6ff', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#1e40af', border: '1px solid #bfdbfe' }}>
              <strong>UN:</strong> {dimLabel('unidades', orden.unidad_negocio_id)}
            </div>
          )}
          {dimLabel('deptos', orden.departamento_id) && (
            <div style={{ background: '#fef9c3', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#854d0e', border: '1px solid #fde047' }}>
              <strong>Depto:</strong> {dimLabel('deptos', orden.departamento_id)}
            </div>
          )}
          {dimLabel('almacenes', orden.almacen_id) && (
            <div style={{ background: '#fce7f3', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#9d174d', border: '1px solid #f9a8d4' }}>
              <strong>Almacén:</strong> {dimLabel('almacenes', orden.almacen_id)}
            </div>
          )}
        </div>
      )}

      {orden.aprobado_por && (
        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>
          Aprobada por <strong>{orden.aprobado_por}</strong> el {fmtDate(orden.fecha_aprobacion)}
          {orden.cerrado_por && <> | Cerrada por <strong>{orden.cerrado_por}</strong> el {fmtDate(orden.fecha_cierre)}</>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {['Borrador', 'Aprobada', 'Parcial'].includes(orden.estado) && (
          <button className="btn-secondary" onClick={() => cambiarEstado('Cancelada')} style={{ color: '#dc2626' }}>Cancelar OC</button>
        )}
        {orden.estado === 'Borrador' && (
          <button className="btn-primary" onClick={aprobarOC} style={{ background: '#854d0e' }}>
            Aprobar OC
          </button>
        )}
        {['Aprobada', 'Parcial'].includes(orden.estado) && (
          <button className="btn-primary" onClick={iniciarRecepcion} style={{ background: '#166534' }}>
            Registrar Recepción
          </button>
        )}
        {['Aprobada', 'Parcial', 'Recibida'].includes(orden.estado) && (
          <button className="btn-secondary" onClick={cerrarOC} style={{ color: '#3730a3' }}>Cerrar OC</button>
        )}
        <button className="btn-secondary" onClick={onClose}>Cerrar</button>
      </div>
    </Modal>
  )
}

// ─── Modal Editar OC ────────────────────────────────────────────────────────
function ModalEditarOC({ ocId, onClose, onDone }) {
  const [loading, setLoading] = useState(true)
  const [productos, setProductos] = useState([])
  const [proveedoresLista, setProveedoresLista] = useState([])
  const [campos, setCampos] = useState([])
  const [dims, setDims] = useState<{ unidades: any[]; deptos: any[]; almacenes: any[] }>({ unidades: [], deptos: [], almacenes: [] })
  const [form, setForm] = useState({ fecha: '', proveedor_id: '', proveedor: '', campo_id: '', unidad_negocio_id: '', departamento_id: '', almacen_id: '', observaciones: '' })
  const [lineas, setLineas] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get(`/ordenes-compra/${ocId}`),
      api.get('/inventario/articulos'),
      api.get('/proveedores'),
      api.get('/campos'),
      api.get('/contabilidad/unidades-negocio'),
      api.get('/contabilidad/departamentos'),
      api.get('/contabilidad/almacenes'),
    ]).then(([oc, p, prov, c, un, dep, alm]) => {
      const o = oc.data.orden
      setForm({
        fecha: o.fecha ? o.fecha.slice(0, 10) : '',
        proveedor_id: o.proveedor_id || '',
        proveedor: o.proveedor || '',
        campo_id: o.campo_id || '',
        unidad_negocio_id: o.unidad_negocio_id || '',
        departamento_id: o.departamento_id || '',
        almacen_id: o.almacen_id || '',
        observaciones: o.observaciones || '',
      })
      setDims({ unidades: un.data, deptos: dep.data, almacenes: alm.data })
      setLineas(oc.data.lineas.map(l => ({
        producto_id: l.producto_id,
        cantidad: l.cantidad,
        precio_unitario: l.precio_unitario,
        descuento_pct: l.descuento_pct || 0,
        impuesto: l.impuesto || 'itbis_18',
      })))
      setProductos(p.data)
      setProveedoresLista(prov.data)
      setCampos(c.data)
    }).catch(() => toast.error('Error al cargar'))
      .finally(() => setLoading(false))
  }, [ocId])

  function addLinea() { setLineas([...lineas, { producto_id: '', cantidad: 1, precio_unitario: 0, descuento_pct: 0, impuesto: 'itbis_18' }]) }
  function removeLinea(i) { setLineas(lineas.filter((_, j) => j !== i)) }
  function updateLinea(i, field, val) {
    const updated = [...lineas]
    updated[i][field] = val
    setLineas(updated)
  }

  function calcSubtotal(l) {
    const cant = Number(l.cantidad) || 0
    const precio = Number(l.precio_unitario) || 0
    const desc = Number(l.descuento_pct) || 0
    return cant * precio * (1 - desc / 100)
  }

  async function save(e) {
    e.preventDefault()
    if (lineas.length === 0) return toast.error('Agrega al menos una línea')
    setSaving(true)
    try {
      await api.put(`/ordenes-compra/${ocId}`, {
        fecha: form.fecha || null,
        proveedor_id: form.proveedor_id ? Number(form.proveedor_id) : null,
        proveedor: form.proveedor || null,
        campo_id: form.campo_id || null,
        unidad_negocio_id: form.unidad_negocio_id ? Number(form.unidad_negocio_id) : null,
        departamento_id: form.departamento_id ? Number(form.departamento_id) : null,
        almacen_id: form.almacen_id ? Number(form.almacen_id) : null,
        observaciones: form.observaciones,
        lineas: lineas.map(l => ({
          producto_id: l.producto_id,
          cantidad: Number(l.cantidad),
          precio_unitario: Number(l.precio_unitario),
          descuento_pct: Number(l.descuento_pct) || 0,
          impuesto: l.impuesto || 'itbis_18',
        })),
      })
      toast.success('Orden actualizada')
      onDone()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al guardar')
    } finally { setSaving(false) }
  }

  if (loading) return <Modal title="Cargando..." onClose={onClose}><p style={{ color: '#9ca3af' }}>Cargando...</p></Modal>

  const total = lineas.reduce((s, l) => s + calcSubtotal(l), 0)

  return (
    <Modal title={`Editar — ${ocId}`} onClose={onClose} width={800}>
      <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Fecha</label>
          <input className="input" type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Proveedor</label>
          <select className="select" value={form.proveedor_id} onChange={e => {
            const pid = e.target.value
            const prov = proveedoresLista.find(p => String(p.id) === pid)
            setForm({ ...form, proveedor_id: pid, proveedor: prov?.nombre || '' })
          }}>
            <option value="">— Seleccionar proveedor —</option>
            {proveedoresLista.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Campo</label>
          <select className="select" value={form.campo_id} onChange={e => setForm({ ...form, campo_id: e.target.value })}>
            <option value="">— Sin asignar —</option>
            {campos.map(c => <option key={c.id_campo} value={c.id_campo}>{c.nombre_campo || c.id_campo}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Unidad de Negocio</label>
          <select className="select" value={form.unidad_negocio_id} onChange={e => setForm({ ...form, unidad_negocio_id: e.target.value })}><option value="">—</option>{dims.unidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}</select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Departamento</label>
          <select className="select" value={form.departamento_id} onChange={e => setForm({ ...form, departamento_id: e.target.value })}><option value="">—</option>{dims.deptos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}</select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Almacén</label>
          <select className="select" value={form.almacen_id} onChange={e => setForm({ ...form, almacen_id: e.target.value })}><option value="">—</option>{dims.almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}</select>
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Observaciones</label>
          <textarea className="input" rows={2} value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} />
        </div>

        <div style={{ gridColumn: '1/-1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#166534' }}>Líneas de Compra</h3>
            <button type="button" className="btn-secondary" onClick={addLinea} style={{ fontSize: 11 }}><Plus size={12} /> Agregar Línea</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <th>Producto</th>
                <th style={{ width: 80 }}>Cantidad</th>
                <th style={{ width: 100 }}>Precio Unit.</th>
                <th style={{ width: 70 }}>Desc.%</th>
                <th style={{ width: 100 }}>Impuesto</th>
                <th style={{ width: 100, textAlign: 'right' }}>Subtotal</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((l, i) => (
                <tr key={i}>
                  <td>
                    <select className="select" value={l.producto_id} onChange={e => updateLinea(i, 'producto_id', e.target.value)} required>
                      <option value="">Seleccionar...</option>
                      {productos.map(p => <option key={p.id_prod} value={p.id_prod}>{p.producto} ({p.id_prod})</option>)}
                    </select>
                  </td>
                  <td><input className="input" type="number" step="0.01" min="0.01" value={l.cantidad} onChange={e => updateLinea(i, 'cantidad', e.target.value)} required /></td>
                  <td><input className="input" type="number" step="0.01" min="0" value={l.precio_unitario} onChange={e => updateLinea(i, 'precio_unitario', e.target.value)} required /></td>
                  <td><input className="input" type="number" step="0.5" min="0" max="100" value={l.descuento_pct} onChange={e => updateLinea(i, 'descuento_pct', e.target.value)} /></td>
                  <td>
                    <select className="select" value={l.impuesto} onChange={e => updateLinea(i, 'impuesto', e.target.value)} style={{ fontSize: 11 }}>
                      <option value="itbis_18">ITBIS 18%</option>
                      <option value="itbis_0">ITBIS 0%</option>
                      <option value="exento">Exento</option>
                    </select>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(calcSubtotal(l))}</td>
                  <td><button type="button" onClick={() => removeLinea(i)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div style={{ textAlign: 'right', fontWeight: 800, fontSize: 16, color: '#166534', marginTop: 8 }}>Total: {fmt(total)}</div>
        </div>

        <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando...' : '✓ Guardar Cambios'}</button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Página Principal ────────────────────────────────────────────────────────
export default function Compras() {
  const [ocs, setOcs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [buscar, setBuscar] = useState('')
  const [modalNueva, setModalNueva] = useState(false)
  const [modalDetalle, setModalDetalle] = useState(null)
  const [modalEditar, setModalEditar] = useState(null)
  const [dims, setDims] = useState<{ unidades: any[]; deptos: any[]; almacenes: any[] }>({ unidades: [], deptos: [], almacenes: [] })

  useEffect(() => {
    Promise.all([
      api.get('/contabilidad/unidades-negocio'),
      api.get('/contabilidad/departamentos'),
      api.get('/contabilidad/almacenes'),
    ]).then(([un, dep, alm]) => setDims({ unidades: un.data, deptos: dep.data, almacenes: alm.data })).catch(() => {})
  }, [])

  const dimName = useCallback((type: 'unidades' | 'deptos' | 'almacenes', id: number | null) => {
    if (!id) return null
    const item = dims[type].find((d: any) => d.id === id)
    return item?.nombre || null
  }, [dims])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (filtroEstado) params.estado = filtroEstado
      if (buscar) params.proveedor = buscar
      const { data } = await api.get('/ordenes-compra', { params })
      setOcs(data)
    } catch { toast.error('Error al cargar órdenes de compra') }
    finally { setLoading(false) }
  }, [filtroEstado, buscar])

  useEffect(() => { load() }, [load])

  function afterAction() {
    setModalNueva(false)
    setModalDetalle(null)
    load()
  }

  async function deleteOC(oc_id) {
    if (!confirm(`¿Eliminar orden ${oc_id}?`)) return
    try {
      await api.delete(`/ordenes-compra/${oc_id}`)
      toast.success('OC eliminada')
      load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  const totalEstimado = ocs.reduce((s, o) => s + (o.total_estimado || 0), 0)
  const borradores = ocs.filter(o => o.estado === 'Borrador').length
  const parciales = ocs.filter(o => o.estado === 'Parcial').length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>
          {ocs.length} órdenes · {borradores} borradores · {parciales} parciales
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={load}><RefreshCw size={14} /></button>
          <button className="btn-primary" onClick={() => setModalNueva(true)}>
            <Plus size={14} /> Nueva OC
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ borderLeft: '4px solid #6b7280', padding: '10px 14px' }}>
          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Total Estimado</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>{fmt(totalEstimado)}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #fde047', padding: '10px 14px' }}>
          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Borradores</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#854d0e' }}>{borradores}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #93c5fd', padding: '10px 14px' }}>
          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Parciales</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1e40af' }}>{parciales}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input className="input" style={{ paddingLeft: 30 }} placeholder="Buscar por proveedor..." value={buscar} onChange={e => setBuscar(e.target.value)} />
        </div>
        <select className="select" style={{ width: 160 }} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="Borrador">Borrador</option>
          <option value="Aprobada">Aprobada</option>
          <option value="Parcial">Parcial</option>
          <option value="Recibida">Recibida</option>
          <option value="Cerrada">Cerrada</option>
          <option value="Cancelada">Cancelada</option>
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>N° OC</th>
              <th>Fecha</th>
              <th>Proveedor</th>
              <th>Dimensiones</th>
              <th>Factura</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right' }}>Total Estimado</th>
              <th>Observaciones</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Cargando...</td></tr>
            ) : ocs.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Sin órdenes de compra</td></tr>
            ) : ocs.map(o => (
              <tr key={o.oc_id} style={{ cursor: 'pointer' }} onClick={() => setModalDetalle(o.oc_id)}
                onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <td style={{ fontWeight: 700, color: '#166534' }}>{o.oc_id}</td>
                <td>{fmtDate(o.fecha)}</td>
                <td>{o.proveedor || '—'}</td>
                <td style={{ fontSize: 10, lineHeight: 1.8 }}>
                  {(() => {
                    const tags = [
                      o.campo_id && { key: 'c', label: o.campo_id, bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
                      dimName('unidades', o.unidad_negocio_id) && { key: 'u', label: dimName('unidades', o.unidad_negocio_id), bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
                      dimName('deptos', o.departamento_id) && { key: 'd', label: dimName('deptos', o.departamento_id), bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
                      dimName('almacenes', o.almacen_id) && { key: 'a', label: dimName('almacenes', o.almacen_id), bg: '#fce7f3', color: '#9d174d', border: '#f9a8d4' },
                    ].filter(Boolean) as { key: string; label: string; bg: string; color: string; border: string }[]
                    return tags.length ? tags.map(t => <span key={t.key} style={{ background: t.bg, color: t.color, border: `1px solid ${t.border}`, borderRadius: 4, padding: '1px 5px', marginRight: 3, whiteSpace: 'nowrap' }}>{t.label}</span>) : <span style={{ color: '#d1d5db' }}>—</span>
                  })()}
                </td>
                <td style={{ fontSize: 11, color: '#1e40af' }}>{o.num_factura || '—'}</td>
                <td><Badge estado={o.estado} /></td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(o.total_estimado)}</td>
                <td style={{ color: '#6b7280', fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.observaciones || '—'}</td>
                <td onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setModalDetalle(o.oc_id)}><Eye size={12} /></button>
                    <button className="btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setModalEditar(o.oc_id)}><Edit2 size={12} /></button>
                    <button className="btn-danger" style={{ padding: '4px 8px' }} onClick={() => deleteOC(o.oc_id)}><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalNueva && <ModalNuevaOC onClose={() => setModalNueva(false)} onDone={afterAction} />}
      {modalDetalle && <ModalDetalleOC ocId={modalDetalle} onClose={() => setModalDetalle(null)} onDone={afterAction} />}
      {modalEditar && <ModalEditarOC ocId={modalEditar} onClose={() => setModalEditar(null)} onDone={afterAction} />}
    </div>
  )
}
