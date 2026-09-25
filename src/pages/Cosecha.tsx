import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Sprout, Plus, X, ShieldAlert, Ban, Scale, Edit2, Trash2, Tags, History } from 'lucide-react'
import api, { apiError } from '../api'
import { useAuth } from '../contexts/AuthContext'

const fmtKg = (n: number) => `${Number(n || 0).toLocaleString('es-DO', { maximumFractionDigits: 2 })} kg`
const fmtDate = (d: string) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('es-DO') : '—')
const hoy = () => new Date().toISOString().slice(0, 10)
const label: any = { fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }

function Modal({ title, onClose, children, width = 640 }: any) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: width, width: '95%', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function Cosecha() {
  const { isAdmin, hasRole } = useAuth()
  const puedeAnular = isAdmin || hasRole('supervisor')
  const [tab, setTab] = useState<'registros' | 'resumen' | 'precios' | 'calibres'>('registros')
  const [calibres, setCalibres] = useState<any[]>([])
  const [campos, setCampos] = useState<any[]>([])
  const [temporadas, setTemporadas] = useState<string[]>([])
  const [registros, setRegistros] = useState<any[]>([])
  const [resumen, setResumen] = useState<any>(null)
  const [filtro, setFiltro] = useState({ temporada: String(new Date().getFullYear()), campo_id: '', fecha_desde: '', fecha_hasta: '' })
  const [modalNueva, setModalNueva] = useState(false)
  const [loading, setLoading] = useState(false)

  const loadBase = useCallback(async () => {
    const [c, cp, t] = await Promise.allSettled([
      api.get('/cosecha/calibres'), api.get('/campos'), api.get('/cosecha/temporadas'),
    ])
    if (c.status === 'fulfilled') setCalibres(c.value.data)
    if (cp.status === 'fulfilled') setCampos((cp.value.data || []).filter((x: any) => x.activo !== false))
    if (t.status === 'fulfilled') setTemporadas(t.value.data)
  }, [])

  const loadRegistros = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = {}
      Object.entries(filtro).forEach(([k, v]) => { if (v) params[k] = v })
      const { data } = await api.get('/cosecha', { params })
      setRegistros(data.items)
    } catch (err) { toast.error(apiError(err, 'Error cargando cosechas')) }
    finally { setLoading(false) }
  }, [filtro])

  const loadResumen = useCallback(async () => {
    try {
      const { data } = await api.get('/cosecha/resumen', { params: { temporada: filtro.temporada || undefined } })
      setResumen(data)
    } catch (err) { toast.error(apiError(err, 'Error cargando resumen')) }
  }, [filtro.temporada])

  useEffect(() => { loadBase() }, [loadBase])
  useEffect(() => { if (tab === 'registros') loadRegistros() }, [tab, loadRegistros])
  useEffect(() => { if (tab === 'resumen') loadResumen() }, [tab, loadResumen])

  const temporadasOpc = useMemo(() => {
    const s = new Set([String(new Date().getFullYear()), ...temporadas])
    return [...s].sort().reverse()
  }, [temporadas])

  async function anular(r: any) {
    const motivo = prompt(`Anular ${r.numero} (${fmtKg(r.total_kg)}). Motivo:`)
    if (!motivo) return
    try {
      await api.post(`/cosecha/${r.id}/anular`, null, { params: { motivo } })
      toast.success(`${r.numero} anulada — stock devuelto`)
      loadRegistros()
    } catch (err) { toast.error(apiError(err, 'No se pudo anular'), { duration: 8000 }) }
  }

  const tabBtn = (id: any, txt: string) => (
    <button key={id} onClick={() => setTab(id)} style={{
      padding: '8px 16px', fontSize: 13, fontWeight: tab === id ? 700 : 500, borderRadius: 8, cursor: 'pointer',
      color: tab === id ? '#166534' : '#6b7280', background: tab === id ? '#f0fdf4' : 'transparent',
      border: tab === id ? '1px solid #86efac' : '1px solid transparent',
    }}>{txt}</button>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}><Sprout size={22} color="#166534" /> Cosecha</h1>
          <p style={{ margin: '2px 0 0', color: '#6b7280', fontSize: 13 }}>Kg cosechados por campo y calibre — entran a inventario al registrarse</p>
        </div>
        <button className="btn-primary" onClick={() => setModalNueva(true)} disabled={!calibres.length}
          title={calibres.length ? '' : 'Configure primero los calibres'}>
          <Plus size={14} /> Registrar cosecha
        </button>
      </div>

      {!calibres.length && (
        <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#854d0e' }}>
          No hay calibres configurados. {isAdmin ? 'Créelos en la pestaña Calibres, cada uno vinculado al producto de inventario donde entra la fruta.' : 'Pida a un administrador que los configure.'}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {tabBtn('registros', 'Registros')}
        {tabBtn('resumen', 'Resumen por campo')}
        {tabBtn('precios', 'Libro de precios')}
        {isAdmin && tabBtn('calibres', 'Calibres')}
      </div>

      {(tab === 'registros' || tab === 'resumen') && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="select" style={{ width: 150 }} value={filtro.temporada} onChange={e => setFiltro({ ...filtro, temporada: e.target.value })}>
            <option value="">Todas las temporadas</option>
            {temporadasOpc.map(t => <option key={t} value={t}>Temporada {t}</option>)}
          </select>
          {tab === 'registros' && (
            <>
              <select className="select" style={{ width: 190 }} value={filtro.campo_id} onChange={e => setFiltro({ ...filtro, campo_id: e.target.value })}>
                <option value="">Todos los campos</option>
                {campos.map(c => <option key={c.id_campo} value={c.id_campo}>{c.id_campo} — {c.nombre}</option>)}
              </select>
              <input className="input" type="date" style={{ width: 150 }} value={filtro.fecha_desde} onChange={e => setFiltro({ ...filtro, fecha_desde: e.target.value })} title="Desde" />
              <input className="input" type="date" style={{ width: 150 }} value={filtro.fecha_hasta} onChange={e => setFiltro({ ...filtro, fecha_hasta: e.target.value })} title="Hasta" />
            </>
          )}
        </div>
      )}

      {tab === 'registros' && (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['N°', 'Fecha', 'Campo', 'Temp.', 'OT'].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, color: '#6b7280' }}>{h}</th>)}
                {calibres.map(c => <th key={c.id} style={{ textAlign: 'right', padding: '8px 10px', fontSize: 11, color: '#6b7280' }}>{c.nombre}</th>)}
                <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 11, color: '#6b7280' }}>Total</th>
                <th style={{ width: 70 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && !registros.length ? (
                <tr><td colSpan={7 + calibres.length} style={{ padding: 30, textAlign: 'center', color: '#9ca3af' }}>Cargando…</td></tr>
              ) : !registros.length ? (
                <tr><td colSpan={7 + calibres.length} style={{ padding: 30, textAlign: 'center', color: '#9ca3af' }}>Sin cosechas registradas con estos filtros</td></tr>
              ) : registros.map(r => {
                const porCal: any = Object.fromEntries(r.lineas.map((l: any) => [l.calibre_id, l.kg]))
                return (
                  <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '7px 10px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {r.numero}
                      {r.carencia_forzada && <span title={`Carencia forzada: ${r.justificacion_carencia}`}><ShieldAlert size={13} color="#dc2626" style={{ marginLeft: 4, verticalAlign: 'middle' }} /></span>}
                    </td>
                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>{fmtDate(r.fecha)}</td>
                    <td style={{ padding: '7px 10px' }}>{r.campo_id} <span style={{ color: '#9ca3af', fontSize: 11 }}>{r.campo_nombre}</span></td>
                    <td style={{ padding: '7px 10px' }}>{r.temporada}</td>
                    <td style={{ padding: '7px 10px', color: '#6b7280' }}>{r.ot_id ?? '—'}</td>
                    {calibres.map(c => <td key={c.id} style={{ padding: '7px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: porCal[c.id] ? '#111827' : '#d1d5db' }}>{porCal[c.id] ? Number(porCal[c.id]).toLocaleString('es-DO') : '—'}</td>)}
                    <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{fmtKg(r.total_kg)}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right' }}>
                      {puedeAnular && r.estado !== 'anulada' && (
                        <button className="btn-secondary" style={{ padding: '3px 8px', color: '#dc2626' }} title="Anular" onClick={() => anular(r)}><Ban size={12} /></button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'resumen' && <Resumen data={resumen} />}
      {tab === 'precios' && <LibroPrecios calibres={calibres} puedeEditar={puedeAnular} />}
      {tab === 'calibres' && isAdmin && <Calibres calibres={calibres} onChange={loadBase} />}

      {modalNueva && (
        <NuevaCosecha calibres={calibres} campos={campos} isAdmin={isAdmin}
          onClose={() => setModalNueva(false)}
          onDone={() => { setModalNueva(false); loadBase(); loadRegistros() }} />
      )}
    </div>
  )
}

function Resumen({ data }: any) {
  if (!data) return <p style={{ color: '#9ca3af' }}>Cargando…</p>
  if (!data.campos.length) return <div className="card" style={{ padding: 30, textAlign: 'center', color: '#9ca3af' }}>Sin cosechas en esta temporada</div>
  const areaTotal = data.campos.reduce((s: number, c: any) => s + (c.area_ha || 0), 0)
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
        {[
          { l: 'Total cosechado', v: fmtKg(data.total_kg) },
          { l: 'Campos con cosecha', v: data.campos.length },
          { l: 'Rendimiento promedio', v: areaTotal ? `${(data.total_kg / areaTotal).toLocaleString('es-DO', { maximumFractionDigits: 0 })} kg/ha` : '—' },
        ].map(k => (
          <div key={k.l} className="card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>{k.l}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#166534' }}>{k.v}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Campo', 'Variedad', 'Área'].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, color: '#6b7280' }}>{h}</th>)}
              {data.calibres.map((c: any) => <th key={c.id} style={{ textAlign: 'right', padding: '8px 10px', fontSize: 11, color: '#6b7280' }}>{c.nombre}</th>)}
              <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 11, color: '#6b7280' }}>Total</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 11, color: '#6b7280' }}>kg/ha</th>
            </tr>
          </thead>
          <tbody>
            {data.campos.map((c: any) => (
              <tr key={c.campo_id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: '7px 10px', fontWeight: 600 }}>{c.campo_id} <span style={{ color: '#9ca3af', fontSize: 11 }}>{c.campo_nombre}</span></td>
                <td style={{ padding: '7px 10px', color: '#6b7280' }}>{c.variedad || '—'}</td>
                <td style={{ padding: '7px 10px', color: '#6b7280' }}>{c.area_ha ? `${c.area_ha} ha` : '—'}</td>
                {data.calibres.map((cal: any) => {
                  const kg = c.kg_por_calibre[String(cal.id)] || 0
                  return <td key={cal.id} style={{ padding: '7px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: kg ? '#111827' : '#d1d5db' }}>{kg ? kg.toLocaleString('es-DO') : '—'}</td>
                })}
                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{c.total_kg.toLocaleString('es-DO')}</td>
                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: '#166534' }}>{c.kg_por_ha != null ? c.kg_por_ha.toLocaleString('es-DO', { maximumFractionDigits: 0 }) : '—'}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '2px solid #cbd5e1', background: '#f9fafb', fontWeight: 700 }}>
              <td colSpan={3} style={{ padding: '8px 10px' }}>Total · participación por calibre</td>
              {data.calibres.map((cal: any) => (
                <td key={cal.id} style={{ padding: '8px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {cal.kg.toLocaleString('es-DO')}<div style={{ fontSize: 10, color: '#6b7280', fontWeight: 500 }}>{cal.porcentaje}%</div>
                </td>
              ))}
              <td style={{ padding: '8px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{data.total_kg.toLocaleString('es-DO')}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  )
}

function NuevaCosecha({ calibres, campos, isAdmin, onClose, onDone }: any) {
  const [form, setForm] = useState({ fecha: hoy(), campo_id: '', temporada: String(new Date().getFullYear()), ot_id: '', observaciones: '' })
  const [kg, setKg] = useState<Record<number, string>>({})
  const [carencia, setCarencia] = useState<any>(null)
  const [forzar, setForzar] = useState(false)
  const [justificacion, setJustificacion] = useState('')
  const [ots, setOts] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setCarencia(null); setForzar(false)
    if (!form.campo_id || !form.fecha) return
    api.get('/cosecha/verificar-carencia', { params: { campo_id: form.campo_id, fecha: form.fecha } })
      .then(r => setCarencia(r.data)).catch(() => setCarencia(null))
  }, [form.campo_id, form.fecha])

  useEffect(() => {
    setOts([])
    if (!form.campo_id) return
    api.get('/ordenes', { params: { campo_id: form.campo_id } })
      .then(r => setOts((r.data || []).slice(0, 50))).catch(() => {})
  }, [form.campo_id])

  const total = Object.values(kg).reduce((s, v) => s + (Number(v) || 0), 0)
  const bloqueado = carencia && !carencia.permitido
  const puedeGuardar = form.campo_id && total > 0 && (!bloqueado || (forzar && justificacion.trim().length >= 15))

  async function guardar(e: any) {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await api.post('/cosecha', {
        fecha: form.fecha, campo_id: form.campo_id, temporada: form.temporada || null,
        ot_id: form.ot_id ? Number(form.ot_id) : null, observaciones: form.observaciones || null,
        lineas: calibres.filter((c: any) => Number(kg[c.id]) > 0).map((c: any) => ({ calibre_id: c.id, kg: Number(kg[c.id]) })),
        forzar_carencia: bloqueado ? forzar : false,
        justificacion_carencia: bloqueado ? justificacion : null,
      })
      toast.success(`Cosecha ${data.numero} registrada — ${fmtKg(data.total_kg)}`)
      onDone()
    } catch (err) { toast.error(apiError(err, 'No se pudo registrar'), { duration: 9000 }) }
    finally { setSaving(false) }
  }

  return (
    <Modal title="Registrar cosecha" onClose={onClose} width={620}>
      <form onSubmit={guardar}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div><label style={label}>Fecha *</label>
            <input className="input" type="date" value={form.fecha} max={hoy()} onChange={e => setForm({ ...form, fecha: e.target.value })} required /></div>
          <div><label style={label}>Campo *</label>
            <select className="select" value={form.campo_id} onChange={e => setForm({ ...form, campo_id: e.target.value, ot_id: '' })} required>
              <option value="">Seleccionar…</option>
              {campos.map((c: any) => <option key={c.id_campo} value={c.id_campo}>{c.id_campo} — {c.nombre}{c.variedad ? ` (${c.variedad})` : ''}</option>)}
            </select></div>
          <div><label style={label}>Temporada</label>
            <input className="input" value={form.temporada} onChange={e => setForm({ ...form, temporada: e.target.value })} /></div>
          <div><label style={label}>Orden de trabajo (opcional)</label>
            <select className="select" value={form.ot_id} onChange={e => setForm({ ...form, ot_id: e.target.value })} disabled={!form.campo_id}>
              <option value="">Sin OT</option>
              {ots.map((o: any) => <option key={o.ot_id} value={o.ot_id}>OT {o.ot_id}{o.fecha_ejecucion ? ` · ${String(o.fecha_ejecucion).slice(0, 10)}` : ''}{o.estado ? ` · ${o.estado}` : ''}</option>)}
            </select></div>
        </div>

        {bloqueado && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#991b1b' }}>
            <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}><ShieldAlert size={15} /> Período de carencia vigente — no se puede cosechar este campo en esta fecha</div>
            {carencia.aplicaciones.map((a: any) => (
              <div key={a.spray_code + a.cosecha_permitida_desde} style={{ fontSize: 12, marginBottom: 2 }}>
                {a.spray_code} · aplicada {fmtDate(a.fecha_aplicacion)}{a.productos ? ` · ${a.productos}` : ''} → cosecha permitida desde <strong>{fmtDate(a.cosecha_permitida_desde)}</strong> ({a.dias_restantes} día{a.dias_restantes === 1 ? '' : 's'})
              </div>
            ))}
            {isAdmin ? (
              <div style={{ marginTop: 8, borderTop: '1px solid #fca5a5', paddingTop: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                  <input type="checkbox" checked={forzar} onChange={e => setForzar(e.target.checked)} /> Forzar como administrador (queda registrado)
                </label>
                {forzar && <textarea className="input" rows={2} style={{ marginTop: 6, width: '100%' }} placeholder="Justificación (mínimo 15 caracteres): p. ej. la aplicación se registró en el campo equivocado"
                  value={justificacion} onChange={e => setJustificacion(e.target.value)} />}
              </div>
            ) : <div style={{ fontSize: 12, marginTop: 6 }}>Solo un administrador puede forzarla con justificación.</div>}
          </div>
        )}

        <label style={label}><Scale size={12} style={{ verticalAlign: 'middle' }} /> Kg por calibre *</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8, marginBottom: 8 }}>
          {calibres.map((c: any) => (
            <div key={c.id} style={{ background: '#f9fafb', borderRadius: 8, padding: '6px 8px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{c.nombre}{!c.producto_id && <span style={{ color: '#9ca3af', fontWeight: 400 }}> · no entra a inv.</span>}</div>
              <input className="input" type="number" min="0" step="0.01" placeholder="0" value={kg[c.id] || ''}
                onChange={e => setKg({ ...kg, [c.id]: e.target.value })} style={{ textAlign: 'right', marginTop: 3 }} />
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'right', fontSize: 15, fontWeight: 800, color: '#166534', marginBottom: 12 }}>Total: {fmtKg(total)}</div>

        <label style={label}>Observaciones</label>
        <input className="input" value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} style={{ marginBottom: 14 }} />

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={!puedeGuardar || saving} style={{ background: '#166534' }}>
            {saving ? 'Registrando…' : 'Registrar cosecha'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Calibres({ calibres, onChange }: any) {
  const [productos, setProductos] = useState<any[]>([])
  const [edit, setEdit] = useState<any>(null)

  useEffect(() => {
    api.get('/inventario/articulos').then(r => setProductos((r.data || []).filter((p: any) => p.es_inventariable))).catch(() => {})
  }, [])

  async function guardar(e: any) {
    e.preventDefault()
    const body = { nombre: edit.nombre, orden: Number(edit.orden) || 0, producto_id: edit.producto_id || null }
    try {
      if (edit.id) await api.put(`/cosecha/calibres/${edit.id}`, body)
      else await api.post('/cosecha/calibres', body)
      toast.success('Calibre guardado'); setEdit(null); onChange()
    } catch (err) { toast.error(apiError(err, 'No se pudo guardar')) }
  }

  async function borrar(c: any) {
    if (!confirm(`¿Eliminar el calibre ${c.nombre}?`)) return
    try {
      const { data } = await api.delete(`/cosecha/calibres/${c.id}`)
      toast.success(data.message || 'Calibre eliminado'); onChange()
    } catch (err) { toast.error(apiError(err, 'No se pudo eliminar')) }
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>Cada calibre apunta al producto de inventario donde entran sus kg, al costo unitario de ese producto. Un calibre sin producto (p. ej. rechazo) se registra pero no entra al stock.</p>
        <button className="btn-primary" onClick={() => setEdit({ nombre: '', orden: calibres.length + 1, producto_id: '' })}><Plus size={14} /> Calibre</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ background: '#f9fafb' }}>
          {['Orden', 'Calibre', 'Producto de inventario', 'Unidad', ''].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, color: '#6b7280' }}>{h}</th>)}
        </tr></thead>
        <tbody>
          {calibres.map((c: any) => (
            <tr key={c.id} style={{ borderTop: '1px solid #f1f5f9' }}>
              <td style={{ padding: '7px 10px', color: '#6b7280' }}>{c.orden}</td>
              <td style={{ padding: '7px 10px', fontWeight: 700 }}>{c.nombre}</td>
              <td style={{ padding: '7px 10px' }}>{c.producto_id ? `${c.producto_id} — ${c.producto_nombre}` : <span style={{ color: '#9ca3af' }}>No entra a inventario</span>}</td>
              <td style={{ padding: '7px 10px', color: c.producto_unidad && c.producto_unidad.toLowerCase() !== 'kg' ? '#b45309' : '#6b7280' }}>
                {c.producto_unidad || '—'}{c.producto_unidad && c.producto_unidad.toLowerCase() !== 'kg' ? ' ⚠ la cosecha se registra en kg' : ''}
              </td>
              <td style={{ padding: '7px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                <button className="btn-secondary" style={{ padding: '3px 8px', marginRight: 4 }} onClick={() => setEdit({ ...c, producto_id: c.producto_id || '' })}><Edit2 size={12} /></button>
                <button className="btn-secondary" style={{ padding: '3px 8px', color: '#dc2626' }} onClick={() => borrar(c)}><Trash2 size={12} /></button>
              </td>
            </tr>
          ))}
          {!calibres.length && <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Sin calibres. Cree el primero.</td></tr>}
        </tbody>
      </table>

      {edit && (
        <Modal title={edit.id ? `Editar ${edit.nombre}` : 'Nuevo calibre'} onClose={() => setEdit(null)} width={460}>
          <form onSubmit={guardar}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><label style={label}>Nombre *</label><input className="input" value={edit.nombre} onChange={e => setEdit({ ...edit, nombre: e.target.value })} placeholder="Cal 18" required /></div>
              <div><label style={label}>Orden</label><input className="input" type="number" value={edit.orden} onChange={e => setEdit({ ...edit, orden: e.target.value })} /></div>
            </div>
            <label style={label}>Producto de inventario</label>
            <select className="select" value={edit.producto_id} onChange={e => setEdit({ ...edit, producto_id: e.target.value })} style={{ marginBottom: 14 }}>
              <option value="">— No entra a inventario —</option>
              {productos.map((p: any) => <option key={p.id_prod} value={p.id_prod}>{p.id_prod} — {p.producto} ({p.unidad})</option>)}
            </select>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={() => setEdit(null)}>Cancelar</button>
              <button type="submit" className="btn-primary">Guardar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

const fmtPrecio = (n: number, moneda: string) =>
  `${moneda === 'USD' ? 'US$' : 'RD$'} ${Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`

const ESTADO_PRECIO: any = {
  vigente: { txt: 'Vigente', color: '#166534', bg: '#dcfce7' },
  futuro: { txt: 'Programado', color: '#1d4ed8', bg: '#dbeafe' },
  vencido: { txt: 'Histórico', color: '#6b7280', bg: '#f3f4f6' },
  anulado: { txt: 'Anulado', color: '#991b1b', bg: '#fee2e2' },
}

function LibroPrecios({ calibres, puedeEditar }: any) {
  const [fecha, setFecha] = useState(hoy())
  const [moneda, setMoneda] = useState('DOP')
  const [matriz, setMatriz] = useState<any>(null)
  const [clientes, setClientes] = useState<any[]>([])
  const [sel, setSel] = useState<any>(null)          // fila elegida para ver su historial
  const [historial, setHistorial] = useState<any[]>([])
  const [nueva, setNueva] = useState<any>(null)      // cliente_id preseleccionado ('' = base)
  const [editando, setEditando] = useState<any>(null)

  const loadMatriz = useCallback(async () => {
    try {
      const { data } = await api.get('/cosecha/precios/matriz', { params: { fecha, moneda } })
      setMatriz(data)
    } catch (err) { toast.error(apiError(err, 'Error cargando precios')) }
  }, [fecha, moneda])

  const loadHistorial = useCallback(async () => {
    if (!sel) return
    try {
      const params: any = { moneda }
      if (sel.cliente_id) params.cliente_id = sel.cliente_id
      else params.solo_base = true
      const { data } = await api.get('/cosecha/precios', { params })
      setHistorial(data)
    } catch (err) { toast.error(apiError(err, 'Error cargando historial')) }
  }, [sel, moneda])

  useEffect(() => { loadMatriz() }, [loadMatriz])
  useEffect(() => { loadHistorial() }, [loadHistorial])
  useEffect(() => { api.get('/clientes').then(r => setClientes(r.data || [])).catch(() => {}) }, [])

  const recargar = () => { loadMatriz(); loadHistorial() }

  async function anular(p: any) {
    if (!confirm(`¿Anular el precio de ${p.calibre} (${fmtPrecio(p.precio, p.moneda)}) vigente desde ${fmtDate(p.fecha_desde)}?`)) return
    try {
      const { data } = await api.delete(`/cosecha/precios/${p.id}`)
      toast.success(data.reabierto ? 'Precio anulado — el anterior vuelve a regir' : 'Precio anulado')
      recargar()
    } catch (err) { toast.error(apiError(err, 'No se pudo anular')) }
  }

  const cols = matriz?.calibres || []
  const th: any = { textAlign: 'left', padding: '8px 10px', fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div><label style={label}>Precios vigentes al</label>
          <input className="input" type="date" style={{ width: 160 }} value={fecha} onChange={e => setFecha(e.target.value || hoy())} /></div>
        <div><label style={label}>Moneda</label>
          <select className="select" style={{ width: 110 }} value={moneda} onChange={e => setMoneda(e.target.value)}>
            <option value="DOP">RD$ (DOP)</option><option value="USD">US$ (USD)</option>
          </select></div>
        <div style={{ flex: 1 }} />
        {puedeEditar && (
          <button className="btn-primary" disabled={!calibres.length} onClick={() => setNueva({ cliente_id: sel?.cliente_id ?? '' })}>
            <Tags size={14} /> Registrar lista de precios
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={th}>Cliente</th>
              {cols.map((c: any) => <th key={c.id} style={{ ...th, textAlign: 'right' }}>{c.nombre} <span style={{ fontWeight: 400 }}>/kg</span></th>)}
            </tr>
          </thead>
          <tbody>
            {!matriz ? (
              <tr><td colSpan={1 + cols.length} style={{ padding: 30, textAlign: 'center', color: '#9ca3af' }}>Cargando…</td></tr>
            ) : matriz.filas.map((f: any) => {
              const activa = sel && (sel.cliente_id ?? null) === (f.cliente_id ?? null)
              return (
                <tr key={f.cliente_id ?? 'base'} onClick={() => setSel(activa ? null : f)}
                  style={{ borderTop: '1px solid #f1f5f9', cursor: 'pointer', background: activa ? '#f0fdf4' : undefined }}>
                  <td style={{ padding: '8px 10px', fontWeight: 700, whiteSpace: 'nowrap', fontStyle: f.cliente_id ? 'normal' : 'italic' }}>
                    {f.cliente_nombre}
                  </td>
                  {cols.map((c: any) => {
                    const v = f.precios[String(c.id)]
                    if (!v) return <td key={c.id} style={{ padding: '8px 10px', textAlign: 'right', color: '#d1d5db' }}>—</td>
                    const esBase = f.cliente_id && v.origen === 'base'
                    return (
                      <td key={c.id} title={`${esBase ? 'Sin precio propio: aplica el precio base. ' : ''}Desde ${fmtDate(v.desde)}${v.hasta ? ` hasta ${fmtDate(v.hasta)}` : ''}`}
                        style={{ padding: '8px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: esBase ? '#9ca3af' : '#111827', fontWeight: esBase ? 400 : 600 }}>
                        {fmtPrecio(v.precio, moneda)}
                        {esBase && <span style={{ fontSize: 10, marginLeft: 4 }}>base</span>}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
            {matriz && matriz.filas.length === 1 && !Object.keys(matriz.filas[0].precios).length && (
              <tr><td colSpan={1 + cols.length} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>
                No hay precios en {moneda} a esta fecha. {puedeEditar ? 'Registre la lista que le dio su cliente.' : ''}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p style={{ margin: '-8px 0 16px', fontSize: 12, color: '#6b7280' }}>
        Un cliente sin precio propio para un calibre usa el precio base (en gris). Haga clic en una fila para ver su historial.
      </p>

      {sel && (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f1f5f9' }}>
            <History size={15} color="#6b7280" />
            <strong style={{ fontSize: 14 }}>Historial — {sel.cliente_nombre} ({moneda})</strong>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ background: '#f9fafb' }}>
              {['Calibre', 'Precio /kg', 'Desde', 'Hasta', 'Estado', 'Notas', ''].map(h => <th key={h} style={th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {historial.map(p => {
                const e = ESTADO_PRECIO[p.estado] || ESTADO_PRECIO.vigente
                return (
                  <tr key={p.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '7px 10px', fontWeight: 600 }}>{p.calibre}</td>
                    <td style={{ padding: '7px 10px', fontVariantNumeric: 'tabular-nums' }}>{fmtPrecio(p.precio, p.moneda)}</td>
                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>{fmtDate(p.fecha_desde)}</td>
                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap', color: p.fecha_hasta ? '#111827' : '#9ca3af' }}>{p.fecha_hasta ? fmtDate(p.fecha_hasta) : 'Abierto'}</td>
                    <td style={{ padding: '7px 10px' }}><span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, color: e.color, background: e.bg }}>{e.txt}</span></td>
                    <td style={{ padding: '7px 10px', color: '#6b7280', maxWidth: 260 }}>{p.notas || ''}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {puedeEditar && <>
                        <button className="btn-secondary" style={{ padding: '3px 8px', marginRight: 4 }} title="Editar" onClick={() => setEditando({ ...p, fecha_hasta: p.fecha_hasta || '', notas: p.notas || '' })}><Edit2 size={12} /></button>
                        <button className="btn-secondary" style={{ padding: '3px 8px', color: '#dc2626' }} title="Anular" onClick={() => anular(p)}><Ban size={12} /></button>
                      </>}
                    </td>
                  </tr>
                )
              })}
              {!historial.length && <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Sin precios propios en {moneda}.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {nueva && (
        <NuevaListaPrecios calibres={calibres} clientes={clientes} inicial={nueva} monedaInicial={moneda}
          onClose={() => setNueva(null)} onDone={() => { setNueva(null); recargar() }} />
      )}
      {editando && <EditarPrecio precio={editando} onClose={() => setEditando(null)} onDone={() => { setEditando(null); recargar() }} />}
    </div>
  )
}

function NuevaListaPrecios({ calibres, clientes, inicial, monedaInicial, onClose, onDone }: any) {
  const [form, setForm] = useState({ cliente_id: inicial.cliente_id ?? '', moneda: monedaInicial, fecha_desde: hoy(), fecha_hasta: '', notas: '' })
  const [precios, setPrecios] = useState<Record<string, string>>({})
  const [actuales, setActuales] = useState<Record<string, any>>({})
  const [guardando, setGuardando] = useState(false)

  // Precio que rige a la fecha para ese cliente, como referencia al lado de cada calibre.
  useEffect(() => {
    api.get('/cosecha/precios/matriz', { params: { fecha: form.fecha_desde || hoy(), moneda: form.moneda } }).then(({ data }) => {
      const base = data.filas.find((f: any) => !f.cliente_id)?.precios || {}
      const propia = form.cliente_id ? data.filas.find((f: any) => String(f.cliente_id) === String(form.cliente_id))?.precios : null
      setActuales(propia || base)
    }).catch(() => setActuales({}))
  }, [form.cliente_id, form.moneda, form.fecha_desde])

  const lineas = calibres.filter((c: any) => precios[c.id] !== undefined && precios[c.id] !== '')
    .map((c: any) => ({ calibre_id: c.id, precio: Number(precios[c.id]) }))

  async function guardar(e: any) {
    e.preventDefault()
    if (!lineas.length) return toast.error('Indique el precio de al menos un calibre')
    setGuardando(true)
    try {
      const { data } = await api.post('/cosecha/precios/lista', {
        cliente_id: form.cliente_id ? Number(form.cliente_id) : null, moneda: form.moneda,
        fecha_desde: form.fecha_desde, fecha_hasta: form.fecha_hasta || null, notas: form.notas || null, lineas,
      })
      toast.success(`Lista registrada: ${data.creados} calibres${data.cerrados ? ` — ${data.cerrados} precios anteriores cerrados` : ''}`)
      onDone()
    } catch (err) { toast.error(apiError(err, 'No se pudo registrar'), { duration: 8000 }) }
    finally { setGuardando(false) }
  }

  return (
    <Modal title="Registrar lista de precios" onClose={onClose} width={560}>
      <form onSubmit={guardar}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
          <div><label style={label}>Cliente</label>
            <select className="select" value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })}>
              <option value="">Precio base (todos los clientes)</option>
              {clientes.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select></div>
          <div><label style={label}>Moneda</label>
            <select className="select" value={form.moneda} onChange={e => setForm({ ...form, moneda: e.target.value })}>
              <option value="DOP">RD$ (DOP)</option><option value="USD">US$ (USD)</option>
            </select></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div><label style={label}>Vigente desde *</label>
            <input className="input" type="date" required value={form.fecha_desde} onChange={e => setForm({ ...form, fecha_desde: e.target.value })} /></div>
          <div><label style={label}>Hasta (opcional)</label>
            <input className="input" type="date" value={form.fecha_hasta} min={form.fecha_desde} onChange={e => setForm({ ...form, fecha_hasta: e.target.value })} /></div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 12 }}>
          <thead><tr style={{ background: '#f9fafb' }}>
            <th style={{ textAlign: 'left', padding: '7px 10px', fontSize: 11, color: '#6b7280' }}>Calibre</th>
            <th style={{ textAlign: 'right', padding: '7px 10px', fontSize: 11, color: '#6b7280' }}>Precio actual</th>
            <th style={{ textAlign: 'right', padding: '7px 10px', fontSize: 11, color: '#6b7280' }}>Nuevo precio /kg</th>
          </tr></thead>
          <tbody>
            {calibres.map((c: any) => {
              const a = actuales[String(c.id)]
              return (
                <tr key={c.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 600 }}>{c.nombre}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>
                    {a ? <>{fmtPrecio(a.precio, form.moneda)}{form.cliente_id && a.origen === 'base' && <span style={{ fontSize: 10, marginLeft: 4 }}>base</span>}</> : '—'}
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                    <input className="input" type="number" min="0" step="0.0001" style={{ width: 130, textAlign: 'right' }}
                      value={precios[c.id] ?? ''} placeholder="Sin cambio" onChange={e => setPrecios({ ...precios, [c.id]: e.target.value })} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: '#6b7280' }}>
          Deje en blanco los calibres cuyo precio no cambia. Si ya había un precio abierto, se cierra el día anterior a la nueva vigencia y queda en el historial.
        </p>

        <label style={label}>Notas</label>
        <input className="input" value={form.notas} maxLength={300} placeholder="Ej.: cotización por correo del 20/09, FOB finca" onChange={e => setForm({ ...form, notas: e.target.value })} style={{ marginBottom: 14 }} />

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={guardando || !lineas.length}>
            {guardando ? 'Guardando…' : `Registrar ${lineas.length || ''} precio${lineas.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function EditarPrecio({ precio, onClose, onDone }: any) {
  const [form, setForm] = useState({ precio: String(precio.precio), fecha_hasta: precio.fecha_hasta, notas: precio.notas })

  async function guardar(e: any) {
    e.preventDefault()
    try {
      await api.put(`/cosecha/precios/${precio.id}`, {
        precio: Number(form.precio), fecha_hasta: form.fecha_hasta || null, notas: form.notas || null,
      })
      toast.success('Precio actualizado'); onDone()
    } catch (err) { toast.error(apiError(err, 'No se pudo guardar'), { duration: 8000 }) }
  }

  return (
    <Modal title={`${precio.calibre} — ${precio.cliente_nombre}`} onClose={onClose} width={440}>
      <form onSubmit={guardar}>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: '#6b7280' }}>
          Vigente desde {fmtDate(precio.fecha_desde)}. Si el cliente cambió el precio, registre una lista nueva; edite aquí solo para corregir un error.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div><label style={label}>Precio /kg ({precio.moneda})</label>
            <input className="input" type="number" min="0" step="0.0001" required value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })} /></div>
          <div><label style={label}>Hasta</label>
            <input className="input" type="date" min={precio.fecha_desde} value={form.fecha_hasta} onChange={e => setForm({ ...form, fecha_hasta: e.target.value })} /></div>
        </div>
        <label style={label}>Notas</label>
        <input className="input" value={form.notas} maxLength={300} onChange={e => setForm({ ...form, notas: e.target.value })} style={{ marginBottom: 14 }} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary">Guardar</button>
        </div>
      </form>
    </Modal>
  )
}
