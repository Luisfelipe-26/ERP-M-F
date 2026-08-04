import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import api from '../api'
import toast from 'react-hot-toast'
import {
  Thermometer, Droplets, Wind, Sun, CloudRain, RefreshCw, Bell, BellOff,
  Plus, Trash2, Edit, Check, ChevronDown, ChevronUp, AlertTriangle, Zap, Leaf
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ComposedChart, Legend, CartesianGrid
} from 'recharts'

const TABS = ['Actual', 'Pronóstico', 'Historial']

const FARM_LAT = 18.49
const FARM_LON = -69.98
const FARM_TZ = 'America/Santo_Domingo'

function calcVpd(tempC, humPct) {
  const es = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3))
  const ea = es * (humPct / 100)
  return Math.round((es - ea) * 1000) / 1000
}

const severityColor = { info: '#3b82f6', warning: '#f59e0b', critical: '#ef4444' }
const riskBadge = (val) => {
  if (val == null) return { bg: '#e5e7eb', color: '#6b7280', label: 'N/A' }
  if (val <= 3) return { bg: '#dcfce7', color: '#166534', label: 'Bajo' }
  if (val <= 6) return { bg: '#fef9c3', color: '#854d0e', label: 'Medio' }
  return { bg: '#fee2e2', color: '#991b1b', label: 'Alto' }
}

const dayName = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('es-DO', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function Clima() {
  const [tab, setTab] = useState('Actual')
  const [current, setCurrent] = useState(null)
  const [forecast, setForecast] = useState([])
  const [history, setHistory] = useState([])
  const [alerts, setAlerts] = useState([])
  const [rules, setRules] = useState([])
  const [hourlyData, setHourlyData] = useState([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [nextRefresh, setNextRefresh] = useState(120)
  const [showRules, setShowRules] = useState(false)
  const [editRule, setEditRule] = useState(null)
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [fechaHasta, setFechaHasta] = useState(() => new Date().toISOString().split('T')[0])

  const loadCurrent = useCallback(async () => {
    try {
      const [weatherRes, a] = await Promise.all([
        axios.get('https://api.open-meteo.com/v1/forecast', {
          params: {
            latitude: FARM_LAT, longitude: FARM_LON,
            current: 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index',
            daily: 'precipitation_sum',
            timezone: FARM_TZ,
            forecast_days: 1,
          },
          timeout: 15000,
        }).then(r => {
          const c = r.data.current
          return {
            timestamp: c.time,
            temperature_c: c.temperature_2m,
            humidity_pct: c.relative_humidity_2m,
            precipitation_mm: c.precipitation,
            daily_rain_mm: r.data.daily?.precipitation_sum?.[0] ?? 0,
            wind_speed_kmh: c.wind_speed_10m,
            wind_direction_deg: c.wind_direction_10m,
            wind_gust_kmh: c.wind_gusts_10m,
            uv_index: c.uv_index,
            vpd_kpa: calcVpd(c.temperature_2m ?? 25, c.relative_humidity_2m ?? 70),
            source: 'live',
          }
        }).catch(() => api.get('/clima/current').then(r => ({ ...r.data, source: 'fallback' }))),
        api.get('/clima/alerts'),
      ])
      setCurrent(weatherRes)
      setAlerts(a.data)
      setNextRefresh(120)

      // Fetch last 24 hours of hourly data
      try {
        const hourlyRes = await axios.get('https://api.open-meteo.com/v1/forecast', {
          params: {
            latitude: FARM_LAT, longitude: FARM_LON,
            hourly: 'temperature_2m,relative_humidity_2m,precipitation',
            timezone: FARM_TZ,
            forecast_days: 1,
            past_days: 1,
          },
          timeout: 15000,
        })
        const h = hourlyRes.data.hourly
        const allPoints = h.time.map((t, i) => ({
          hour: t.slice(11, 16),
          temp: h.temperature_2m[i],
          humidity: h.relative_humidity_2m[i],
          rain: h.precipitation[i],
        }))
        setHourlyData(allPoints.slice(-24))
      } catch {
        setHourlyData([])
      }
    } catch { toast.error('Error al cargar clima actual') }
  }, [])

  const loadForecast = useCallback(async () => {
    try {
      const r = await axios.get('https://api.open-meteo.com/v1/forecast', {
        params: {
          latitude: FARM_LAT, longitude: FARM_LON,
          daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,uv_index_max,et0_fao_evapotranspiration',
          timezone: FARM_TZ, forecast_days: 7,
        },
        timeout: 15000,
      })
      const daily = r.data.daily
      const days = daily.time.map((d, i) => ({
        date: d,
        temp_max: daily.temperature_2m_max[i],
        temp_min: daily.temperature_2m_min[i],
        precipitation_mm: daily.precipitation_sum[i],
        wind_max_kmh: daily.wind_speed_10m_max[i],
        uv_max: daily.uv_index_max[i],
        et0_mm: daily.et0_fao_evapotranspiration[i],
      }))
      setForecast(days)
    } catch {
      try {
        const fallback = await api.get('/clima/forecast')
        setForecast(fallback.data)
      } catch { toast.error('Error al cargar pronóstico') }
    }
  }, [])

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get(`/clima/history?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`)
      setHistory(r.data)
    } catch { toast.error('Error al cargar historial') }
    finally { setLoading(false) }
  }, [fechaDesde, fechaHasta])

  const loadRules = useCallback(async () => {
    try {
      const r = await api.get('/clima/alert-rules')
      setRules(r.data)
    } catch {}
  }, [])

  useEffect(() => {
    if (tab === 'Actual') { loadCurrent(); loadRules() }
    if (tab === 'Pronóstico') loadForecast()
    if (tab === 'Historial') loadHistory()
  }, [tab, loadCurrent, loadForecast, loadHistory, loadRules])

  // Auto-refresh current weather every 2 minutes
  useEffect(() => {
    if (tab !== 'Actual') return
    const iv = setInterval(loadCurrent, 120000)
    return () => clearInterval(iv)
  }, [tab, loadCurrent])

  // Countdown timer for next refresh
  useEffect(() => {
    if (tab !== 'Actual') return
    const iv = setInterval(() => setNextRefresh(n => n <= 1 ? 120 : n - 1), 1000)
    return () => clearInterval(iv)
  }, [tab])

  async function doSync() {
    setSyncing(true)
    try {
      const r = await api.post('/clima/sync')
      toast.success(`${r.data.message}: ${r.data.readings_stored} lecturas, ${r.data.days_summarized} días`)
      if (tab === 'Historial') loadHistory()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al sincronizar')
    } finally { setSyncing(false) }
  }

  async function saveRule(rule) {
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
    } catch (e) { toast.error(e.response?.data?.detail || 'Error al guardar regla') }
  }

  async function deleteRule(id) {
    if (!confirm('¿Eliminar esta regla de alerta?')) return
    try {
      await api.delete(`/clima/alert-rules/${id}`)
      toast.success('Regla eliminada')
      loadRules()
    } catch { toast.error('Error al eliminar') }
  }

  async function acknowledgeAlert(id) {
    try {
      await api.post(`/clima/alerts/${id}/acknowledge`, { action_taken: 'Revisado' })
      toast.success('Alerta reconocida')
      loadCurrent()
    } catch { toast.error('Error') }
  }

  // ─── Styles ───
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {tab === 'Actual' && (
              <span style={{ fontSize: 12, color: '#fff', opacity: 0.6 }}>
                ↻ {nextRefresh}s
              </span>
            )}
            <button
              onClick={doSync}
              disabled={syncing}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13,
              }}
            >
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sincronizando...' : 'Sincronizar Datos'}
            </button>
          </div>
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
      {tab === 'Actual' && <TabActual current={current} alerts={alerts} acknowledge={acknowledgeAlert} card={card} hourlyData={hourlyData} />}
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
          onClick={() => setShowRules(!showRules)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: 16, fontWeight: 600, color: '#1F3A5F',
          }}
        >
          <Bell size={18} />
          Reglas de Alerta ({rules.length})
          {showRules ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showRules && (
          <div style={{ marginTop: 16 }}>
            <button
              onClick={() => setEditRule({ name: '', variable: 'temperature_c', condition: 'gt', threshold_value: '', severity: 'warning', is_active: true, cooldown_minutes: 60 })}
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
                  {rules.map(r => (
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
                  {rules.length === 0 && (
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

function TabActual({ current, alerts, acknowledge, card, hourlyData }) {
  if (!current) return (
    <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
      <Thermometer size={40} style={{ margin: '0 auto 12px' }} />
      <p>Cargando datos meteorológicos...</p>
    </div>
  )

  const fv = (v, d=1) => v != null ? Number(v).toFixed(d) : '—'

  const metrics = [
    { icon: <Thermometer size={28} color="#ef4444" />, label: 'Temperatura', value: `${fv(current.temperature_c)}°C`, bg: '#fef2f2' },
    { icon: <Droplets size={28} color="#3b82f6" />, label: 'Humedad', value: `${fv(current.humidity_pct, 0)}%`, bg: '#eff6ff' },
    { icon: <Wind size={28} color="#64748b" />, label: 'Viento', value: `${fv(current.wind_speed_kmh, 0)} km/h`, sub: `Ráfaga: ${fv(current.wind_gust_kmh, 0)} km/h`, bg: '#f8fafc' },
    { icon: <CloudRain size={28} color="#0ea5e9" />, label: 'Lluvia Hoy', value: `${fv(current.daily_rain_mm ?? current.precipitation_mm)} mm`, sub: `Actual: ${fv(current.precipitation_mm)} mm/h`, bg: '#ecfeff' },
    { icon: <Sun size={28} color="#f59e0b" />, label: 'Índice UV', value: fv(current.uv_index, 0), bg: '#fffbeb' },
    { icon: <Zap size={28} color="#8b5cf6" />, label: 'VPD', value: `${fv(current.vpd_kpa, 2)} kPa`, bg: '#f5f3ff' },
  ]

  const activeAlerts = alerts.filter(a => !a.acknowledged_at)

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

      {current.timestamp && (() => {
        const isLive = current.source === 'live'
        const tsDate = new Date(current.timestamp)
        const diffMs = Date.now() - tsDate.getTime()
        const diffMin = Math.floor(diffMs / 60000)
        const diffH = Math.floor(diffMin / 60)
        const diffD = Math.floor(diffH / 24)
        let timeAgo = ''
        if (diffD > 0) timeAgo = ` (hace ${diffD} día${diffD > 1 ? 's' : ''})`
        else if (diffH > 0) timeAgo = ` (hace ${diffH} hora${diffH > 1 ? 's' : ''})`
        else if (diffMin > 1) timeAgo = ` (hace ${diffMin} min)`
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginTop: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: isLive ? '#22c55e' : '#eab308', display: 'inline-block' }} />
            <span style={{ color: '#6b7280' }}>
              {isLive ? 'En vivo' : 'Datos almacenados'} — {tsDate.toLocaleString('es-DO')}
              {!isLive && timeAgo}
            </span>
          </div>
        )
      })()}

      {hourlyData.length > 0 && (
        <div style={{ ...card, marginTop: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1F3A5F', marginBottom: 12 }}>
            Últimas 24 Horas
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
              <YAxis yAxisId="temp" tick={{ fontSize: 11 }} unit="°C" />
              <YAxis yAxisId="rain" orientation="right" tick={{ fontSize: 11 }} unit="mm" />
              <Tooltip />
              <Legend />
              <Line yAxisId="temp" dataKey="temp" name="Temp °C" stroke="#ef4444" strokeWidth={2} dot={false} />
              <Line yAxisId="temp" dataKey="humidity" name="Humedad %" stroke="#3b82f6" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
              <Bar yAxisId="rain" dataKey="rain" name="Lluvia mm" fill="#93c5fd" radius={[2, 2, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1F3A5F', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} color="#f59e0b" /> Alertas Activas ({activeAlerts.length})
          </h3>
          {activeAlerts.map(a => (
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

function TabPronostico({ forecast, card }) {
  if (!forecast.length) return (
    <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
      <Sun size={40} style={{ margin: '0 auto 12px' }} />
      <p>Cargando pronóstico...</p>
    </div>
  )

  const weatherIcon = (rain, uv) => {
    if (rain > 10) return '🌧️'
    if (rain > 2) return '🌦️'
    if (uv > 8) return '☀️'
    return '⛅'
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
      {forecast.map((d, i) => (
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

function TabHistorial({ history, loading, card, fechaDesde, fechaHasta, setFechaDesde, setFechaHasta, onSearch }) {
  const chartData = [...history].reverse().map(h => ({
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
              {history.map(r => {
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

// ════════════════════ Rule Form ════════════════════

function RuleForm({ rule, onSave, onCancel }) {
  const [form, setForm] = useState({ ...rule })
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const inputStyle = {
    padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6,
    fontSize: 13, width: '100%',
  }

  return (
    <div style={{
      background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
      padding: 16, marginBottom: 16,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, color: '#64748b' }}>Nombre</label>
          <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#64748b' }}>Variable</label>
          <select style={inputStyle} value={form.variable} onChange={e => set('variable', e.target.value)}>
            {['temperature_c', 'humidity_pct', 'rainfall_mm', 'wind_speed_kmh', 'wind_gust_kmh', 'uv_index'].map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#64748b' }}>Condición</label>
          <select style={inputStyle} value={form.condition} onChange={e => set('condition', e.target.value)}>
            {['gt', 'gte', 'lt', 'lte'].map(c => (
              <option key={c} value={c}>{c === 'gt' ? '>' : c === 'gte' ? '≥' : c === 'lt' ? '<' : '≤'}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#64748b' }}>Umbral</label>
          <input type="number" style={inputStyle} value={form.threshold_value} onChange={e => set('threshold_value', parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#64748b' }}>Severidad</label>
          <select style={inputStyle} value={form.severity} onChange={e => set('severity', e.target.value)}>
            {['info', 'warning', 'critical'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#64748b' }}>Cooldown (min)</label>
          <input type="number" style={inputStyle} value={form.cooldown_minutes} onChange={e => set('cooldown_minutes', parseInt(e.target.value) || 60)} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button onClick={() => onSave(form)} style={{
          padding: '6px 16px', background: '#166534', color: '#fff', border: 'none',
          borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
        }}>Guardar</button>
        <button onClick={onCancel} style={{
          padding: '6px 16px', background: '#e5e7eb', color: '#374151', border: 'none',
          borderRadius: 6, cursor: 'pointer', fontSize: 13,
        }}>Cancelar</button>
      </div>
    </div>
  )
}
