import { useEffect, useState, useCallback } from 'react'
import api from '../api'
import toast from 'react-hot-toast'
import {
  Bug, Shield, Search, Plus, Eye, RefreshCw, X, AlertTriangle, CheckCircle,
  Activity, Crosshair, SprayCan, BarChart2, Calendar, Thermometer, Droplets,
  Wind, ChevronRight, ClipboardList, Target, Beaker, Clock, Leaf
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-DO') : '—'
const fmtDT = d => d ? new Date(d).toLocaleString('es-DO', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'
const fmtN = (n, dec = 2) => n != null ? Number(n).toLocaleString('es-DO', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : '—'
const today = () => new Date().toISOString().slice(0, 10)

const VIGOR_COLORS = { excelente: '#16a34a', bueno: '#22c55e', regular: '#eab308', malo: '#f97316', critico: '#dc2626' }
const STATUS_COLORS = { borrador: { bg: '#fef9c3', color: '#854d0e' }, completado: { bg: '#dbeafe', color: '#1e40af' }, revisado: { bg: '#dcfce7', color: '#166534' } }
const SEVERITY_COLORS = { 0: '#16a34a', 1: '#eab308', 2: '#eab308', 3: '#f97316', 4: '#f97316', 5: '#dc2626' }
const TRAP_STATUS_COLORS = { activa: { bg: '#dcfce7', color: '#166534' }, mantenimiento: { bg: '#fef9c3', color: '#854d0e' }, retirada: { bg: '#fee2e2', color: '#991b1b' } }

const Badge = ({ text, bg, color }) => (
  <span style={{ background: bg, color, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>{text}</span>
)

const ThresholdBadge = ({ exceeded }) => exceeded
  ? <span style={{ color: '#dc2626', fontWeight: 700, fontSize: 12 }}>⚠️ Excedido</span>
  : <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 12 }}>✅ OK</span>

const SeverityDot = ({ level }) => {
  const c = SEVERITY_COLORS[level] || '#9ca3af'
  return <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: c, marginRight: 4 }} title={`Severidad ${level}`} />
}

// ─── Modal Base ───────────────────────────────────────────────────────────────
const Modal = ({ title, subtitle, onClose, children, width = 620 }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={e => e.target === e.currentTarget && onClose()}>
    <div style={{ background: '#fff', borderRadius: 12, maxWidth: width, width: '94%', maxHeight: '92vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', padding: 24 }}>
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

const Field = ({ label, children, full }) => (
  <div style={{ gridColumn: full ? '1/-1' : undefined }}>
    <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
    {children}
  </div>
)

const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }
const btnPrimary = { background: '#14532d', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }
const btnSecondary = { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function Sanidad() {
  const [tab, setTab] = useState('dashboard')
  const [loading, setLoading] = useState(false)
  const [campos, setCampos] = useState([])
  const [catalogo, setCatalogo] = useState([])

  // Dashboard
  const [dash, setDash] = useState(null)
  // Monitoreo
  const [visitas, setVisitas] = useState([])
  const [filtCampo, setFiltCampo] = useState('')
  const [filtStatus, setFiltStatus] = useState('')
  const [showNewVisit, setShowNewVisit] = useState(false)
  const [showVisitDetail, setShowVisitDetail] = useState(null)
  // Trampas
  const [trampas, setTrampas] = useState([])
  const [showNewTrap, setShowNewTrap] = useState(false)
  const [showTrapDetail, setShowTrapDetail] = useState(null)
  const [showNewReading, setShowNewReading] = useState(null)
  // Aplicaciones
  const [sprays, setSprays] = useState([])
  const [showNewSpray, setShowNewSpray] = useState(false)
  const [showSprayDetail, setShowSprayDetail] = useState(null)

  const loadBase = useCallback(async () => {
    try {
      const [c, cat] = await Promise.all([
        api.get('/campos').then(r => r.data),
        api.get('/sanidad/catalogo').then(r => r.data),
      ])
      setCampos(c)
      setCatalogo(cat)
    } catch { /* ignore */ }
  }, [])

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try { const r = await api.get('/sanidad/dashboard'); setDash(r.data) } catch { toast.error('Error cargando dashboard') }
    setLoading(false)
  }, [])

  const loadVisitas = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filtCampo) params.campo_id = filtCampo
      if (filtStatus) params.status = filtStatus
      const r = await api.get('/sanidad/monitoreo', { params })
      setVisitas(r.data)
    } catch { toast.error('Error cargando visitas') }
    setLoading(false)
  }, [filtCampo, filtStatus])

  const loadTrampas = useCallback(async () => {
    setLoading(true)
    try { const r = await api.get('/sanidad/trampas'); setTrampas(r.data) } catch { toast.error('Error cargando trampas') }
    setLoading(false)
  }, [])

  const loadSprays = useCallback(async () => {
    setLoading(true)
    try { const r = await api.get('/sanidad/spray-logs'); setSprays(r.data) } catch { toast.error('Error cargando aplicaciones') }
    setLoading(false)
  }, [])

  useEffect(() => { loadBase() }, [loadBase])
  useEffect(() => {
    if (tab === 'dashboard') loadDashboard()
    else if (tab === 'monitoreo') loadVisitas()
    else if (tab === 'trampas') loadTrampas()
    else if (tab === 'aplicaciones') loadSprays()
  }, [tab, loadDashboard, loadVisitas, loadTrampas, loadSprays])

  const TABS = [
    { key: 'dashboard', label: 'Dashboard', icon: BarChart2 },
    { key: 'monitoreo', label: 'Monitoreo', icon: Search },
    { key: 'trampas', label: 'Trampas', icon: Target },
    { key: 'aplicaciones', label: 'Aplicaciones', icon: SprayCan },
  ]

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1F3A5F' }}>🛡️ Sanidad Vegetal — MIP</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>Monitoreo integrado de plagas y enfermedades</p>
        </div>
        <button onClick={() => { if (tab === 'dashboard') loadDashboard(); else if (tab === 'monitoreo') loadVisitas(); else if (tab === 'trampas') loadTrampas(); else loadSprays() }} style={btnSecondary}>
          <RefreshCw size={14} style={{ marginRight: 6 }} />Actualizar
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid #e5e7eb', paddingBottom: 0 }}>
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', border: 'none', borderBottom: active ? '3px solid #14532d' : '3px solid transparent',
              background: active ? '#f0fdf4' : 'transparent', color: active ? '#14532d' : '#6b7280', fontWeight: active ? 700 : 500, fontSize: 13, cursor: 'pointer', borderRadius: '8px 8px 0 0', transition: 'all 0.2s'
            }}>
              <Icon size={15} />{t.label}
            </button>
          )
        })}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Cargando...</div>}

      {/* ═══ DASHBOARD ═══ */}
      {tab === 'dashboard' && dash && !loading && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Visitas este mes', value: dash.visits_month, icon: ClipboardList, color: '#1e40af', bg: '#dbeafe' },
              { label: 'Alertas umbral', value: dash.alerts_count, icon: AlertTriangle, color: '#dc2626', bg: '#fee2e2' },
              { label: 'Trampas activas', value: dash.active_traps, icon: Target, color: '#7c3aed', bg: '#ede9fe' },
              { label: 'Aplicaciones mes', value: dash.sprays_month, icon: SprayCan, color: '#0891b2', bg: '#cffafe' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="card" style={{ borderLeft: `4px solid ${color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ background: bg, borderRadius: 8, padding: 8, display: 'flex' }}><Icon size={16} color={color} /></div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>{label}</div>
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Pest detection chart */}
            <div className="card">
              <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>Detecciones por Plaga/Enfermedad</h3>
              {dash.pest_stats.length === 0 ? <p style={{ color: '#9ca3af', fontSize: 13 }}>Sin datos de detecciones</p> : (
                dash.pest_stats.map(p => {
                  const maxDet = Math.max(...dash.pest_stats.map(x => x.detections), 1)
                  const pct = (p.detections / maxDet) * 100
                  return (
                    <div key={p.code} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{p.name} <span style={{ color: '#9ca3af', fontSize: 10 }}>({p.code})</span></span>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{p.detections} <span style={{ color: '#dc2626', fontSize: 10 }}>{p.alerts > 0 ? `(${p.alerts} ⚠)` : ''}</span></span>
                      </div>
                      <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: p.alerts > 0 ? '#f97316' : '#14532d', borderRadius: 4, transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Recent alerts */}
            <div className="card" style={{ maxHeight: 400, overflow: 'auto' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#dc2626' }}>⚠ Alertas Recientes</h3>
              {dash.recent_alerts.length === 0 ? <p style={{ color: '#9ca3af', fontSize: 13 }}>Sin alertas</p> : (
                dash.recent_alerts.map((a, i) => (
                  <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: 13, color: '#dc2626' }}>{a.pest_name}</span>
                        <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 6 }}>{a.pest_code}</span>
                      </div>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>{fmtDate(a.visit_date)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      {a.campo} — {fmtN(a.average_per_unit)} {a.threshold_unit || ''} (umbral: {fmtN(a.threshold)})
                    </div>
                    <div style={{ fontSize: 11, marginTop: 2 }}>
                      <SeverityDot level={a.severity} /> Acción: <strong>{a.recommended_action}</strong>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* ═══ MONITOREO ═══ */}
      {tab === 'monitoreo' && !loading && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={filtCampo} onChange={e => setFiltCampo(e.target.value)} style={{ ...inputStyle, width: 200 }}>
              <option value="">Todos los campos</option>
              {campos.map(c => <option key={c.id_campo} value={c.id_campo}>{c.id_campo} — {c.nombre}</option>)}
            </select>
            <select value={filtStatus} onChange={e => setFiltStatus(e.target.value)} style={{ ...inputStyle, width: 160 }}>
              <option value="">Todos los estados</option>
              <option value="borrador">Borrador</option>
              <option value="completado">Completado</option>
              <option value="revisado">Revisado</option>
            </select>
            <button onClick={loadVisitas} style={btnSecondary}><Search size={14} /></button>
            <div style={{ flex: 1 }} />
            <button onClick={() => setShowNewVisit(true)} style={btnPrimary}><Plus size={14} style={{ marginRight: 6 }} />Nueva Visita</button>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th>Código</th><th>Fecha</th><th>Campo</th><th>Monitor</th><th>Vigor</th><th>Observaciones</th><th>Alertas</th><th>Estado</th><th></th>
                </tr>
              </thead>
              <tbody>
                {visitas.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Sin visitas registradas</td></tr>
                ) : visitas.map(v => {
                  const sc = STATUS_COLORS[v.status] || { bg: '#f3f4f6', color: '#374151' }
                  return (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 700, fontSize: 12 }}>{v.visit_code}</td>
                      <td>{fmtDate(v.visit_date)}</td>
                      <td>{v.campo_nombre}</td>
                      <td>{v.scout_nombre}</td>
                      <td><span style={{ color: VIGOR_COLORS[v.general_vigor] || '#6b7280', fontWeight: 600, fontSize: 12, textTransform: 'capitalize' }}>{v.general_vigor || '—'}</span></td>
                      <td style={{ textAlign: 'center' }}>{v.obs_count}</td>
                      <td style={{ textAlign: 'center' }}>{v.alerts > 0 ? <span style={{ color: '#dc2626', fontWeight: 700 }}>⚠ {v.alerts}</span> : <span style={{ color: '#16a34a' }}>0</span>}</td>
                      <td><Badge text={v.status} bg={sc.bg} color={sc.color} /></td>
                      <td><button onClick={() => setShowVisitDetail(v.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Eye size={16} /></button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ═══ TRAMPAS ═══ */}
      {tab === 'trampas' && !loading && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button onClick={() => setShowNewTrap(true)} style={btnPrimary}><Plus size={14} style={{ marginRight: 6 }} />Nueva Trampa</button>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th>Código</th><th>Tipo</th><th>Campo</th><th>Plaga Objetivo</th><th>Estado</th><th>Última Lectura</th><th>FTD</th><th>Umbral</th><th></th>
                </tr>
              </thead>
              <tbody>
                {trampas.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Sin trampas registradas</td></tr>
                ) : trampas.map(t => {
                  const ts = TRAP_STATUS_COLORS[t.status] || { bg: '#f3f4f6', color: '#374151' }
                  return (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 700, fontSize: 12 }}>{t.trap_code}</td>
                      <td style={{ textTransform: 'capitalize', fontSize: 12 }}>{(t.trap_type || '').replace(/_/g, ' ')}</td>
                      <td>{t.campo_nombre}</td>
                      <td>{t.target_pest_name}</td>
                      <td><Badge text={t.status} bg={ts.bg} color={ts.color} /></td>
                      <td>{fmtDate(t.last_reading_date)}</td>
                      <td style={{ fontWeight: 700 }}>{t.last_ftd != null ? fmtN(t.last_ftd) : '—'}</td>
                      <td>{t.last_threshold_exceeded != null ? <ThresholdBadge exceeded={t.last_threshold_exceeded} /> : '—'}</td>
                      <td style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => setShowTrapDetail(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Eye size={16} /></button>
                        <button onClick={() => setShowNewReading(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#14532d' }} title="Nueva lectura"><Plus size={16} /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ═══ APLICACIONES ═══ */}
      {tab === 'aplicaciones' && !loading && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button onClick={() => setShowNewSpray(true)} style={btnPrimary}><Plus size={14} style={{ marginRight: 6 }} />Nuevo Registro</button>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th>Código</th><th>Fecha</th><th>Campo</th><th>Método</th><th>Plagas Objetivo</th><th>REI Expira</th><th>Cosecha Temprana</th><th>Aplicador</th><th></th>
                </tr>
              </thead>
              <tbody>
                {sprays.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Sin aplicaciones registradas</td></tr>
                ) : sprays.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 700, fontSize: 12 }}>{s.spray_code}</td>
                    <td>{fmtDate(s.application_date)}</td>
                    <td>{s.campo_nombre}</td>
                    <td style={{ textTransform: 'capitalize', fontSize: 12 }}>{s.method || '—'}</td>
                    <td style={{ fontSize: 12 }}>{s.target_pests || '—'}</td>
                    <td>
                      {s.rei_expiry ? (
                        <span style={{ color: new Date(s.rei_expiry) > new Date() ? '#dc2626' : '#16a34a', fontWeight: 600, fontSize: 12 }}>
                          {fmtDT(s.rei_expiry)} {new Date(s.rei_expiry) > new Date() ? '🔴' : '🟢'}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ fontSize: 12, fontWeight: 600 }}>{fmtDate(s.earliest_harvest)}</td>
                    <td>{s.applicator_name}</td>
                    <td><button onClick={() => setShowSprayDetail(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Eye size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ═══ MODALS ═══ */}
      {showNewVisit && <ModalNewVisit campos={campos} catalogo={catalogo} onClose={() => setShowNewVisit(false)} onDone={() => { setShowNewVisit(false); loadVisitas() }} />}
      {showVisitDetail && <ModalVisitDetail visitId={showVisitDetail} onClose={() => setShowVisitDetail(null)} />}
      {showNewTrap && <ModalNewTrap campos={campos} catalogo={catalogo} onClose={() => setShowNewTrap(false)} onDone={() => { setShowNewTrap(false); loadTrampas() }} />}
      {showTrapDetail && <ModalTrapDetail trap={showTrapDetail} onClose={() => setShowTrapDetail(null)} />}
      {showNewReading && <ModalNewReading trap={showNewReading} onClose={() => setShowNewReading(null)} onDone={() => { setShowNewReading(null); loadTrampas() }} />}
      {showNewSpray && <ModalNewSpray campos={campos} catalogo={catalogo} onClose={() => setShowNewSpray(false)} onDone={() => { setShowNewSpray(false); loadSprays() }} />}
      {showSprayDetail && <ModalSprayDetail logId={showSprayDetail} onClose={() => setShowSprayDetail(null)} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Modal: New Scouting Visit
// ═══════════════════════════════════════════════════════════════════════════════
function ModalNewVisit({ campos, catalogo, onClose, onDone }) {
  const [form, setForm] = useState({ campo_id: '', visit_date: today(), phenological_stage: '', general_vigor: 'bueno', trees_sampled: '', leaves_sampled: '', fruits_sampled: '', temperature_c: '', humidity_pct: '', wind_speed_kmh: '', recent_rain_mm: '', observations: '' })
  const [observations, setObservations] = useState([])
  const [saving, setSaving] = useState(false)

  const addObs = () => setObservations([...observations, { pest_id: '', total_count: '', sample_units: '', severity_scale: 0, affected_area_pct: '', affected_trees_pct: '', plant_part: 'hojas', canopy_position: 'medio', recommended_action: 'ninguna', notes: '' }])
  const updateObs = (i, field, val) => { const copy = [...observations]; copy[i] = { ...copy[i], [field]: val }; setObservations(copy) }
  const removeObs = (i) => setObservations(observations.filter((_, idx) => idx !== i))

  async function submit() {
    if (!form.campo_id) return toast.error('Seleccione un campo')
    setSaving(true)
    try {
      const pest_observations = observations.filter(o => o.pest_id).map(o => ({
        pest_id: Number(o.pest_id),
        total_count: o.total_count ? Number(o.total_count) : null,
        sample_units: o.sample_units ? Number(o.sample_units) : null,
        severity_scale: Number(o.severity_scale || 0),
        affected_area_pct: o.affected_area_pct ? Number(o.affected_area_pct) : null,
        affected_trees_pct: o.affected_trees_pct ? Number(o.affected_trees_pct) : null,
        plant_part: o.plant_part,
        canopy_position: o.canopy_position,
        recommended_action: o.recommended_action,
        notes: o.notes || null,
      }))
      await api.post('/sanidad/monitoreo', {
        ...form,
        trees_sampled: form.trees_sampled ? Number(form.trees_sampled) : null,
        leaves_sampled: form.leaves_sampled ? Number(form.leaves_sampled) : null,
        fruits_sampled: form.fruits_sampled ? Number(form.fruits_sampled) : null,
        temperature_c: form.temperature_c ? Number(form.temperature_c) : null,
        humidity_pct: form.humidity_pct ? Number(form.humidity_pct) : null,
        wind_speed_kmh: form.wind_speed_kmh ? Number(form.wind_speed_kmh) : null,
        recent_rain_mm: form.recent_rain_mm ? Number(form.recent_rain_mm) : null,
        pest_observations,
      })
      toast.success('Visita de monitoreo creada')
      onDone()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error creando visita') }
    setSaving(false)
  }

  return (
    <Modal title="Nueva Visita de Monitoreo" subtitle="Registro de inspección fitosanitaria" onClose={onClose} width={780}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
        <Field label="Campo *">
          <select value={form.campo_id} onChange={e => setForm({ ...form, campo_id: e.target.value })} style={inputStyle}>
            <option value="">Seleccionar...</option>
            {campos.map(c => <option key={c.id_campo} value={c.id_campo}>{c.id_campo} — {c.nombre}</option>)}
          </select>
        </Field>
        <Field label="Fecha">
          <input type="date" value={form.visit_date} onChange={e => setForm({ ...form, visit_date: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Etapa fenológica">
          <select value={form.phenological_stage} onChange={e => setForm({ ...form, phenological_stage: e.target.value })} style={inputStyle}>
            <option value="">—</option>
            {['floracion', 'cuaje', 'llenado', 'cosecha', 'reposo'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Vigor general">
          <select value={form.general_vigor} onChange={e => setForm({ ...form, general_vigor: e.target.value })} style={inputStyle}>
            {['excelente', 'bueno', 'regular', 'malo', 'critico'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </Field>
        <Field label="Árboles muestreados">
          <input type="number" value={form.trees_sampled} onChange={e => setForm({ ...form, trees_sampled: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Hojas muestreadas">
          <input type="number" value={form.leaves_sampled} onChange={e => setForm({ ...form, leaves_sampled: e.target.value })} style={inputStyle} />
        </Field>
      </div>

      {/* Weather */}
      <div style={{ background: '#f0f9ff', borderRadius: 8, padding: 14, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', marginBottom: 10 }}>🌤️ Condiciones climáticas</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <Field label="Temp °C"><input type="number" step="0.1" value={form.temperature_c} onChange={e => setForm({ ...form, temperature_c: e.target.value })} style={inputStyle} /></Field>
          <Field label="Humedad %"><input type="number" step="0.1" value={form.humidity_pct} onChange={e => setForm({ ...form, humidity_pct: e.target.value })} style={inputStyle} /></Field>
          <Field label="Viento km/h"><input type="number" step="0.1" value={form.wind_speed_kmh} onChange={e => setForm({ ...form, wind_speed_kmh: e.target.value })} style={inputStyle} /></Field>
          <Field label="Lluvia reciente mm"><input type="number" step="0.1" value={form.recent_rain_mm} onChange={e => setForm({ ...form, recent_rain_mm: e.target.value })} style={inputStyle} /></Field>
        </div>
      </div>

      {/* Pest observations */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>🐛 Observaciones de Plagas/Enfermedades</span>
          <button onClick={addObs} style={btnSecondary}><Plus size={14} style={{ marginRight: 4 }} />Agregar</button>
        </div>
        {observations.map((obs, i) => (
          <div key={i} style={{ background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Observación #{i + 1}</span>
              <button onClick={() => removeObs(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 12 }}>✕ Quitar</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <Field label="Plaga/Enfermedad *">
                <select value={obs.pest_id} onChange={e => updateObs(i, 'pest_id', e.target.value)} style={inputStyle}>
                  <option value="">Seleccionar...</option>
                  {catalogo.map(p => <option key={p.id} value={p.id}>{p.code} — {p.common_name}</option>)}
                </select>
              </Field>
              <Field label="Conteo total"><input type="number" value={obs.total_count} onChange={e => updateObs(i, 'total_count', e.target.value)} style={inputStyle} /></Field>
              <Field label="Unidades muestra"><input type="number" value={obs.sample_units} onChange={e => updateObs(i, 'sample_units', e.target.value)} style={inputStyle} /></Field>
              <Field label="Severidad (0-5)">
                <select value={obs.severity_scale} onChange={e => updateObs(i, 'severity_scale', e.target.value)} style={inputStyle}>
                  {[0,1,2,3,4,5].map(s => <option key={s} value={s}>{s} — {['Sin daño','Muy leve','Leve','Moderado','Severo','Crítico'][s]}</option>)}
                </select>
              </Field>
              <Field label="% Área afectada"><input type="number" step="0.1" value={obs.affected_area_pct} onChange={e => updateObs(i, 'affected_area_pct', e.target.value)} style={inputStyle} /></Field>
              <Field label="% Árboles afectados"><input type="number" step="0.1" value={obs.affected_trees_pct} onChange={e => updateObs(i, 'affected_trees_pct', e.target.value)} style={inputStyle} /></Field>
              <Field label="Parte planta">
                <select value={obs.plant_part} onChange={e => updateObs(i, 'plant_part', e.target.value)} style={inputStyle}>
                  {['hojas','fruto','raiz','tronco','flores'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Posición copa">
                <select value={obs.canopy_position} onChange={e => updateObs(i, 'canopy_position', e.target.value)} style={inputStyle}>
                  {['superior','medio','inferior'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Acción recomendada">
                <select value={obs.recommended_action} onChange={e => updateObs(i, 'recommended_action', e.target.value)} style={inputStyle}>
                  {['ninguna','monitorear','cultural','biologico','quimico'].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Notas" full><input value={obs.notes} onChange={e => updateObs(i, 'notes', e.target.value)} style={{ ...inputStyle, marginTop: 8 }} /></Field>
          </div>
        ))}
      </div>

      <Field label="Observaciones generales" full>
        <textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
      </Field>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
        <button onClick={onClose} style={btnSecondary}>Cancelar</button>
        <button onClick={submit} disabled={saving} style={btnPrimary}>{saving ? 'Guardando...' : 'Crear Visita'}</button>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Modal: Visit Detail
// ═══════════════════════════════════════════════════════════════════════════════
function ModalVisitDetail({ visitId, onClose }) {
  const [data, setData] = useState(null)
  useEffect(() => {
    api.get(`/sanidad/monitoreo/${visitId}`).then(r => setData(r.data)).catch(() => toast.error('Error cargando detalle'))
  }, [visitId])

  if (!data) return <Modal title="Cargando..." onClose={onClose}><div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando detalle...</div></Modal>

  const sc = STATUS_COLORS[data.status] || { bg: '#f3f4f6', color: '#374151' }
  return (
    <Modal title={`Visita ${data.visit_code}`} subtitle={`${data.campo_nombre} — ${fmtDate(data.visit_date)}`} onClose={onClose} width={800}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <div><span style={{ fontSize: 11, color: '#9ca3af' }}>Monitor</span><div style={{ fontWeight: 600, fontSize: 13 }}>{data.scout_nombre}</div></div>
        <div><span style={{ fontSize: 11, color: '#9ca3af' }}>Vigor</span><div style={{ fontWeight: 600, fontSize: 13, color: VIGOR_COLORS[data.general_vigor] }}>{data.general_vigor}</div></div>
        <div><span style={{ fontSize: 11, color: '#9ca3af' }}>Etapa</span><div style={{ fontWeight: 600, fontSize: 13, textTransform: 'capitalize' }}>{data.phenological_stage || '—'}</div></div>
        <div><span style={{ fontSize: 11, color: '#9ca3af' }}>Estado</span><div><Badge text={data.status} bg={sc.bg} color={sc.color} /></div></div>
      </div>

      {data.temperature_c != null && (
        <div style={{ background: '#f0f9ff', borderRadius: 8, padding: 12, marginBottom: 16, display: 'flex', gap: 20, fontSize: 12 }}>
          <span>🌡️ {data.temperature_c}°C</span>
          <span>💧 {data.humidity_pct}%</span>
          <span>💨 {data.wind_speed_kmh} km/h</span>
          <span>🌧️ {data.recent_rain_mm} mm</span>
        </div>
      )}

      <h3 style={{ fontSize: 14, fontWeight: 700, margin: '16px 0 12px' }}>Observaciones ({data.observations?.length ? '' : '0'})</h3>
      {(!data.observations || data.observations.length === 0) ? (
        <p style={{ color: '#9ca3af', fontSize: 13 }}>Sin observaciones de plagas registradas</p>
      ) : null}
      {Array.isArray(data.observations) && data.observations.map((o, i) => (
        <div key={i} style={{ background: o.threshold_exceeded ? '#fef2f2' : '#fafafa', border: `1px solid ${o.threshold_exceeded ? '#fecaca' : '#e5e7eb'}`, borderRadius: 8, padding: 14, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div>
              <SeverityDot level={o.severity_scale} />
              <strong>{o.pest_name}</strong> <span style={{ color: '#9ca3af', fontSize: 11 }}>{o.pest_code}</span>
            </div>
            <ThresholdBadge exceeded={o.threshold_exceeded} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontSize: 12 }}>
            <div><span style={{ color: '#9ca3af' }}>Promedio/unidad:</span> <strong>{fmtN(o.average_per_unit)}</strong></div>
            <div><span style={{ color: '#9ca3af' }}>Umbral:</span> <strong>{fmtN(o.threshold_value)} {o.threshold_unit || ''}</strong></div>
            <div><span style={{ color: '#9ca3af' }}>Severidad:</span> <strong>{o.severity_scale}/5</strong></div>
            <div><span style={{ color: '#9ca3af' }}>Acción:</span> <strong style={{ textTransform: 'capitalize' }}>{o.recommended_action}</strong></div>
          </div>
          {o.notes && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>📝 {o.notes}</div>}
        </div>
      ))}

      {data.observations && typeof data.observations === 'string' && data.observations && (
        <div style={{ fontSize: 13, color: '#374151', background: '#f9fafb', borderRadius: 8, padding: 12, marginTop: 10 }}>
          <strong>Notas:</strong> {data.observations}
        </div>
      )}
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Modal: New Trap
// ═══════════════════════════════════════════════════════════════════════════════
function ModalNewTrap({ campos, catalogo, onClose, onDone }) {
  const [form, setForm] = useState({ trap_type: 'mcphail', campo_id: '', target_pest_id: '', location_desc: '', latitude: '', longitude: '', installation_date: today(), lure_type: '', lure_change_days: 14 })
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!form.campo_id) return toast.error('Seleccione un campo')
    setSaving(true)
    try {
      await api.post('/sanidad/trampas', {
        ...form,
        target_pest_id: form.target_pest_id ? Number(form.target_pest_id) : null,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        lure_change_days: Number(form.lure_change_days),
      })
      toast.success('Trampa creada')
      onDone()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error creando trampa') }
    setSaving(false)
  }

  return (
    <Modal title="Nueva Trampa" subtitle="Registro de trampa para monitoreo" onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        <Field label="Tipo de trampa">
          <select value={form.trap_type} onChange={e => setForm({ ...form, trap_type: e.target.value })} style={inputStyle}>
            <option value="mcphail">McPhail</option>
            <option value="jackson">Jackson</option>
            <option value="pegajosa_amarilla">Pegajosa amarilla</option>
          </select>
        </Field>
        <Field label="Campo *">
          <select value={form.campo_id} onChange={e => setForm({ ...form, campo_id: e.target.value })} style={inputStyle}>
            <option value="">Seleccionar...</option>
            {campos.map(c => <option key={c.id_campo} value={c.id_campo}>{c.id_campo} — {c.nombre}</option>)}
          </select>
        </Field>
        <Field label="Plaga objetivo">
          <select value={form.target_pest_id} onChange={e => setForm({ ...form, target_pest_id: e.target.value })} style={inputStyle}>
            <option value="">Ninguna</option>
            {catalogo.filter(p => p.pest_type === 'plaga').map(p => <option key={p.id} value={p.id}>{p.code} — {p.common_name}</option>)}
          </select>
        </Field>
        <Field label="Fecha instalación">
          <input type="date" value={form.installation_date} onChange={e => setForm({ ...form, installation_date: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Tipo de atrayente">
          <input value={form.lure_type} onChange={e => setForm({ ...form, lure_type: e.target.value })} style={inputStyle} placeholder="Ej: proteína hidrolizada" />
        </Field>
        <Field label="Cambio atrayente (días)">
          <input type="number" value={form.lure_change_days} onChange={e => setForm({ ...form, lure_change_days: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Ubicación / descripción" full>
          <input value={form.location_desc} onChange={e => setForm({ ...form, location_desc: e.target.value })} style={inputStyle} placeholder="Ej: Hilera 15, árbol 3" />
        </Field>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={onClose} style={btnSecondary}>Cancelar</button>
        <button onClick={submit} disabled={saving} style={btnPrimary}>{saving ? 'Guardando...' : 'Crear Trampa'}</button>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Modal: Trap Detail (with readings)
// ═══════════════════════════════════════════════════════════════════════════════
function ModalTrapDetail({ trap, onClose }) {
  const [readings, setReadings] = useState([])
  useEffect(() => {
    api.get(`/sanidad/trampas/${trap.id}/lecturas`).then(r => setReadings(r.data)).catch(() => toast.error('Error al cargar lecturas'))
  }, [trap.id])

  const ts = TRAP_STATUS_COLORS[trap.status] || { bg: '#f3f4f6', color: '#374151' }
  return (
    <Modal title={`Trampa ${trap.trap_code}`} subtitle={`${trap.campo_nombre} — ${(trap.trap_type || '').replace(/_/g, ' ')}`} onClose={onClose} width={700}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <div><span style={{ fontSize: 11, color: '#9ca3af' }}>Estado</span><div><Badge text={trap.status} bg={ts.bg} color={ts.color} /></div></div>
        <div><span style={{ fontSize: 11, color: '#9ca3af' }}>Plaga objetivo</span><div style={{ fontWeight: 600, fontSize: 13 }}>{trap.target_pest_name}</div></div>
        <div><span style={{ fontSize: 11, color: '#9ca3af' }}>Instalación</span><div style={{ fontWeight: 600, fontSize: 13 }}>{fmtDate(trap.installation_date)}</div></div>
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 700, margin: '16px 0 12px' }}>Historial de Lecturas ({readings.length})</h3>
      {readings.length === 0 ? (
        <p style={{ color: '#9ca3af', fontSize: 13 }}>Sin lecturas registradas</p>
      ) : (
        <div style={{ maxHeight: 300, overflow: 'auto' }}>
          <table style={{ width: '100%', fontSize: 12 }}>
            <thead>
              <tr><th>Fecha</th><th>Objetivo</th><th>No objetivo</th><th>Días</th><th>FTD</th><th>Umbral</th><th>Atrayente</th><th>Lector</th></tr>
            </thead>
            <tbody>
              {readings.map(r => (
                <tr key={r.id}>
                  <td>{fmtDate(r.reading_date)}</td>
                  <td style={{ fontWeight: 700 }}>{r.target_count}</td>
                  <td>{r.non_target_count}</td>
                  <td>{r.days_since_last || '—'}</td>
                  <td style={{ fontWeight: 700 }}>{r.catches_per_trap_day != null ? fmtN(r.catches_per_trap_day) : '—'}</td>
                  <td>{r.threshold_exceeded != null ? <ThresholdBadge exceeded={r.threshold_exceeded} /> : '—'}</td>
                  <td>{r.lure_replaced ? '🔄 Sí' : '—'}</td>
                  <td>{r.reader_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Modal: New Trap Reading
// ═══════════════════════════════════════════════════════════════════════════════
function ModalNewReading({ trap, onClose, onDone }) {
  const [form, setForm] = useState({ reading_date: today(), target_count: '', non_target_count: 0, lure_replaced: false, notes: '' })
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!form.target_count && form.target_count !== 0) return toast.error('Ingrese conteo objetivo')
    setSaving(true)
    try {
      await api.post(`/sanidad/trampas/${trap.id}/lectura`, {
        ...form,
        target_count: Number(form.target_count),
        non_target_count: Number(form.non_target_count || 0),
      })
      toast.success('Lectura registrada')
      onDone()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error registrando lectura') }
    setSaving(false)
  }

  return (
    <Modal title={`Nueva Lectura — ${trap.trap_code}`} subtitle={`${trap.campo_nombre} — ${trap.target_pest_name}`} onClose={onClose} width={480}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        <Field label="Fecha lectura">
          <input type="date" value={form.reading_date} onChange={e => setForm({ ...form, reading_date: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Conteo objetivo *">
          <input type="number" value={form.target_count} onChange={e => setForm({ ...form, target_count: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Conteo no objetivo">
          <input type="number" value={form.non_target_count} onChange={e => setForm({ ...form, non_target_count: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="¿Atrayente reemplazado?">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={form.lure_replaced} onChange={e => setForm({ ...form, lure_replaced: e.target.checked })} />
            Sí, se reemplazó
          </label>
        </Field>
        <Field label="Notas" full>
          <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={inputStyle} />
        </Field>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={onClose} style={btnSecondary}>Cancelar</button>
        <button onClick={submit} disabled={saving} style={btnPrimary}>{saving ? 'Guardando...' : 'Registrar Lectura'}</button>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Modal: New Spray Log
// ═══════════════════════════════════════════════════════════════════════════════
function ModalNewSpray({ campos, catalogo, onClose, onDone }) {
  const [form, setForm] = useState({ campo_id: '', application_date: today(), target_pests: '', justification: '', products_json: '', water_volume_l_ha: '', method: 'aspersora', area_treated_ha: '', temp_c: '', humidity_pct: '', wind_kmh: '', rei_hours: '', phi_days: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const reiExpiry = form.application_date && form.rei_hours ? new Date(new Date(form.application_date).getTime() + Number(form.rei_hours) * 3600000) : null
  const earliestHarvest = form.application_date && form.phi_days ? new Date(new Date(form.application_date).getTime() + Number(form.phi_days) * 86400000) : null

  async function submit() {
    if (!form.campo_id) return toast.error('Seleccione un campo')
    setSaving(true)
    try {
      await api.post('/sanidad/spray-logs', {
        ...form,
        water_volume_l_ha: form.water_volume_l_ha ? Number(form.water_volume_l_ha) : null,
        area_treated_ha: form.area_treated_ha ? Number(form.area_treated_ha) : null,
        temp_c: form.temp_c ? Number(form.temp_c) : null,
        humidity_pct: form.humidity_pct ? Number(form.humidity_pct) : null,
        wind_kmh: form.wind_kmh ? Number(form.wind_kmh) : null,
        rei_hours: form.rei_hours ? Number(form.rei_hours) : null,
        phi_days: form.phi_days ? Number(form.phi_days) : null,
        products_json: form.products_json || null,
        target_pests: form.target_pests || null,
      })
      toast.success('Aplicación registrada')
      onDone()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error registrando aplicación') }
    setSaving(false)
  }

  return (
    <Modal title="Nuevo Registro de Aplicación" subtitle="Bitácora de aplicación fitosanitaria" onClose={onClose} width={740}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
        <Field label="Campo *">
          <select value={form.campo_id} onChange={e => setForm({ ...form, campo_id: e.target.value })} style={inputStyle}>
            <option value="">Seleccionar...</option>
            {campos.map(c => <option key={c.id_campo} value={c.id_campo}>{c.id_campo} — {c.nombre}</option>)}
          </select>
        </Field>
        <Field label="Fecha aplicación">
          <input type="date" value={form.application_date} onChange={e => setForm({ ...form, application_date: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Método">
          <select value={form.method} onChange={e => setForm({ ...form, method: e.target.value })} style={inputStyle}>
            {['aspersora', 'drench', 'inyeccion_tronco', 'mochila', 'dron', 'otro'].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Plagas objetivo" full>
          <input value={form.target_pests} onChange={e => setForm({ ...form, target_pests: e.target.value })} style={inputStyle} placeholder='Ej: PL-001, EN-002' />
        </Field>
        <Field label="Justificación" full>
          <input value={form.justification} onChange={e => setForm({ ...form, justification: e.target.value })} style={inputStyle} placeholder="Motivo de la aplicación" />
        </Field>
        <Field label="Productos (JSON)" full>
          <input value={form.products_json} onChange={e => setForm({ ...form, products_json: e.target.value })} style={inputStyle} placeholder='[{"producto_id":"P-001","dosis_ha":2}]' />
        </Field>
        <Field label="Volumen agua L/ha">
          <input type="number" value={form.water_volume_l_ha} onChange={e => setForm({ ...form, water_volume_l_ha: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Área tratada (ha)">
          <input type="number" step="0.1" value={form.area_treated_ha} onChange={e => setForm({ ...form, area_treated_ha: e.target.value })} style={inputStyle} />
        </Field>
        <div />
      </div>

      {/* Weather at application */}
      <div style={{ background: '#f0f9ff', borderRadius: 8, padding: 14, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', marginBottom: 10 }}>🌤️ Condiciones al aplicar</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <Field label="Temp °C"><input type="number" step="0.1" value={form.temp_c} onChange={e => setForm({ ...form, temp_c: e.target.value })} style={inputStyle} /></Field>
          <Field label="Humedad %"><input type="number" step="0.1" value={form.humidity_pct} onChange={e => setForm({ ...form, humidity_pct: e.target.value })} style={inputStyle} /></Field>
          <Field label="Viento km/h"><input type="number" step="0.1" value={form.wind_kmh} onChange={e => setForm({ ...form, wind_kmh: e.target.value })} style={inputStyle} /></Field>
        </div>
      </div>

      {/* REI / PHI */}
      <div style={{ background: '#fef9c3', borderRadius: 8, padding: 14, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#854d0e', marginBottom: 10 }}>⏱️ Intervalos de Seguridad</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
          <Field label="REI (horas)"><input type="number" value={form.rei_hours} onChange={e => setForm({ ...form, rei_hours: e.target.value })} style={inputStyle} /></Field>
          <Field label="REI expira">{reiExpiry ? <div style={{ fontWeight: 700, fontSize: 13, color: '#dc2626', marginTop: 8 }}>{fmtDT(reiExpiry)}</div> : <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>—</div>}</Field>
          <Field label="PHI (días)"><input type="number" value={form.phi_days} onChange={e => setForm({ ...form, phi_days: e.target.value })} style={inputStyle} /></Field>
          <Field label="Cosecha temprana">{earliestHarvest ? <div style={{ fontWeight: 700, fontSize: 13, color: '#0891b2', marginTop: 8 }}>{fmtDate(earliestHarvest)}</div> : <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>—</div>}</Field>
        </div>
      </div>

      <Field label="Notas" full>
        <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ ...inputStyle, minHeight: 50 }} />
      </Field>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
        <button onClick={onClose} style={btnSecondary}>Cancelar</button>
        <button onClick={submit} disabled={saving} style={btnPrimary}>{saving ? 'Guardando...' : 'Registrar Aplicación'}</button>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Modal: Spray Log Detail
// ═══════════════════════════════════════════════════════════════════════════════
function ModalSprayDetail({ logId, onClose }) {
  const [data, setData] = useState(null)
  useEffect(() => {
    api.get(`/sanidad/spray-logs/${logId}`).then(r => setData(r.data)).catch(() => toast.error('Error cargando detalle'))
  }, [logId])

  if (!data) return <Modal title="Cargando..." onClose={onClose}><div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando detalle...</div></Modal>

  return (
    <Modal title={`Aplicación ${data.spray_code}`} subtitle={`${data.campo_nombre} — ${fmtDate(data.application_date)}`} onClose={onClose} width={700}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <div><span style={{ fontSize: 11, color: '#9ca3af' }}>Aplicador</span><div style={{ fontWeight: 600, fontSize: 13 }}>{data.applicator_name}</div></div>
        <div><span style={{ fontSize: 11, color: '#9ca3af' }}>Método</span><div style={{ fontWeight: 600, fontSize: 13, textTransform: 'capitalize' }}>{data.method || '—'}</div></div>
        <div><span style={{ fontSize: 11, color: '#9ca3af' }}>Área tratada</span><div style={{ fontWeight: 600, fontSize: 13 }}>{data.area_treated_ha ? `${fmtN(data.area_treated_ha)} ha` : '—'}</div></div>
        <div><span style={{ fontSize: 11, color: '#9ca3af' }}>Plagas objetivo</span><div style={{ fontWeight: 600, fontSize: 13 }}>{data.target_pests || '—'}</div></div>
        <div><span style={{ fontSize: 11, color: '#9ca3af' }}>Vol. agua</span><div style={{ fontWeight: 600, fontSize: 13 }}>{data.water_volume_l_ha ? `${fmtN(data.water_volume_l_ha)} L/ha` : '—'}</div></div>
        <div><span style={{ fontSize: 11, color: '#9ca3af' }}>Justificación</span><div style={{ fontWeight: 600, fontSize: 13 }}>{data.justification || '—'}</div></div>
      </div>

      {/* Weather */}
      {(data.temp_c != null || data.humidity_pct != null) && (
        <div style={{ background: '#f0f9ff', borderRadius: 8, padding: 12, marginBottom: 16, display: 'flex', gap: 20, fontSize: 12 }}>
          <span>🌡️ {data.temp_c}°C</span>
          <span>💧 {data.humidity_pct}%</span>
          <span>💨 {data.wind_kmh} km/h</span>
        </div>
      )}

      {/* REI/PHI */}
      <div style={{ background: '#fef9c3', borderRadius: 8, padding: 14, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, fontSize: 12 }}>
          <div><span style={{ color: '#854d0e' }}>REI</span><div style={{ fontWeight: 700 }}>{data.rei_hours ? `${data.rei_hours}h` : '—'}</div></div>
          <div><span style={{ color: '#854d0e' }}>REI expira</span><div style={{ fontWeight: 700, color: data.rei_expiry && new Date(data.rei_expiry) > new Date() ? '#dc2626' : '#16a34a' }}>{fmtDT(data.rei_expiry)}</div></div>
          <div><span style={{ color: '#854d0e' }}>PHI</span><div style={{ fontWeight: 700 }}>{data.phi_days ? `${data.phi_days}d` : '—'}</div></div>
          <div><span style={{ color: '#854d0e' }}>Cosecha temprana</span><div style={{ fontWeight: 700, color: '#0891b2' }}>{fmtDate(data.earliest_harvest)}</div></div>
        </div>
      </div>

      {data.products_json && (
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>Productos:</span>
          <pre style={{ background: '#f9fafb', borderRadius: 6, padding: 8, fontSize: 11, overflow: 'auto', maxHeight: 100 }}>{data.products_json}</pre>
        </div>
      )}

      {data.notes && <div style={{ fontSize: 13, color: '#374151', background: '#f9fafb', borderRadius: 8, padding: 12 }}>📝 {data.notes}</div>}
    </Modal>
  )
}
