import { useEffect, useState, useCallback } from 'react'
import api from '../api'
import toast from 'react-hot-toast'
import {
  Droplets, CloudRain, BarChart3, Settings, Plus, RefreshCw, Search,
  AlertTriangle, CheckCircle, ThermometerSun, Clock, Gauge, ChevronDown,
  ChevronUp, Save, X, Zap, Filter
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ComposedChart, Area
} from 'recharts'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtN = (n, d = 1) => Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: d, maximumFractionDigits: d })
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-DO') : '—'
const fmtDT = d => d ? new Date(d).toLocaleString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
const today = () => new Date().toISOString().slice(0, 10)
const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)

const VISUAL_EMOJIS = { 1: '🔵 Saturado', 2: '💧 Muy húmedo', 3: '✅ Óptimo', 4: '⚠️ Seco', 5: '🔴 Muy seco' }
const STATUS_COLORS = {
  optimo:   { bg: '#dcfce7', color: '#166534', border: '#86efac', label: 'Óptimo' },
  saturado: { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd', label: 'Saturado' },
  deficit:  { bg: '#fef9c3', color: '#854d0e', border: '#fde047', label: 'Déficit' },
  estres:   { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', label: 'Estrés' },
  sin_dato: { bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db', label: 'Sin dato' },
}

const StatusBadge = ({ status }) => {
  const s = STATUS_COLORS[status] || STATUS_COLORS.sin_dato
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
      {s.label}
    </span>
  )
}

const cbarColor = v => {
  if (v == null) return '#6b7280'
  if (v < 10) return '#3b82f6'
  if (v <= 25) return '#16a34a'
  if (v <= 40) return '#eab308'
  return '#dc2626'
}

const TabBtn = ({ active, icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
      background: active ? '#1F3A5F' : 'transparent', color: active ? '#fff' : '#374151',
      border: active ? 'none' : '1px solid #d1d5db', borderRadius: 8, fontWeight: 600, fontSize: 13,
      cursor: 'pointer', transition: 'all 0.2s'
    }}
  >
    <Icon size={15} /> {label}
  </button>
)

const Field = ({ label, children, full }) => (
  <div style={{ gridColumn: full ? '1/-1' : undefined }}>
    <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
    {children}
  </div>
)

const Modal = ({ title, onClose, children, width = 560 }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
    onClick={e => e.target === e.currentTarget && onClose()}>
    <div style={{ background: '#fff', borderRadius: 14, padding: 24, maxWidth: width, width: '92%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
      </div>
      {children}
    </div>
  </div>
)

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function Riego() {
  const [tab, setTab] = useState('dashboard')
  const [campos, setCampos] = useState([])
  const [selCampo, setSelCampo] = useState('')
  const [loading, setLoading] = useState(false)

  // Dashboard
  const [dashboard, setDashboard] = useState({ campos: [], alert_count: 0 })
  const [alertas, setAlertas] = useState([])

  // Lecturas
  const [lecturas, setLecturas] = useState([])
  const [showLecturaForm, setShowLecturaForm] = useState(false)

  // Eventos
  const [eventos, setEventos] = useState([])
  const [showEventoForm, setShowEventoForm] = useState(false)

  // Balance
  const [balance, setBalance] = useState([])
  const [balFechas, setBalFechas] = useState({ desde: daysAgo(30), hasta: today() })
  const [balCampo, setBalCampo] = useState('')

  // Config
  const [showConfig, setShowConfig] = useState(false)
  const [configs, setConfigs] = useState([])

  // ── Load campos once ──
  useEffect(() => {
    api.get('/campos').then(r => {
      const c = Array.isArray(r.data) ? r.data : r.data.campos || []
      setCampos(c)
    }).catch(() => {})
  }, [])

  // ── Tab data loaders ──
  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const [dash, alerts] = await Promise.all([
        api.get('/riego/dashboard'),
        api.get('/riego/alertas'),
      ])
      setDashboard(dash.data)
      setAlertas(alerts.data)
    } catch (err) { toast.error('Error cargando dashboard de riego') }
    setLoading(false)
  }, [])

  const loadLecturas = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (selCampo) params.campo_id = selCampo
      const r = await api.get('/riego/lecturas', { params })
      setLecturas(r.data)
    } catch { toast.error('Error cargando lecturas') }
    setLoading(false)
  }, [selCampo])

  const loadEventos = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (selCampo) params.campo_id = selCampo
      const r = await api.get('/riego/eventos', { params })
      setEventos(r.data)
    } catch { toast.error('Error cargando eventos') }
    setLoading(false)
  }, [selCampo])

  const loadBalance = useCallback(async () => {
    if (!balCampo) return
    setLoading(true)
    try {
      const r = await api.get('/riego/balance', { params: { campo_id: balCampo, fecha_desde: balFechas.desde, fecha_hasta: balFechas.hasta } })
      setBalance(r.data)
    } catch { toast.error('Error cargando balance') }
    setLoading(false)
  }, [balCampo, balFechas])

  const loadConfigs = useCallback(async () => {
    try {
      const r = await api.get('/riego/config')
      setConfigs(r.data)
    } catch {}
  }, [])

  useEffect(() => {
    if (tab === 'dashboard') loadDashboard()
    else if (tab === 'lecturas') loadLecturas()
    else if (tab === 'riego') loadEventos()
    else if (tab === 'balance') loadBalance()
  }, [tab, loadDashboard, loadLecturas, loadEventos, loadBalance])

  useEffect(() => { loadConfigs() }, [loadConfigs])

  // ── Dashboard tab ──────────────────────────────────────────────────────────
  const DashboardTab = () => (
    <div>
      {/* Alerts banner */}
      {alertas.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <AlertTriangle size={16} color="#dc2626" />
            <strong style={{ color: '#991b1b', fontSize: 13 }}>{alertas.length} Alerta{alertas.length > 1 ? 's' : ''} activa{alertas.length > 1 ? 's' : ''}</strong>
          </div>
          {alertas.map((a, i) => (
            <div key={i} style={{ fontSize: 12, color: '#7f1d1d', marginLeft: 24, marginBottom: 2 }}>
              <strong>{a.campo_id}</strong> — {a.message}
            </div>
          ))}
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 140, background: '#f0fdf4', borderRadius: 10, padding: '12px 16px', border: '1px solid #86efac' }}>
          <div style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>CAMPOS ACTIVOS</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#14532d' }}>{dashboard.total_campos || 0}</div>
        </div>
        <div style={{ flex: 1, minWidth: 140, background: dashboard.alert_count > 0 ? '#fef2f2' : '#f0fdf4', borderRadius: 10, padding: '12px 16px', border: `1px solid ${dashboard.alert_count > 0 ? '#fca5a5' : '#86efac'}` }}>
          <div style={{ fontSize: 11, color: dashboard.alert_count > 0 ? '#991b1b' : '#166534', fontWeight: 600 }}>ALERTAS</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: dashboard.alert_count > 0 ? '#dc2626' : '#14532d' }}>{dashboard.alert_count}</div>
        </div>
        <div style={{ flex: 1, minWidth: 140, background: '#eff6ff', borderRadius: 10, padding: '12px 16px', border: '1px solid #93c5fd' }}>
          <div style={{ fontSize: 11, color: '#1e40af', fontWeight: 600 }}>CON RIEGO HOY</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#1e3a5f' }}>
            {(dashboard.campos || []).filter(c => c.days_since_irrigation === 0).length}
          </div>
        </div>
      </div>

      {/* Campo cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {(dashboard.campos || []).map(c => {
          const sc = STATUS_COLORS[c.status] || STATUS_COLORS.sin_dato
          return (
            <div key={c.campo_id}
              onClick={() => { setSelCampo(c.campo_id); setBalCampo(c.campo_id); setTab('lecturas') }}
              style={{
                background: '#fff', borderRadius: 10, padding: 14, border: `2px solid ${sc.border}`,
                cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong style={{ fontSize: 14, color: '#1F3A5F' }}>{c.campo_nombre || c.campo_id}</strong>
                <StatusBadge status={c.status} />
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.7 }}>
                {c.value_cbar != null ? (
                  <div><Gauge size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> <span style={{ color: cbarColor(c.value_cbar), fontWeight: 700 }}>{fmtN(c.value_cbar, 0)} cbar</span></div>
                ) : c.visual_scale != null ? (
                  <div>{VISUAL_EMOJIS[c.visual_scale] || '—'}</div>
                ) : (
                  <div style={{ color: '#9ca3af' }}>Sin lectura</div>
                )}
                <div><Clock size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> Último riego: {c.days_since_irrigation != null ? `hace ${c.days_since_irrigation}d` : '—'}</div>
                <div><CloudRain size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> Lectura: {c.reading_datetime ? fmtDate(c.reading_datetime) : '—'}</div>
                {c.cumulative_deficit_mm != null && (
                  <div><BarChart3 size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> Balance: <span style={{ color: c.cumulative_deficit_mm < -5 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>{fmtN(c.cumulative_deficit_mm)} mm</span></div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  // ── Lecturas tab ───────────────────────────────────────────────────────────
  const LecturasTab = () => {
    const [form, setForm] = useState({
      campo_id: selCampo || '', depth_cm: '20', reading_type: 'visual',
      value_cbar: '', visual_scale: '3', position: 'bajo_gotero',
      location_zone: '', notes: '', reading_datetime: new Date().toISOString().slice(0, 16)
    })
    const [saving, setSaving] = useState(false)
    const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

    async function submit(e) {
      e.preventDefault()
      setSaving(true)
      try {
        const payload = {
          ...form,
          depth_cm: Number(form.depth_cm),
          value_cbar: form.reading_type === 'tensiometro' && form.value_cbar ? Number(form.value_cbar) : null,
          visual_scale: form.reading_type === 'visual' ? Number(form.visual_scale) : null,
        }
        await api.post('/riego/lecturas', payload)
        toast.success('Lectura registrada')
        setShowLecturaForm(false)
        loadLecturas()
      } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
      setSaving(false)
    }

    return (
      <div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="select" value={selCampo} onChange={e => setSelCampo(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="">Todos los campos</option>
            {campos.map(c => <option key={c.id_campo} value={c.id_campo}>{c.id_campo} — {c.nombre}</option>)}
          </select>
          <button className="btn-primary" onClick={() => setShowLecturaForm(true)} style={{ background: '#14532d', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> Nueva Lectura
          </button>
          <button className="btn-secondary" onClick={loadLecturas} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>

        {showLecturaForm && (
          <Modal title="Nueva Lectura de Suelo" onClose={() => setShowLecturaForm(false)} width={580}>
            <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Campo *">
                <select className="select" value={form.campo_id} onChange={e => f('campo_id', e.target.value)} required>
                  <option value="">Seleccionar…</option>
                  {campos.map(c => <option key={c.id_campo} value={c.id_campo}>{c.id_campo} — {c.nombre}</option>)}
                </select>
              </Field>
              <Field label="Profundidad (cm) *">
                <select className="select" value={form.depth_cm} onChange={e => f('depth_cm', e.target.value)}>
                  <option value="20">20 cm</option>
                  <option value="50">50 cm</option>
                  <option value="30">30 cm</option>
                </select>
              </Field>
              <Field label="Tipo de lectura *">
                <select className="select" value={form.reading_type} onChange={e => f('reading_type', e.target.value)}>
                  <option value="visual">Visual</option>
                  <option value="tensiometro">Tensiómetro</option>
                  <option value="sensor">Sensor</option>
                </select>
              </Field>
              {form.reading_type === 'tensiometro' || form.reading_type === 'sensor' ? (
                <Field label="Valor (cbar) *">
                  <input className="input" type="number" step="0.1" min="0" value={form.value_cbar} onChange={e => f('value_cbar', e.target.value)} required placeholder="0-80" />
                </Field>
              ) : (
                <Field label="Escala visual *">
                  <select className="select" value={form.visual_scale} onChange={e => f('visual_scale', e.target.value)}>
                    <option value="1">🔵 1 — Saturado</option>
                    <option value="2">💧 2 — Muy húmedo</option>
                    <option value="3">✅ 3 — Húmedo (Óptimo)</option>
                    <option value="4">⚠️ 4 — Ligeramente seco</option>
                    <option value="5">🔴 5 — Seco</option>
                  </select>
                </Field>
              )}
              <Field label="Posición">
                <select className="select" value={form.position} onChange={e => f('position', e.target.value)}>
                  <option value="bajo_gotero">Bajo gotero</option>
                  <option value="entre_goteros">Entre goteros</option>
                  <option value="borde_copa">Borde copa</option>
                </select>
              </Field>
              <Field label="Zona">
                <input className="input" value={form.location_zone} onChange={e => f('location_zone', e.target.value)} placeholder="A1, B2..." />
              </Field>
              <Field label="Fecha/Hora" full>
                <input className="input" type="datetime-local" value={form.reading_datetime} onChange={e => f('reading_datetime', e.target.value)} />
              </Field>
              <Field label="Notas" full>
                <input className="input" value={form.notes} onChange={e => f('notes', e.target.value)} placeholder="Observaciones…" />
              </Field>
              <div style={{ gridColumn: '1/-1', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowLecturaForm(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={saving} style={{ background: '#14532d' }}>
                  {saving ? 'Guardando...' : 'Guardar Lectura'}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* Lecturas table */}
        <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#1F3A5F', color: '#fff' }}>
                <th style={th}>Campo</th>
                <th style={th}>Fecha</th>
                <th style={th}>Prof.</th>
                <th style={th}>Tipo</th>
                <th style={th}>Valor</th>
                <th style={th}>Estado</th>
                <th style={th}>Posición</th>
                <th style={th}>Notas</th>
              </tr>
            </thead>
            <tbody>
              {lecturas.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}>Sin lecturas registradas</td></tr>
              ) : lecturas.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={td}><strong>{r.campo_id}</strong></td>
                  <td style={td}>{fmtDT(r.reading_datetime)}</td>
                  <td style={td}>{r.depth_cm} cm</td>
                  <td style={td}>{r.reading_type}</td>
                  <td style={td}>
                    {r.value_cbar != null ? (
                      <span style={{ color: cbarColor(r.value_cbar), fontWeight: 700 }}>{fmtN(r.value_cbar, 0)} cbar</span>
                    ) : r.visual_scale != null ? (
                      <span>{VISUAL_EMOJIS[r.visual_scale]}</span>
                    ) : '—'}
                  </td>
                  <td style={td}>
                    {r.value_cbar != null ? (
                      <span style={{ background: `${cbarColor(r.value_cbar)}20`, color: cbarColor(r.value_cbar), padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                        {r.value_cbar < 10 ? 'Húmedo' : r.value_cbar <= 25 ? 'Óptimo' : r.value_cbar <= 40 ? 'Déficit' : 'Estrés'}
                      </span>
                    ) : null}
                  </td>
                  <td style={td}>{r.position || '—'}</td>
                  <td style={{ ...td, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ── Riego (Events) tab ────────────────────────────────────────────────────
  const RiegoTab = () => {
    const [form, setForm] = useState({
      campo_id: selCampo || '', start_time: new Date().toISOString().slice(0, 16),
      end_time: '', volume_liters: '', volume_mm: '', duration_minutes: '',
      fertigation: false, fert_product: '', fert_dose: '', source: 'manual', notes: ''
    })
    const [saving, setSaving] = useState(false)
    const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

    async function submit(e) {
      e.preventDefault()
      setSaving(true)
      try {
        const payload = {
          ...form,
          volume_liters: form.volume_liters ? Number(form.volume_liters) : null,
          volume_mm: form.volume_mm ? Number(form.volume_mm) : null,
          duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
          end_time: form.end_time || null,
        }
        await api.post('/riego/eventos', payload)
        toast.success('Evento de riego registrado')
        setShowEventoForm(false)
        loadEventos()
      } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
      setSaving(false)
    }

    // Monthly summary
    const monthSummary = {}
    eventos.forEach(e => {
      if (!monthSummary[e.campo_id]) monthSummary[e.campo_id] = { count: 0, volume_l: 0, volume_mm: 0 }
      monthSummary[e.campo_id].count++
      monthSummary[e.campo_id].volume_l += e.volume_liters || 0
      monthSummary[e.campo_id].volume_mm += e.volume_mm || 0
    })

    return (
      <div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="select" value={selCampo} onChange={e => setSelCampo(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="">Todos los campos</option>
            {campos.map(c => <option key={c.id_campo} value={c.id_campo}>{c.id_campo} — {c.nombre}</option>)}
          </select>
          <button className="btn-primary" onClick={() => setShowEventoForm(true)} style={{ background: '#14532d', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> Registrar Riego
          </button>
          <button className="btn-secondary" onClick={loadEventos} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>

        {/* Monthly summary */}
        {Object.keys(monthSummary).length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            {Object.entries(monthSummary).map(([cid, s]) => (
              <div key={cid} style={{ background: '#eff6ff', borderRadius: 8, padding: '8px 14px', border: '1px solid #93c5fd', fontSize: 12 }}>
                <strong style={{ color: '#1e40af' }}>{cid}</strong>: {s.count} riegos · {fmtN(s.volume_l / 1000, 1)}m³ · {fmtN(s.volume_mm)} mm
              </div>
            ))}
          </div>
        )}

        {showEventoForm && (
          <Modal title="Registrar Evento de Riego" onClose={() => setShowEventoForm(false)} width={620}>
            <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Campo *">
                <select className="select" value={form.campo_id} onChange={e => f('campo_id', e.target.value)} required>
                  <option value="">Seleccionar…</option>
                  {campos.map(c => <option key={c.id_campo} value={c.id_campo}>{c.id_campo} — {c.nombre}</option>)}
                </select>
              </Field>
              <Field label="Fuente">
                <select className="select" value={form.source} onChange={e => f('source', e.target.value)}>
                  <option value="manual">Manual</option>
                  <option value="controlador">Controlador</option>
                  <option value="programado">Programado</option>
                </select>
              </Field>
              <Field label="Inicio *">
                <input className="input" type="datetime-local" value={form.start_time} onChange={e => f('start_time', e.target.value)} required />
              </Field>
              <Field label="Fin">
                <input className="input" type="datetime-local" value={form.end_time} onChange={e => f('end_time', e.target.value)} />
              </Field>
              <Field label="Duración (min)">
                <input className="input" type="number" min="0" value={form.duration_minutes} onChange={e => f('duration_minutes', e.target.value)} placeholder="Auto si hay inicio/fin" />
              </Field>
              <Field label="Volumen (litros)">
                <input className="input" type="number" step="0.1" min="0" value={form.volume_liters} onChange={e => f('volume_liters', e.target.value)} />
              </Field>
              <Field label="Lámina (mm)">
                <input className="input" type="number" step="0.01" min="0" value={form.volume_mm} onChange={e => f('volume_mm', e.target.value)} placeholder="Auto si hay litros" />
              </Field>
              <Field label="Fertiriego">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.fertigation} onChange={e => f('fertigation', e.target.checked)} />
                  <span style={{ fontSize: 13 }}>Incluye fertirrigación</span>
                </label>
              </Field>
              {form.fertigation && (
                <>
                  <Field label="Producto fertiriego">
                    <input className="input" value={form.fert_product} onChange={e => f('fert_product', e.target.value)} placeholder="Ej: 12-6-24" />
                  </Field>
                  <Field label="Dosis">
                    <input className="input" value={form.fert_dose} onChange={e => f('fert_dose', e.target.value)} placeholder="Ej: 5 kg/ha" />
                  </Field>
                </>
              )}
              <Field label="Notas" full>
                <input className="input" value={form.notes} onChange={e => f('notes', e.target.value)} />
              </Field>
              <div style={{ gridColumn: '1/-1', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowEventoForm(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={saving} style={{ background: '#14532d' }}>
                  <Droplets size={14} /> {saving ? 'Guardando...' : 'Registrar Riego'}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* Events table */}
        <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#1F3A5F', color: '#fff' }}>
                <th style={th}>Campo</th>
                <th style={th}>Inicio</th>
                <th style={th}>Fin</th>
                <th style={th}>Duración</th>
                <th style={th}>Volumen (L)</th>
                <th style={th}>Lámina (mm)</th>
                <th style={th}>Fertiriego</th>
                <th style={th}>Fuente</th>
                <th style={th}>Notas</th>
              </tr>
            </thead>
            <tbody>
              {eventos.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}>Sin eventos de riego</td></tr>
              ) : eventos.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={td}><strong>{e.campo_id}</strong></td>
                  <td style={td}>{fmtDT(e.start_time)}</td>
                  <td style={td}>{fmtDT(e.end_time)}</td>
                  <td style={td}>{e.duration_minutes ? `${e.duration_minutes} min` : '—'}</td>
                  <td style={td}>{e.volume_liters ? fmtN(e.volume_liters, 0) : '—'}</td>
                  <td style={td}>{e.volume_mm ? fmtN(e.volume_mm, 2) : '—'}</td>
                  <td style={td}>
                    {e.fertigation ? (
                      <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                        <Zap size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> {e.fert_product || 'Sí'}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={td}>{e.source}</td>
                  <td style={{ ...td, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ── Balance Hídrico tab ───────────────────────────────────────────────────
  const BalanceTab = () => {
    const [calculating, setCalculating] = useState(false)

    async function recalculate() {
      if (!balCampo) return toast.error('Seleccione un campo')
      setCalculating(true)
      try {
        const r = await api.post('/riego/balance/calcular', {
          campo_id: balCampo, fecha_desde: balFechas.desde, fecha_hasta: balFechas.hasta
        })
        toast.success(`Balance calculado: ${r.data.rows_calculated} días`)
        loadBalance()
      } catch (err) { toast.error(err.response?.data?.detail || 'Error calculando balance') }
      setCalculating(false)
    }

    const chartData = [...balance].reverse().map(b => ({
      date: b.date ? new Date(b.date).toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit' }) : '',
      Lluvia: b.rainfall_mm || 0,
      Riego: b.irrigation_mm || 0,
      ETc: b.etc_mm || 0,
      Acumulado: b.cumulative_deficit_mm || 0,
    }))

    return (
      <div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="select" value={balCampo} onChange={e => setBalCampo(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="">Seleccionar campo…</option>
            {campos.map(c => <option key={c.id_campo} value={c.id_campo}>{c.id_campo} — {c.nombre}</option>)}
          </select>
          <input className="input" type="date" value={balFechas.desde} onChange={e => setBalFechas(p => ({ ...p, desde: e.target.value }))} style={{ maxWidth: 160 }} />
          <input className="input" type="date" value={balFechas.hasta} onChange={e => setBalFechas(p => ({ ...p, hasta: e.target.value }))} style={{ maxWidth: 160 }} />
          <button className="btn-secondary" onClick={loadBalance} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Search size={14} /> Consultar
          </button>
          <button className="btn-primary" onClick={recalculate} disabled={calculating} style={{ background: '#14532d', display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> {calculating ? 'Calculando...' : 'Recalcular'}
          </button>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #e5e7eb', marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1F3A5F', marginBottom: 12 }}>Balance Hídrico — {balCampo}</h3>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" fontSize={10} />
                <YAxis yAxisId="left" fontSize={10} label={{ value: 'mm', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" fontSize={10} label={{ value: 'mm acum.', angle: 90, position: 'insideRight', fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="Lluvia" fill="#3b82f6" stackId="input" radius={[2, 2, 0, 0]} />
                <Bar yAxisId="left" dataKey="Riego" fill="#06b6d4" stackId="input" radius={[2, 2, 0, 0]} />
                <Line yAxisId="left" dataKey="ETc" stroke="#dc2626" strokeWidth={2} dot={false} />
                <Line yAxisId="right" dataKey="Acumulado" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 3" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Balance table */}
        <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#1F3A5F', color: '#fff' }}>
                <th style={th}>Fecha</th>
                <th style={th}>ET₀</th>
                <th style={th}>Kc</th>
                <th style={th}>ETc</th>
                <th style={th}>Lluvia</th>
                <th style={th}>Riego</th>
                <th style={th}>Balance</th>
                <th style={th}>Acumulado</th>
                <th style={th}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {balance.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}>Seleccione un campo y consulte el balance</td></tr>
              ) : balance.map(b => (
                <tr key={b.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={td}>{fmtDate(b.date)}</td>
                  <td style={td}>{fmtN(b.et0_mm, 2)}</td>
                  <td style={td}>{fmtN(b.kc, 2)}</td>
                  <td style={{ ...td, color: '#dc2626', fontWeight: 600 }}>{fmtN(b.etc_mm, 2)}</td>
                  <td style={{ ...td, color: '#3b82f6', fontWeight: 600 }}>{fmtN(b.rainfall_mm, 1)}</td>
                  <td style={{ ...td, color: '#06b6d4', fontWeight: 600 }}>{fmtN(b.irrigation_mm, 2)}</td>
                  <td style={{ ...td, fontWeight: 700, color: (b.balance_mm || 0) >= 0 ? '#16a34a' : '#dc2626' }}>{fmtN(b.balance_mm, 2)}</td>
                  <td style={{ ...td, fontWeight: 700, color: (b.cumulative_deficit_mm || 0) < -5 ? '#dc2626' : '#16a34a' }}>{fmtN(b.cumulative_deficit_mm, 2)}</td>
                  <td style={td}><StatusBadge status={b.status === 'adecuado' ? 'optimo' : b.status === 'deficit' ? 'deficit' : b.status === 'exceso' ? 'saturado' : 'sin_dato'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ── Config panel ──────────────────────────────────────────────────────────
  const ConfigPanel = () => {
    const [editCampo, setEditCampo] = useState(null)
    const [cfgForm, setCfgForm] = useState({})
    const [saving, setSaving] = useState(false)

    function startEdit(cfg) {
      setEditCampo(cfg.campo_id)
      setCfgForm({ ...cfg, kc_by_stage: typeof cfg.kc_by_stage === 'object' ? cfg.kc_by_stage : {} })
    }

    function startNew(campoId) {
      setEditCampo(campoId)
      setCfgForm({
        campo_id: campoId, irrigation_type: 'goteo', emitters_per_tree: 4,
        emitter_flow_lph: 4.0, field_capacity_cbar: 10, refill_point_cbar: 25,
        stress_point_cbar: 40, waterlog_point_cbar: 5,
        kc_by_stage: { floracion: 0.65, cuaje: 0.75, llenado: 0.85, maduracion: 0.78 }, notes: ''
      })
    }

    async function saveConfig() {
      setSaving(true)
      try {
        await api.put(`/riego/config/${editCampo}`, cfgForm)
        toast.success('Configuración guardada')
        setEditCampo(null)
        loadConfigs()
      } catch (err) { toast.error(err.response?.data?.detail || 'Error guardando') }
      setSaving(false)
    }

    const cf = (k, v) => setCfgForm(p => ({ ...p, [k]: v }))
    const configMap = {}
    configs.forEach(c => { configMap[c.campo_id] = c })

    return (
      <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1F3A5F', margin: 0 }}>
            <Settings size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
            Configuración de Riego por Campo
          </h3>
        </div>

        {editCampo && (
          <Modal title={`Configurar Riego — ${editCampo}`} onClose={() => setEditCampo(null)} width={600}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Tipo riego">
                <select className="select" value={cfgForm.irrigation_type || 'goteo'} onChange={e => cf('irrigation_type', e.target.value)}>
                  <option value="goteo">Goteo</option>
                  <option value="microaspersion">Microaspersión</option>
                  <option value="aspersion">Aspersión</option>
                </select>
              </Field>
              <Field label="Emisores/árbol">
                <input className="input" type="number" min="1" value={cfgForm.emitters_per_tree || ''} onChange={e => cf('emitters_per_tree', Number(e.target.value))} />
              </Field>
              <Field label="Caudal emisor (L/h)">
                <input className="input" type="number" step="0.1" min="0" value={cfgForm.emitter_flow_lph || ''} onChange={e => cf('emitter_flow_lph', Number(e.target.value))} />
              </Field>
              <Field label="Cap. campo (cbar)">
                <input className="input" type="number" step="1" min="0" value={cfgForm.field_capacity_cbar || ''} onChange={e => cf('field_capacity_cbar', Number(e.target.value))} />
              </Field>
              <Field label="Punto recarga (cbar)">
                <input className="input" type="number" step="1" min="0" value={cfgForm.refill_point_cbar || ''} onChange={e => cf('refill_point_cbar', Number(e.target.value))} />
              </Field>
              <Field label="Punto estrés (cbar)">
                <input className="input" type="number" step="1" min="0" value={cfgForm.stress_point_cbar || ''} onChange={e => cf('stress_point_cbar', Number(e.target.value))} />
              </Field>
              <Field label="Punto saturación (cbar)">
                <input className="input" type="number" step="1" min="0" value={cfgForm.waterlog_point_cbar || ''} onChange={e => cf('waterlog_point_cbar', Number(e.target.value))} />
              </Field>
              <Field label="Notas" full>
                <input className="input" value={cfgForm.notes || ''} onChange={e => cf('notes', e.target.value)} />
              </Field>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6, display: 'block' }}>Kc por etapa fenológica</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {['floracion', 'cuaje', 'llenado', 'maduracion'].map(stage => (
                    <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, width: 80, textTransform: 'capitalize' }}>{stage}:</span>
                      <input className="input" type="number" step="0.01" min="0" max="2" style={{ width: 80 }}
                        value={cfgForm.kc_by_stage?.[stage] ?? ''} onChange={e => cf('kc_by_stage', { ...cfgForm.kc_by_stage, [stage]: Number(e.target.value) })} />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="btn-secondary" onClick={() => setEditCampo(null)}>Cancelar</button>
                <button className="btn-primary" onClick={saveConfig} disabled={saving} style={{ background: '#14532d' }}>
                  <Save size={14} /> {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </Modal>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
          {campos.map(c => {
            const cfg = configMap[c.id_campo]
            return (
              <div key={c.id_campo} style={{ background: '#f9fafb', borderRadius: 8, padding: 12, border: '1px solid #e5e7eb', fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <strong style={{ color: '#1F3A5F' }}>{c.id_campo} — {c.nombre}</strong>
                  <button onClick={() => cfg ? startEdit(cfg) : startNew(c.id_campo)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontSize: 11, fontWeight: 600 }}>
                    {cfg ? 'Editar' : '+ Crear'}
                  </button>
                </div>
                {cfg ? (
                  <div style={{ color: '#6b7280', lineHeight: 1.6 }}>
                    {cfg.irrigation_type} · {cfg.emitters_per_tree} emisores × {cfg.emitter_flow_lph} L/h<br />
                    Umbrales: {cfg.waterlog_point_cbar}–{cfg.field_capacity_cbar}–{cfg.refill_point_cbar}–{cfg.stress_point_cbar} cbar
                  </div>
                ) : (
                  <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>Sin configurar</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1F3A5F', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Droplets size={24} /> Riego & Humedad de Suelo
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
            Monitoreo de humedad, eventos de irrigación y balance hídrico — 350 ha goteo
          </p>
        </div>
        <button className="btn-secondary" onClick={() => setShowConfig(!showConfig)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Settings size={14} /> {showConfig ? 'Ocultar Config' : 'Configuración'}
          {showConfig ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <TabBtn active={tab === 'dashboard'} icon={BarChart3} label="Dashboard" onClick={() => setTab('dashboard')} />
        <TabBtn active={tab === 'lecturas'} icon={ThermometerSun} label="Lecturas" onClick={() => setTab('lecturas')} />
        <TabBtn active={tab === 'riego'} icon={Droplets} label="Riego" onClick={() => setTab('riego')} />
        <TabBtn active={tab === 'balance'} icon={CloudRain} label="Balance Hídrico" onClick={() => setTab('balance')} />
      </div>

      {/* Config panel (collapsible) */}
      {showConfig && <div style={{ marginBottom: 16 }}><ConfigPanel /></div>}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>
          <RefreshCw size={18} className="animate-spin" style={{ display: 'inline' }} /> Cargando…
        </div>
      )}

      {/* Tab content */}
      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'lecturas' && <LecturasTab />}
      {tab === 'riego' && <RiegoTab />}
      {tab === 'balance' && <BalanceTab />}
    </div>
  )
}

// ── Table styles ──
const th = { padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, letterSpacing: '0.03em' }
const td = { padding: '8px 12px', textAlign: 'left', color: '#374151' }
