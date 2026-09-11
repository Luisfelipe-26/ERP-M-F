import { useEffect, useState, useCallback } from 'react'
import api from '../api'
import toast from 'react-hot-toast'
import {
  Plus, Search, RefreshCw, ShoppingCart, X, Trash2, Eye, ChevronRight, Download, Edit2,
  Copy, FileText, CreditCard, CheckCircle, Calendar, AlertTriangle, DollarSign, BarChart3, ReceiptText
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'

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
  const [genDims, setGenDims] = useState<any[]>([])
  const [dimSelections, setDimSelections] = useState<Record<number, number>>({})
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
      api.get('/contabilidad/dimensiones', { params: { entidad_tipo: 'OC' } }),
    ]).then(([n, p, prov, c, un, dep, alm, gd]) => {
      setNextId(n.data.next_oc_id)
      setProductos(p.data)
      setProveedoresLista(prov.data)
      setCampos(c.data)
      setDims({ unidades: un.data, deptos: dep.data, almacenes: alm.data })
      setGenDims(gd.data.filter((d: any) => d.activo))
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
      const ocId = result.oc_id || nextId
      const assigns = Object.entries(dimSelections)
        .filter(([, vid]) => vid)
        .map(([did, vid]) => ({ dimension_id: Number(did), valor_id: vid }))
      if (assigns.length > 0) {
        try { await api.post(`/contabilidad/entidad-dimensiones/OC/${ocId}`, assigns) } catch {}
      }
      toast.success(`Orden de Compra ${ocId} creada`)
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
          {genDims.map(dim => (
            <div key={dim.id}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
                {dim.nombre}{dim.obligatoria ? ' *' : ''}
              </label>
              <select className="select" value={dimSelections[dim.id] || ''} onChange={e => setDimSelections({ ...dimSelections, [dim.id]: Number(e.target.value) || 0 })}
                      required={dim.obligatoria}>
                <option value="">—</option>
                {(dim.valores || []).filter((v: any) => v.activo).map((v: any) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
              </select>
            </div>
          ))}
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
  const [genDimsAsig, setGenDimsAsig] = useState<any[]>([])
  const [showDevolucion, setShowDevolucion] = useState(false)
  const [devolucion, setDevolucion] = useState([])
  const [motivoDev, setMotivoDev] = useState('')
  const [savingDev, setSavingDev] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get(`/ordenes-compra/${ocId}`),
      api.get('/contabilidad/unidades-negocio'),
      api.get('/contabilidad/departamentos'),
      api.get('/contabilidad/almacenes'),
      api.get(`/contabilidad/entidad-dimensiones/OC/${ocId}`),
    ]).then(([oc, un, dep, alm, gda]) => {
      setData(oc.data)
      setDims({ unidades: un.data, deptos: dep.data, almacenes: alm.data })
      setGenDimsAsig(gda.data)
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

  function iniciarDevolucion() {
    setDevolucion(data.lineas.filter(l => (l.cantidad_recibida || 0) > 0).map(l => ({
      linea_id: l.id,
      producto_nombre: l.producto_nombre,
      producto_id: l.producto_id,
      recibida: l.cantidad_recibida,
      unidad: l.unidad,
      precio_unitario: l.precio_unitario,
      cantidad_devuelta: 0,
    })))
    setMotivoDev('Devolución a proveedor')
    setShowDevolucion(true)
  }

  async function submitDevolucion(e) {
    e.preventDefault()
    const lineas = devolucion.filter(d => Number(d.cantidad_devuelta) > 0).map(d => ({
      linea_id: d.linea_id,
      cantidad_devuelta: Number(d.cantidad_devuelta),
    }))
    if (lineas.length === 0) return toast.error('Indique al menos una cantidad a devolver')
    setSavingDev(true)
    try {
      const { data: result } = await api.post(`/ordenes-compra/${ocId}/devolucion`, {
        motivo: motivoDev || 'Devolución a proveedor',
        lineas,
      })
      toast.success(`Devolución procesada — ${result.lineas_devueltas.length} líneas, ${fmt(result.total_devuelto)}` +
        (result.nc_numero ? ` · NC ${result.nc_numero}` : '') +
        (result.cxp_ajustada ? ` · CxP ${result.cxp_ajustada} ajustada` : ''))
      onDone()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al procesar devolución') }
    finally { setSavingDev(false) }
  }

  function updateDevQty(i, val) {
    const updated = [...devolucion]
    updated[i].cantidad_devuelta = val
    setDevolucion(updated)
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

  if (showDevolucion) {
    const totalDev = devolucion.reduce((s, d) => s + (Number(d.cantidad_devuelta) || 0) * d.precio_unitario, 0)
    return (
      <Modal title={`Devolución — ${orden.oc_id}`} subtitle={`${orden.proveedor || ''}`} onClose={() => setShowDevolucion(false)} width={800}>
        <form onSubmit={submitDevolucion}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Motivo de Devolución</label>
              <input className="input" value={motivoDev} onChange={e => setMotivoDev(e.target.value)} placeholder="Ej: Producto dañado, error en pedido..." />
            </div>
            <div style={{ display: 'flex', alignItems: 'end' }}>
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#991b1b' }}>
                Total a devolver: {fmt(totalDev)}
              </div>
            </div>
          </div>

          <table className="table" style={{ fontSize: 12, marginBottom: 16 }}>
            <thead>
              <tr>
                <th>Producto</th>
                <th style={{ textAlign: 'right' }}>Recibida</th>
                <th style={{ textAlign: 'right' }}>Precio Unit.</th>
                <th style={{ textAlign: 'right', width: 120 }}>Devolver</th>
                <th style={{ textAlign: 'right' }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {devolucion.map((d, i) => (
                <tr key={d.linea_id}>
                  <td style={{ fontWeight: 600 }}>{d.producto_nombre} <span style={{ color: '#9ca3af', fontSize: 10 }}>({d.producto_id})</span></td>
                  <td style={{ textAlign: 'right' }}>{d.recibida} {d.unidad}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(d.precio_unitario)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <input className="input" type="number" step="0.01" min="0" max={d.recibida}
                      value={d.cantidad_devuelta} onChange={e => updateDevQty(i, e.target.value)}
                      style={{ width: 100, textAlign: 'right', fontWeight: 700, color: '#991b1b' }} />
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#991b1b' }}>{fmt((Number(d.cantidad_devuelta) || 0) * d.precio_unitario)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary" onClick={() => setShowDevolucion(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={savingDev} style={{ background: '#991b1b' }}>
              {savingDev ? 'Procesando...' : 'Confirmar Devolución'}
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

      {(orden.num_factura || orden.campo_id || orden.unidad_negocio_id || orden.departamento_id || orden.almacen_id || genDimsAsig.length > 0) && (
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
          {genDimsAsig.map((gd: any) => (
            <div key={gd.id} style={{ background: '#f5f3ff', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#5b21b6', border: '1px solid #c4b5fd' }}>
              <strong>{gd.dimension_nombre}:</strong> {gd.valor_nombre}
            </div>
          ))}
        </div>
      )}

      {orden.aprobado_por && (
        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>
          Aprobada por <strong>{orden.aprobado_por}</strong> el {fmtDate(orden.fecha_aprobacion)}
          {orden.cerrado_por && <> | Cerrada por <strong>{orden.cerrado_por}</strong> el {fmtDate(orden.fecha_cierre)}</>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn-secondary" onClick={async () => {
          try {
            const { data: r } = await api.post(`/ordenes-compra/${orden.oc_id}/duplicar`)
            toast.success(`OC ${r.oc_id} creada (duplicada de ${orden.oc_id})`)
            onDone()
          } catch (err) { toast.error(err.response?.data?.detail || 'Error al duplicar') }
        }} style={{ color: '#6d28d9' }}><Copy size={13} /> Duplicar</button>
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
        {['Parcial', 'Recibida', 'Cerrada'].includes(orden.estado) && lineas.some(l => (l.cantidad_recibida || 0) > 0) && (
          <button className="btn-secondary" onClick={iniciarDevolucion} style={{ color: '#991b1b' }}>
            Devolver Productos
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
  const [genDims, setGenDims] = useState<any[]>([])
  const [dimSelections, setDimSelections] = useState<Record<number, number>>({})
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
      api.get('/contabilidad/dimensiones', { params: { entidad_tipo: 'OC' } }),
      api.get(`/contabilidad/entidad-dimensiones/OC/${ocId}`),
    ]).then(([oc, p, prov, c, un, dep, alm, gd, gda]) => {
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
      setGenDims(gd.data.filter((d: any) => d.activo))
      const sel: Record<number, number> = {}
      gda.data.forEach((a: any) => { sel[a.dimension_id] = a.valor_id })
      setDimSelections(sel)
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
      const assigns = Object.entries(dimSelections)
        .filter(([, vid]) => vid)
        .map(([did, vid]) => ({ dimension_id: Number(did), valor_id: vid }))
      try { await api.post(`/contabilidad/entidad-dimensiones/OC/${ocId}`, assigns) } catch {}
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
        {genDims.map(dim => (
          <div key={dim.id}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
              {dim.nombre}{dim.obligatoria ? ' *' : ''}
            </label>
            <select className="select" value={dimSelections[dim.id] || ''} onChange={e => setDimSelections({ ...dimSelections, [dim.id]: Number(e.target.value) || 0 })}
                    required={dim.obligatoria}>
              <option value="">—</option>
              {(dim.valores || []).filter((v: any) => v.activo).map((v: any) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </div>
        ))}
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

// ─── Modal Detalle CxP ────────────────────────────────────────────────────────
function ModalDetalleCxP({ cxp, onClose, onPagar, onCrearNC, onDone }) {
  const [detail, setDetail] = useState<any>(null)
  const [pagos, setPagos] = useState<any[]>([])
  const [ncs, setNcs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [validando, setValidando] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get(`/contabilidad/cxp/${cxp.id}`),
      api.get('/contabilidad/pagos', { params: { cxp_id: cxp.id } }),
      api.get('/contabilidad/notas-credito', { params: { cxp_id: cxp.id } }),
    ]).then(([d, p, nc]) => {
      setDetail(d.data)
      setPagos(p.data)
      setNcs(nc.data?.items || [])
    }).catch(() => toast.error('Error al cargar detalle'))
      .finally(() => setLoading(false))
  }, [cxp.id])

  async function validar() {
    setValidando(true)
    try {
      const { data } = await api.post(`/contabilidad/cxp/${cxp.id}/validar`)
      if (data.ok) {
        toast.success(data.mensaje || 'Factura validada')
        if (data.alertas?.length) data.alertas.forEach((a: string) => toast(a, { icon: '⚠️', duration: 5000 }))
        onDone()
      } else {
        (data.errores || []).forEach((e: string) => toast.error(e, { duration: 6000 }))
        if (data.alertas?.length) data.alertas.forEach((a: string) => toast(a, { icon: '⚠️', duration: 5000 }))
      }
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al validar') }
    finally { setValidando(false) }
  }

  if (loading) return <Modal title="Cargando..." onClose={onClose}><p style={{ color: '#9ca3af' }}>Cargando detalle CxP...</p></Modal>

  const d = detail || cxp
  const progreso = d.total > 0 ? Math.round(((d.total - d.saldo_pendiente) / d.total) * 100) : 0

  return (
    <Modal title={`Factura ${d.numero}`} subtitle={`${d.proveedor_nombre || ''} · ${fmtDate(d.fecha_factura)}`} onClose={onClose} width={700}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Subtotal', value: fmt(d.subtotal) },
          { label: 'ITBIS', value: fmt(d.itbis), color: '#1e40af' },
          { label: 'Ret. ISR', value: fmt(d.retencion_isr), color: '#dc2626' },
          { label: 'Ret. ITBIS', value: fmt(d.retencion_itbis), color: '#dc2626' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: color || '#111827' }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 2 }}>Total</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#166534' }}>{fmt(d.total)}</div>
        </div>
        <div style={{ flex: 1, background: d.saldo_pendiente > 0 ? '#fef9c3' : '#dcfce7', border: `1px solid ${d.saldo_pendiente > 0 ? '#fde047' : '#86efac'}`, borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 2 }}>Saldo Pendiente</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: d.saldo_pendiente > 0 ? '#b45309' : '#166534' }}>{fmt(d.saldo_pendiente)}</div>
          <div style={{ marginTop: 4, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progreso}%`, background: '#166534', borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{progreso}% pagado</div>
        </div>
      </div>

      {d.oc_id && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 14px', marginBottom: 12, fontSize: 13 }}>
          <strong>OC Vinculada:</strong> <span style={{ color: '#166534', fontWeight: 700 }}>{d.oc_id}</span>
          {d.num_factura_proveedor && <> · <strong>Factura:</strong> {d.num_factura_proveedor}</>}
          {d.tipo_ncf && <> · <strong>NCF:</strong> {d.tipo_ncf}</>}
          {d.ncf && <> {d.ncf}</>}
        </div>
      )}

      {detail?.lineas?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 8px' }}>Líneas</h4>
          <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ fontSize: 12 }}>
            <thead>
              <tr><th>Producto</th><th style={{ textAlign: 'right' }}>Cant.</th><th style={{ textAlign: 'right' }}>Precio</th><th>Impuesto</th><th style={{ textAlign: 'right' }}>ITBIS</th><th style={{ textAlign: 'right' }}>Subtotal</th></tr>
            </thead>
            <tbody>
              {detail.lineas.map((l: any) => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 600 }}>{l.producto_id || '—'}</td>
                  <td style={{ textAlign: 'right' }}>{l.cantidad}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(l.precio_unitario)}</td>
                  <td style={{ fontSize: 10 }}>{l.impuesto === 'itbis_18' ? 'ITBIS 18%' : l.impuesto === 'exento' ? 'Exento' : l.impuesto}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(l.monto_itbis)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(l.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 8px' }}>Pagos Realizados</h4>
        {pagos.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: 13 }}>Sin pagos registrados</p>
        ) : (
          <table className="table" style={{ fontSize: 12 }}>
            <thead><tr><th>Número</th><th>Fecha</th><th>Método</th><th>Referencia</th><th style={{ textAlign: 'right' }}>Monto</th></tr></thead>
            <tbody>
              {pagos.map((p: any) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.numero}</td>
                  <td>{fmtDate(p.fecha)}</td>
                  <td>{p.metodo_pago || '—'}</td>
                  <td style={{ fontSize: 11 }}>{p.referencia_bancaria || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#166534' }}>{fmt(p.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {ncs.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 8px' }}>Notas de Crédito Aplicadas</h4>
          <table className="table" style={{ fontSize: 12 }}>
            <thead><tr><th>Número</th><th>Fecha</th><th>Motivo</th><th style={{ textAlign: 'right' }}>Subtotal</th><th style={{ textAlign: 'right' }}>ITBIS</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
            <tbody>
              {ncs.map((nc: any) => (
                <tr key={nc.id}>
                  <td style={{ fontWeight: 600, color: '#6A4C93' }}>{nc.numero}</td>
                  <td>{fmtDate(nc.fecha)}</td>
                  <td style={{ fontSize: 11, color: '#6b7280' }}>{nc.motivo || '—'}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(nc.subtotal)}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(nc.itbis)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#6A4C93' }}>{fmt(nc.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {d.notas && (
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
          <strong>Notas:</strong> {d.notas}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {d.oc_id && ['pendiente', 'parcial'].includes(d.estado) && (
          <button className="btn-secondary" onClick={validar} disabled={validando} style={{ color: '#1e40af' }}>
            <CheckCircle size={13} /> {validando ? 'Validando...' : 'Validar (3-way match)'}
          </button>
        )}
        {['pendiente', 'parcial'].includes(d.estado) && (
          <button className="btn-secondary" onClick={() => onCrearNC(d)} style={{ color: '#6A4C93' }}>
            <ReceiptText size={13} /> Nota de Crédito
          </button>
        )}
        {['pendiente', 'parcial'].includes(d.estado) && (
          <button className="btn-primary" onClick={() => onPagar(d)} style={{ background: '#166534' }}>
            <DollarSign size={13} /> Registrar Pago
          </button>
        )}
        <button className="btn-secondary" onClick={onClose}>Cerrar</button>
      </div>
    </Modal>
  )
}

// ─── Modal Pago ────────────────────────────────────────────────────────
function ModalPago({ cxp, onClose, onDone }) {
  const [cuentas, setCuentas] = useState<any[]>([])
  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    monto: String(cxp.saldo_pendiente || 0),
    metodo_pago: 'transferencia',
    referencia_bancaria: '',
    cuenta_bancaria_id: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/contabilidad/cuentas-bancarias').then(r => setCuentas(r.data)).catch(() => {})
  }, [])

  async function submit(e) {
    e.preventDefault()
    if (!form.monto || Number(form.monto) <= 0) return toast.error('Monto debe ser mayor a 0')
    setSaving(true)
    try {
      const { data } = await api.post('/contabilidad/pagos', {
        cxp_id: cxp.id,
        fecha: form.fecha,
        monto: Number(form.monto),
        metodo_pago: form.metodo_pago,
        referencia_bancaria: form.referencia_bancaria || null,
        cuenta_bancaria_id: form.cuenta_bancaria_id ? Number(form.cuenta_bancaria_id) : null,
      })
      toast.success(`Pago ${data.numero} registrado — Saldo: ${fmt(data.saldo_restante)}`)
      onDone()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al registrar pago') }
    finally { setSaving(false) }
  }

  return (
    <Modal title={`Pago — ${cxp.numero}`} subtitle={`Saldo pendiente: ${fmt(cxp.saldo_pendiente)}`} onClose={onClose} width={500}>
      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Fecha *</label>
            <input className="input" type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} required />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Monto *</label>
            <input className="input" type="number" step="0.01" min="0.01" max={cxp.saldo_pendiente} value={form.monto}
              onChange={e => setForm({ ...form, monto: e.target.value })} required
              style={{ fontWeight: 700, fontSize: 16, color: '#166534' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Método de Pago</label>
            <select className="select" value={form.metodo_pago} onChange={e => setForm({ ...form, metodo_pago: e.target.value })}>
              <option value="transferencia">Transferencia</option>
              <option value="cheque">Cheque</option>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Cuenta Bancaria</label>
            <select className="select" value={form.cuenta_bancaria_id} onChange={e => setForm({ ...form, cuenta_bancaria_id: e.target.value })}>
              <option value="">— Sin especificar —</option>
              {cuentas.map((c: any) => <option key={c.id} value={c.id}>{c.nombre} ({c.banco})</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Referencia Bancaria</label>
            <input className="input" value={form.referencia_bancaria} onChange={e => setForm({ ...form, referencia_bancaria: e.target.value })} placeholder="N° cheque, referencia transferencia..." />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving} style={{ background: '#166534' }}>
            <DollarSign size={13} /> {saving ? 'Registrando...' : 'Registrar Pago'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Modal Nueva CxP ────────────────────────────────────────────────────────
function ModalNuevaCxP({ onClose, onDone }) {
  const [proveedores, setProveedores] = useState<any[]>([])
  const [form, setForm] = useState({
    proveedor_id: '',
    oc_id: '',
    tipo_ncf: 'E41',
    ncf: '',
    num_factura_proveedor: '',
    fecha_factura: new Date().toISOString().slice(0, 10),
    fecha_vencimiento: '',
    subtotal: '',
    notas: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/proveedores').then(r => setProveedores(r.data)).catch(() => {})
  }, [])

  const prov = proveedores.find(p => String(p.id) === form.proveedor_id)
  const subtotal = Number(form.subtotal) || 0
  const itbis = round2(subtotal * 0.18)
  const retIsr = prov ? round2(subtotal * (prov.retencion_isr_pct || 0) / 100) : 0
  const retItbis = prov ? round2(itbis * (prov.retencion_itbis_pct || 0) / 100) : 0
  const total = round2(subtotal + itbis - retIsr - retItbis)

  async function submit(e) {
    e.preventDefault()
    if (!form.proveedor_id) return toast.error('Seleccione un proveedor')
    if (subtotal <= 0) return toast.error('Subtotal debe ser mayor a 0')
    setSaving(true)
    try {
      const { data } = await api.post('/contabilidad/cxp', {
        proveedor_id: Number(form.proveedor_id),
        oc_id: form.oc_id || null,
        tipo_ncf: form.tipo_ncf || null,
        ncf: form.ncf || null,
        num_factura_proveedor: form.num_factura_proveedor || null,
        fecha_factura: form.fecha_factura,
        fecha_vencimiento: form.fecha_vencimiento || null,
        subtotal,
        itbis,
        retencion_isr: retIsr,
        retencion_itbis: retItbis,
        notas: form.notas || null,
      })
      toast.success(`Factura ${data.numero} creada${data.asiento ? ` · Asiento: ${data.asiento}` : ''}`)
      onDone()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al crear factura') }
    finally { setSaving(false) }
  }

  return (
    <Modal title="Nueva Factura de Proveedor" onClose={onClose} width={600}>
      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Proveedor *</label>
            <select className="select" value={form.proveedor_id} onChange={e => setForm({ ...form, proveedor_id: e.target.value })} required>
              <option value="">— Seleccionar proveedor —</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.tipo_persona || ''} · {p.tipo_contribuyente || ''})</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Fecha Factura *</label>
            <input className="input" type="date" value={form.fecha_factura} onChange={e => setForm({ ...form, fecha_factura: e.target.value })} required />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Fecha Vencimiento</label>
            <input className="input" type="date" value={form.fecha_vencimiento} onChange={e => setForm({ ...form, fecha_vencimiento: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Tipo NCF</label>
            <select className="select" value={form.tipo_ncf} onChange={e => setForm({ ...form, tipo_ncf: e.target.value })}>
              <option value="E31">E31 — Factura de crédito fiscal</option>
              <option value="E41">E41 — Compras</option>
              <option value="E44">E44 — Gastos menores</option>
              <option value="E45">E45 — Gubernamental</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>NCF</label>
            <input className="input" value={form.ncf} onChange={e => setForm({ ...form, ncf: e.target.value })} placeholder="E410000000001" />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>N° Factura Proveedor</label>
            <input className="input" value={form.num_factura_proveedor} onChange={e => setForm({ ...form, num_factura_proveedor: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>OC Vinculada</label>
            <input className="input" value={form.oc_id} onChange={e => setForm({ ...form, oc_id: e.target.value })} placeholder="OC-0001" />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Subtotal (sin ITBIS) *</label>
            <input className="input" type="number" step="0.01" min="0.01" value={form.subtotal}
              onChange={e => setForm({ ...form, subtotal: e.target.value })} required
              style={{ fontSize: 16, fontWeight: 700 }} />
          </div>
        </div>

        {/* Calculated totals */}
        {subtotal > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16, background: '#f9fafb', borderRadius: 10, padding: 14 }}>
            {[
              { label: 'Subtotal', value: fmt(subtotal) },
              { label: 'ITBIS 18%', value: fmt(itbis), color: '#1e40af' },
              { label: `Ret. ISR ${prov?.retencion_isr_pct || 0}%`, value: `(${fmt(retIsr)})`, color: '#dc2626' },
              { label: `Ret. ITBIS ${prov?.retencion_itbis_pct || 0}%`, value: `(${fmt(retItbis)})`, color: '#dc2626' },
              { label: 'TOTAL', value: fmt(total), color: '#166534' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: color || '#111827' }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Notas</label>
          <input className="input" value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <FileText size={13} /> {saving ? 'Guardando...' : 'Crear Factura'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function round2(n: number) { return Math.round(n * 100) / 100 }

// ─── Modal Nota de Crédito ────────────────────────────────────────────────
function ModalNotaCredito({ cxp, onClose, onDone }) {
  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    motivo: '',
    subtotal: '',
    itbis: '',
    ncf: '',
  })
  const [saving, setSaving] = useState(false)

  const subtotal = Number(form.subtotal) || 0
  const itbis = Number(form.itbis) || 0
  const total = round2(subtotal + itbis)

  async function submit(e) {
    e.preventDefault()
    if (subtotal <= 0) return toast.error('Subtotal debe ser mayor a 0')
    if (total > Number(cxp.saldo_pendiente || 0)) return toast.error('El monto excede el saldo pendiente')
    setSaving(true)
    try {
      const { data } = await api.post('/contabilidad/notas-credito', {
        proveedor_id: cxp.proveedor_id,
        cxp_id: cxp.id,
        tipo: 'proveedor',
        fecha: form.fecha,
        motivo: form.motivo || null,
        subtotal,
        itbis,
        ncf: form.ncf || null,
      })
      if (data.ok) {
        toast.success(`Nota de Crédito ${data.numero} creada` + (data.cxp_ajustada ? ` — CxP ${data.cxp_ajustada} ajustada` : ''))
        onDone()
      }
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al crear NC') }
    finally { setSaving(false) }
  }

  const field = (label, name, type = 'text', extra = {}) => (
    <div style={{ marginBottom: 12, ...extra }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 4 }}>{label}</label>
      <input type={type} value={form[name]} onChange={e => setForm({ ...form, [name]: e.target.value })}
        style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
    </div>
  )

  return (
    <Modal title="Nueva Nota de Crédito" subtitle={`${cxp.proveedor_nombre || ''} · Saldo: ${fmt(cxp.saldo_pendiente)}`} onClose={onClose} width={500}>
      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {field('Fecha', 'fecha', 'date')}
          {field('NCF (opcional)', 'ncf')}
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 4 }}>Motivo</label>
          <textarea value={form.motivo} onChange={e => setForm({ ...form, motivo: e.target.value })} rows={2}
            style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, resize: 'vertical' }}
            placeholder="Devolución, ajuste de precio, descuento..." />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
          {field('Subtotal', 'subtotal', 'number')}
          {field('ITBIS', 'itbis', 'number')}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 4 }}>Total</label>
            <div style={{ padding: '7px 10px', background: '#f3f4f6', borderRadius: 6, fontSize: 15, fontWeight: 800, color: '#6A4C93' }}>{fmt(total)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving} style={{ background: '#6A4C93' }}>
            <ReceiptText size={13} /> {saving ? 'Guardando...' : 'Crear Nota de Crédito'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Tab Reportes ────────────────────────────────────────────────────────
const REPORT_COLORS = ['#2D6A4F', '#219EBC', '#F4A261', '#E76F51', '#6A4C93', '#1982C4', '#8AC926', '#FF595E']

function TabReportesCompras() {
  const currentYear = new Date().getFullYear()
  const [anio, setAnio] = useState(currentYear)
  const [campoId, setCampoId] = useState('')
  const [unidadId, setUnidadId] = useState('')
  const [deptoId, setDeptoId] = useState('')
  const [dimType, setDimType] = useState('campo')
  const [campos, setCampos] = useState<any[]>([])
  const [unidades, setUnidades] = useState<any[]>([])
  const [deptos, setDeptos] = useState<any[]>([])
  const [dataPeriodo, setDataPeriodo] = useState<any[]>([])
  const [dataProveedores, setDataProveedores] = useState<any[]>([])
  const [dataDimension, setDataDimension] = useState<any[]>([])
  const [dataProductos, setDataProductos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/campos'),
      api.get('/contabilidad/unidades-negocio'),
      api.get('/contabilidad/departamentos'),
    ]).then(([c, u, d]) => {
      setCampos(c.data)
      setUnidades(u.data)
      setDeptos(d.data)
    }).catch(() => {})
  }, [])

  const loadReportes = useCallback(async () => {
    setLoading(true)
    const dimParams: Record<string, string> = {}
    if (campoId) dimParams.campo_id = campoId
    if (unidadId) dimParams.unidad_negocio_id = unidadId
    if (deptoId) dimParams.departamento_id = deptoId
    try {
      const [periodo, proveedores, dimension, productos] = await Promise.all([
        api.get('/ordenes-compra/reportes/compras-periodo', { params: { anio, ...dimParams } }),
        api.get('/ordenes-compra/reportes/top-proveedores', { params: { anio, ...dimParams } }),
        api.get('/ordenes-compra/reportes/compras-dimension', { params: { dimension: dimType, anio } }),
        api.get('/ordenes-compra/reportes/productos-frecuentes', { params: { anio } }),
      ])
      setDataPeriodo(periodo.data.datos || [])
      setDataProveedores(proveedores.data)
      setDataDimension(dimension.data)
      setDataProductos(productos.data)
    } catch { toast.error('Error al cargar reportes') }
    finally { setLoading(false) }
  }, [anio, campoId, unidadId, deptoId, dimType])

  useEffect(() => { loadReportes() }, [loadReportes])

  const totalAnual = dataPeriodo.reduce((s, d) => s + d.total_estimado, 0)
  const totalRecibido = dataPeriodo.reduce((s, d) => s + d.total_recibido, 0)
  const totalOcs = dataPeriodo.reduce((s, d) => s + d.num_ocs, 0)

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'end' }}>
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Año</label>
          <select className="select" style={{ width: 100 }} value={anio} onChange={e => setAnio(Number(e.target.value))}>
            {[currentYear, currentYear - 1, currentYear - 2].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Campo</label>
          <select className="select" style={{ width: 140 }} value={campoId} onChange={e => setCampoId(e.target.value)}>
            <option value="">Todos</option>
            {campos.map(c => <option key={c.id_campo} value={c.id_campo}>{c.nombre_campo || c.id_campo}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Unidad Negocio</label>
          <select className="select" style={{ width: 150 }} value={unidadId} onChange={e => setUnidadId(e.target.value)}>
            <option value="">Todas</option>
            {unidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Departamento</label>
          <select className="select" style={{ width: 150 }} value={deptoId} onChange={e => setDeptoId(e.target.value)}>
            <option value="">Todos</option>
            {deptos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>
        </div>
        <button className="btn-secondary" onClick={loadReportes} style={{ height: 34 }}><RefreshCw size={14} /></button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ borderLeft: '4px solid #2D6A4F', padding: '10px 14px' }}>
          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Total Compras {anio}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#2D6A4F' }}>{fmt(totalAnual)}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #219EBC', padding: '10px 14px' }}>
          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Total Recibido</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#219EBC' }}>{fmt(totalRecibido)}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #F4A261', padding: '10px 14px' }}>
          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Total OCs</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#E76F51' }}>{totalOcs}</div>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#9ca3af', textAlign: 'center', padding: 40 }}>Cargando reportes...</p>
      ) : (
        <>
          {/* Monthly Chart */}
          <div className="card" style={{ padding: 16, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700 }}>Compras Mensuales — {anio}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dataPeriodo}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="nombre_mes" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="total_estimado" name="Estimado" fill="#2D6A4F" radius={[4, 4, 0, 0]} />
                <Bar dataKey="total_recibido" name="Recibido" fill="#219EBC" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Two-column: Proveedores + Dimension */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* Top Proveedores */}
            <div className="card" style={{ padding: 16 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700 }}>Top Proveedores</h3>
              {dataProveedores.length === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: 13 }}>Sin datos</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(200, dataProveedores.length * 36)}>
                  <BarChart data={dataProveedores} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis dataKey="proveedor" type="category" tick={{ fontSize: 10 }} width={110} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="total" name="Total" fill="#2D6A4F" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Dimension PieChart */}
            <div className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Distribución por</h3>
                <select className="select" style={{ width: 150, fontSize: 12 }} value={dimType} onChange={e => setDimType(e.target.value)}>
                  <option value="campo">Campo</option>
                  <option value="unidad_negocio">Unidad Negocio</option>
                  <option value="departamento">Departamento</option>
                </select>
              </div>
              {dataDimension.length === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: 13 }}>Sin datos</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={dataDimension} dataKey="total" nameKey="nombre" cx="50%" cy="50%"
                      outerRadius={90} label={({ nombre, porcentaje }) => `${nombre} (${porcentaje}%)`}
                      labelLine={{ strokeWidth: 1 }} style={{ fontSize: 11 }}>
                      {dataDimension.map((_, i) => <Cell key={i} fill={REPORT_COLORS[i % REPORT_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Productos frecuentes table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px 0' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700 }}>Productos Más Comprados</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Producto</th>
                    <th>Unidad</th>
                    <th style={{ textAlign: 'right' }}>Cantidad Total</th>
                    <th style={{ textAlign: 'right' }}>Monto Total</th>
                    <th style={{ textAlign: 'right' }}>N° OCs</th>
                  </tr>
                </thead>
                <tbody>
                  {dataProductos.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>Sin datos</td></tr>
                  ) : dataProductos.map((p, i) => (
                    <tr key={p.producto_id}>
                      <td style={{ color: '#9ca3af', fontWeight: 700 }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{p.producto_nombre}</td>
                      <td style={{ color: '#6b7280' }}>{p.unidad}</td>
                      <td style={{ textAlign: 'right' }}>{p.total_cantidad.toLocaleString('es-DO', { maximumFractionDigits: 2 })}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#2D6A4F' }}>{fmt(p.total_monto)}</td>
                      <td style={{ textAlign: 'right' }}>{p.num_ocs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Página Principal ────────────────────────────────────────────────────────
const TabBtn = ({ id, label, icon: Icon, active, onClick }) => (
  <button onClick={() => onClick(id)} style={{
    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13, fontWeight: active ? 700 : 500,
    color: active ? '#166534' : '#6b7280', background: active ? '#f0fdf4' : 'transparent',
    border: active ? '1px solid #86efac' : '1px solid transparent', borderRadius: 8, cursor: 'pointer',
  }}><Icon size={14} />{label}</button>
)

export default function Compras() {
  const [tab, setTab] = useState('ocs')
  const [ocs, setOcs] = useState([])
  const [ocsTotal, setOcsTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [buscar, setBuscar] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [modalNueva, setModalNueva] = useState(false)
  const [modalDetalle, setModalDetalle] = useState(null)
  const [modalEditar, setModalEditar] = useState(null)
  const [dims, setDims] = useState<{ unidades: any[]; deptos: any[]; almacenes: any[] }>({ unidades: [], deptos: [], almacenes: [] })
  const [resumenCxp, setResumenCxp] = useState({ total_pendiente: 0, num_pendientes: 0, num_vencidas: 0, monto_vencido: 0 })

  // CxP tab state
  const [cxpList, setCxpList] = useState([])
  const [cxpTotal, setCxpTotal] = useState(0)
  const [cxpLoading, setCxpLoading] = useState(false)
  const [cxpEstado, setCxpEstado] = useState('')
  const [cxpBuscar, setCxpBuscar] = useState('')
  const [cxpDetalle, setCxpDetalle] = useState<any>(null)
  const [modalPago, setModalPago] = useState<any>(null)
  const [modalNuevaCxp, setModalNuevaCxp] = useState(false)
  const [modalNC, setModalNC] = useState<any>(null)

  useEffect(() => {
    Promise.all([
      api.get('/contabilidad/unidades-negocio'),
      api.get('/contabilidad/departamentos'),
      api.get('/contabilidad/almacenes'),
      api.get('/ordenes-compra/resumen-cxp'),
    ]).then(([un, dep, alm, rcxp]) => {
      setDims({ unidades: un.data, deptos: dep.data, almacenes: alm.data })
      setResumenCxp(rcxp.data)
    }).catch(() => {})
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
      if (fechaDesde) params.fecha_desde = fechaDesde
      if (fechaHasta) params.fecha_hasta = fechaHasta
      const { data } = await api.get('/ordenes-compra', { params })
      setOcs(data.items || data)
      setOcsTotal(data.total ?? (data.items || data).length)
    } catch { toast.error('Error al cargar órdenes de compra') }
    finally { setLoading(false) }
  }, [filtroEstado, buscar, fechaDesde, fechaHasta])

  useEffect(() => { load() }, [load])

  const loadCxp = useCallback(async () => {
    setCxpLoading(true)
    try {
      const params: Record<string, string> = {}
      if (cxpEstado) params.estado = cxpEstado
      const { data } = await api.get('/contabilidad/cxp', { params })
      let items = data.items || data
      if (cxpBuscar) {
        const q = cxpBuscar.toLowerCase()
        items = items.filter((c: any) => (c.proveedor_nombre || '').toLowerCase().includes(q) || (c.numero || '').toLowerCase().includes(q))
      }
      setCxpList(items)
      setCxpTotal(data.total ?? items.length)
    } catch { toast.error('Error al cargar CxP') }
    finally { setCxpLoading(false) }
  }, [cxpEstado, cxpBuscar])

  useEffect(() => { if (tab === 'cxp') loadCxp() }, [tab, loadCxp])

  function afterAction() {
    setModalNueva(false)
    setModalDetalle(null)
    load()
    api.get('/ordenes-compra/resumen-cxp').then(r => setResumenCxp(r.data)).catch(() => {})
  }

  function afterCxpAction() {
    setCxpDetalle(null)
    setModalPago(null)
    setModalNuevaCxp(false)
    setModalNC(null)
    loadCxp()
    api.get('/ordenes-compra/resumen-cxp').then(r => setResumenCxp(r.data)).catch(() => {})
  }

  async function deleteOC(oc_id) {
    if (!confirm(`¿Eliminar orden ${oc_id}?`)) return
    try {
      await api.delete(`/ordenes-compra/${oc_id}`)
      toast.success('OC eliminada')
      load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  async function duplicarOC(oc_id) {
    try {
      const { data } = await api.post(`/ordenes-compra/${oc_id}/duplicar`)
      toast.success(`OC ${data.oc_id} creada (duplicada de ${oc_id})`)
      load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al duplicar') }
  }

  function exportCSV() {
    const header = 'N° OC,Fecha,Proveedor,Estado,Total Estimado,Observaciones\n'
    const rows = ocs.map(o =>
      `"${o.oc_id}","${o.fecha ? new Date(o.fecha).toLocaleDateString('es-DO') : ''}","${(o.proveedor || '').replace(/"/g, '""')}","${o.estado}",${o.total_estimado || 0},"${(o.observaciones || '').replace(/"/g, '""')}"`
    ).join('\n')
    const blob = new Blob(['﻿' + header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `ordenes_compra_${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const totalEstimado = ocs.reduce((s, o) => s + (o.total_estimado || 0), 0)
  const borradores = ocs.filter(o => o.estado === 'Borrador').length
  const parciales = ocs.filter(o => o.estado === 'Parcial').length
  const aprobadas = ocs.filter(o => o.estado === 'Aprobada').length

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, borderBottom: '1px solid #e5e7eb', paddingBottom: 8 }}>
        <TabBtn id="ocs" label="Órdenes de Compra" icon={ShoppingCart} active={tab === 'ocs'} onClick={setTab} />
        <TabBtn id="cxp" label="Facturas y Pagos" icon={FileText} active={tab === 'cxp'} onClick={setTab} />
        <TabBtn id="reportes" label="Reportes" icon={BarChart3} active={tab === 'reportes'} onClick={setTab} />
      </div>

      {tab === 'ocs' && <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>
          {ocsTotal} órdenes · {borradores} borradores · {aprobadas} pendientes recepción · {parciales} parciales
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={exportCSV} title="Exportar CSV"><Download size={14} /></button>
          <button className="btn-secondary" onClick={load}><RefreshCw size={14} /></button>
          <button className="btn-primary" onClick={() => setModalNueva(true)}>
            <Plus size={14} /> Nueva OC
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ borderLeft: '4px solid #6b7280', padding: '10px 14px' }}>
          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Total Estimado</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>{fmt(totalEstimado)}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #fde047', padding: '10px 14px' }}>
          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Borradores</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#854d0e' }}>{borradores}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #93c5fd', padding: '10px 14px' }}>
          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Pend. Recepción</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1e40af' }}>{aprobadas}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #f97316', padding: '10px 14px' }}>
          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Pend. Pago</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#c2410c' }}>{fmt(resumenCxp.total_pendiente)}</div>
          <div style={{ fontSize: 10, color: '#9ca3af' }}>{resumenCxp.num_pendientes} facturas</div>
        </div>
        <div className="card" style={{ borderLeft: `4px solid ${resumenCxp.num_vencidas > 0 ? '#ef4444' : '#86efac'}`, padding: '10px 14px' }}>
          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>CxP Vencidas</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: resumenCxp.num_vencidas > 0 ? '#dc2626' : '#166534' }}>{resumenCxp.num_vencidas}</div>
          {resumenCxp.monto_vencido > 0 && <div style={{ fontSize: 10, color: '#dc2626' }}>{fmt(resumenCxp.monto_vencido)}</div>}
        </div>
        <div className="card" style={{ borderLeft: '4px solid #a78bfa', padding: '10px 14px' }}>
          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Parciales</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#6d28d9' }}>{parciales}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
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
        <input className="input" type="date" style={{ width: 140 }} value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} title="Desde" />
        <input className="input" type="date" style={{ width: 140 }} value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} title="Hasta" />
        {(fechaDesde || fechaHasta) && (
          <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => { setFechaDesde(''); setFechaHasta('') }}>
            <X size={12} /> Limpiar fechas
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
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
                    <button className="btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setModalDetalle(o.oc_id)} title="Ver"><Eye size={12} /></button>
                    <button className="btn-secondary" style={{ padding: '4px 8px' }} onClick={() => duplicarOC(o.oc_id)} title="Duplicar"><Copy size={12} /></button>
                    <button className="btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setModalEditar(o.oc_id)} title="Editar"><Edit2 size={12} /></button>
                    <button className="btn-danger" style={{ padding: '4px 8px' }} onClick={() => deleteOC(o.oc_id)} title="Eliminar"><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      </>}

      {/* ═══════ TAB: FACTURAS Y PAGOS (CxP) ═══════ */}
      {tab === 'cxp' && <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>
            {cxpTotal} facturas · {fmt(resumenCxp.total_pendiente)} pendiente · {resumenCxp.num_vencidas} vencidas
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary" onClick={loadCxp}><RefreshCw size={14} /></button>
            <button className="btn-primary" onClick={() => setModalNuevaCxp(true)}>
              <Plus size={14} /> Nueva Factura
            </button>
          </div>
        </div>

        {/* CxP Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          <div className="card" style={{ borderLeft: '4px solid #f97316', padding: '10px 14px' }}>
            <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Total Pendiente</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#c2410c' }}>{fmt(resumenCxp.total_pendiente)}</div>
          </div>
          <div className="card" style={{ borderLeft: '4px solid #3b82f6', padding: '10px 14px' }}>
            <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Facturas Pendientes</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1e40af' }}>{resumenCxp.num_pendientes}</div>
          </div>
          <div className="card" style={{ borderLeft: `4px solid ${resumenCxp.num_vencidas > 0 ? '#ef4444' : '#86efac'}`, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Vencidas</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: resumenCxp.num_vencidas > 0 ? '#dc2626' : '#166534' }}>{resumenCxp.num_vencidas}</div>
          </div>
          <div className="card" style={{ borderLeft: '4px solid #ef4444', padding: '10px 14px' }}>
            <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Monto Vencido</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626' }}>{fmt(resumenCxp.monto_vencido)}</div>
          </div>
        </div>

        {/* CxP Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input className="input" style={{ paddingLeft: 30 }} placeholder="Buscar por proveedor o número..." value={cxpBuscar} onChange={e => setCxpBuscar(e.target.value)} />
          </div>
          <select className="select" style={{ width: 160 }} value={cxpEstado} onChange={e => setCxpEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="parcial">Parcial</option>
            <option value="pagada">Pagada</option>
            <option value="anulada">Anulada</option>
          </select>
        </div>

        {/* CxP Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Número</th>
                <th>Proveedor</th>
                <th>OC</th>
                <th>Factura Prov.</th>
                <th>Fecha</th>
                <th>Vencimiento</th>
                <th style={{ textAlign: 'right' }}>Subtotal</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'right' }}>Saldo</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cxpLoading ? (
                <tr><td colSpan={11} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Cargando...</td></tr>
              ) : cxpList.length === 0 ? (
                <tr><td colSpan={11} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Sin facturas</td></tr>
              ) : cxpList.map((c: any) => {
                const vencida = c.estado !== 'pagada' && c.fecha_vencimiento && new Date(c.fecha_vencimiento) < new Date()
                return (
                <tr key={c.id} style={{ cursor: 'pointer', background: vencida ? '#fef2f2' : '' }}
                  onClick={() => setCxpDetalle(c)}
                  onMouseEnter={e => e.currentTarget.style.background = vencida ? '#fee2e2' : '#f0fdf4'}
                  onMouseLeave={e => e.currentTarget.style.background = vencida ? '#fef2f2' : ''}>
                  <td style={{ fontWeight: 700, color: '#1e40af' }}>{c.numero}</td>
                  <td>{c.proveedor_nombre || '—'}</td>
                  <td style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>{c.oc_id || '—'}</td>
                  <td style={{ fontSize: 11 }}>{c.num_factura_proveedor || '—'}</td>
                  <td>{fmtDate(c.fecha_factura)}</td>
                  <td style={{ color: vencida ? '#dc2626' : '#6b7280', fontWeight: vencida ? 700 : 400 }}>
                    {fmtDate(c.fecha_vencimiento)} {vencida && <AlertTriangle size={11} style={{ verticalAlign: 'text-bottom' }} />}
                  </td>
                  <td style={{ textAlign: 'right' }}>{fmt(c.subtotal)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(c.total)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: Number(c.saldo_pendiente) > 0 ? '#b45309' : '#166534' }}>{fmt(c.saldo_pendiente)}</td>
                  <td>
                    <span style={{
                      background: c.estado === 'pagada' ? '#dcfce7' : c.estado === 'parcial' ? '#dbeafe' : c.estado === 'anulada' ? '#fee2e2' : '#fef9c3',
                      color: c.estado === 'pagada' ? '#166534' : c.estado === 'parcial' ? '#1e40af' : c.estado === 'anulada' ? '#991b1b' : '#854d0e',
                      border: `1px solid ${c.estado === 'pagada' ? '#86efac' : c.estado === 'parcial' ? '#93c5fd' : c.estado === 'anulada' ? '#fca5a5' : '#fde047'}`,
                      borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700,
                    }}>{c.estado}</span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setCxpDetalle(c)} title="Ver"><Eye size={12} /></button>
                      {['pendiente', 'parcial'].includes(c.estado) && (
                        <button className="btn-secondary" style={{ padding: '4px 8px', color: '#166534' }} onClick={() => setModalPago(c)} title="Pagar"><DollarSign size={12} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
          </div>
        </div>

        {/* CxP Detail Modal */}
        {cxpDetalle && <ModalDetalleCxP cxp={cxpDetalle} onClose={() => setCxpDetalle(null)} onPagar={c => { setCxpDetalle(null); setModalPago(c) }} onCrearNC={c => { setCxpDetalle(null); setModalNC(c) }} onDone={afterCxpAction} />}
        {modalPago && <ModalPago cxp={modalPago} onClose={() => setModalPago(null)} onDone={afterCxpAction} />}
        {modalNC && <ModalNotaCredito cxp={modalNC} onClose={() => setModalNC(null)} onDone={afterCxpAction} />}
        {modalNuevaCxp && <ModalNuevaCxP onClose={() => setModalNuevaCxp(false)} onDone={afterCxpAction} />}
      </>}

      {tab === 'reportes' && <TabReportesCompras />}

      {modalNueva && <ModalNuevaOC onClose={() => setModalNueva(false)} onDone={afterAction} />}
      {modalDetalle && <ModalDetalleOC ocId={modalDetalle} onClose={() => setModalDetalle(null)} onDone={afterAction} />}
      {modalEditar && <ModalEditarOC ocId={modalEditar} onClose={() => setModalEditar(null)} onDone={afterAction} />}
    </div>
  )
}
