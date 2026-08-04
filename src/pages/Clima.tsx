import { useEffect, useState, useCallback } from 'react'
import api from '../api'
import { useApi } from '../hooks/useApi'
import toast from 'react-hot-toast'
import {
  Thermometer, Droplets, Wind, Sun, CloudRain, RefreshCw, Bell, BellOff,
  Plus, Trash2, Edit, Check, ChevronDown, ChevronUp, AlertTriangle, Zap, Leaf
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ComposedChart, Legend, CartesianGrid
} from 'recharts'
import RuleForm from '../components/clima/RuleForm'

const TABS = ['Actual', 'Pronóstico', 'Historial']

const severityColor: Record<string, string> = { info: '#3b82f6', warning: '#f59e0b', critical: '#ef4444' }

const riskBadge = (val: number | null) => {
  if (val == null) return { bg: '#e5e7eb', color: '#6b7280', label: 'N/A' }
  if (val <= 3) return { bg: '#dcfce7', color: '#166534', label: 'Bajo' }
  if (val <= 6) return { bg: '#fef9c3', color: '#854d0e', label: 'Medio' }
  return { bg: '#fee2e2', color: '#991b1b', label: 'Alto' }
}

const dayName = (dateStr: string) => {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('es-DO', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function Clima() {
  const [tab, setTab] = useState('Actual')
  const [current, setCurrent] = useState<any>(null)
  const [forecast, setForecast] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [editRule, setEditRule] = useState<any>(null)
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [fechaHasta, setFechaHasta] = useState(() => new Date().toISOString().split('T')[0])

  const { data: rulesData, refetch: loadRules } = useApi<any[]>('/clima/alert-rules', { immediate: false })
  const rules = rulesData ?? []

  const loadCurrent = useCallback(async () => {
    try {
      const [c, a] = await Promise.all([
        api.get('/clima/current'),
        api.get('/clima/alerts'),
      ])
      setCurrent(c.data)
      setAlerts(a.data)
    } catch { toast.error('Error al cargar clima actual') }
  }, [])

  const loadForecast = useCallback(async () => {
    try {
      const r = await api.get('/clima/forecast')
      setForecast(r.data)
    } catch { toast.error('Error al cargar pronóstico') }
  }, [])

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get(`/clima/history?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`)
      setHistory(r.data)
    } catch { toast.error('Error al cargar historial') }
    finally { setLoading(false) }
  }, [fechaDesde, fechaHasta])

  useEffect(() => {
    if (tab === 'Actual') { loadCurrent(); loadRules() }
    if (tab === 'Pronóstico') loadForecast()
    if (tab === 'Historial') loadHistory()
  }, [tab, loadCurrent, loadForecast, loadHistory, loadRules])

  // Auto-refresh current weather every 5 minutes
  useEffect(() => {
    if (tab !== 'Actual') return
    const iv = setInterval(loadCurrent, 300000)
    return () => clearInterval(iv)
  }, [tab, loadCurrent])

  async function doSync() {
    setSyncing(true)
    try {
      const r = await api.post('/clima/sync')
      toast.success(`${r.data.message}: ${r.data.readings_stored} lecturas, ${r.data.days_summarized} días`)
      if (tab === 'Historial') loadHistory()
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Error al sincronizar')
    } finally { setSyncing(false) }
  }

  async function saveRule(rule: any) {
    try {
      if (rule.id) {
        await api.put(`/clima/alert-rules/${rule.id}`, rule)
        toast.success('Regla actualizada')
      } else {
        await api.post('/clima/alert-rules', rule)
        toast.success('Regla creada')
      }
      setEditRule(null)
      loadRules()
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Error al guardar regla') }
  }

  async function deleteRule(id: number) {
    if (!confirm('¿Eliminar esta regla de alerta?')) return
    try {
      await api.delete(`/clima/alert-rules/${id}`)
      toast.success('Regla eliminada')
      loadRules()
    } catch { toast.error('Error al eliminar') }
  }

  async function acknowledgeAlert(id: number) {
    try {
      await api.post(`/clima/alerts/${id}/acknowledge`, { action_taken: 'Revisado' })
      toast.success('Alerta reconocida')
      loadCurrent()
    } catch { toast.error('Error') }
  }

  const card = {
    background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb'
  }
  const header = {
    background: 'linear-gradient(135deg, #1F3A5F 0%, #2d5a8e 100%)',
    color: '#fff', padding: '24px 28px', borderRadius: 12, marginBottom: 20
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>🌤️ Estación Meteorológica</h1>
            <p style={{ margin: '4px 0 0', opacity: 0.85, fontSize: 14 }}>
              Monitoreo climático — Rancho Arriba, San José de Ocoa
            </p>
          </div>
          <button
            onClick={doSync}
            disabled={syncing}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13,
            }}
          >
            <RefreshCw size={16} style={syncing ? { animation: 'spin 1s linear infinite' } : undefined} />
            {syncing ? 'Sincronizando...' : 'Sincronizar Datos'}
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginTop: 16 }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 600, transition: 'all 0.2s',
                background: tab === t ? '#fff' : 'rgba(255,255,255,0.12)',
                color: tab === t ? '#1F3A5F' : 'rgba(255,255,255,0.8)',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {tab === 'Actual' && <TabActual current={current} alerts={alerts} acknowledge={acknowledgeAlert} card={card} />}
      {tab === 'Pronóstico' && <TabPronostico forecast={forecast} card={card} />}
      {tab === 'Historial' && (
        <TabHistorial
          history={history} loading={loading} card={card}
          fechaDesde={fechaDesde} fechaHasta={fechaHasta}
          setFechaDesde={setFechaDesde} setFechaHasta={setFechaHasta}
          onSearch={loadHistory}
        />
      )}

      {/* Alert Rules Panel */}
      <div style={{ ...card, marginTop: 20 }}>
        <button
          onClick={() => { setShowRules(!showRules); if (!showRules) loadRules() }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: 16, fontWeight: 600, color: '#1F3A5F',
          }}
        >
          <Bell size={18} />
          Reglas de Alerta ({rules?.length ?? 0})
          {showRules ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showRules && (
          <div style={{ marginTop: 16 }}>
            <button
              onClick={() => setEditRule({ name: '', variable: 'temperature_c', condition: 'gt', threshold_value: null, severity: 'warning', is_active: true, cooldown_minutes: 60 })}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                background: '#166534', color: '#fff', border: 'none', borderRadius: 6,
                cursor: 'pointer', fontSize: 13, marginBottom: 12,
              }}
            >
              <Plus size={14} /> Nueva Regla
            </button>

            {editRule && (
              <RuleForm rule={editRule} onSave={saveRule} onCancel={() => setEditRule(null)} />
            )}

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                    {['Nombre', 'Variable', 'Condición', 'Umbral', 'Severidad', 'Activa', 'Acciones'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rules && rules.map((r: any) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 500 }}>{r.name}</td>
                      <td style={{ padding: '8px 12px' }}>{r.variable}</td>
                      <td style={{ padding: '8px 12px' }}>{r.condition}</td>
                      <td style={{ padding: '8px 12px' }}>{r.threshold_value}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                          background: severityColor[r.severity] + '20', color: severityColor[r.severity],
                        }}>{r.severity}</span>
                      </td>
                      <td style={{ padding: '8px 12px' }}>{r.is_active ? '✅' : '❌'}</td>
                      <td style={{ padding: '8px 12px', display: 'flex', gap: 6 }}>
                        <button onClick={() => setEditRule(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6' }}><Edit size={14} /></button>
                        <button onClick={() => deleteRule(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                  {rules && rules.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>No hay reglas configuradas</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════ Tab Actual ════════════════════

function TabActual({ current, alerts, acknowledge, card }: any) {
  if (!current) return (
    <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
      <Thermometer size={40} style={{ margin: '0 auto 12px' }} />
      <p>Cargando datos meteorológicos...</p>
    </div>
  )

  const metrics = [
    { icon: <Thermometer size={28} color="#ef4444" />, label: 'Temperatura', value: `${current.temperature_c}°C`, bg: '#fef2f2' },
    { icon: <Droplets size={28} color="#3b82f6" />, label: 'Humedad', value: `${current.humidity_pct}%`, bg: '#eff6ff' },
    { icon: <Wind size={28} color="#64748b" />, label: 'Viento', value: `${current.wind_speed_kmh} km/h`, sub: `Ráfaga: ${current.wind_gust_kmh} km/h`, bg: '#f8fafc' },
    { icon: <CloudRain size={28} color="#0ea5e9" />, label: 'Precipitación', value: `${current.precipitation_mm} mm`, bg: '#ecfeff' },
    { icon: <Sun size={28} color="#f59e0b" />, label: 'Índice UV', value: current.uv_index, bg: '#fffbeb' },
    { icon: <Zap size={28} color="#8b5cf6" />, label: 'VPD', value: `${current.vpd_kpa} kPa`, bg: '#f5f3ff' },
  ]

  const activeAlerts = alerts.filter((a: any) => !a.acknowledged_at)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
        {metrics.map((m, i) => (
          <div key={i} style={{ ...card, background: m.bg, textAlign: 'center', padding: 20 }}>
            <div style={{ marginBottom: 8 }}>{m.icon}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>{m.value}</div>
            {m.sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{m.sub}</div>}
          </div>
        ))}
      </div>

      {current.timestamp && (
        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 12 }}>
          Última lectura: {new Date(current.timestamp).toLocaleString('es-DO')}
        </p>
      )}

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1F3A5F', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} color="#f59e0b" /> Alertas Activas ({activeAlerts.length})
          </h3>
          {activeAlerts.map((a: any) => (
            <div
              key={a.id}
              style={{
                ...card, marginBottom: 8, display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', borderLeft: `4px solid ${severityColor[a.severity] || '#6b7280'}`,
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{a.message}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  {a.triggered_at && new Date(a.triggered_at).toLocaleString('es-DO')} — Valor: {a.trigger_value}
                </div>
              </div>
              <button
                onClick={() => acknowledge(a.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px',
                  background: '#166534', color: '#fff', border: 'none', borderRadius: 6,
                  cursor: 'pointer', fontSize: 12,
                }}
              >
                <Check size={14} /> Reconocer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ════════════════════ Tab Pronóstico ════════════════════

function TabPronostico({ forecast, card }: any) {
  if (!forecast.length) return (
    <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
      <Sun size={40} style={{ margin: '0 auto 12px' }} />
      <p>Cargando pronóstico...</p>
    </div>
  )

  const weatherIcon = (rain: number, uv: number) => {
    if (rain > 10) return '🌧️'
    if (rain > 2) return '🌦️'
    if (uv > 8) return '☀️'
    return '⛅'
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
      {forecast.map((d: any, i: number) => (
        <div key={i} style={{ ...card, textAlign: 'center', padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1F3A5F', marginBottom: 8 }}>
            {dayName(d.date)}
          </div>
          <div style={{ fontSize: 36, marginBottom: 8 }}>
            {weatherIcon(d.precipitation_mm, d.uv_max)}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>
            {d.temp_max}° <span style={{ color: '#94a3b8', fontWeight: 400 }}>/ {d.temp_min}°</span>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: '#64748b', lineHeight: 1.8 }}>
            <div><CloudRain size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {d.precipitation_mm} mm</div>
            <div><Wind size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {d.wind_max_kmh} km/h</div>
            <div><Sun size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> UV {d.uv_max}</div>
            <div><Leaf size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> ET₀ {d.et0_mm} mm</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ════════════════════ Tab Historial ════════════════════

function TabHistorial({ history, loading, card, fechaDesde, fechaHasta, setFechaDesde, setFechaHasta, onSearch }: any) {
  const chartData = [...history].reverse().map((h: any) => ({
    date: h.date?.slice(5) || '',
    'T.Máx': h.temp_max,
    'T.Mín': h.temp_min,
    'Lluvia mm': h.rainfall_total_mm,
  }))

  return (
    <div>
      {/* Date filters */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'end', marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Desde</label>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Hasta</label>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }} />
        </div>
        <button onClick={onSearch}
          style={{
            padding: '8px 20px', background: '#166534', color: '#fff', border: 'none',
            borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600, height: 38,
          }}>
          Buscar
        </button>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div style={{ ...card, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1F3A5F', marginBottom: 12 }}>
            Temperatura y Precipitación
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="temp" tick={{ fontSize: 11 }} unit="°C" />
              <YAxis yAxisId="rain" orientation="right" tick={{ fontSize: 11 }} unit="mm" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="rain" dataKey="Lluvia mm" fill="#93c5fd" radius={[4, 4, 0, 0]} />
              <Line yAxisId="temp" dataKey="T.Máx" stroke="#ef4444" strokeWidth={2} dot={false} />
              <Line yAxisId="temp" dataKey="T.Mín" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Cargando...</div>
      ) : (
        <div style={{ ...card, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                {['Fecha', 'T.Mín', 'T.Máx', 'Lluvia', 'ET₀', 'GDD', 'Humedad', 'Viento', 'Antracnosis', 'Phytophthora'].map(h => (
                  <th key={h} style={{ padding: '10px 10px', textAlign: 'left', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((r: any) => {
                const arisk = riskBadge(r.anthracnose_risk)
                const prisk = riskBadge(r.phytophthora_risk)
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 500, whiteSpace: 'nowrap' }}>{r.date}</td>
                    <td style={{ padding: '8px 10px', color: '#3b82f6' }}>{r.temp_min != null ? `${r.temp_min}°` : '—'}</td>
                    <td style={{ padding: '8px 10px', color: '#ef4444' }}>{r.temp_max != null ? `${r.temp_max}°` : '—'}</td>
                    <td style={{ padding: '8px 10px' }}>{r.rainfall_total_mm != null ? `${r.rainfall_total_mm} mm` : '—'}</td>
                    <td style={{ padding: '8px 10px' }}>{r.et0_mm != null ? `${r.et0_mm} mm` : '—'}</td>
                    <td style={{ padding: '8px 10px' }}>{r.gdd_base10 != null ? r.gdd_base10.toFixed(1) : '—'}</td>
                    <td style={{ padding: '8px 10px' }}>{r.humidity_avg != null ? `${r.humidity_avg}%` : '—'}</td>
                    <td style={{ padding: '8px 10px' }}>{r.wind_avg_kmh != null ? `${r.wind_avg_kmh} km/h` : '—'}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                        background: arisk.bg, color: arisk.color,
                      }}>{r.anthracnose_risk != null ? `${r.anthracnose_risk} ${arisk.label}` : arisk.label}</span>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                        background: prisk.bg, color: prisk.color,
                      }}>{r.phytophthora_risk != null ? `${r.phytophthora_risk} ${prisk.label}` : prisk.label}</span>
                    </td>
                  </tr>
                )
              })}
              {!history.length && (
                <tr><td colSpan={10} style={{ padding: 30, textAlign: 'center', color: '#9ca3af' }}>
                  No hay datos en el rango seleccionado. Presiona "Sincronizar Datos" para importar.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}