import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { HandCoins, Plus, X, Ban, Scale, Container, RefreshCw, Upload, FileText, Search } from 'lucide-react'
import api, { apiError } from '../api'
import { useAuth } from '../contexts/AuthContext'

// Venta de fruta: la finca despacha, el cliente clasifica en su planta y liquida por calibre,
// y la factura (de una o varias liquidaciones) reconoce la venta y el costo de los despachos.
// El reporte de liquidaciones de la planta se puede importar de una vez.

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
  const [importar, setImportar] = useState(false)
  const [filtroLiq, setFiltroLiq] = useState('')
  const [sel, setSel] = useState<number[]>([])
  const [facturar, setFacturar] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [d, l, p] = await Promise.all([
        api.get('/ventas/despachos', { params: filtro ? { estado: filtro } : {} }),
        api.get('/ventas/liquidaciones'),
        api.get('/ventas/pendientes'),
      ])
      setDespachos(d.data); setLiquidaciones(l.data); setPendientes(p.data); setSel([])
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
    const motivo = prompt(`Anular la liquidación ${l.numero}. El despacho vuelve a quedar por liquidar.\n\nMotivo:`)
    if (!motivo) return
    try {
      await api.post(`/ventas/liquidaciones/${l.id}/anular`, null, { params: { motivo } })
      toast.success(`Liquidación ${l.numero} anulada`); cargar()
    } catch (err) { toast.error(apiError(err, 'No se pudo anular'), { duration: 8000 }) }
  }

  async function anularFactura(l: any) {
    const otras = liquidaciones.filter(x => x.cxc_id === l.cxc_id).length
    const motivo = prompt(`Anular la factura ${l.ncf || l.cxc}${otras > 1 ? ` (agrupa ${otras} liquidaciones)` : ''}. Sus liquidaciones quedan por facturar para volver a facturarlas.\n\nMotivo:`)
    if (!motivo) return
    try {
      await api.post(`/ventas/facturas/${l.cxc_id}/anular`, null, { params: { motivo } })
      toast.success(`Factura ${l.ncf || l.cxc} anulada — sus liquidaciones quedan por facturar`); cargar()
    } catch (err) { toast.error(apiError(err, 'No se pudo anular'), { duration: 8000 }) }
  }

  function facturarSeleccion() {
    const liqs = liquidaciones.filter(l => sel.includes(l.id))
    if (new Set(liqs.map(l => l.cliente_id)).size > 1) return toast.error('Las liquidaciones de una factura deben ser del mismo cliente')
    if (new Set(liqs.map(l => l.moneda)).size > 1) return toast.error('Las liquidaciones de una factura deben estar en la misma moneda')
    setFacturar(liqs)
  }
  const liqVisibles = liquidaciones.filter(l =>
    filtroLiq === 'por_facturar' ? l.por_facturar : filtroLiq === 'facturadas' ? l.facturada && l.estado === 'activa'
      : filtroLiq === 'anuladas' ? l.estado === 'anulada' : true)
  const porFacturar = liquidaciones.filter(l => l.por_facturar)

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
          {puedeEditar && <button className="btn-secondary" onClick={() => setImportar(true)}><Upload size={14} /> Importar liquidaciones</button>}
          {puedeEditar && <button className="btn-primary" onClick={() => setNuevo(true)}><Plus size={14} /> Nuevo despacho</button>}
        </div>
      </div>

      {pendientes && (pendientes.items.length > 0 || pendientes.liquidaciones_por_facturar > 0) && (
        <div className="card" style={{ padding: '12px 16px', marginBottom: 16, borderLeft: `4px solid ${cuadra ? '#3b82f6' : '#dc2626'}`, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          {pendientes.items.length > 0 && <div>
            <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Despachado por liquidar</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1d4ed8' }}>{kg(pendientes.kg)} · {rd(pendientes.costo)}</div>
          </div>}
          {pendientes.liquidaciones_por_facturar > 0 && <div>
            <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Liquidado por facturar</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#b45309' }}>{pendientes.liquidaciones_por_facturar} liquidación(es) · {rd(pendientes.costo_por_facturar)}</div>
          </div>}
          <div style={{ fontSize: 12, color: cuadra ? '#6b7280' : '#991b1b' }}>
            {pendientes.items.length > 0 && `${pendientes.items.length} despacho(s) esperando la liquidación del cliente. `}
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

      {tab === 'liquidaciones' && (<>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          <select className="select" style={{ width: 200 }} value={filtroLiq} onChange={e => setFiltroLiq(e.target.value)}>
            <option value="">Todas las liquidaciones</option>
            <option value="por_facturar">Por facturar ({porFacturar.length})</option>
            <option value="facturadas">Facturadas</option>
            <option value="anuladas">Anuladas</option>
          </select>
          {puedeEditar && porFacturar.length > 0 && (
            <button className="btn-primary" disabled={!sel.length} onClick={facturarSeleccion} title={sel.length ? '' : 'Marque las liquidaciones por facturar'}>
              <FileText size={14} /> Facturar seleccionadas{sel.length ? ` (${sel.length})` : ''}
            </button>
          )}
          {porFacturar.length > 0 && !sel.length && <span style={{ fontSize: 12, color: '#6b7280' }}>Marque las liquidaciones que van en la misma factura de la planta.</span>}
        </div>
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ background: '#f9fafb' }}>
              <th style={{ ...th, width: 28 }}></th>
              {['N°', 'Fecha', 'Cliente', 'Despacho', 'Campo'].map(h => <th key={h} style={th}>{h}</th>)}
              {['Despachado', 'Liquidado', 'Rechazo', 'Venta', 'Venta RD$', 'Costo', 'Margen'].map(h => <th key={h} style={{ ...th, textAlign: 'right' }}>{h}</th>)}
              <th style={th}>Factura</th><th style={th}></th>
            </tr></thead>
            <tbody>
              {!liqVisibles.length ? <tr><td colSpan={15} style={{ padding: 30, textAlign: 'center', color: '#9ca3af' }}>{liquidaciones.length ? 'Ninguna con este filtro.' : 'Sin liquidaciones. Se registran desde un despacho con "Liquidar" o con "Importar liquidaciones".'}</td></tr>
                : liqVisibles.map(l => (
                  <tr key={l.id} style={{ borderTop: '1px solid #f1f5f9', opacity: l.estado === 'anulada' ? 0.5 : 1, background: sel.includes(l.id) ? '#f0fdf4' : undefined }}>
                    <td style={{ ...td, width: 28 }}>
                      {puedeEditar && l.por_facturar && <input type="checkbox" checked={sel.includes(l.id)} onChange={e => setSel(e.target.checked ? [...sel, l.id] : sel.filter(x => x !== l.id))} />}
                    </td>
                    <td style={{ ...td, fontWeight: 700 }}>{l.numero}{l.referencia_cliente && <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 400 }}>Cliente: {l.referencia_cliente}</div>}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtDate(l.fecha)}</td>
                    <td style={td}>{l.cliente}</td>
                    <td style={{ ...td, color: '#6b7280' }}>{l.despacho}</td>
                    <td style={{ ...td, color: '#6b7280' }}>{l.campo_id || '—'}</td>
                    <td style={tdNum}>{kg(l.kg_despachados)}</td>
                    <td style={{ ...tdNum, fontWeight: 700 }}>{kg(l.kg_liquidados)}</td>
                    <td style={{ ...tdNum, color: l.kg_rechazo > 0 ? '#b45309' : '#9ca3af' }}>{kg(l.kg_rechazo)}{l.kg_merma > 0 && <div style={{ fontSize: 10 }}>merma {kg(l.kg_merma)}</div>}</td>
                    <td style={{ ...tdNum, fontWeight: 700 }}>{mon(l.subtotal, l.moneda)}{l.precio_promedio && <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 400 }}>{num(l.precio_promedio, 4)}/kg</div>}</td>
                    <td style={tdNum}>{l.facturada ? <>{rd(l.venta_dop)}{l.moneda === 'USD' && <div style={{ fontSize: 10, color: '#9ca3af' }}>a {l.tasa_cambio}</div>}</> : '—'}</td>
                    <td style={tdNum}>{rd(l.costo_total)}</td>
                    <td style={{ ...tdNum, fontWeight: 700, color: l.margen_dop >= 0 ? '#166534' : '#b91c1c' }}>{l.margen_dop !== null ? <>{rd(l.margen_dop)}{l.margen_pct !== null && <div style={{ fontSize: 10 }}>{l.margen_pct}%</div>}</> : '—'}</td>
                    <td style={{ ...td, fontSize: 12 }}>
                      {l.facturada ? <>{l.cxc}<div style={{ fontSize: 10, color: '#6b7280', fontFamily: 'monospace' }}>{l.ncf}</div></>
                        : l.por_facturar ? <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, color: '#92400e', background: '#fef3c7' }}>Por facturar</span> : '—'}
                    </td>
                    <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {puedeEditar && l.por_facturar && (
                        <button className="btn-secondary" style={{ padding: '4px 8px', color: '#dc2626' }} title="Anular liquidación" onClick={() => anularLiquidacion(l)}><Ban size={12} /></button>
                      )}
                      {puedeEditar && l.estado === 'activa' && l.facturada && l.cxc_estado === 'pendiente' && (
                        <button className="btn-secondary" style={{ padding: '4px 8px', color: '#dc2626' }} title="Anular factura (sus liquidaciones quedan por facturar)" onClick={() => anularFactura(l)}><Ban size={12} /></button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </>)}

      {tab === 'rentabilidad' && <Rentabilidad />}

      {nuevo && <NuevoDespacho onClose={() => setNuevo(false)} onDone={() => { setNuevo(false); cargar() }} />}
      {liquidar && <LiquidarDespacho despacho={liquidar} onClose={() => setLiquidar(null)} onDone={() => { setLiquidar(null); setTab('liquidaciones'); cargar() }} />}
      {facturar && <FacturarLiquidaciones liqs={facturar} onClose={() => setFacturar(null)} onDone={() => { setFacturar(null); cargar() }} />}
      {importar && <ImportarLiquidaciones onClose={() => setImportar(false)} onDone={() => { setImportar(false); setTab('liquidaciones'); cargar() }} />}
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
  const [form, setForm] = useState({ fecha: hoy(), ncf: '', referencia_cliente: '', moneda: 'USD', tasa_cambio: '', fecha_vencimiento: '', kg_rechazo: '', observaciones: '', facturar: true })
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
  const tasa = form.moneda === 'USD' ? (form.facturar ? Number(form.tasa_cambio) || 0 : 0) : 1
  const ventaDop = subtotal * tasa
  const excede = kgLiq + rech > despacho.kg_total * 1.02 + 0.005
  const sinPrecio = filas.filter(f => f.kg > 0 && f.precio === null)

  const set = (id: number, k: 'kg' | 'precio', v: string) => setLineas({ ...lineas, [id]: { kg: lineas[id]?.kg ?? '', precio: lineas[id]?.precio ?? '', [k]: v } })

  async function guardar(e: any) {
    e.preventDefault()
    if (!kgLiq) return toast.error('Indique los kg liquidados por calibre')
    if (excede) return toast.error('Lo liquidado más el rechazo supera lo despachado en más de 2%')
    if (sinPrecio.length) return toast.error(`Sin precio: ${sinPrecio.map(f => f.nombre).join(', ')}`)
    if (form.facturar && form.moneda === 'USD' && !(tasa > 1)) return toast.error('Indique la tasa de cambio')
    setSaving(true)
    try {
      const { data } = await api.post(`/ventas/despachos/${despacho.id}/liquidacion`, {
        fecha: form.fecha, moneda: form.moneda, facturar: form.facturar,
        ncf: form.facturar ? form.ncf.toUpperCase().replace(/[\s-]/g, '') : null,
        referencia_cliente: form.referencia_cliente || null, tasa_cambio: form.facturar && form.moneda === 'USD' ? tasa : null,
        fecha_vencimiento: form.facturar ? form.fecha_vencimiento || null : null, kg_rechazo: rech, observaciones: form.observaciones || null,
        lineas: filas.filter(f => f.kg > 0).map(f => ({ calibre_id: f.id, kg: f.kg, precio: f.precio })),
      })
      toast.success(form.facturar ? `Liquidación ${data.numero} y factura ${data.cxc} registradas — margen ${rd(data.margen_dop)}`
        : `Liquidación ${data.numero} registrada — queda por facturar`, { duration: 7000 })
      onDone()
    } catch (err) { toast.error(apiError(err, 'No se pudo registrar la liquidación'), { duration: 9000 }) }
    finally { setSaving(false) }
  }

  return (
    <Modal title={`Liquidar despacho ${despacho.numero}`} width={880}
      subtitle={`${despacho.cliente} · ${fmtDate(despacho.fecha)} · despachado ${kg(despacho.kg_total)} (${despacho.lineas.map((l: any) => `${l.calibre} ${num(l.kg, 0)}`).join(', ')}) · costo ${rd(despacho.costo_total)}`}
      onClose={onClose}>
      <form onSubmit={guardar}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginBottom: 12, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.facturar} onChange={e => setForm({ ...form, facturar: e.target.checked })} />
          <strong>Emitir la factura ahora</strong>
          <span style={{ fontSize: 11, color: '#6b7280' }}>{form.facturar ? 'Una factura solo para esta liquidación.' : 'Queda por facturar: luego se factura junto con otras recepciones en una sola factura.'}</span>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1fr 0.8fr 1fr', gap: 12, marginBottom: 14 }}>
          <div><label style={label}>Fecha *</label><input className="input" type="date" min={despacho.fecha} max={hoy()} value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} required /></div>
          {form.facturar
            ? <div><label style={label}>NCF de la factura *</label><input className="input" value={form.ncf} onChange={e => setForm({ ...form, ncf: e.target.value })} placeholder="E310000000001" style={{ fontFamily: 'monospace' }} required /></div>
            : <div />}
          <div><label style={label}>N° liquidación cliente</label><input className="input" value={form.referencia_cliente} onChange={e => setForm({ ...form, referencia_cliente: e.target.value })} /></div>
          <div><label style={label}>Moneda</label>
            <select className="select" value={form.moneda} onChange={e => setForm({ ...form, moneda: e.target.value })}>
              <option value="USD">US$</option><option value="DOP">RD$</option>
            </select></div>
          {form.moneda === 'USD' && form.facturar
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
          {form.facturar
            ? <div><label style={label}>Vencimiento</label><input className="input" type="date" value={form.fecha_vencimiento} onChange={e => setForm({ ...form, fecha_vencimiento: e.target.value })} title="Vacío: según la condición de pago del cliente" /></div>
            : <div />}
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
          <button type="submit" className="btn-primary" disabled={saving}><Scale size={14} /> {saving ? 'Registrando…' : form.facturar ? 'Registrar liquidación y factura' : 'Registrar liquidación'}</button>
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
        {t.kg_por_facturar > 0 && <span style={{ fontSize: 12, color: '#b45309' }}>{kg(t.kg_por_facturar)} liquidados aún sin facturar ({mon(t.venta_por_facturar, monedaVenta)}; no entran en venta en pesos ni margen)</span>}
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
            {['Cosechado', 'Despachado', 'Liquidado', 'Packout', 'Rechazo', 'Venta RD$', 'Retorno /kg', 'Costo producción', 'Costo /kg', 'Resultado'].map(h => <th key={h} style={{ ...th, textAlign: 'right' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {data.por_campo.map((f: any) => (
              <tr key={f.campo} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ ...td, fontWeight: 600 }}>{f.campo}</td>
                <td style={tdNum}>{kg(f.kg_cosechados)}</td>
                <td style={tdNum}>{kg(f.kg_despachados)}</td>
                <td style={{ ...tdNum, fontWeight: 700 }}>{kg(f.kg_liquidados)}</td>
                <td style={{ ...tdNum, fontWeight: 700 }} title="Parte de lo despachado (y ya liquidado) que la planta pagó">{f.packout_pct !== null ? `${f.packout_pct}%` : '—'}</td>
                <td style={{ ...tdNum, color: f.kg_rechazo > 0 ? '#b45309' : '#9ca3af' }}>{kg(f.kg_rechazo)}{f.pct_rechazo !== null && f.kg_rechazo > 0 && <span style={{ fontSize: 10 }}> ({f.pct_rechazo}%)</span>}</td>
                <td style={tdNum}>{rd(f.venta_dop)}</td>
                <td style={tdNum} title="Pesos recibidos por kg despachado">{f.retorno_kg !== null ? rd(f.retorno_kg) : '—'}</td>
                <td style={tdNum} title="Órdenes de trabajo del campo y servicios comprados para él en la temporada">{rd(f.costo_produccion)}</td>
                <td style={{ ...tdNum, color: '#6b7280' }}>{f.costo_kg !== null ? rd(f.costo_kg) : '—'}</td>
                <td style={{ ...tdNum, fontWeight: 700, color: f.resultado >= 0 ? '#166534' : '#b91c1c' }}>{rd(f.resultado)}</td>
              </tr>
            ))}
            {!data.por_campo.length && <tr><td colSpan={11} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Sin cosecha ni ventas en la temporada {temporada}</td></tr>}
            {data.por_campo.length > 1 && (
              <tr style={{ borderTop: '2px solid #e5e7eb', background: '#f9fafb', fontWeight: 700 }}>
                <td style={td}>Total</td>
                <td style={tdNum}>{kg(t.kg_cosechados)}</td><td style={tdNum}>{kg(t.kg_despachados)}</td>
                <td style={tdNum}>{kg(t.kg_liquidados)}</td>
                <td style={tdNum}>{t.packout_pct !== null ? `${t.packout_pct}%` : '—'}</td>
                <td style={tdNum}>{kg(t.kg_rechazo)}</td>
                <td style={tdNum}>{rd(t.venta_dop)}</td>
                <td style={tdNum}>{t.retorno_kg !== null ? rd(t.retorno_kg) : '—'}</td>
                <td style={tdNum}>{rd(t.costo_produccion)}</td>
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
            {['Kg liquidados', '% del total', 'Venta', 'Precio promedio /kg', 'Venta RD$'].map(h => <th key={h} style={{ ...th, textAlign: 'right' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {data.por_calibre.map((k: any) => (
              <tr key={k.calibre_id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ ...td, fontWeight: 600 }}>{k.calibre}</td>
                <td style={tdNum}>{kg(k.kg)}</td>
                <td style={{ ...tdNum, color: '#6b7280' }}>{k.pct !== null ? `${k.pct}%` : '—'}</td>
                <td style={tdNum}>{mon(k.venta, monedaVenta)}</td>
                <td style={{ ...tdNum, fontWeight: 700 }}>{k.precio_promedio !== null ? num(k.precio_promedio, 4) : '—'}</td>
                <td style={tdNum}>{rd(k.venta_dop)}</td>
              </tr>
            ))}
            {!data.por_calibre.length && <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Sin liquidaciones en la temporada</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Facturar varias liquidaciones en una sola factura ───────────────────────

function FacturarLiquidaciones({ liqs, onClose, onDone }: any) {
  const moneda = liqs[0].moneda
  const ultima = liqs.map((l: any) => l.fecha).sort().slice(-1)[0]
  const [form, setForm] = useState({ fecha: ultima, ncf: '', tasa_cambio: '', fecha_vencimiento: '' })
  const [saving, setSaving] = useState(false)
  const total = liqs.reduce((s: number, l: any) => s + l.subtotal, 0)
  const kgs = liqs.reduce((s: number, l: any) => s + l.kg_liquidados, 0)
  const costo = liqs.reduce((s: number, l: any) => s + l.costo_total, 0)
  const tasa = moneda === 'USD' ? Number(form.tasa_cambio) || 0 : 1

  async function guardar(e: any) {
    e.preventDefault()
    if (moneda === 'USD' && !(tasa > 1)) return toast.error('Indique la tasa de cambio')
    setSaving(true)
    try {
      const { data } = await api.post('/ventas/facturas', {
        liquidacion_ids: liqs.map((l: any) => l.id), ncf: form.ncf.toUpperCase().replace(/[\s-]/g, ''),
        fecha: form.fecha, tasa_cambio: moneda === 'USD' ? tasa : null, fecha_vencimiento: form.fecha_vencimiento || null,
      })
      toast.success(`Factura ${data.ncf} (${data.cxc}) emitida: ${mon(data.total, moneda)} — margen ${rd(data.margen_dop)}`, { duration: 7000 })
      onDone()
    } catch (err) { toast.error(apiError(err, 'No se pudo emitir la factura'), { duration: 9000 }) }
    finally { setSaving(false) }
  }

  return (
    <Modal title="Facturar liquidaciones" width={760} onClose={onClose}
      subtitle={`${liqs[0].cliente} · ${liqs.length} liquidación(es) en una sola factura`}>
      <form onSubmit={guardar}>
        <div style={{ overflowX: 'auto', marginBottom: 14 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ background: '#f9fafb' }}>
              {['Liquidación', 'Recepción', 'Campo', 'Fecha'].map(h => <th key={h} style={th}>{h}</th>)}
              <th style={{ ...th, textAlign: 'right' }}>Kg</th><th style={{ ...th, textAlign: 'right' }}>Importe</th>
            </tr></thead>
            <tbody>
              {liqs.map((l: any) => (
                <tr key={l.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ ...td, fontWeight: 700 }}>{l.numero}</td>
                  <td style={td}>{l.referencia_cliente || '—'}</td>
                  <td style={{ ...td, color: '#6b7280' }}>{l.campo_id || '—'}</td>
                  <td style={td}>{fmtDate(l.fecha)}</td>
                  <td style={tdNum}>{kg(l.kg_liquidados)}</td>
                  <td style={{ ...tdNum, fontWeight: 600 }}>{mon(l.subtotal, moneda)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid #e5e7eb', fontWeight: 800 }}>
                <td style={td} colSpan={4}>Total de la factura</td>
                <td style={tdNum}>{kg(kgs)}</td><td style={tdNum}>{mon(total, moneda)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
          <div><label style={label}>Fecha *</label><input className="input" type="date" min={ultima} max={hoy()} value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} required /></div>
          <div><label style={label}>NCF *</label><input className="input" value={form.ncf} onChange={e => setForm({ ...form, ncf: e.target.value })} placeholder="E310000000001" style={{ fontFamily: 'monospace' }} required /></div>
          {moneda === 'USD'
            ? <div><label style={label}>Tasa (RD$/US$) *</label><input className="input" type="number" min="1" step="0.0001" value={form.tasa_cambio} onChange={e => setForm({ ...form, tasa_cambio: e.target.value })} required /></div>
            : <div />}
          <div><label style={label}>Vencimiento</label><input className="input" type="date" value={form.fecha_vencimiento} onChange={e => setForm({ ...form, fecha_vencimiento: e.target.value })} title="Vacío: según la condición de pago del cliente" /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
          {[['En pesos', tasa > 0 ? rd(total * tasa) : '—'], ['Costo de los despachos', rd(costo)], ['Margen', tasa > 0 ? rd(total * tasa - costo) : '—']].map(([k, v]) => (
            <div key={k} style={{ background: '#f0fdf4', borderRadius: 8, padding: '8px 12px' }}>
              <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>{k}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#166534', fontVariantNumeric: 'tabular-nums' }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving}><FileText size={14} /> {saving ? 'Emitiendo…' : 'Emitir factura'}</button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Importar el reporte de liquidaciones de la planta ───────────────────────

// Columnas por su encabezado; sin encabezado se asume el orden del reporte de la planta.
const COLUMNAS: [string, RegExp][] = [
  ['fecha', /fecha/i], ['factura', /factura/i], ['referencia', /refer|recep/i], ['calibre', /calibre/i],
  ['campo', /campo|finca|lote/i], ['precio', /precio/i], ['kg', /volumen|kg|kilo|peso|cantidad/i], ['importe', /importe|monto|total/i],
]
const ORDEN_REPORTE: Record<string, number> = { fecha: 0, factura: 1, referencia: 2, calibre: 3, campo: 4, precio: 5, kg: 6, importe: 7 }

// "1,291.22", "1.291,22", " 13.50 " o "US$ 30.38" → número
function aNumero(txt: string): number {
  let t = (txt || '').replace(/[^\d.,-]/g, '')
  if (t.includes(',') && t.includes('.')) t = t.lastIndexOf(',') > t.lastIndexOf('.') ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '')
  else if (t.includes(',')) t = /^-?\d{1,3}(,\d{3})+$/.test(t) ? t.replace(/,/g, '') : t.replace(',', '.')
  return t === '' ? NaN : Number(t)
}

// dd/mm/aaaa (o aaaa-mm-dd) → aaaa-mm-dd
function aFecha(txt: string): string | null {
  const t = (txt || '').trim()
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/)
  if (!m) return null
  let d = Number(m[1]), mes = Number(m[2])
  if (mes > 12 && d <= 12) [d, mes] = [mes, d]
  if (mes < 1 || mes > 12 || d < 1 || d > 31) return null
  const anio = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
  return `${anio}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

const redondear = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100

function leerReporte(texto: string) {
  const filas: any[] = [], errores: string[] = [], avisos: string[] = []
  const lineas = texto.split(/\r?\n/).map(l => l.split('\t')).filter(c => c.some(x => x.trim()))
  if (!lineas.length) return { filas, errores, avisos }
  let idx = ORDEN_REPORTE
  if (!aFecha(lineas[0][0])) {
    const cab = lineas.shift()!
    const enc: Record<string, number> = {}
    COLUMNAS.forEach(([k, re]) => {
      const i = cab.findIndex((c, j) => re.test(c) && !Object.values(enc).includes(j))
      if (i >= 0) enc[k] = i
    })
    if (['fecha', 'factura', 'referencia', 'calibre', 'campo', 'precio', 'kg'].every(k => k in enc)) idx = enc
  }
  lineas.forEach((c, i) => {
    const n = i + 1
    const fecha = aFecha(c[idx.fecha])
    const f = {
      fecha, factura: (c[idx.factura] || '').trim(), referencia: (c[idx.referencia] || '').trim(),
      calibre: (c[idx.calibre] || '').replace(/\s+/g, ' ').trim(), campo: (c[idx.campo] || '').trim(),
      precio: aNumero(c[idx.precio]), kg: aNumero(c[idx.kg]),
    }
    if (!fecha) return errores.push(`Fila ${n}: la fecha "${c[idx.fecha] || ''}" no se reconoce (use dd/mm/aaaa)`)
    if (!f.factura || !f.referencia || !f.calibre || !f.campo) return errores.push(`Fila ${n}: falta factura, referencia, calibre o campo`)
    if (!(f.kg > 0) || !(f.precio >= 0)) return errores.push(`Fila ${n}: volumen o precio inválido`)
    if (idx.importe !== undefined && c[idx.importe] !== undefined) {
      const imp = aNumero(c[idx.importe])
      if (!Number.isNaN(imp) && Math.abs(imp - redondear(f.kg * f.precio)) > 0.011)
        avisos.push(`Fila ${n} (${f.referencia}, ${f.calibre}): el importe ${num(imp)} no es volumen × precio (${num(redondear(f.kg * f.precio))}); se usará volumen × precio`)
    }
    filas.push(f)
  })
  return { filas, errores, avisos }
}

const normal = (s: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()
const nombreCalibre = (t: string) => {
  const m = t.match(/calibre\s+(.+)$/i)
  return m ? `Cal ${m[1].trim()}` : /industria/i.test(t) ? 'Industria' : t.trim()
}

function ImportarLiquidaciones({ onClose, onDone }: any) {
  const { isAdmin } = useAuth()
  const [clientes, setClientes] = useState<any[]>([])
  const [campos, setCampos] = useState<any[]>([])
  const [calibres, setCalibres] = useState<any[]>([])
  const [form, setForm] = useState({ cliente_id: '', temporada: String(new Date().getFullYear()), registrar_cosecha: true, forzar_carencia: false, justificacion_carencia: '' })
  const [texto, setTexto] = useState('')
  const [mapCampos, setMapCampos] = useState<Record<string, string>>({})
  const [mapCalibres, setMapCalibres] = useState<Record<string, string>>({})
  const [facturas, setFacturas] = useState<Record<string, any>>({})
  const [revision, setRevision] = useState<any>(null)
  const [revisado, setRevisado] = useState('')
  const [errores, setErrores] = useState<string[]>([])
  const [trabajando, setTrabajando] = useState(false)

  useEffect(() => {
    Promise.all([api.get('/clientes'), api.get('/campos'), api.get('/ventas/calibres-stock'), api.get('/cosecha/temporadas')]).then(([c, ca, k, t]) => {
      if (t.data?.length) setForm(f => ({ ...f, temporada: t.data[0] }))
      setClientes((c.data || []).filter((x: any) => x.activo !== false))
      setCampos((ca.data || []).filter((x: any) => x.activo !== false))
      setCalibres(k.data || [])
    }).catch(err => toast.error(apiError(err, 'Error cargando datos')))
  }, [])

  const rep = useMemo(() => leerReporte(texto), [texto])
  const comerciales = calibres.filter(c => !c.es_granel)
  const granel = calibres.find(c => c.es_granel && c.producto_id)

  // Resumen por campo, calibre, factura y recepción
  const resumen = useMemo(() => {
    const porCampo: Record<string, number> = {}, porCalibre: Record<string, number> = {}
    const porFactura: Record<string, { kg: number; total: number; fecha: string; recepciones: Set<string> }> = {}
    const recepciones = new Set<string>()
    rep.filas.forEach(f => {
      porCampo[f.campo] = (porCampo[f.campo] || 0) + f.kg
      porCalibre[f.calibre] = (porCalibre[f.calibre] || 0) + f.kg
      if (!porFactura[f.factura]) porFactura[f.factura] = { kg: 0, total: 0, fecha: f.fecha, recepciones: new Set() }
      const x = porFactura[f.factura]
      x.kg += f.kg; x.total += redondear(f.kg * f.precio)
      if (f.fecha > x.fecha) x.fecha = f.fecha
      x.recepciones.add(`${f.referencia}|${f.campo}`); recepciones.add(`${f.referencia}|${f.campo}`)
    })
    return { porCampo, porCalibre, porFactura, recepciones: recepciones.size }
  }, [rep])

  // Sugerencias: el campo "5" del reporte con el campo C05 (o el que tenga ese número);
  // "Aguacate Hass Calibre 14" con el calibre "Cal 14".
  useEffect(() => {
    setMapCampos(prev => {
      const out: Record<string, string> = {}
      Object.keys(resumen.porCampo).forEach(txt => {
        if (prev[txt]) { out[txt] = prev[txt]; return }
        const t = txt.toLowerCase(), dig = t.replace(/\D/g, '').replace(/^0+/, '')
        const c = campos.find(c => c.id_campo.toLowerCase() === t)
          || (dig ? campos.find(c => c.id_campo.replace(/\D/g, '').replace(/^0+/, '') === dig) : null)
          || (dig ? campos.find(c => new RegExp(`(^|\\D)0*${dig}(\\D|$)`).test(c.nombre || '')) : null)
        out[txt] = c?.id_campo || ''
      })
      return out
    })
    setMapCalibres(prev => {
      const out: Record<string, string> = {}
      Object.keys(resumen.porCalibre).forEach(txt => {
        if (txt in prev) { out[txt] = prev[txt]; return }
        const c = comerciales.find(c => normal(c.nombre) === normal(txt) || normal(c.nombre) === normal(nombreCalibre(txt)))
        out[txt] = c ? String(c.id) : ''
      })
      return out
    })
    setFacturas(prev => {
      const out: Record<string, any> = {}
      Object.entries(resumen.porFactura).forEach(([k, v]) => { out[k] = prev[k] || { ncf: '', tasa_cambio: '', fecha: v.fecha, fecha_vencimiento: '' } })
      return out
    })
  }, [resumen, campos, calibres]) // eslint-disable-line react-hooks/exhaustive-deps

  const payload = {
    cliente_id: Number(form.cliente_id), moneda: 'USD', temporada: form.temporada || null,
    campos: Object.fromEntries(Object.keys(resumen.porCampo).map(k => [k, mapCampos[k] || ''])),
    calibres: Object.fromEntries(Object.keys(resumen.porCalibre).map(k => [k, mapCalibres[k] ? Number(mapCalibres[k]) : null])),
    facturas: Object.fromEntries(Object.keys(resumen.porFactura).map(k => {
      const f = facturas[k] || {}
      return [k, { ncf: (f.ncf || '').toUpperCase().replace(/[\s-]/g, ''), tasa_cambio: Number(f.tasa_cambio) || null, fecha: f.fecha || null, fecha_vencimiento: f.fecha_vencimiento || null }]
    })),
    registrar_cosecha: form.registrar_cosecha,
    forzar_carencia: form.forzar_carencia, justificacion_carencia: form.justificacion_carencia || null,
    filas: rep.filas,
  }
  const firma = JSON.stringify(payload)
  const listo = revision && revisado === firma

  async function enviar(prueba: boolean) {
    if (!form.cliente_id) return toast.error('Elija el cliente (la planta)')
    if (!rep.filas.length) return toast.error('Pegue el reporte de liquidaciones')
    if (rep.errores.length) return toast.error('Corrija las filas con error antes de continuar')
    if (!prueba && !confirm(`Se registrarán ${resumen.recepciones} recepciones y ${Object.keys(resumen.porFactura).length} factura(s). ¿Continuar?`)) return
    setTrabajando(true); setErrores([])
    try {
      const { data } = await api.post('/ventas/importar-liquidaciones', payload, { params: { dry_run: prueba } })
      if (prueba) { setRevision(data); setRevisado(firma) }
      else {
        toast.success(`Importadas ${data.liquidaciones} liquidaciones y ${data.facturas.length} factura(s): ${kg(data.kg)}, ${mon(data.total, data.moneda)}`, { duration: 8000 })
        onDone()
      }
    } catch (err: any) {
      const det = err?.response?.data?.detail
      setRevision(null)
      setErrores(typeof det === 'string' ? det.split('\n').filter(Boolean) : [apiError(err, 'No se pudo importar')])
    } finally { setTrabajando(false) }
  }

  const setFactura = (k: string, campo: string, v: string) => setFacturas({ ...facturas, [k]: { ...facturas[k], [campo]: v } })
  const totalKg = rep.filas.reduce((s, f) => s + f.kg, 0)
  const totalUsd = Object.values(resumen.porFactura).reduce((s, f) => s + f.total, 0)
  const sec: any = { fontSize: 13, fontWeight: 800, margin: '18px 0 8px', color: '#111827' }

  return (
    <Modal title="Importar liquidaciones de la planta" width={1040} onClose={onClose}
      subtitle="Pegue el reporte tal como viene de Excel. Por cada recepción y campo se registra la cosecha, el despacho y la liquidación; por cada número de factura, una factura.">
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: 12, alignItems: 'end' }}>
        <div><label style={label}>Cliente (planta) *</label>
          <select className="select" value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })}>
            <option value="">Elija…</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select></div>
        <div><label style={label}>Temporada</label><input className="input" value={form.temporada} onChange={e => setForm({ ...form, temporada: e.target.value })} /></div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, cursor: 'pointer', paddingBottom: 6 }}>
          <input type="checkbox" checked={form.registrar_cosecha} onChange={e => setForm({ ...form, registrar_cosecha: e.target.checked })} style={{ marginTop: 2 }} />
          <span><strong>Registrar también la cosecha</strong> a granel de cada recepción. Desmárquelo si esa fruta ya está cosechada en el sistema.</span>
        </label>
      </div>
      {!granel && calibres.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: '#991b1b', background: '#fef2f2', padding: '8px 12px', borderRadius: 8 }}>
          Falta el calibre a granel: en Cosecha → Calibres cree uno marcado "a granel" con el producto de inventario de la fruta de campo (con su costo y sus cuentas).
        </div>
      )}

      <div style={sec}>Reporte</div>
      <textarea className="input" value={texto} onChange={e => setTexto(e.target.value)} rows={6}
        placeholder={'Fecha\tNumero Factura\tReferencia Interna\tCalibres\tCampo\tPrecio\tVolumen\tImporte\n14/09/2026\t627\t342526\tAguacate Hass Calibre 14\t5\t2.25\t35.10\t78.98'}
        style={{ fontFamily: 'monospace', fontSize: 12, width: '100%', resize: 'vertical' }} />
      {rep.filas.length > 0 && (
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 12, color: '#374151', marginTop: 6 }}>
          <span><strong>{rep.filas.length}</strong> filas</span>
          <span><strong>{resumen.recepciones}</strong> recepciones por campo</span>
          <span><strong>{Object.keys(resumen.porFactura).length}</strong> facturas</span>
          <span><strong>{kg(totalKg)}</strong></span>
          <span><strong>{mon(totalUsd, 'USD')}</strong></span>
        </div>
      )}
      {[...rep.errores, ...rep.avisos].length > 0 && (
        <ul style={{ margin: '8px 0 0', padding: '8px 12px 8px 28px', fontSize: 12, borderRadius: 8, background: rep.errores.length ? '#fef2f2' : '#fffbeb', color: rep.errores.length ? '#991b1b' : '#92400e', maxHeight: 120, overflow: 'auto' }}>
          {[...rep.errores, ...rep.avisos].map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      )}

      {rep.filas.length > 0 && <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 18 }}>
          <div>
            <div style={sec}>Campos</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#f9fafb' }}><th style={th}>En el reporte</th><th style={{ ...th, textAlign: 'right' }}>Kg</th><th style={th}>Campo del sistema</th></tr></thead>
              <tbody>{Object.entries(resumen.porCampo).map(([txt, k]) => (
                <tr key={txt} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ ...td, fontWeight: 700 }}>{txt}</td>
                  <td style={tdNum}>{num(k)}</td>
                  <td style={td}><select className="select" value={mapCampos[txt] || ''} onChange={e => setMapCampos({ ...mapCampos, [txt]: e.target.value })} style={{ borderColor: mapCampos[txt] ? undefined : '#fca5a5' }}>
                    <option value="">Elija…</option>
                    {campos.map(c => <option key={c.id_campo} value={c.id_campo}>{c.id_campo} — {c.nombre}</option>)}
                  </select></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div>
            <div style={sec}>Calibres</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#f9fafb' }}><th style={th}>En el reporte</th><th style={{ ...th, textAlign: 'right' }}>Kg</th><th style={th}>Calibre del sistema</th></tr></thead>
              <tbody>{Object.entries(resumen.porCalibre).map(([txt, k]) => (
                <tr key={txt} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={td}>{txt}</td>
                  <td style={tdNum}>{num(k)}</td>
                  <td style={td}><select className="select" value={mapCalibres[txt] ?? ''} onChange={e => setMapCalibres({ ...mapCalibres, [txt]: e.target.value })}>
                    <option value="">Crear «{nombreCalibre(txt)}»</option>
                    {comerciales.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>

        <div style={sec}>Facturas</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ background: '#f9fafb' }}>
              <th style={th}>N°</th><th style={{ ...th, textAlign: 'right' }}>Recepciones</th><th style={{ ...th, textAlign: 'right' }}>Kg</th><th style={{ ...th, textAlign: 'right' }}>Total</th>
              <th style={th}>NCF *</th><th style={th}>Tasa RD$/US$ *</th><th style={th}>Fecha</th><th style={th}>Vencimiento</th>
            </tr></thead>
            <tbody>{Object.entries(resumen.porFactura).map(([k, v]) => (
              <tr key={k} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ ...td, fontWeight: 700 }}>{k}</td>
                <td style={tdNum}>{v.recepciones.size}</td>
                <td style={tdNum}>{num(v.kg)}</td>
                <td style={{ ...tdNum, fontWeight: 700 }}>{mon(v.total, 'USD')}</td>
                <td style={td}><input className="input" value={facturas[k]?.ncf || ''} onChange={e => setFactura(k, 'ncf', e.target.value)} placeholder="E310000000001" style={{ fontFamily: 'monospace', width: 150 }} /></td>
                <td style={td}><input className="input" type="number" min="1" step="0.0001" value={facturas[k]?.tasa_cambio || ''} onChange={e => setFactura(k, 'tasa_cambio', e.target.value)} style={{ width: 100 }} /></td>
                <td style={td}><input className="input" type="date" min={v.fecha} max={hoy()} value={facturas[k]?.fecha || ''} onChange={e => setFactura(k, 'fecha', e.target.value)} /></td>
                <td style={td}><input className="input" type="date" value={facturas[k]?.fecha_vencimiento || ''} onChange={e => setFactura(k, 'fecha_vencimiento', e.target.value)} title="Vacío: según la condición de pago del cliente" /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </>}

      {errores.length > 0 && (
        <div style={{ marginTop: 14, fontSize: 12, color: '#991b1b', background: '#fef2f2', padding: '10px 14px', borderRadius: 8 }}>
          <strong>{errores[0]}</strong>
          {errores.length > 1 && <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{errores.slice(1).map((x, i) => <li key={i}>{x}</li>)}</ul>}
        </div>
      )}
      {isAdmin && errores.some(x => /carencia/i.test(x)) && (
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 10, alignItems: 'center', fontSize: 12 }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={form.forzar_carencia} onChange={e => setForm({ ...form, forzar_carencia: e.target.checked })} /> Registrar pese a la carencia</label>
          <input className="input" placeholder="Justificación (mínimo 15 caracteres)" value={form.justificacion_carencia} onChange={e => setForm({ ...form, justificacion_carencia: e.target.value })} />
        </div>
      )}

      {revision && (
        <div style={{ marginTop: 14, fontSize: 12, background: listo ? '#f0fdf4' : '#f9fafb', border: `1px solid ${listo ? '#86efac' : '#e5e7eb'}`, padding: '10px 14px', borderRadius: 8 }}>
          <strong style={{ color: '#166534' }}>{listo ? 'Revisión correcta' : 'Cambió algo desde la revisión: vuelva a revisar'}</strong>
          {' — '}se registrarán {revision.cosechas > 0 && `${revision.cosechas} cosechas, `}{revision.despachos} despachos, {revision.liquidaciones} liquidaciones y {revision.facturas.length} factura(s)
          {revision.calibres_creados.length > 0 && <>; se crean los calibres {revision.calibres_creados.join(', ')}</>}.
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
            <thead><tr>{['Factura', 'NCF'].map(h => <th key={h} style={th}>{h}</th>)}{['Kg', 'Total', 'En pesos', 'Costo', 'Margen'].map(h => <th key={h} style={{ ...th, textAlign: 'right' }}>{h}</th>)}</tr></thead>
            <tbody>{revision.facturas.map((f: any) => (
              <tr key={f.factura} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ ...td, fontWeight: 700 }}>{f.factura}</td><td style={{ ...td, fontFamily: 'monospace' }}>{f.ncf}</td>
                <td style={tdNum}>{num(f.kg)}</td><td style={tdNum}>{mon(f.total, f.moneda)}</td><td style={tdNum}>{rd(f.total_dop)}</td>
                <td style={tdNum}>{rd(f.costo)}</td><td style={{ ...tdNum, fontWeight: 700, color: f.margen_dop >= 0 ? '#166534' : '#b91c1c' }}>{rd(f.margen_dop)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
        <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn-secondary" disabled={trabajando || !rep.filas.length} onClick={() => enviar(true)}><Search size={14} /> {trabajando && !listo ? 'Revisando…' : 'Revisar (sin guardar)'}</button>
        <button type="button" className="btn-primary" disabled={trabajando || !listo} onClick={() => enviar(false)} title={listo ? '' : 'Revise primero'}><Upload size={14} /> {trabajando && listo ? 'Importando…' : 'Importar'}</button>
      </div>
    </Modal>
  )
}
