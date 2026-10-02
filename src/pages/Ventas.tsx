import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { HandCoins, Plus, X, Ban, Scale, Container, RefreshCw } from 'lucide-react'
import api, { apiError } from '../api'
import { useAuth } from '../contexts/AuthContext'

// Venta de fruta: la finca despacha, el cliente clasifica en su planta y liquida por calibre,
// y con esa liquidación se emite la factura y se reconoce el costo del despacho.

const num = (n: number, dec = 2) => Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: dec, maximumFractionDigits: dec })
const kg = (n: number) => `${Number(n || 0).toLocaleString('es-DO', { maximumFractionDigits: 2 })} kg`
const rd = (n: number) => `RD$ ${num(n)}`
const mon = (n: number, moneda: string) => `${moneda === 'USD' ? 'US$' : 'RD$'} ${num(n)}`
const fmtDate = (d: string) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('es-DO') : '—')
const hoy = () => new Date().toISOString().slice(0, 10)
const label: any = { fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }
const th: any = { textAlign: 'left', padding: '8px 10px', fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }
const td: any = { padding: '7px 10px' }
const tdNum: any = { padding: '7px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }

const ESTADOS: any = {
  despachado: { txt: 'Por liquidar', color: '#1d4ed8', bg: '#dbeafe' },
  liquidado: { txt: 'Liquidado', color: '#166534', bg: '#dcfce7' },
  anulado: { txt: 'Anulado', color: '#6b7280', bg: '#f3f4f6' },
  activa: { txt: 'Activa', color: '#166534', bg: '#dcfce7' },
  anulada: { txt: 'Anulada', color: '#6b7280', bg: '#f3f4f6' },
}
const Estado = ({ e }: any) => {
  const x = ESTADOS[e] || ESTADOS.anulado
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, color: x.color, background: x.bg }}>{x.txt}</span>
}

function Modal({ title, subtitle, onClose, children, width = 720 }: any) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: width, width: '95%', maxHeight: '92vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</h2>
            {subtitle && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function Ventas() {
  const { isAdmin, hasRole } = useAuth()
  const puedeEditar = isAdmin || hasRole('supervisor')
  const [tab, setTab] = useState<'despachos' | 'liquidaciones' | 'rentabilidad'>('despachos')
  const [despachos, setDespachos] = useState<any[]>([])
  const [liquidaciones, setLiquidaciones] = useState<any[]>([])
  const [pendientes, setPendientes] = useState<any>(null)
  const [filtro, setFiltro] = useState('')
  const [nuevo, setNuevo] = useState(false)
  const [liquidar, setLiquidar] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [d, l, p] = await Promise.all([
        api.get('/ventas/despachos', { params: filtro ? { estado: filtro } : {} }),
        api.get('/ventas/liquidaciones'),
        api.get('/ventas/pendientes'),
      ])
      setDespachos(d.data); setLiquidaciones(l.data); setPendientes(p.data)
    } catch (err) { toast.error(apiError(err, 'Error cargando ventas')) }
    finally { setLoading(false) }
  }, [filtro])
  useEffect(() => { cargar() }, [cargar])

  async function anularDespacho(d: any) {
    const motivo = prompt(`Anular el despacho ${d.numero}: la fruta vuelve al inventario.\n\nMotivo:`)
    if (!motivo) return
    try {
      await api.post(`/ventas/despachos/${d.id}/anular`, null, { params: { motivo } })
      toast.success(`Despacho ${d.numero} anulado — la fruta volvió al inventario`); cargar()
    } catch (err) { toast.error(apiError(err, 'No se pudo anular'), { duration: 8000 }) }
  }

  async function anularLiquidacion(l: any) {
    const motivo = prompt(`Anular la liquidación ${l.numero} y su factura ${l.cxc || ''}. El despacho vuelve a quedar por liquidar.\n\nMotivo:`)
    if (!motivo) return
    try {
      await api.post(`/ventas/liquidaciones/${l.id}/anular`, null, { params: { motivo } })
      toast.success(`Liquidación ${l.numero} anulada`); cargar()
    } catch (err) { toast.error(apiError(err, 'No se pudo anular'), { duration: 8000 }) }
  }

  const tabBtn = (id: any, txt: string) => (
    <button key={id} onClick={() => setTab(id)} style={{
      padding: '8px 16px', fontSize: 13, fontWeight: tab === id ? 700 : 500, borderRadius: 8, cursor: 'pointer',
      color: tab === id ? '#166534' : '#6b7280', background: tab === id ? '#f0fdf4' : 'transparent',
      border: tab === id ? '1px solid #86efac' : '1px solid transparent',
    }}>{txt}</button>
  )

  const cuadra = !pendientes || pendientes.diferencia === null || Math.abs(pendientes.diferencia) < 0.01

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}><HandCoins size={22} color="#166534" /> Ventas de fruta</h1>
          <p style={{ margin: '2px 0 0', color: '#6b7280', fontSize: 13 }}>Despacho → liquidación del cliente por calibre → factura</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={cargar} title="Actualizar"><RefreshCw size={14} /></button>
          {puedeEditar && <button className="btn-primary" onClick={() => setNuevo(true)}><Plus size={14} /> Nuevo despacho</button>}
        </div>
      </div>

      {pendientes && pendientes.items.length > 0 && (
        <div className="card" style={{ padding: '12px 16px', marginBottom: 16, borderLeft: `4px solid ${cuadra ? '#3b82f6' : '#dc2626'}`, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Despachado por liquidar</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1d4ed8' }}>{kg(pendientes.kg)} · {rd(pendientes.costo)}</div>
          </div>
          <div style={{ fontSize: 12, color: cuadra ? '#6b7280' : '#991b1b' }}>
            {pendientes.items.length} despacho(s) esperando la liquidación del cliente.{' '}
            {pendientes.saldo_mayor !== null && (cuadra ? 'Cuadra con la cuenta de fruta despachada.' : `No cuadra con la cuenta: mayor ${rd(pendientes.saldo_mayor)}.`)}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {tabBtn('despachos', 'Despachos')}
        {tabBtn('liquidaciones', 'Liquidaciones y facturas')}
        {tabBtn('rentabilidad', 'Rentabilidad')}
      </div>

      {tab === 'despachos' && (
        <>
          <div style={{ marginBottom: 12 }}>
            <select className="select" style={{ width: 200 }} value={filtro} onChange={e => setFiltro(e.target.value)}>
              <option value="">Todos los despachos</option>
              <option value="despachado">Por liquidar</option>
              <option value="liquidado">Liquidados</option>
              <option value="anulado">Anulados</option>
            </select>
          </div>
          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#f9fafb' }}>
                {['N°', 'Fecha', 'Cliente', 'Campo', 'Conduce', 'Calibres'].map(h => <th key={h} style={th}>{h}</th>)}
                <th style={{ ...th, textAlign: 'right' }}>Kg</th>
                <th style={{ ...th, textAlign: 'right' }}>Costo</th>
                <th style={th}>Estado</th><th style={th}></th>
              </tr></thead>
              <tbody>
                {loading && !despachos.length ? <tr><td colSpan={10} style={{ padding: 30, textAlign: 'center', color: '#9ca3af' }}>Cargando…</td></tr>
                  : !despachos.length ? <tr><td colSpan={10} style={{ padding: 30, textAlign: 'center', color: '#9ca3af' }}>Sin despachos{puedeEditar ? '. Registre el primero con "Nuevo despacho".' : ''}</td></tr>
                  : despachos.map(d => (
                    <tr key={d.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ ...td, fontWeight: 700 }}>{d.numero}</td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtDate(d.fecha)}</td>
                      <td style={td}>{d.cliente}</td>
                      <td style={{ ...td, color: '#6b7280' }}>{d.campo_id || '—'}</td>
                      <td style={{ ...td, color: '#6b7280' }}>{d.conduce || '—'}</td>
                      <td style={{ ...td, fontSize: 12, color: '#374151' }}>{d.lineas.map((l: any) => `${l.calibre} ${num(l.kg, 0)}`).join(' · ')}</td>
                      <td style={{ ...tdNum, fontWeight: 700 }}>{kg(d.kg_total)}</td>
                      <td style={tdNum}>{rd(d.costo_total)}</td>
                      <td style={td}>
                        <Estado e={d.estado} />
                        {d.estado === 'despachado' && d.dias > 0 && <span style={{ fontSize: 10, color: d.dias > 30 ? '#b91c1c' : '#9ca3af', marginLeft: 6 }}>{d.dias} días</span>}
                        {d.liquidacion && <span style={{ fontSize: 10, color: '#6b7280', marginLeft: 6 }}>{d.liquidacion}</span>}
                      </td>
                      <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {puedeEditar && d.estado === 'despachado' && <>
                          <button className="btn-primary" style={{ padding: '4px 10px', fontSize: 12, marginRight: 4 }} onClick={() => setLiquidar(d)}><Scale size={12} /> Liquidar</button>
                          <button className="btn-secondary" style={{ padding: '4px 8px', color: '#dc2626' }} title="Anular despacho" onClick={() => anularDespacho(d)}><Ban size={12} /></button>
                        </>}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'liquidaciones' && (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ background: '#f9fafb' }}>
              {['N°', 'Fecha', 'Cliente', 'Despacho'].map(h => <th key={h} style={th}>{h}</th>)}
              {['Despachado', 'Liquidado', 'Rechazo', 'Venta', 'Venta RD$', 'Costo', 'Margen'].map(h => <th key={h} style={{ ...th, textAlign: 'right' }}>{h}</th>)}
              <th style={th}>Factura</th><th style={th}></th>
            </tr></thead>
            <tbody>
              {!liquidaciones.length ? <tr><td colSpan={13} style={{ padding: 30, textAlign: 'center', color: '#9ca3af' }}>Sin liquidaciones. Se registran desde un despacho con "Liquidar".</td></tr>
                : liquidaciones.map(l => (
                  <tr key={l.id} style={{ borderTop: '1px solid #f1f5f9', opacity: l.estado === 'anulada' ? 0.5 : 1 }}>
                    <td style={{ ...td, fontWeight: 700 }}>{l.numero}{l.referencia_cliente && <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 400 }}>Cliente: {l.referencia_cliente}</div>}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtDate(l.fecha)}</td>
                    <td style={td}>{l.cliente}</td>
                    <td style={{ ...td, color: '#6b7280' }}>{l.despacho}</td>
                    <td style={tdNum}>{kg(l.kg_despachados)}</td>
                    <td style={{ ...tdNum, fontWeight: 700 }}>{kg(l.kg_liquidados)}</td>
                    <td style={{ ...tdNum, color: l.kg_rechazo > 0 ? '#b45309' : '#9ca3af' }}>{kg(l.kg_rechazo)}{l.kg_merma > 0 && <div style={{ fontSize: 10 }}>merma {kg(l.kg_merma)}</div>}</td>
                    <td style={{ ...tdNum, fontWeight: 700 }}>{mon(l.subtotal, l.moneda)}{l.precio_promedio && <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 400 }}>{num(l.precio_promedio, 4)}/kg</div>}</td>
                    <td style={tdNum}>{rd(l.venta_dop)}{l.moneda === 'USD' && <div style={{ fontSize: 10, color: '#9ca3af' }}>a {l.tasa_cambio}</div>}</td>
                    <td style={tdNum}>{rd(l.costo_total)}</td>
                    <td style={{ ...tdNum, fontWeight: 700, color: l.margen_dop >= 0 ? '#166534' : '#b91c1c' }}>{rd(l.margen_dop)}{l.margen_pct !== null && <div style={{ fontSize: 10 }}>{l.margen_pct}%</div>}</td>
                    <td style={{ ...td, fontSize: 12 }}>{l.cxc}<div style={{ fontSize: 10, color: '#6b7280', fontFamily: 'monospace' }}>{l.ncf}</div></td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      {puedeEditar && l.estado === 'activa' && l.cxc_estado === 'pendiente' && (
                        <button className="btn-secondary" style={{ padding: '4px 8px', color: '#dc2626' }} title="Anular liquidación y factura" onClick={() => anularLiquidacion(l)}><Ban size={12} /></button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'rentabilidad' && <Rentabilidad />}

      {nuevo && <NuevoDespacho onClose={() => setNuevo(false)} onDone={() => { setNuevo(false); cargar() }} />}
      {liquidar && <LiquidarDespacho despacho={liquidar} onClose={() => setLiquidar(null)} onDone={() => { setLiquidar(null); setTab('liquidaciones'); cargar() }} />}
    </div>
  )
}

function NuevoDespacho({ onClose, onDone }: any) {
  const [clientes, setClientes] = useState<any[]>([])
  const [campos, setCampos] = useState<any[]>([])
  const [calibres, setCalibres] = useState<any[]>([])
  const [form, setForm] = useState({ cliente_id: '', fecha: hoy(), campo_id: '', temporada: String(new Date().getFullYear()), conduce: '', observaciones: '' })
  const [kgs, setKgs] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([api.get('/clientes'), api.get('/campos'), api.get('/ventas/calibres-stock'), api.get('/cosecha/temporadas')]).then(([c, ca, k, t]) => {
      // La fruta que sale es de la temporada que se está cosechando, aunque el despacho caiga en otro año.
      if (t.data?.length) setForm(f => ({ ...f, temporada: t.data[0] }))
      setClientes(c.data || [])
      setCampos((ca.data || []).filter((x: any) => x.activo !== false))
      setCalibres((k.data || []).filter((x: any) => x.producto_id))
    }).catch(err => toast.error(apiError(err, 'Error cargando datos')))
  }, [])

  const lineas = calibres.filter(c => Number(kgs[c.id]) > 0).map(c => ({ calibre_id: c.id, kg: Number(kgs[c.id]) }))
  const totalKg = lineas.reduce((s, l) => s + l.kg, 0)
  const totalCosto = calibres.reduce((s, c) => s + (Number(kgs[c.id]) || 0) * c.costo_promedio, 0)

  async function guardar(e: any) {
    e.preventDefault()
    if (!form.cliente_id) return toast.error('Seleccione el cliente')
    if (!lineas.length) return toast.error('Indique los kg de al menos un calibre')
    const excede = calibres.find(c => Number(kgs[c.id]) > c.stock_kg + 1e-6)
    if (excede) return toast.error(`${excede.nombre}: solo hay ${num(excede.stock_kg)} kg en inventario`)
    setSaving(true)
    try {
      const { data } = await api.post('/ventas/despachos', {
        ...form, cliente_id: Number(form.cliente_id), campo_id: form.campo_id || null,
        conduce: form.conduce || null, observaciones: form.observaciones || null, lineas,
      })
      toast.success(`Despacho ${data.numero} registrado: ${kg(data.kg_total)} por liquidar`)
      onDone()
    } catch (err) { toast.error(apiError(err, 'No se pudo registrar el despacho'), { duration: 8000 }) }
    finally { setSaving(false) }
  }

  return (
    <Modal title="Nuevo despacho" subtitle="La fruta sale del inventario a su costo y queda por liquidar hasta que el cliente envíe su liquidación" onClose={onClose}>
      <form onSubmit={guardar}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div><label style={label}>Cliente *</label>
            <select className="select" value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })} required>
              <option value="">— Seleccionar —</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select></div>
          <div><label style={label}>Fecha *</label><input className="input" type="date" max={hoy()} value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} required /></div>
          <div><label style={label}>Conduce</label><input className="input" value={form.conduce} onChange={e => setForm({ ...form, conduce: e.target.value })} placeholder="CD-0001" /></div>
          <div><label style={label}>Campo de origen</label>
            <select className="select" value={form.campo_id} onChange={e => setForm({ ...form, campo_id: e.target.value })}>
              <option value="">— Varios / sin campo —</option>
              {campos.map(c => <option key={c.id_campo} value={c.id_campo}>{c.id_campo} — {c.nombre}</option>)}
            </select></div>
          <div><label style={label}>Temporada</label><input className="input" value={form.temporada} onChange={e => setForm({ ...form, temporada: e.target.value })} /></div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 12 }}>
          <thead><tr style={{ background: '#f9fafb' }}>
            <th style={th}>Calibre</th>
            <th style={{ ...th, textAlign: 'right' }}>En inventario</th>
            <th style={{ ...th, textAlign: 'right' }}>Costo prom./kg</th>
            <th style={{ ...th, textAlign: 'right' }}>Kg a despachar</th>
          </tr></thead>
          <tbody>
            {calibres.map(c => (
              <tr key={c.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ ...td, fontWeight: 600 }}>{c.nombre}{c.es_granel && <span style={{ color: '#166534', fontSize: 11, fontWeight: 400 }}> · sin clasificar</span>} <span style={{ color: '#9ca3af', fontSize: 11, fontWeight: 400 }}>{c.producto_id}</span></td>
                <td style={{ ...tdNum, color: c.stock_kg > 0 ? '#111827' : '#d1d5db' }}>{kg(c.stock_kg)}</td>
                <td style={{ ...tdNum, color: '#6b7280' }}>{rd(c.costo_promedio)}</td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <input className="input" type="number" min="0" step="0.01" max={c.stock_kg} disabled={c.stock_kg <= 0}
                    value={kgs[c.id] ?? ''} onChange={e => setKgs({ ...kgs, [c.id]: e.target.value })} style={{ width: 120, textAlign: 'right' }} />
                </td>
              </tr>
            ))}
            {!calibres.length && <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>No hay calibres vinculados a productos de inventario (Cosecha → Calibres).</td></tr>}
          </tbody>
        </table>
        <label style={label}>Observaciones</label>
        <input className="input" value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} style={{ marginBottom: 14 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{kg(totalKg)} <span style={{ color: '#6b7280', fontWeight: 400, fontSize: 12 }}>· costo {rd(totalCosto)}</span></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}><Container size={14} /> {saving ? 'Registrando…' : 'Registrar despacho'}</button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

function LiquidarDespacho({ despacho, onClose, onDone }: any) {
  const [calibres, setCalibres] = useState<any[]>([])
  const [form, setForm] = useState({ fecha: hoy(), ncf: '', referencia_cliente: '', moneda: 'USD', tasa_cambio: '', fecha_vencimiento: '', kg_rechazo: '', observaciones: '' })
  const [lineas, setLineas] = useState<Record<string, { kg: string; precio: string }>>({})
  const [sugeridos, setSugeridos] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)

  // La liquidación va por los calibres del cliente, no por la fruta a granel de la finca.
  useEffect(() => { api.get('/ventas/calibres-stock').then(r => setCalibres((r.data || []).filter((c: any) => !c.es_granel))).catch(() => {}) }, [])
  // Precio del libro del cliente para la fecha y moneda de la liquidación.
  useEffect(() => {
    api.get('/ventas/precios-sugeridos', { params: { cliente_id: despacho.cliente_id, fecha: form.fecha || hoy(), moneda: form.moneda } })
      .then(r => setSugeridos(r.data || {})).catch(() => setSugeridos({}))
  }, [despacho.cliente_id, form.fecha, form.moneda])

  const precioDe = (id: number) => {
    const l = lineas[id]
    if (l && l.precio !== '' && l.precio !== undefined) return Number(l.precio)
    return sugeridos[String(id)]?.precio ?? null
  }
  const filas = calibres.map(c => ({ ...c, kg: Number(lineas[c.id]?.kg) || 0, precio: precioDe(c.id) }))
  const kgLiq = filas.reduce((s, f) => s + f.kg, 0)
  const rech = Number(form.kg_rechazo) || 0
  const merma = despacho.kg_total - kgLiq - rech
  const subtotal = filas.reduce((s, f) => s + (f.kg && f.precio !== null ? f.kg * f.precio : 0), 0)
  const tasa = form.moneda === 'USD' ? Number(form.tasa_cambio) || 0 : 1
  const ventaDop = subtotal * tasa
  const excede = kgLiq + rech > despacho.kg_total * 1.02 + 0.005
  const sinPrecio = filas.filter(f => f.kg > 0 && f.precio === null)

  const set = (id: number, k: 'kg' | 'precio', v: string) => setLineas({ ...lineas, [id]: { kg: lineas[id]?.kg ?? '', precio: lineas[id]?.precio ?? '', [k]: v } })

  async function guardar(e: any) {
    e.preventDefault()
    if (!kgLiq) return toast.error('Indique los kg liquidados por calibre')
    if (excede) return toast.error('Lo liquidado más el rechazo supera lo despachado en más de 2%')
    if (sinPrecio.length) return toast.error(`Sin precio: ${sinPrecio.map(f => f.nombre).join(', ')}`)
    if (form.moneda === 'USD' && !(tasa > 1)) return toast.error('Indique la tasa de cambio')
    setSaving(true)
    try {
      const { data } = await api.post(`/ventas/despachos/${despacho.id}/liquidacion`, {
        fecha: form.fecha, ncf: form.ncf.toUpperCase().replace(/[\s-]/g, ''), moneda: form.moneda,
        referencia_cliente: form.referencia_cliente || null, tasa_cambio: form.moneda === 'USD' ? tasa : null,
        fecha_vencimiento: form.fecha_vencimiento || null, kg_rechazo: rech, observaciones: form.observaciones || null,
        lineas: filas.filter(f => f.kg > 0).map(f => ({ calibre_id: f.id, kg: f.kg, precio: f.precio })),
      })
      toast.success(`Liquidación ${data.numero} y factura ${data.cxc} registradas — margen ${rd(data.margen_dop)}`, { duration: 7000 })
      onDone()
    } catch (err) { toast.error(apiError(err, 'No se pudo registrar la liquidación'), { duration: 9000 }) }
    finally { setSaving(false) }
  }

  return (
    <Modal title={`Liquidar despacho ${despacho.numero}`} width={880}
      subtitle={`${despacho.cliente} · ${fmtDate(despacho.fecha)} · despachado ${kg(despacho.kg_total)} (${despacho.lineas.map((l: any) => `${l.calibre} ${num(l.kg, 0)}`).join(', ')}) · costo ${rd(despacho.costo_total)}`}
      onClose={onClose}>
      <form onSubmit={guardar}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1fr 0.8fr 1fr', gap: 12, marginBottom: 14 }}>
          <div><label style={label}>Fecha *</label><input className="input" type="date" min={despacho.fecha} max={hoy()} value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} required /></div>
          <div><label style={label}>NCF de la factura *</label><input className="input" value={form.ncf} onChange={e => setForm({ ...form, ncf: e.target.value })} placeholder="E310000000001" style={{ fontFamily: 'monospace' }} required /></div>
          <div><label style={label}>N° liquidación cliente</label><input className="input" value={form.referencia_cliente} onChange={e => setForm({ ...form, referencia_cliente: e.target.value })} /></div>
          <div><label style={label}>Moneda</label>
            <select className="select" value={form.moneda} onChange={e => setForm({ ...form, moneda: e.target.value })}>
              <option value="USD">US$</option><option value="DOP">RD$</option>
            </select></div>
          {form.moneda === 'USD'
            ? <div><label style={label}>Tasa (RD$/US$) *</label><input className="input" type="number" min="1" step="0.0001" value={form.tasa_cambio} onChange={e => setForm({ ...form, tasa_cambio: e.target.value })} required /></div>
            : <div />}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 12 }}>
          <thead><tr style={{ background: '#f9fafb' }}>
            <th style={th}>Calibre (clasificación del cliente)</th>
            <th style={{ ...th, textAlign: 'right' }}>Kg liquidados</th>
            <th style={{ ...th, textAlign: 'right' }}>Precio /kg</th>
            <th style={{ ...th, textAlign: 'right' }}>Subtotal</th>
          </tr></thead>
          <tbody>
            {filas.map(f => {
              const sug = sugeridos[String(f.id)]
              return (
                <tr key={f.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ ...td, fontWeight: 600 }}>{f.nombre}</td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <input className="input" type="number" min="0" step="0.01" value={lineas[f.id]?.kg ?? ''} onChange={e => set(f.id, 'kg', e.target.value)} style={{ width: 110, textAlign: 'right' }} />
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <input className="input" type="number" min="0" step="0.0001" value={lineas[f.id]?.precio ?? ''} onChange={e => set(f.id, 'precio', e.target.value)}
                      placeholder={sug ? String(sug.precio) : 'sin precio'} style={{ width: 110, textAlign: 'right', borderColor: f.kg > 0 && f.precio === null ? '#fca5a5' : undefined }} />
                    <div style={{ fontSize: 10, color: '#9ca3af' }}>{sug ? `libro${sug.origen === 'base' ? ' (base)' : ''}: ${num(sug.precio, 4)}` : 'no hay en el libro'}</div>
                  </td>
                  <td style={{ ...tdNum, fontWeight: 600 }}>{f.kg && f.precio !== null ? mon(f.kg * f.precio, form.moneda) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 12, marginBottom: 14, alignItems: 'end' }}>
          <div><label style={label}>Kg rechazados</label><input className="input" type="number" min="0" step="0.01" value={form.kg_rechazo} onChange={e => setForm({ ...form, kg_rechazo: e.target.value })} /></div>
          <div><label style={label}>Vencimiento</label><input className="input" type="date" value={form.fecha_vencimiento} onChange={e => setForm({ ...form, fecha_vencimiento: e.target.value })} title="Vacío: según la condición de pago del cliente" /></div>
          <div style={{ fontSize: 12, color: excede ? '#b91c1c' : '#374151', background: excede ? '#fef2f2' : '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
            Despachado {kg(despacho.kg_total)} = liquidado {kg(kgLiq)} + rechazo {kg(rech)} + {merma >= 0 ? `merma ${kg(merma)}` : `exceso ${kg(-merma)}`}
            {excede && <div style={{ fontWeight: 700 }}>Supera lo despachado en más de 2%: revise la liquidación.</div>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
          {[
            ['Factura', mon(subtotal, form.moneda)],
            ['En pesos', tasa > 0 ? rd(ventaDop) : '—'],
            ['Costo del despacho', rd(despacho.costo_total)],
            ['Margen', tasa > 0 ? rd(ventaDop - despacho.costo_total) : '—'],
          ].map(([k, v]) => (
            <div key={k} style={{ background: '#f0fdf4', borderRadius: 8, padding: '8px 12px' }}>
              <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>{k}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#166534', fontVariantNumeric: 'tabular-nums' }}>{v}</div>
            </div>
          ))}
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 11, color: '#6b7280' }}>
          La factura sale sin ITBIS (la fruta fresca normalmente está exenta; confírmelo con su contador). El costo de lo liquidado va a costo de venta; el del rechazo y la merma, a merma.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving}><Scale size={14} /> {saving ? 'Registrando…' : 'Registrar liquidación y factura'}</button>
        </div>
      </form>
    </Modal>
  )
}

function Rentabilidad() {
  const [temporada, setTemporada] = useState(String(new Date().getFullYear()))
  const [data, setData] = useState<any>(null)
  useEffect(() => {
    api.get('/ventas/rentabilidad', { params: { temporada } }).then(r => setData(r.data)).catch(err => toast.error(apiError(err, 'Error cargando rentabilidad')))
  }, [temporada])
  const anios = useMemo(() => { const y = new Date().getFullYear(); return [y, y - 1, y - 2].map(String) }, [])
  if (!data) return <p style={{ color: '#9ca3af' }}>Cargando…</p>
  const t = data.totales
  const monedaVenta = data.moneda_venta || 'USD'
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
        <select className="select" style={{ width: 170 }} value={temporada} onChange={e => setTemporada(e.target.value)}>
          {anios.map(a => <option key={a} value={a}>Temporada {a}</option>)}
        </select>
        {t.kg_por_liquidar > 0 && <span style={{ fontSize: 12, color: '#1d4ed8' }}>{kg(t.kg_por_liquidar)} despachados aún sin liquidar (no entran en venta ni margen)</span>}
      </div>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: '#6b7280', maxWidth: 820 }}>
        <strong>Costo producción</strong>: órdenes de trabajo del campo (mano de obra, insumos, equipo) y servicios comprados para él
        {data.periodo_costos?.desde ? ` entre ${fmtDate(data.periodo_costos.desde)} y ${fmtDate(data.periodo_costos.hasta)}` : ''}.
        <strong> Resultado</strong> = venta liquidada − costo de producción; si queda fruta por vender o por liquidar, el resultado final será mayor.
        {t.costo_kg !== null && <> Use el <strong>costo por kg</strong> como costo unitario del producto de fruta a granel para que el margen de cada liquidación sea realista.</>}
      </p>
      <div className="card" style={{ padding: 0, overflowX: 'auto', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ background: '#f9fafb' }}>
            <th style={th}>Campo</th>
            {['Cosechado', 'Despachado', 'Liquidado', 'Rechazo', 'Venta RD$', 'Costo producción', 'Costo /kg', 'Resultado'].map(h => <th key={h} style={{ ...th, textAlign: 'right' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {data.por_campo.map((f: any) => (
              <tr key={f.campo} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ ...td, fontWeight: 600 }}>{f.campo}</td>
                <td style={tdNum}>{kg(f.kg_cosechados)}</td>
                <td style={tdNum}>{kg(f.kg_despachados)}</td>
                <td style={{ ...tdNum, fontWeight: 700 }}>{kg(f.kg_liquidados)}</td>
                <td style={{ ...tdNum, color: f.kg_rechazo > 0 ? '#b45309' : '#9ca3af' }}>{kg(f.kg_rechazo)}{f.pct_rechazo !== null && f.kg_rechazo > 0 && <span style={{ fontSize: 10 }}> ({f.pct_rechazo}%)</span>}</td>
                <td style={tdNum}>{rd(f.venta_dop)}</td>
                <td style={tdNum} title="Órdenes de trabajo del campo y servicios comprados para él en la temporada">{rd(f.costo_produccion)}</td>
                <td style={{ ...tdNum, color: '#6b7280' }}>{f.costo_kg !== null ? rd(f.costo_kg) : '—'}</td>
                <td style={{ ...tdNum, fontWeight: 700, color: f.resultado >= 0 ? '#166534' : '#b91c1c' }}>{rd(f.resultado)}</td>
              </tr>
            ))}
            {!data.por_campo.length && <tr><td colSpan={9} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Sin cosecha ni ventas en la temporada {temporada}</td></tr>}
            {data.por_campo.length > 1 && (
              <tr style={{ borderTop: '2px solid #e5e7eb', background: '#f9fafb', fontWeight: 700 }}>
                <td style={td}>Total</td>
                <td style={tdNum}>{kg(t.kg_cosechados)}</td><td style={tdNum}>{kg(t.kg_despachados)}</td>
                <td style={tdNum}>{kg(t.kg_liquidados)}</td><td style={tdNum}>{kg(t.kg_rechazo)}</td>
                <td style={tdNum}>{rd(t.venta_dop)}</td><td style={tdNum}>{rd(t.costo_produccion)}</td>
                <td style={tdNum}>{t.costo_kg !== null ? rd(t.costo_kg) : '—'}</td><td style={tdNum}>{rd(t.resultado)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>Por calibre (clasificación del cliente)</h3>
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ background: '#f9fafb' }}>
            <th style={th}>Calibre</th>
            {['Kg liquidados', 'Venta', 'Precio promedio /kg', 'Venta RD$'].map(h => <th key={h} style={{ ...th, textAlign: 'right' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {data.por_calibre.map((k: any) => (
              <tr key={k.calibre_id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ ...td, fontWeight: 600 }}>{k.calibre}</td>
                <td style={tdNum}>{kg(k.kg)}</td>
                <td style={tdNum}>{mon(k.venta, monedaVenta)}</td>
                <td style={{ ...tdNum, fontWeight: 700 }}>{k.precio_promedio !== null ? num(k.precio_promedio, 4) : '—'}</td>
                <td style={tdNum}>{rd(k.venta_dop)}</td>
              </tr>
            ))}
            {!data.por_calibre.length && <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Sin liquidaciones en la temporada</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
