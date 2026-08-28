import { useEffect, useState, useCallback, useRef } from 'react'
import api from '../api'
import toast from 'react-hot-toast'
import {
  Plus, Search, Download, RefreshCw, AlertTriangle, TrendingUp, TrendingDown,
  Package, DollarSign, Edit2, Trash2, BarChart2, ArrowDownCircle, ArrowUpCircle,
  ClipboardList, X, Eye, Clock
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = n => `RD$ ${Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`
const fmtN = (n, dec = 2) => Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: dec, maximumFractionDigits: dec })
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-DO') : '—'

const TIPOS_PROD = ['FERTILIZANTE','FUNGICIDAS','INSECTICIDAS','HERBICIDA','BIOESTIMULANTE','PBZ','REGULADOR HORMONAL','OTRO']
const MOTIVOS_GI = ['Consumo OT','Merma','Vencimiento','Devolucion Proveedor','Muestra','Uso No Productivo','Otro']
const DOC_LABELS = { GR: 'Entrada', GI: 'Salida', AJ: 'Ajuste', OT: 'Consumo OT' }
const DOC_COLORS = {
  GR: { bg: '#dcfce7', color: '#166534', border: '#86efac' },
  GI: { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
  AJ: { bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
  OT: { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
}

const Badge = ({ tipo_doc }) => {
  const c = DOC_COLORS[tipo_doc] || { bg: '#f3f4f6', color: '#374151', border: '#d1d5db' }
  return (
    <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.03em' }}>
      {DOC_LABELS[tipo_doc] || tipo_doc}
    </span>
  )
}

const StockBadge = ({ stock, minimo }) => {
  const bajo = minimo > 0 && stock <= minimo
  const sinStock = stock === 0
  if (sinStock) return <span style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>Sin stock</span>
  if (bajo) return <span style={{ background: '#fef9c3', color: '#854d0e', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>Bajo mínimo</span>
  return <span style={{ background: '#dcfce7', color: '#166534', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>OK</span>
}

// ─── Modal Base ───────────────────────────────────────────────────────────────
const Modal = ({ title, subtitle = '', onClose, children, width = 560 }) => (
  <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="modal" style={{ maxWidth: width, width: '90%' }}>
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

const Field = ({ label, children, full = false }) => (
  <div style={{ gridColumn: full ? '1/-1' : undefined }}>
    <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
    {children}
  </div>
)

const SearchSelect = ({ items, value, onChange, placeholder = 'Buscar artículo...' }) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)
  const inputRef = useRef(null)

  const selected = items.find(p => p.id_prod === value)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = items.filter(p => {
    if (!query) return true
    const q = query.toLowerCase()
    return p.id_prod.toLowerCase().includes(q) || p.producto.toLowerCase().includes(q)
  })

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        className="input"
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0) }}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, minHeight: 38 }}
      >
        <Search size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
        {open ? (
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={placeholder}
            style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: 13, padding: 0 }}
          />
        ) : (
          <span style={{ fontSize: 13, color: selected ? '#111827' : '#9ca3af' }}>
            {selected ? `${selected.id_prod} — ${selected.producto}` : placeholder}
          </span>
        )}
        {value && !open && (
          <button type="button" onClick={e => { e.stopPropagation(); onChange(''); setQuery('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#9ca3af', marginLeft: 'auto' }}>
            <X size={14} />
          </button>
        )}
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, marginTop: 4, maxHeight: 220, overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.12)' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '12px 14px', color: '#9ca3af', fontSize: 13 }}>Sin resultados</div>
          ) : filtered.map(p => (
            <div
              key={p.id_prod}
              onClick={() => { onChange(p.id_prod); setOpen(false); setQuery('') }}
              style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f3f4f6', background: p.id_prod === value ? '#f0fdf4' : 'white' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.background = p.id_prod === value ? '#f0fdf4' : 'white'}
            >
              <span style={{ fontWeight: 700, color: '#166534' }}>{p.id_prod}</span>
              <span style={{ color: '#6b7280' }}> — {p.producto}</span>
              <span style={{ float: 'right', fontSize: 11, color: '#9ca3af' }}>{fmtN(p.stock_actual)} {p.unidad}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Modal GR — Entrada de Mercancía ──────────────────────────────────────────
const ModalGR = ({ producto, articulos, almacenes, onClose, onDone }) => {
  const [form, setForm] = useState({
    producto_id: producto?.id_prod || '',
    cantidad: '',
    precio_compra: producto?.costo_promedio || producto?.costo_unitario || '',
    proveedor: producto?.proveedor || '',
    num_factura: '',
    lote: '',
    vencimiento: '',
    fecha: new Date().toISOString().slice(0, 10),
    observacion: '',
    orden_compra_id: '',
    almacen_id: '',
  })
  const [saving, setSaving] = useState(false)
  const [ocs, setOcs] = useState([])

  const prodSeleccionado = producto || (articulos || []).find(p => p.id_prod === form.producto_id) || null

  useEffect(() => {
    api.get('/inventario/ordenes-compra-lista').then(r => setOcs(r.data)).catch(() => toast.error('Error al cargar órdenes de compra'))
  }, [])

  async function submit(e) {
    e.preventDefault()
    if (!form.cantidad || Number(form.cantidad) <= 0) return toast.error('Cantidad debe ser mayor a 0')
    if (!form.precio_compra || Number(form.precio_compra) < 0) return toast.error('Precio de compra requerido')
    setSaving(true)
    try {
      await api.post('/inventario/gr', {
        ...form,
        cantidad: Number(form.cantidad),
        precio_compra: Number(form.precio_compra),
        fecha: form.fecha ? new Date(form.fecha).toISOString() : undefined,
        vencimiento: form.vencimiento ? new Date(form.vencimiento).toISOString() : undefined,
        orden_compra_id: form.orden_compra_id || undefined,
        almacen_id: form.almacen_id ? Number(form.almacen_id) : undefined,
      })
      toast.success('Entrada de mercancía registrada')
      onDone()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al registrar entrada')
    } finally { setSaving(false) }
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <Modal title="Entrada de Mercancía (GR)" subtitle={prodSeleccionado ? `Artículo: ${prodSeleccionado.producto} · Stock actual: ${fmtN(prodSeleccionado.stock_actual)} ${prodSeleccionado.unidad}` : undefined} onClose={onClose} width={620}>
      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {!producto && (
          <Field label="Artículo *" full>
            <SearchSelect
              items={articulos || []}
              value={form.producto_id}
              onChange={id => {
                const sel = (articulos || []).find(p => p.id_prod === id)
                f('producto_id', id)
                if (sel) {
                  f('precio_compra', sel.costo_promedio || sel.costo_unitario || '')
                  f('proveedor', sel.proveedor || '')
                }
              }}
            />
          </Field>
        )}
        <Field label="Orden de Compra" full>
          <select className="select" value={form.orden_compra_id} onChange={e => f('orden_compra_id', e.target.value)}>
            <option value="">— Sin OC vinculada —</option>
            {ocs.map(oc => <option key={oc.oc_id} value={oc.oc_id}>{oc.label}</option>)}
          </select>
        </Field>
        <Field label="Cantidad *">
          <input className="input" type="number" step="0.01" min="0.01" value={form.cantidad} onChange={e => f('cantidad', e.target.value)} required autoFocus={!!producto} />
        </Field>
        <Field label="Precio Compra (RD$) *">
          <input className="input" type="number" step="0.01" min="0" value={form.precio_compra} onChange={e => f('precio_compra', e.target.value)} required />
        </Field>
        <Field label="Proveedor">
          <input className="input" value={form.proveedor} onChange={e => f('proveedor', e.target.value)} placeholder={producto?.proveedor || ''} />
        </Field>
        <Field label="N° Factura">
          <input className="input" value={form.num_factura} onChange={e => f('num_factura', e.target.value)} placeholder="FAC-0001" />
        </Field>
        <Field label="Lote">
          <input className="input" value={form.lote} onChange={e => f('lote', e.target.value)} placeholder="LOT-001" />
        </Field>
        <Field label="Fecha Vencimiento">
          <input className="input" type="date" value={form.vencimiento} onChange={e => f('vencimiento', e.target.value)} />
        </Field>
        <Field label="Fecha Recepción *">
          <input className="input" type="date" value={form.fecha} onChange={e => f('fecha', e.target.value)} required />
        </Field>
        {(almacenes || []).length > 0 && (
          <Field label="Almacén">
            <select className="select" value={form.almacen_id} onChange={e => f('almacen_id', e.target.value)}>
              <option value="">— Sin almacén —</option>
              {almacenes.map(a => <option key={a.id} value={a.id}>{a.codigo} — {a.nombre}</option>)}
            </select>
          </Field>
        )}
        <Field label="Observación" full>
          <input className="input" value={form.observacion} onChange={e => f('observacion', e.target.value)} />
        </Field>
        {form.cantidad && form.precio_compra && prodSeleccionado && (
          <div style={{ gridColumn: '1/-1', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#166534' }}>
            <strong>Vista previa:</strong> Nuevo costo promedio estimado ≈{' '}
            {(() => {
              const s = prodSeleccionado.stock_actual || 0
              const cp = prodSeleccionado.costo_promedio || prodSeleccionado.costo_unitario || 0
              const q = Number(form.cantidad) || 0
              const pp = Number(form.precio_compra) || 0
              if (s + q === 0) return fmt(pp)
              return fmt(((s * cp) + (q * pp)) / (s + q))
            })()}
          </div>
        )}
        <div style={{ gridColumn: '1/-1', display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving} style={{ background: '#166534' }}>
            <ArrowDownCircle size={14} /> {saving ? 'Guardando...' : 'Registrar Entrada'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Modal GI — Salida de Mercancía ──────────────────────────────────────────
const ModalGI = ({ producto, articulos, almacenes, onClose, onDone }) => {
  const [form, setForm] = useState({
    producto_id: producto?.id_prod || '',
    cantidad: '',
    motivo: 'Consumo OT',
    referencia: '',
    fecha: new Date().toISOString().slice(0, 10),
    observacion: '',
    ot_id: '',
    almacen_id: '',
  })
  const [saving, setSaving] = useState(false)
  const [ots, setOts] = useState([])

  useEffect(() => {
    api.get('/inventario/ordenes-trabajo-lista').then(r => setOts(r.data)).catch(() => toast.error('Error al cargar órdenes de trabajo'))
  }, [])

  async function submit(e) {
    e.preventDefault()
    if (!form.cantidad || Number(form.cantidad) <= 0) return toast.error('Cantidad debe ser mayor a 0')
    setSaving(true)
    try {
      await api.post('/inventario/gi', {
        ...form,
        cantidad: Number(form.cantidad),
        fecha: form.fecha ? new Date(form.fecha).toISOString() : undefined,
        ot_id: form.ot_id ? Number(form.ot_id) : undefined,
        almacen_id: form.almacen_id ? Number(form.almacen_id) : undefined,
      })
      toast.success('Salida de mercancía registrada')
      onDone()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al registrar salida')
    } finally { setSaving(false) }
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <Modal title="Salida de Mercancía (GI)" subtitle={producto ? `${producto.producto} · Stock disponible: ${fmtN(producto.stock_actual)} ${producto.unidad}` : undefined} onClose={onClose} width={560}>
      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {!producto && (
          <Field label="Artículo *" full>
            <SearchSelect items={articulos || []} value={form.producto_id} onChange={id => f('producto_id', id)} />
          </Field>
        )}
        <Field label="Orden de Trabajo" full>
          <select className="select" value={form.ot_id} onChange={e => {
            f('ot_id', e.target.value)
            if (e.target.value) f('motivo', 'Consumo OT')
          }}>
            <option value="">— Sin OT vinculada —</option>
            {ots.map(ot => <option key={ot.ot_id} value={ot.ot_id}>{ot.label}</option>)}
          </select>
        </Field>
        <Field label="Cantidad *">
          <input className="input" type="number" step="0.01" min="0.01" max={producto?.stock_actual || undefined} value={form.cantidad} onChange={e => f('cantidad', e.target.value)} required autoFocus={!!producto} />
        </Field>
        <Field label="Motivo *">
          <select className="select" value={form.motivo} onChange={e => f('motivo', e.target.value)} required>
            {MOTIVOS_GI.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Referencia">
          <input className="input" value={form.referencia} onChange={e => f('referencia', e.target.value)} placeholder="Nota interna..." />
        </Field>
        <Field label="Fecha *">
          <input className="input" type="date" value={form.fecha} onChange={e => f('fecha', e.target.value)} required />
        </Field>
        {(almacenes || []).length > 0 && (
          <Field label="Almacén">
            <select className="select" value={form.almacen_id} onChange={e => f('almacen_id', e.target.value)}>
              <option value="">— Sin almacén —</option>
              {almacenes.map(a => <option key={a.id} value={a.id}>{a.codigo} — {a.nombre}</option>)}
            </select>
          </Field>
        )}
        <Field label="Observación" full>
          <input className="input" value={form.observacion} onChange={e => f('observacion', e.target.value)} />
        </Field>
        <div style={{ gridColumn: '1/-1', display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving} style={{ background: '#991b1b' }}>
            <ArrowUpCircle size={14} /> {saving ? 'Guardando...' : 'Registrar Salida'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Modal Ajuste — Recuento Físico ──────────────────────────────────────────
const ModalAjuste = ({ producto, articulos, almacenes, onClose, onDone }) => {
  const [form, setForm] = useState({
    producto_id: producto?.id_prod || '',
    cantidad_contada: '',
    observacion: '',
    fecha: new Date().toISOString().slice(0, 10),
    almacen_id: '',
  })
  const [saving, setSaving] = useState(false)

  // When no producto prop, look it up from articulos list
  const prodActual = producto || (articulos || []).find(p => p.id_prod === form.producto_id) || null
  const diferencia = prodActual ? (Number(form.cantidad_contada) || 0) - (prodActual.stock_actual || 0) : 0

  async function submit(e) {
    e.preventDefault()
    if (!form.producto_id) return toast.error('Seleccione un artículo')
    if (form.cantidad_contada === '') return toast.error('Ingrese la cantidad contada')
    setSaving(true)
    try {
      await api.post('/inventario/ajuste', {
        ...form,
        cantidad_contada: Number(form.cantidad_contada),
        fecha: form.fecha ? new Date(form.fecha).toISOString() : undefined,
        almacen_id: form.almacen_id ? Number(form.almacen_id) : undefined,
      })
      toast.success('Ajuste de inventario registrado')
      onDone()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al registrar ajuste')
    } finally { setSaving(false) }
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <Modal title="Ajuste de Inventario (Recuento Físico)" subtitle={prodActual ? `${prodActual.producto} · Stock en sistema: ${fmtN(prodActual.stock_actual)} ${prodActual.unidad}` : 'Seleccione un artículo para ajustar'} onClose={onClose} width={520}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!producto && (
          <Field label="Artículo *">
            <SearchSelect items={articulos || []} value={form.producto_id} onChange={id => { f('producto_id', id); f('cantidad_contada', '') }} />
          </Field>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>Stock en sistema</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#374151' }}>{fmtN(prodActual?.stock_actual)} <span style={{ fontSize: 13, fontWeight: 500 }}>{prodActual?.unidad}</span></div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Conteo Físico *</label>
            <input className="input" type="number" step="0.01" min="0" value={form.cantidad_contada} onChange={e => f('cantidad_contada', e.target.value)} required autoFocus={!!prodActual} style={{ fontSize: 18, fontWeight: 700 }} />
          </div>
        </div>
        {form.cantidad_contada !== '' && prodActual && (
          <div style={{ background: diferencia === 0 ? '#f0fdf4' : diferencia > 0 ? '#eff6ff' : '#fef2f2', border: `1px solid ${diferencia === 0 ? '#86efac' : diferencia > 0 ? '#93c5fd' : '#fca5a5'}`, borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            {diferencia > 0 ? <TrendingUp size={16} color="#1e40af" /> : diferencia < 0 ? <TrendingDown size={16} color="#dc2626" /> : <ClipboardList size={16} color="#166534" />}
            <span style={{ fontSize: 13, fontWeight: 600, color: diferencia === 0 ? '#166534' : diferencia > 0 ? '#1e40af' : '#dc2626' }}>
              {diferencia === 0 ? 'Sin diferencia (no se generará ajuste)' : `Diferencia: ${diferencia > 0 ? '+' : ''}${fmtN(diferencia)} ${prodActual.unidad} (${diferencia > 0 ? 'sobrante' : 'faltante'})`}
            </span>
          </div>
        )}
        <Field label="Observación">
          <input className="input" value={form.observacion} onChange={e => f('observacion', e.target.value)} placeholder="Motivo del ajuste..." />
        </Field>
        {(almacenes || []).length > 0 && (
          <Field label="Almacén">
            <select className="select" value={form.almacen_id} onChange={e => f('almacen_id', e.target.value)}>
              <option value="">— Sin almacén —</option>
              {almacenes.map(a => <option key={a.id} value={a.id}>{a.codigo} — {a.nombre}</option>)}
            </select>
          </Field>
        )}
        <Field label="Fecha Conteo">
          <input className="input" type="date" value={form.fecha} onChange={e => f('fecha', e.target.value)} />
        </Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving || (diferencia === 0 && form.cantidad_contada !== '')} style={{ background: '#854d0e' }}>
            <ClipboardList size={14} /> {saving ? 'Guardando...' : 'Registrar Ajuste'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Modal Kardex ─────────────────────────────────────────────────────────────
const ModalKardex = ({ producto, onClose }) => {
  const [kardex, setKardex] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/inventario/kardex/${producto.id_prod}`)
      .then(r => setKardex(r.data))
      .catch(() => toast.error('Error al cargar kardex'))
      .finally(() => setLoading(false))
  }, [producto.id_prod])

  return (
    <Modal title={`Kardex — ${producto.producto}`} subtitle={`${producto.id_prod} · ${producto.unidad} · Costo prom.: ${fmt(producto.costo_promedio)}`} onClose={onClose} width={900}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Cargando kardex...</div>
      ) : !kardex?.movimientos?.length ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Sin movimientos registrados</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Stock Actual', value: `${fmtN(kardex.producto.stock_actual)} ${kardex.producto.unidad}`, color: '#166534' },
              { label: 'Costo Promedio', value: fmt(kardex.producto.costo_promedio), color: '#1e40af' },
              { label: 'Valor Inventario', value: fmt(kardex.producto.valor_inventario), color: '#854d0e' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: '#f9fafb', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                <tr>
                  {['N° Doc.','Fecha','Tipo','Motivo','Referencia/Lote','Entradas','Salidas','Saldo','Costo Unit.','Valor Total'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Entradas' || h === 'Salidas' || h === 'Saldo' || h === 'Costo Unit.' || h === 'Valor Total' ? 'right' : 'left', fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kardex.movimientos.map((m, i) => {
                  const isEntrada = m.tipo === 'entrada'
                  const val = (m.stock_post || 0) * (m.costo_promedio_post || 0)
                  return (
                    <tr key={m.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '7px 10px', fontWeight: 700, fontSize: 11, color: '#374151', whiteSpace: 'nowrap' }}>{m.num_documento || '—'}{m.asiento_id ? <span title="Asiento contable vinculado" style={{ marginLeft: 4, color: '#3b82f6', fontSize: 10 }}>📒</span> : ''}</td>
                      <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>{fmtDate(m.fecha)}</td>
                      <td style={{ padding: '7px 10px' }}><Badge tipo_doc={m.tipo_doc} /></td>
                      <td style={{ padding: '7px 10px', color: '#6b7280' }}>{m.motivo || '—'}</td>
                      <td style={{ padding: '7px 10px', color: '#6b7280', fontSize: 11 }}>{m.lote || m.referencia || m.num_factura || '—'}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', color: '#166534', fontWeight: 700 }}>{isEntrada ? fmtN(m.cantidad) : ''}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', color: '#dc2626', fontWeight: 700 }}>{!isEntrada ? fmtN(m.cantidad) : ''}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 800, color: '#111827' }}>{fmtN(m.stock_post)}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', color: '#6b7280' }}>{fmt(m.costo_promedio_post)}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>{fmt(val)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn-secondary" onClick={onClose}>Cerrar</button>
      </div>
    </Modal>
  )
}

// ─── Modal Artículo (crear/editar) ────────────────────────────────────────────
const emptyProd = { id_prod:'', producto:'', tipo:'', unidad:'L', costo_unitario:'', stock_actual:0, stock_minimo:0, stock_maximo:'', proveedor:'', concentracion:'', es_inventariable:true }

const ModalArticulo = ({ item, onClose, onDone }) => {
  const [form, setForm] = useState(item ? { ...item } : emptyProd)
  const [saving, setSaving] = useState(false)
  const editing = !!item

  useEffect(() => {
    if (!editing) {
      api.get('/inventario/articulos/next-id').then(r => setForm(p => ({ ...p, id_prod: r.data.next_id }))).catch(() => toast.error('Error al obtener ID de artículo'))
    }
  }, [])

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, costo_unitario: Number(form.costo_unitario) || null, stock_actual: Number(form.stock_actual), stock_minimo: Number(form.stock_minimo), stock_maximo: form.stock_maximo ? Number(form.stock_maximo) : null }
      if (editing) await api.put(`/inventario/articulos/${item.id_prod}`, payload)
      else await api.post('/inventario/articulos', payload)
      toast.success(editing ? 'Artículo actualizado' : 'Artículo creado')
      onDone()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <Modal title={editing ? 'Editar Artículo' : 'Nuevo Artículo'} onClose={onClose} width={620}>
      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="ID Artículo *">
          <input className="input" value={form.id_prod} required disabled />
        </Field>
        <Field label="Tipo">
          <select className="select" value={form.tipo} onChange={e => f('tipo', e.target.value)}>
            <option value="">Seleccionar...</option>
            {TIPOS_PROD.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Nombre del Artículo *" full>
          <input className="input" value={form.producto} onChange={e => f('producto', e.target.value)} required />
        </Field>
        <Field label="Unidad de Medida">
          <select className="select" value={form.unidad} onChange={e => f('unidad', e.target.value)}>
            <option value="L">Litros (L)</option>
            <option value="Kg">Kilogramos (Kg)</option>
            <option value="unidad">Unidad</option>
            <option value="g">Gramos (g)</option>
            <option value="mL">Mililitros (mL)</option>
          </select>
        </Field>
        <Field label="Precio Lista (RD$)">
          <input className="input" type="number" step="0.01" min="0" value={form.costo_unitario} onChange={e => f('costo_unitario', e.target.value)} />
        </Field>
        {!editing && (
          <Field label="Stock Inicial">
            <input className="input" type="number" step="0.01" min="0" value={form.stock_actual} onChange={e => f('stock_actual', e.target.value)} />
          </Field>
        )}
        <Field label="Stock Mínimo (Punto Reorden)">
          <input className="input" type="number" step="0.01" min="0" value={form.stock_minimo} onChange={e => f('stock_minimo', e.target.value)} />
        </Field>
        <Field label="Stock Máximo">
          <input className="input" type="number" step="0.01" min="0" value={form.stock_maximo || ''} onChange={e => f('stock_maximo', e.target.value)} />
        </Field>
        <Field label="Concentración">
          <input className="input" value={form.concentracion || ''} onChange={e => f('concentracion', e.target.value)} placeholder="25%, 48%, etc." />
        </Field>
        <Field label="Proveedor Preferido">
          <input className="input" value={form.proveedor || ''} onChange={e => f('proveedor', e.target.value)} />
        </Field>
        <Field label="Inventariable">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={form.es_inventariable !== false} onChange={e => f('es_inventariable', e.target.checked)} />
            Producto con control de inventario
          </label>
        </Field>
        <div style={{ gridColumn: '1/-1', display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving}>Guardar</button>
        </div>
      </form>
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function Inventario() {
  const [tab, setTab] = useState('articulos')
  const [articulos, setArticulos] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [valoracion, setValoracion] = useState(null)
  const [loading, setLoading] = useState(false)
  const [almacenes, setAlmacenes] = useState([])
  const [alertasVenc, setAlertasVenc] = useState(null)
  const [conciliacion, setConciliacion] = useState(null)

  // Filtros artículos
  const [buscar, setBuscar] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroStock, setFiltroStock] = useState('todos')

  // Filtros movimientos
  const [filtroMovProd, setFiltroMovProd] = useState('')
  const [filtroMovDoc, setFiltroMovDoc] = useState('')
  const [filtroMovDesde, setFiltroMovDesde] = useState('')
  const [filtroMovHasta, setFiltroMovHasta] = useState('')

  // Modals
  const [modalGR, setModalGR] = useState(null)    // producto o true
  const [modalGI, setModalGI] = useState(null)
  const [modalAJ, setModalAJ] = useState(null)
  const [modalKardex, setModalKardex] = useState(null)
  const [modalArticulo, setModalArticulo] = useState(null)

  const loadArticulos = useCallback(async () => {
    setLoading(true)
    try { const { data } = await api.get('/inventario/articulos'); setArticulos(data) }
    catch { toast.error('Error al cargar artículos') }
    finally { setLoading(false) }
  }, [])

  const loadMovimientos = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/inventario/movimientos', { params: { producto_id: filtroMovProd || undefined, tipo_doc: filtroMovDoc || undefined, fecha_desde: filtroMovDesde || undefined, fecha_hasta: filtroMovHasta || undefined, limit: 500 } })
      setMovimientos(data)
    } catch { toast.error('Error al cargar movimientos') }
    finally { setLoading(false) }
  }, [filtroMovProd, filtroMovDoc, filtroMovDesde, filtroMovHasta])

  const loadValoracion = useCallback(async () => {
    setLoading(true)
    try { const { data } = await api.get('/inventario/valoracion'); setValoracion(data) }
    catch { toast.error('Error al cargar valoración') }
    finally { setLoading(false) }
  }, [])

  const loadConciliacion = useCallback(async () => {
    setLoading(true)
    try { const { data } = await api.get('/inventario/conciliacion-ot'); setConciliacion(data) }
    catch { toast.error('Error al cargar conciliación') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    loadArticulos()
    api.get('/contabilidad/almacenes').then(r => setAlmacenes(r.data)).catch(() => {})
    api.get('/inventario/alertas-vencimiento').then(r => setAlertasVenc(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (tab === 'articulos') loadArticulos()
    else if (tab === 'movimientos') loadMovimientos()
    else if (tab === 'valoracion') loadValoracion()
    else if (tab === 'conciliacion') loadConciliacion()
  }, [tab, loadArticulos, loadMovimientos, loadValoracion, loadConciliacion])

  function reload() {
    if (tab === 'articulos') loadArticulos()
    else if (tab === 'movimientos') loadMovimientos()
    else if (tab === 'valoracion') loadValoracion()
  }

  function afterAction() {
    setModalGR(null); setModalGI(null); setModalAJ(null); setModalArticulo(null)
    loadArticulos()
    if (tab === 'movimientos') loadMovimientos()
    if (tab === 'valoracion') loadValoracion()
    api.get('/inventario/alertas-vencimiento').then(r => setAlertasVenc(r.data)).catch(() => {})
  }

  const csvEsc = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`

  function exportCSV() {
    let csv = '', filename = ''
    if (tab === 'articulos') {
      csv = 'ID,Artículo,Tipo,Unidad,Stock,Mínimo,C.Promedio,Valor Inv.\n'
      articulosFiltrados.forEach(p => {
        csv += `${p.id_prod},${csvEsc(p.producto)},${p.tipo || ''},${p.unidad},${p.stock_actual},${p.stock_minimo},${p.costo_promedio},${p.valor_inventario}\n`
      })
      filename = `articulos_${new Date().toISOString().slice(0, 10)}.csv`
    } else if (tab === 'movimientos') {
      csv = 'N° Doc,Fecha,Tipo Doc,Artículo,Motivo,Cantidad,Tipo,Costo Unit.,Saldo\n'
      movimientos.forEach(m => {
        csv += `${m.num_documento},${m.fecha?.slice(0, 10) || ''},${m.tipo_doc},${csvEsc(m.producto_nombre || m.producto_id)},${csvEsc(m.motivo)},${m.cantidad},${m.tipo},${m.costo_unitario || ''},${m.stock_post ?? ''}\n`
      })
      filename = `movimientos_${new Date().toISOString().slice(0, 10)}.csv`
    } else if (tab === 'valoracion' && valoracion) {
      csv = 'ID,Artículo,Tipo,Unidad,Stock,C.Promedio,Valor\n'
      valoracion.items.forEach(p => {
        csv += `${p.id_prod},${csvEsc(p.producto)},${p.tipo},${p.unidad},${p.stock},${p.costo_promedio},${p.valor}\n`
      })
      filename = `valoracion_${new Date().toISOString().slice(0, 10)}.csv`
    }
    if (!csv) return
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  async function delArticulo(id_prod) {
    if (!confirm('¿Desactivar este artículo?')) return
    try { await api.delete(`/inventario/articulos/${id_prod}`); toast.success('Artículo desactivado'); loadArticulos() }
    catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  // ─── Artículos filtrados
  const articulosFiltrados = articulos.filter(p => {
    const txt = buscar.toLowerCase()
    const matchTxt = !txt || p.producto.toLowerCase().includes(txt) || p.id_prod.toLowerCase().includes(txt) || (p.proveedor || '').toLowerCase().includes(txt)
    const matchTipo = !filtroTipo || p.tipo === filtroTipo
    const matchStock = filtroStock === 'todos' || (filtroStock === 'bajo' && p.bajo_minimo) || (filtroStock === 'sin' && p.stock_actual === 0) || (filtroStock === 'ok' && !p.bajo_minimo && p.stock_actual > 0)
    return matchTxt && matchTipo && matchStock
  })

  const totalValor = articulos.reduce((s, p) => s + (p.valor_inventario || 0), 0)
  const bajosMinimo = articulos.filter(p => p.bajo_minimo).length
  const sinStock = articulos.filter(p => p.stock_actual === 0).length

  // ─── Render tabs
  const TabBtn = ({ id, label, icon: Icon }) => (
    <button onClick={() => setTab(id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: tab === id ? '#166534' : 'transparent', color: tab === id ? 'white' : '#6b7280', transition: 'all 0.15s' }}>
      <Icon size={15} />{label}
    </button>
  )

  return (
    <div>
      {/* ─── Header ──── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#111827' }}>Gestión de Inventario</h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>
            {articulos.length} artículos · Valor total: <strong style={{ color: '#166534' }}>{fmt(totalValor)}</strong>
            {bajosMinimo > 0 && <span style={{ marginLeft: 12, color: '#dc2626' }}>⚠ {bajosMinimo} bajo mínimo</span>}
            {sinStock > 0 && <span style={{ marginLeft: 8, color: '#9ca3af' }}>· {sinStock} sin stock</span>}
            {alertasVenc && alertasVenc.total > 0 && (
              <span style={{ marginLeft: 12, color: alertasVenc.vencidos > 0 ? '#dc2626' : '#b45309' }}>
                <Clock size={12} style={{ verticalAlign: 'middle', marginRight: 2 }} />
                {alertasVenc.vencidos > 0 ? `${alertasVenc.vencidos} vencidos` : `${alertasVenc.total} por vencer`}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={exportCSV} title="Exportar CSV"><Download size={14} /></button>
          <button className="btn-secondary" onClick={reload} title="Actualizar"><RefreshCw size={14} /></button>
          <button onClick={() => setModalGR(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10, border:'none', background:'#166534', color:'white', cursor:'pointer', fontWeight:600, fontSize:13 }}>
            <ArrowDownCircle size={14} /> GR — Entrada
          </button>
          <button onClick={() => setModalGI(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10, border:'none', background:'#991b1b', color:'white', cursor:'pointer', fontWeight:600, fontSize:13 }}>
            <ArrowUpCircle size={14} /> GI — Salida
          </button>
          <button onClick={() => setModalAJ(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10, border:'none', background:'#854d0e', color:'white', cursor:'pointer', fontWeight:600, fontSize:13 }}>
            <ClipboardList size={14} /> AJ — Ajuste
          </button>
        </div>
      </div>

      {/* ─── Tabs ──── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f3f4f6', padding: 4, borderRadius: 12, width: 'fit-content' }}>
        <TabBtn id="articulos" label="Artículos" icon={Package} />
        <TabBtn id="movimientos" label="Movimientos" icon={ClipboardList} />
        <TabBtn id="valoracion" label="Valoración" icon={BarChart2} />
        <TabBtn id="conciliacion" label="Conciliación OT" icon={RefreshCw} />
      </div>

      {/* ══════════════ TAB: ARTÍCULOS ══════════════ */}
      {tab === 'articulos' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 320 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input className="input" placeholder="Buscar por nombre, ID o proveedor..." value={buscar} onChange={e => setBuscar(e.target.value)} style={{ paddingLeft: 34 }} />
            </div>
            <select className="select" style={{ width: 180 }} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
              <option value="">Todos los tipos</option>
              {TIPOS_PROD.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="select" style={{ width: 160 }} value={filtroStock} onChange={e => setFiltroStock(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="ok">Stock OK</option>
              <option value="bajo">Bajo mínimo</option>
              <option value="sin">Sin stock</option>
            </select>
            <button onClick={() => setModalArticulo('new')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: 'none', background: '#1e40af', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              <Plus size={14} /> Nuevo Artículo
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Valor Total Inventario', value: fmt(totalValor), icon: DollarSign, color: '#166534', bg: '#dcfce7' },
              { label: 'Artículos Activos', value: articulos.length, icon: Package, color: '#1e40af', bg: '#dbeafe' },
              { label: 'Bajo Mínimo', value: bajosMinimo, icon: AlertTriangle, color: '#b45309', bg: '#fef9c3' },
              { label: 'Sin Stock', value: sinStock, icon: TrendingDown, color: '#dc2626', bg: '#fee2e2' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="card" style={{ borderLeft: `4px solid ${color}`, padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ background: bg, borderRadius: 8, padding: 6, display: 'flex' }}><Icon size={14} color={color} /></div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>{label}</div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
            {articulosFiltrados.length} de {articulos.length} artículos
            {filtroTipo || filtroStock !== 'todos' || buscar ? ` · Valor filtrado: ${fmt(articulosFiltrados.reduce((s, p) => s + (p.valor_inventario || 0), 0))}` : ''}
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>ID</th><th>Artículo</th><th>Tipo</th><th>Unidad</th>
                    <th style={{ textAlign: 'right' }}>Stock</th>
                    <th style={{ textAlign: 'right' }}>Mínimo</th>
                    <th style={{ textAlign: 'right' }}>C. Promedio</th>
                    <th style={{ textAlign: 'right' }}>Valor Inv.</th>
                    <th>Estado</th>
                    <th style={{ textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Cargando...</td></tr>
                  ) : articulosFiltrados.length === 0 ? (
                    <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Sin artículos</td></tr>
                  ) : articulosFiltrados.map(p => (
                    <tr key={p.id_prod}>
                      <td style={{ fontWeight: 700, fontSize: 12, color: '#166534', whiteSpace: 'nowrap' }}>{p.id_prod}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.producto}</div>
                        {p.concentracion && <div style={{ fontSize: 10, color: '#9ca3af' }}>{p.concentracion}</div>}
                      </td>
                      <td><span className="badge badge-blue" style={{ fontSize: 10 }}>{p.tipo || '—'}</span></td>
                      <td style={{ fontSize: 12 }}>{p.unidad}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: p.stock_actual === 0 ? '#dc2626' : '#111827' }}>{fmtN(p.stock_actual)}</td>
                      <td style={{ textAlign: 'right', color: '#6b7280', fontSize: 12 }}>{fmtN(p.stock_minimo)}</td>
                      <td style={{ textAlign: 'right', color: '#6b7280', fontSize: 12 }}>{fmt(p.costo_promedio)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#166534' }}>{fmt(p.valor_inventario)}</td>
                      <td><StockBadge stock={p.stock_actual} minimo={p.stock_minimo} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <button title="Kardex" onClick={() => setModalKardex(p)} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: '#6b7280' }}><Eye size={13} /></button>
                          <button title="Entrada" onClick={() => setModalGR(p)} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: '#166534' }}><ArrowDownCircle size={13} /></button>
                          <button title="Salida" onClick={() => setModalGI(p)} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: '#dc2626' }}><ArrowUpCircle size={13} /></button>
                          <button title="Editar" onClick={() => setModalArticulo(p)} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: '#1e40af' }}><Edit2 size={13} /></button>
                          <button title="Desactivar" onClick={() => delArticulo(p.id_prod)} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: '#9ca3af' }}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ══════════════ TAB: MOVIMIENTOS ══════════════ */}
      {tab === 'movimientos' && (() => {
        const movsIn = movimientos.filter(m => m.tipo === 'entrada')
        const movsOut = movimientos.filter(m => m.tipo !== 'entrada')
        const qtyEntradas = movsIn.reduce((s, m) => s + (m.cantidad || 0), 0)
        const qtySalidas = movsOut.reduce((s, m) => s + (m.cantidad || 0), 0)
        const valEntradas = movsIn.reduce((s, m) => s + (m.cantidad * (m.costo_unitario || 0)), 0)
        const valSalidas = movsOut.reduce((s, m) => s + (m.cantidad * (m.costo_unitario || 0)), 0)
        return (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
            {[
              { label: 'Movimientos', value: movimientos.length, icon: ClipboardList, color: '#374151', bg: '#f3f4f6' },
              { label: `Entradas (${movsIn.length})`, value: fmt(valEntradas), icon: ArrowDownCircle, color: '#166534', bg: '#dcfce7' },
              { label: `Salidas (${movsOut.length})`, value: fmt(valSalidas), icon: ArrowUpCircle, color: '#dc2626', bg: '#fee2e2' },
              { label: 'Neto', value: fmt(valEntradas - valSalidas), icon: DollarSign, color: '#1e40af', bg: '#dbeafe' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="card" style={{ borderLeft: `4px solid ${color}`, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ background: bg, borderRadius: 8, padding: 6, display: 'flex' }}><Icon size={14} color={color} /></div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>{label}</div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <select className="select" style={{ width: 200 }} value={filtroMovProd} onChange={e => { setFiltroMovProd(e.target.value); }}>
              <option value="">Todos los artículos</option>
              {articulos.length === 0
                ? null
                : articulos.map(p => <option key={p.id_prod} value={p.id_prod}>{p.producto}</option>)}
            </select>
            <select className="select" style={{ width: 160 }} value={filtroMovDoc} onChange={e => setFiltroMovDoc(e.target.value)}>
              <option value="">Todos los tipos</option>
              <option value="GR">GR — Entrada</option>
              <option value="GI">GI — Salida</option>
              <option value="AJ">AJ — Ajuste</option>
              <option value="OT">OT — Consumo</option>
            </select>
            <input className="input" type="date" style={{ width: 150 }} value={filtroMovDesde} onChange={e => setFiltroMovDesde(e.target.value)} title="Desde" />
            <input className="input" type="date" style={{ width: 150 }} value={filtroMovHasta} onChange={e => setFiltroMovHasta(e.target.value)} title="Hasta" />
            <button className="btn-secondary" onClick={loadMovimientos}><Search size={14} /> Buscar</button>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th>N° Doc.</th>
                  <th>Fecha</th>
                  <th>Tipo Doc.</th>
                  <th>Artículo</th>
                  <th>Motivo</th>
                  <th>Ref / Lote / Factura</th>
                  <th style={{ textAlign: 'right' }}>Entradas</th>
                  <th style={{ textAlign: 'right' }}>Salidas</th>
                  <th style={{ textAlign: 'right' }}>Saldo</th>
                  <th style={{ textAlign: 'right' }}>C. Unit.</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Cargando...</td></tr>
                ) : movimientos.length === 0 ? (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Sin movimientos en el período</td></tr>
                ) : movimientos.map(m => {
                  const isIn = m.tipo === 'entrada'
                  return (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 700, fontSize: 12, color: '#374151', whiteSpace: 'nowrap' }}>{m.num_documento || '—'}</td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{fmtDate(m.fecha)}</td>
                      <td><Badge tipo_doc={m.tipo_doc} /></td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{m.producto_nombre || m.producto_id}</div>
                        <div style={{ fontSize: 10, color: '#9ca3af' }}>{m.producto_id}</div>
                      </td>
                      <td style={{ color: '#6b7280', fontSize: 12 }}>{m.motivo || '—'}</td>
                      <td style={{ fontSize: 11, color: '#6b7280' }}>
                        {[m.lote && `Lote: ${m.lote}`, m.num_factura && `Fac: ${m.num_factura}`, m.referencia].filter(Boolean).join(' · ') || '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#166534' }}>{isIn ? `${fmtN(m.cantidad)} ${m.producto_unidad || ''}` : ''}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>{!isIn ? `${fmtN(m.cantidad)} ${m.producto_unidad || ''}` : ''}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#111827' }}>{m.stock_post != null ? `${fmtN(m.stock_post)} ${m.producto_unidad || ''}` : '—'}</td>
                      <td style={{ textAlign: 'right', color: '#6b7280', fontSize: 12 }}>{m.costo_unitario ? fmt(m.costo_unitario) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
              {movimientos.length > 0 && (
                <tfoot>
                  <tr style={{ background: '#f9fafb', fontWeight: 700 }}>
                    <td colSpan={6} style={{ textAlign: 'right', fontSize: 12, color: '#374151' }}>TOTALES ({movimientos.length} mov.)</td>
                    <td style={{ textAlign: 'right', color: '#166534', fontSize: 13 }}>
                      <div>{fmtN(qtyEntradas)}</div>
                      <div style={{ fontSize: 11, fontWeight: 600 }}>{fmt(valEntradas)}</div>
                    </td>
                    <td style={{ textAlign: 'right', color: '#dc2626', fontSize: 13 }}>
                      <div>{fmtN(qtySalidas)}</div>
                      <div style={{ fontSize: 11, fontWeight: 600 }}>{fmt(valSalidas)}</div>
                    </td>
                    <td style={{ textAlign: 'right', color: '#1e40af', fontSize: 13 }}>—</td>
                    <td style={{ textAlign: 'right', color: '#1e40af', fontSize: 13, fontWeight: 800 }}>{fmt(valEntradas - valSalidas)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
        )
      })()}

      {/* ══════════════ TAB: VALORACIÓN ══════════════ */}
      {tab === 'valoracion' && valoracion && (
        <>
          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
            {[
              { label: 'Valor Total Inventario', value: fmt(valoracion.total_valor), icon: DollarSign, color: '#166534', bg: '#dcfce7' },
              { label: 'Total Artículos Activos', value: valoracion.total_articulos, icon: Package, color: '#1e40af', bg: '#dbeafe' },
              { label: 'Bajo Mínimo', value: valoracion.bajo_minimo.length, icon: AlertTriangle, color: '#b45309', bg: '#fef9c3' },
              { label: 'Sin Stock', value: valoracion.sin_stock.length, icon: TrendingDown, color: '#dc2626', bg: '#fee2e2' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="card" style={{ borderLeft: `4px solid ${color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ background: bg, borderRadius: 8, padding: 8, display: 'flex' }}><Icon size={16} color={color} /></div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>{label}</div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Por tipo */}
            <div className="card">
              <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>Valor por Categoría</h3>
              {valoracion.por_tipo.map(({ tipo, valor }) => {
                const pct = valoracion.total_valor > 0 ? (valor / valoracion.total_valor * 100) : 0
                return (
                  <div key={tipo} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{tipo}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>{fmt(valor)}</span>
                    </div>
                    <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#166534', borderRadius: 4, transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{pct.toFixed(1)}%</div>
                  </div>
                )
              })}
            </div>

            {/* Alertas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card">
                <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#b45309' }}>⚠ Bajo Mínimo ({valoracion.bajo_minimo.length})</h3>
                {valoracion.bajo_minimo.length === 0 ? (
                  <p style={{ color: '#9ca3af', fontSize: 13 }}>Sin alertas</p>
                ) : valoracion.bajo_minimo.map(p => (
                  <div key={p.id_prod} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                    <span style={{ fontWeight: 500 }}>{p.producto}</span>
                    <span style={{ color: '#b45309', fontWeight: 700 }}>{fmtN(p.stock)} / {fmtN(p.minimo)} {p.unidad}</span>
                  </div>
                ))}
              </div>
              <div className="card">
                <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#dc2626' }}>Sin Stock ({valoracion.sin_stock.length})</h3>
                {valoracion.sin_stock.length === 0 ? (
                  <p style={{ color: '#9ca3af', fontSize: 13 }}>Sin artículos agotados</p>
                ) : valoracion.sin_stock.map(p => (
                  <div key={p.id_prod} style={{ padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13, fontWeight: 500, color: '#dc2626' }}>
                    {p.producto} <span style={{ color: '#9ca3af', fontWeight: 400 }}>({p.id_prod})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Alertas de vencimiento */}
          {alertasVenc && alertasVenc.total > 0 && (
            <div className="card" style={{ marginTop: 20 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#b45309' }}>
                <Clock size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Alertas de Vencimiento ({alertasVenc.total})
                {alertasVenc.vencidos > 0 && <span style={{ marginLeft: 8, background: '#fee2e2', color: '#dc2626', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>{alertasVenc.vencidos} vencidos</span>}
                {alertasVenc.criticos > 0 && <span style={{ marginLeft: 6, background: '#fef9c3', color: '#854d0e', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>{alertasVenc.criticos} criticos</span>}
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead style={{ background: '#f9fafb' }}>
                    <tr>
                      {['Artículo', 'Lote', 'N° Doc.', 'Cantidad', 'Vencimiento', 'Días', 'Estado'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {alertasVenc.alertas.map(a => (
                      <tr key={a.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '7px 10px', fontWeight: 600 }}>{a.producto_nombre || a.producto_id}</td>
                        <td style={{ padding: '7px 10px', color: '#6b7280' }}>{a.lote || '—'}</td>
                        <td style={{ padding: '7px 10px', fontWeight: 700, fontSize: 11, color: '#374151' }}>{a.num_documento}</td>
                        <td style={{ padding: '7px 10px' }}>{fmtN(a.cantidad)}</td>
                        <td style={{ padding: '7px 10px' }}>{fmtDate(a.vencimiento)}</td>
                        <td style={{ padding: '7px 10px', fontWeight: 700, color: a.estado === 'vencido' ? '#dc2626' : a.estado === 'critico' ? '#b45309' : '#6b7280' }}>{a.dias_restantes}</td>
                        <td style={{ padding: '7px 10px' }}>
                          <span style={{ borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700,
                            background: a.estado === 'vencido' ? '#fee2e2' : a.estado === 'critico' ? '#fef9c3' : '#dbeafe',
                            color: a.estado === 'vencido' ? '#dc2626' : a.estado === 'critico' ? '#854d0e' : '#1e40af'
                          }}>
                            {a.estado === 'vencido' ? 'Vencido' : a.estado === 'critico' ? 'Crítico' : 'Próximo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top 10 por valor */}
          <div className="card" style={{ marginTop: 20, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6' }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Ranking por Valor de Inventario</h3>
            </div>
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Artículo</th><th>Tipo</th>
                  <th style={{ textAlign: 'right' }}>Stock</th>
                  <th style={{ textAlign: 'right' }}>C. Promedio</th>
                  <th style={{ textAlign: 'right' }}>Valor Inv.</th>
                  <th style={{ textAlign: 'right' }}>% del total</th>
                </tr>
              </thead>
              <tbody>
                {valoracion.items.slice(0, 15).map((p, i) => {
                  const pct = valoracion.total_valor > 0 ? (p.valor / valoracion.total_valor * 100) : 0
                  return (
                    <tr key={p.id_prod}>
                      <td style={{ color: '#9ca3af', fontSize: 12 }}>{i + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.producto}</div>
                        <div style={{ fontSize: 10, color: '#9ca3af' }}>{p.id_prod}</div>
                      </td>
                      <td><span className="badge badge-blue" style={{ fontSize: 10 }}>{p.tipo}</span></td>
                      <td style={{ textAlign: 'right', fontSize: 12 }}>{fmtN(p.stock)} {p.unidad}</td>
                      <td style={{ textAlign: 'right', fontSize: 12, color: '#6b7280' }}>{fmt(p.costo_promedio)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#166534' }}>{fmt(p.valor)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          <div style={{ width: 50, height: 5, background: '#f3f4f6', borderRadius: 3 }}>
                            <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: '#166534', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, color: '#6b7280', minWidth: 36 }}>{pct.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'valoracion' && !valoracion && !loading && (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>Cargando valoración...</div>
      )}

      {/* ══════════════ TAB: CONCILIACIÓN OT ══════════════ */}
      {tab === 'conciliacion' && conciliacion && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 16 }}>
            {[
              { label: 'Total líneas', value: conciliacion.total, icon: ClipboardList, color: '#374151', bg: '#f3f4f6' },
              { label: 'Conciliados', value: conciliacion.conciliados, icon: Eye, color: '#166534', bg: '#dcfce7' },
              { label: 'Diferencias', value: conciliacion.diferencias, icon: AlertTriangle, color: '#b45309', bg: '#fef9c3' },
              { label: 'No invent.', value: conciliacion.no_inventariable ?? 0, icon: Package, color: '#6b7280', bg: '#f3f4f6' },
              { label: 'Solo en OT', value: conciliacion.solo_ot, icon: ArrowUpCircle, color: '#dc2626', bg: '#fee2e2' },
              { label: 'Solo en Inv.', value: conciliacion.solo_inv, icon: ArrowDownCircle, color: '#1e40af', bg: '#dbeafe' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="card" style={{ borderLeft: `4px solid ${color}`, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ background: bg, borderRadius: 8, padding: 6, display: 'flex' }}><Icon size={14} color={color} /></div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>{label}</div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
              </div>
            ))}
          </div>

          {(() => {
            const difNeta = conciliacion.diferencia_neta ?? (conciliacion.valor_conciliable_ot - conciliacion.valor_total_inv)
            const cuadra = Math.abs(difNeta) < 1
            return (
              <div className="card" style={{ padding: '16px 20px', marginBottom: 16, borderLeft: `4px solid ${cuadra ? '#166534' : '#dc2626'}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', marginBottom: 12 }}>Cuadre Consumo OT ↔ Inventario</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, fontSize: 13 }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700 }}>Consumo OT total</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#166534' }}>{fmt(conciliacion.valor_total_ot)}</div>
                  </div>
                  <div style={{ fontSize: 20, color: '#9ca3af', fontWeight: 300 }}>−</div>
                  <div>
                    <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700 }}>No inventariable</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#6b7280' }}>{fmt(conciliacion.valor_no_inventariable ?? 0)}</div>
                  </div>
                  <div style={{ fontSize: 20, color: '#9ca3af', fontWeight: 300 }}>=</div>
                  <div>
                    <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700 }}>Conciliable OT</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#1e40af' }}>{fmt(conciliacion.valor_conciliable_ot ?? 0)}</div>
                  </div>
                  <div style={{ fontSize: 20, color: '#9ca3af', fontWeight: 300 }}>vs</div>
                  <div>
                    <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700 }}>Salidas Inventario</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#1e40af' }}>{fmt(conciliacion.valor_total_inv)}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700 }}>Diferencia neta</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: cuadra ? '#166534' : '#dc2626' }}>
                      {cuadra ? '✓ ' + fmt(0) : fmt(difNeta)}
                    </div>
                  </div>
                </div>
                {!cuadra && (
                  <div style={{ marginTop: 10, fontSize: 12, color: '#854d0e', background: '#fef9c3', borderRadius: 8, padding: '8px 12px' }}>
                    Quedan RD$ {fmtN(Math.abs(difNeta))} sin explicar por no inventariables. Revisa las filas marcadas "Diferencia" o "Solo OT" abajo.
                  </div>
                )}
              </div>
            )
          })()}

          {conciliacion.items.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Sin datos de consumo para conciliar</div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table>
                <thead>
                  <tr>
                    <th>OT</th>
                    <th>Artículo</th>
                    <th style={{ textAlign: 'right' }}>Cant. OT</th>
                    <th style={{ textAlign: 'right' }}>Cant. Inv.</th>
                    <th style={{ textAlign: 'right' }}>Dif. Cant.</th>
                    <th style={{ textAlign: 'right' }}>Valor OT</th>
                    <th style={{ textAlign: 'right' }}>Valor Inv.</th>
                    <th style={{ textAlign: 'right' }}>Dif. Valor</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {conciliacion.items.map((r, i) => {
                    const estadoStyles = {
                      conciliado: { bg: '#dcfce7', color: '#166534', label: 'OK' },
                      diferencia: { bg: '#fef9c3', color: '#854d0e', label: 'Diferencia' },
                      solo_ot: { bg: '#fee2e2', color: '#dc2626', label: 'Solo OT' },
                      solo_inv: { bg: '#dbeafe', color: '#1e40af', label: 'Solo Inv.' },
                      no_inventariable: { bg: '#f3f4f6', color: '#6b7280', label: 'No invent.' },
                    }
                    const est = estadoStyles[r.estado] || estadoStyles.diferencia
                    return (
                      <tr key={i} style={{ background: r.estado !== 'conciliado' ? `${est.bg}33` : undefined }}>
                        <td style={{ fontWeight: 700, fontSize: 12 }}>OT-{r.ot_id}</td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{r.producto_nombre}</div>
                          <div style={{ fontSize: 10, color: '#9ca3af' }}>{r.producto_id}</div>
                        </td>
                        <td style={{ textAlign: 'right', fontSize: 13 }}>{r.cantidad_ot > 0 ? `${fmtN(r.cantidad_ot)} ${r.unidad}` : '—'}</td>
                        <td style={{ textAlign: 'right', fontSize: 13 }}>{r.cantidad_inv > 0 ? `${fmtN(r.cantidad_inv)} ${r.unidad}` : '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13, color: Math.abs(r.diferencia_qty) < 0.001 ? '#166534' : '#dc2626' }}>
                          {Math.abs(r.diferencia_qty) < 0.001 ? '0' : `${r.diferencia_qty > 0 ? '+' : ''}${fmtN(r.diferencia_qty)}`}
                        </td>
                        <td style={{ textAlign: 'right', fontSize: 12 }}>{r.valor_ot > 0 ? fmt(r.valor_ot) : '—'}</td>
                        <td style={{ textAlign: 'right', fontSize: 12 }}>{r.valor_inv > 0 ? fmt(r.valor_inv) : '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12, color: Math.abs(r.diferencia_val) < 0.01 ? '#166534' : '#dc2626' }}>
                          {Math.abs(r.diferencia_val) < 0.01 ? '0' : fmt(r.diferencia_val)}
                        </td>
                        <td>
                          <span style={{ background: est.bg, color: est.color, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{est.label}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'conciliacion' && !conciliacion && !loading && (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>Cargando conciliación...</div>
      )}

      {/* ─── Modals ──── */}
      {modalGR && <ModalGR producto={modalGR === true ? null : modalGR} articulos={articulos} almacenes={almacenes} onClose={() => setModalGR(null)} onDone={afterAction} />}
      {modalGI && <ModalGI producto={modalGI === true ? null : modalGI} articulos={articulos} almacenes={almacenes} onClose={() => setModalGI(null)} onDone={afterAction} />}
      {modalAJ && <ModalAjuste producto={modalAJ === true ? null : modalAJ} articulos={articulos} almacenes={almacenes} onClose={() => setModalAJ(null)} onDone={afterAction} />}
      {modalKardex && <ModalKardex producto={modalKardex} onClose={() => setModalKardex(null)} />}
      {modalArticulo && <ModalArticulo item={modalArticulo === 'new' ? null : modalArticulo} onClose={() => setModalArticulo(null)} onDone={afterAction} />}
    </div>
  )
}
