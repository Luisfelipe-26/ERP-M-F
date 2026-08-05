import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  MapPin, ClipboardList, DollarSign, AlertTriangle, Droplets, TrendingUp,
  Sun, Cloud, CloudRain, Bug, Leaf, RefreshCw, Download, Activity,
  Thermometer, Wind, Eye, ShoppingCart, ChevronRight, Sprout
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts'

/* ─── Helpers ─── */
const fmt = n => `RD$ ${Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 0 })}`
const fmtK = n => { const v = Number(n || 0); return v >= 1000 ? `${(v/1000).toFixed(1)}k` : v.toFixed(0) }
const CHART_COLORS = ['#2D6A4F', '#219EBC', '#F4A261', '#E76F51', '#6366F1', '#94A3B8']
const STATUS_COLORS = { green: '#22c55e', yellow: '#eab308', red: '#ef4444' }

const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos Días'
  if (h < 18) return 'Buenas Tardes'
  return 'Buenas Noches'
}

function getDateStr() {
  const d = new Date()
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}

/* ─── KPI Card ─── */
function KpiCard({ label, value, subtitle, icon: Icon, accentColor, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        height: 120, borderRadius: 12, background: '#fff', padding: '16px 20px',
        borderLeft: `4px solid ${accentColor}`, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', cursor: onClick ? 'pointer' : 'default',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', transition: 'box-shadow 0.2s',
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)' }}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Icon size={16} color={accentColor} />
        <span style={{ fontSize: 13, fontWeight: 500, color: '#6B7280' }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#1A1A2E', lineHeight: 1 }}>{value ?? '—'}</div>
      {subtitle && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{subtitle}</div>}
    </div>
  )
}

/* ─── Briefing Panel ─── */
function BriefingPanel({ icon: Icon, title, children, bgGradient }) {
  return (
    <div style={{
      flex: 1, borderRadius: 12, padding: '16px 20px', background: bgGradient,
      minWidth: 200, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Icon size={18} color="#374151" />
        <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{title}</span>
      </div>
      <div style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.6 }}>{children}</div>
    </div>
  )
}

/* ─── Campo Card ─── */
function CampoCard({ campo }) {
  const dotColor = STATUS_COLORS[campo.status] || '#94a3b8'
  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '12px 14px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: dotColor, borderRadius: '10px 10px 0 0',
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 2 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1F2937' }}>{campo.id_campo}</div>
          <div style={{ fontSize: 11, color: '#9CA3AF' }}>
            {campo.area_ha ? `${campo.area_ha} ha` : '—'}{campo.bloque ? ` · B${campo.bloque}` : ''}
          </div>
        </div>
        <div style={{
          width: 10, height: 10, borderRadius: '50%', background: dotColor,
          boxShadow: `0 0 6px ${dotColor}80`, flexShrink: 0, marginTop: 3,
        }} />
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
        {campo.ot_open > 0 && (
          <span style={{ fontSize: 10, background: '#EDE9FE', color: '#7C3AED', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
            {campo.ot_open} OT
          </span>
        )}
        {campo.issues.includes('pest') && (
          <span style={{ fontSize: 10, background: '#FEF3C7', color: '#92400E', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
            <Bug size={9} style={{ display: 'inline', verticalAlign: 'middle' }} /> Plaga
          </span>
        )}
        {campo.issues.includes('water') && (
          <span style={{ fontSize: 10, background: '#DBEAFE', color: '#1E40AF', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
            <Droplets size={9} style={{ display: 'inline', verticalAlign: 'middle' }} /> Déficit
          </span>
        )}
        {campo.cost_month > 0 && (
          <span style={{ fontSize: 10, color: '#6B7280' }}>{fmt(campo.cost_month)}</span>
        )}
      </div>
    </div>
  )
}


/* ═══════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [briefing, setBriefing] = useState(null)
  const [campoStatus, setCampoStatus] = useState([])
  const [costosCampo, setCostosCampo] = useState([])
  const [costosAct, setCostosAct] = useState([])
  const [liveWeather, setLiveWeather] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [s, b, cs, cc, ca] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/briefing'),
        api.get('/dashboard/campo-status'),
        api.get('/dashboard/costos-por-campo'),
        api.get('/dashboard/costos-por-actividad'),
      ])
      setStats(s.data)
      setBriefing(b.data)
      setCampoStatus(cs.data)
      setCostosCampo(cc.data.filter(x => x.costo_total > 0).sort((a, b) => b.costo_total - a.costo_total).slice(0, 12))
      setCostosAct(ca.data.filter(x => x.costo_total > 0).sort((a, b) => b.costo_total - a.costo_total).slice(0, 8))
      // Fetch live weather from Open-Meteo (non-blocking)
      axios.get('https://api.open-meteo.com/v1/forecast', {
        params: {
          latitude: 18.49, longitude: -69.98,
          current: 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m',
          daily: 'precipitation_sum',
          timezone: 'America/Santo_Domingo',
          forecast_days: 1,
        },
        timeout: 10000,
      }).then(r => {
        const c = r.data.current
        setLiveWeather({
          temperature_c: c.temperature_2m,
          humidity_pct: c.relative_humidity_2m,
          precipitation_mm: c.precipitation,
          wind_speed_kmh: c.wind_speed_10m,
          daily_rain_mm: r.data.daily?.precipitation_sum?.[0] ?? 0,
        })
      }).catch(() => {})
    } catch {
      setError('Error al cargar datos del dashboard.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function exportNomina() {
    const now = new Date()
    try {
      const res = await api.get(`/dashboard/export/nomina-csv?mes=${now.getMonth()+1}&ano=${now.getFullYear()}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `nomina_${String(now.getMonth()+1).padStart(2,'0')}_${now.getFullYear()}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch { toast.error('Error al exportar nómina') }
  }

  /* ─── Loading / Error ─── */
  if (loading && !stats) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center', color: '#6b7280' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🌱</div>
        <p style={{ fontSize: 15 }}>Cargando datos del campo...</p>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <AlertTriangle size={40} color="#E63946" style={{ marginBottom: 12 }} />
        <p style={{ color: '#E63946', marginBottom: 16, fontSize: 15 }}>{error}</p>
        <button className="btn-primary" onClick={load}>Reintentar</button>
      </div>
    </div>
  )

  const w = liveWeather || briefing?.weather
  const fin = briefing?.financial

  /* Chart data: OTs by estado */
  const otEstadoData = []
  if (stats) {
    const cerradas = (stats.ordenes_mes || 0) - (stats.ordenes_abiertas || 0)
    if (stats.ordenes_abiertas > 0) otEstadoData.push({ name: 'Abiertas', value: stats.ordenes_abiertas })
    if (cerradas > 0) otEstadoData.push({ name: 'Cerradas', value: cerradas })
  }

  /* Chart data: Costos por campo for AreaChart */
  const campoChartData = costosCampo.map(c => ({
    campo: c.campo_id,
    costoOT: c.costo_ot,
    costoOC: c.costo_oc,
  }))

  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh', padding: '0' }}>

      {/* ═══ 1. MORNING BRIEFING STRIP ═══ */}
      <div style={{
        background: 'linear-gradient(135deg, #1F3A5F 0%, #2D6A4F 100%)',
        borderRadius: 16, padding: '24px 28px', marginBottom: 20, color: '#fff',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
              {getGreeting()} <span style={{ fontSize: 20, opacity: 0.85 }}>☀️</span>
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, opacity: 0.8 }}>{getDateStr()} · Finca CORVUS</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={exportNomina}
              style={{
                background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
                padding: '8px 14px', color: '#fff', fontSize: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Download size={13} /> Nómina
            </button>
            <button
              onClick={load}
              disabled={loading}
              style={{
                background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
                padding: '8px 14px', color: '#fff', fontSize: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Actualizar
            </button>
          </div>
        </div>

        {/* 3 Briefing Panels */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <BriefingPanel icon={Sun} title="Clima" bgGradient="linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)">
            {w ? (
              <>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1E3A5F', marginBottom: 4 }}>
                  {w.temperature_c != null ? `${w.temperature_c.toFixed(1)}°C` : '—'}
                </div>
                <div>Humedad: {w.humidity_pct != null ? `${w.humidity_pct.toFixed(0)}%` : '—'}</div>
                <div>Lluvia hoy: {w.daily_rain_mm != null ? `${w.daily_rain_mm.toFixed(1)} mm` : '0 mm'}</div>
                <div>Viento: {w.wind_speed_kmh != null ? `${w.wind_speed_kmh.toFixed(0)} km/h` : '—'}</div>
                <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7 }}>
                  {liveWeather
                    ? <span style={{ color: '#22c55e' }}>● En vivo</span>
                    : <span style={{ color: '#eab308' }}>● Datos almacenados</span>}
                </div>
                {(briefing?.weather_alerts > 0) && (
                  <div style={{ marginTop: 4, color: '#E63946', fontWeight: 600 }}>
                    ⚠️ {briefing.weather_alerts} alerta(s) activa(s)
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: '#9CA3AF' }}>Sin datos meteorológicos</div>
            )}
          </BriefingPanel>

          <BriefingPanel icon={Bug} title="Sanidad Vegetal" bgGradient="linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)">
            <div>Monitoreos (7d): <strong>{briefing?.pest?.recent_visits_7d ?? 0}</strong></div>
            <div>Umbrales excedidos: <strong style={{ color: briefing?.pest?.alerts_threshold > 0 ? '#E63946' : '#2D6A4F' }}>
              {briefing?.pest?.alerts_threshold ?? 0}
            </strong></div>
            <div>Trampas activas: <strong>{briefing?.pest?.active_traps ?? 0}</strong></div>
            {briefing?.productos_bajo_stock > 0 && (
              <div style={{ marginTop: 4, color: '#E63946', fontWeight: 600 }}>
                📦 {briefing.productos_bajo_stock} producto(s) stock bajo
              </div>
            )}
          </BriefingPanel>

          <BriefingPanel icon={Droplets} title="Riego" bgGradient="linear-gradient(135deg, #ECFEFF 0%, #CFFAFE 100%)">
            <div>Riegos hoy: <strong>{briefing?.irrigation?.events_today ?? 0}</strong></div>
            <div>Lámina aplicada: <strong>{briefing?.irrigation?.volume_mm_today?.toFixed(1) ?? '0'} mm</strong></div>
            <div>Campos en déficit: <strong style={{ color: briefing?.irrigation?.campos_deficit > 0 ? '#E63946' : '#2D6A4F' }}>
              {briefing?.irrigation?.campos_deficit ?? 0}
            </strong></div>
            {w?.et0_mm != null && <div>ET₀: <strong>{w.et0_mm.toFixed(1)} mm</strong></div>}
          </BriefingPanel>
        </div>
      </div>

      {/* ═══ 2. KPI CARDS ROW ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 20 }}>
        <KpiCard
          label="Ha Activas"
          value={fin?.total_ha?.toFixed(1) ?? stats?.total_campos}
          subtitle={`${stats?.total_campos ?? 0} campos`}
          icon={MapPin}
          accentColor="#2D6A4F"
          onClick={() => navigate('/campos')}
        />
        <KpiCard
          label="OTs Abiertas"
          value={briefing?.ots_open ?? stats?.ordenes_abiertas}
          subtitle={`${briefing?.ots_today ?? 0} programadas hoy`}
          icon={ClipboardList}
          accentColor="#6366F1"
          onClick={() => navigate('/ordenes')}
        />
        <KpiCard
          label="Costo/ha Acum."
          value={fin?.costo_por_ha ? fmt(fin.costo_por_ha) : '—'}
          subtitle="Mes actual"
          icon={TrendingUp}
          accentColor="#F4A261"
        />
        <KpiCard
          label="Alertas Activas"
          value={(briefing?.weather_alerts ?? 0) + (briefing?.pest?.alerts_threshold ?? 0) + (briefing?.productos_bajo_stock ?? 0)}
          subtitle="Clima + Plagas + Stock"
          icon={AlertTriangle}
          accentColor="#E63946"
        />
        <KpiCard
          label="Balance Hídrico"
          value={`${briefing?.irrigation?.campos_deficit ?? 0} déficit`}
          subtitle={`${briefing?.irrigation?.events_today ?? 0} riegos hoy`}
          icon={Droplets}
          accentColor="#219EBC"
        />
        <KpiCard
          label="Costo Total Mes"
          value={fmt(fin?.costo_total_mes)}
          subtitle={`OC pend: ${fmt(briefing?.ocs_pending_total)}`}
          icon={DollarSign}
          accentColor="#E76F51"
        />
      </div>

      {/* ═══ 3. CHARTS ROW ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16, marginBottom: 20 }}>
        {/* Left: Costo por Campo Bar Chart */}
        <div style={{
          background: '#fff', borderRadius: 12, padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1A1A2E' }}>
            Costo Acumulado por Campo
          </h3>
          {campoChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={campoChartData} margin={{ left: 0, right: 8 }}>
                <XAxis dataKey="campo" tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={v => `${fmtK(v)}`} width={48} />
                <Tooltip
                  formatter={(v, name) => [fmt(v), name === 'costoOT' ? 'Órdenes' : 'Compras']}
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="costoOT" stackId="a" fill="#2D6A4F" name="costoOT" radius={[0,0,0,0]} />
                <Bar dataKey="costoOC" stackId="a" fill="#219EBC" name="costoOC" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
              Sin datos de costos por campo aún
            </div>
          )}
        </div>

        {/* Right: OTs por Estado Pie */}
        <div style={{
          background: '#fff', borderRadius: 12, padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1A1A2E' }}>
            Distribución por Actividad
          </h3>
          {costosAct.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={costosAct}
                  dataKey="costo_total"
                  nameKey="actividad"
                  cx="50%" cy="50%"
                  outerRadius={85}
                  label={({ percent }) => percent > 0.05 ? `${(percent*100).toFixed(0)}%` : ''}
                >
                  {costosAct.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip
                  formatter={v => [fmt(v), 'Costo']}
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend
                  formatter={v => v?.length > 20 ? v.slice(0, 18) + '…' : v}
                  iconSize={10}
                  wrapperStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
              Sin datos de actividades aún
            </div>
          )}
        </div>
      </div>

      {/* ═══ 4. BOTTOM ROW: Campo Grid + Activity Feed ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Left: Campo Status Grid */}
        <div style={{
          background: '#fff', borderRadius: 12, padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1A1A2E' }}>
              Estado de Campos
            </h3>
            <div style={{ display: 'flex', gap: 10, fontSize: 11, color: '#6B7280' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} /> Normal
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#eab308', display: 'inline-block' }} /> Atención
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} /> Crítico
              </span>
            </div>
          </div>
          {campoStatus.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {campoStatus.map(c => <CampoCard key={c.id_campo} campo={c} />)}
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>
              <Sprout size={32} style={{ marginBottom: 8 }} />
              <p>Sin campos activos</p>
            </div>
          )}
        </div>

        {/* Right: Activity / Summary Feed */}
        <div style={{
          background: '#fff', borderRadius: 12, padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#1A1A2E' }}>
            Resumen Operativo
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* OTs */}
            <div
              onClick={() => navigate('/ordenes')}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                background: '#F5F3FF', borderRadius: 10, cursor: 'pointer',
              }}
            >
              <ClipboardList size={20} color="#7C3AED" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>Órdenes de Trabajo</div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>
                  {briefing?.ots_open ?? 0} abiertas · {briefing?.ots_today ?? 0} hoy · {stats?.ordenes_mes ?? 0} en el mes
                </div>
              </div>
              <ChevronRight size={16} color="#9CA3AF" />
            </div>

            {/* OCs */}
            <div
              onClick={() => navigate('/compras')}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                background: '#FFF7ED', borderRadius: 10, cursor: 'pointer',
              }}
            >
              <ShoppingCart size={20} color="#EA580C" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>Órdenes de Compra</div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>
                  {briefing?.ocs_pending ?? 0} pendientes · {fmt(briefing?.ocs_pending_total)}
                </div>
              </div>
              <ChevronRight size={16} color="#9CA3AF" />
            </div>

            {/* Costos */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
              background: '#F0FDF4', borderRadius: 10,
            }}>
              <DollarSign size={20} color="#2D6A4F" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>Costos del Mes</div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>
                  MO: {fmt(fin?.costo_mo_mes)} · Insumos: {fmt(fin?.costo_insumos_mes)}
                </div>
              </div>
            </div>

            {/* Productos bajo stock */}
            {(briefing?.productos_bajo_stock > 0) && (
              <div
                onClick={() => navigate('/productos')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  background: '#FEF2F2', borderRadius: 10, cursor: 'pointer',
                }}
              >
                <AlertTriangle size={20} color="#E63946" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#991B1B' }}>Stock Bajo</div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>
                    {briefing.productos_bajo_stock} producto(s) por debajo del mínimo
                  </div>
                </div>
                <ChevronRight size={16} color="#9CA3AF" />
              </div>
            )}

            {/* Sanidad */}
            <div
              onClick={() => navigate('/sanidad')}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                background: '#FFFBEB', borderRadius: 10, cursor: 'pointer',
              }}
            >
              <Bug size={20} color="#D97706" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>Sanidad Vegetal</div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>
                  {briefing?.pest?.recent_visits_7d ?? 0} monitoreos (7d) · {briefing?.pest?.alerts_threshold ?? 0} alertas
                </div>
              </div>
              <ChevronRight size={16} color="#9CA3AF" />
            </div>

            {/* Riego */}
            <div
              onClick={() => navigate('/riego')}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                background: '#ECFEFF', borderRadius: 10, cursor: 'pointer',
              }}
            >
              <Droplets size={20} color="#0891B2" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>Riego</div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>
                  {briefing?.irrigation?.events_today ?? 0} eventos hoy · {briefing?.irrigation?.campos_deficit ?? 0} campos en déficit
                </div>
              </div>
              <ChevronRight size={16} color="#9CA3AF" />
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
