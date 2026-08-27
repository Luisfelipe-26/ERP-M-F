import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  Cell
} from 'recharts'
import {
  BarChart3, TrendingUp, Users, Package, Droplets, Bug, MapPin, Layers,
  ArrowUpRight, ArrowDownRight, Minus, ChevronUp, ChevronDown, Loader2, RefreshCw,
  Calendar
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'

const COLORS = ['#2D6A4F', '#219EBC', '#F4A261', '#E76F51', '#6A4C93', '#1982C4', '#8AC926', '#FF595E']
const CHART_COLORS = { mo: '#2D6A4F', insumos: '#219EBC', equipo: '#F4A261', total: '#E76F51' }

async function apiFetch(path) {
  const r = await api.get(path)
  return r.data
}

// ─── Shared UI components ────────────────────────────────────────────────────

function KpiCard({ title, value, subtitle, icon: Icon, color = '#2D6A4F', trend }) {
  return (
    <div style={{
      background: 'white', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: 8
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>{title}</span>
        {Icon && <div style={{
          width: 36, height: 36, borderRadius: 10, background: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}><Icon size={18} color={color} /></div>}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>{value}</div>
      {subtitle && <div style={{ fontSize: 12, color: '#6b7280' }}>{subtitle}</div>}
      {trend !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
          {trend > 0 ? <ArrowUpRight size={14} color="#10b981" /> :
           trend < 0 ? <ArrowDownRight size={14} color="#ef4444" /> :
           <Minus size={14} color="#6b7280" />}
          <span style={{ color: trend > 0 ? '#10b981' : trend < 0 ? '#ef4444' : '#6b7280' }}>
            {Math.abs(trend)}%
          </span>
        </div>
      )}
    </div>
  )
}

function TabButton({ active, children, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 20px', fontSize: 14, fontWeight: active ? 600 : 400, cursor: 'pointer',
      borderRadius: '8px 8px 0 0', border: 'none',
      background: active ? 'white' : 'transparent',
      color: active ? '#14532d' : '#6b7280',
      borderBottom: active ? '2px solid #14532d' : '2px solid transparent',
      transition: 'all 0.15s'
    }}>{children}</button>
  )
}

function SortHeader({ label, sortKey, sortConfig, onSort }) {
  const active = sortConfig.key === sortKey
  return (
    <th onClick={() => onSort(sortKey)} style={{
      cursor: 'pointer', userSelect: 'none', padding: '10px 12px', textAlign: 'left',
      fontSize: 12, fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb',
      background: '#f9fafb', whiteSpace: 'nowrap'
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}
        {active && (sortConfig.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
      </span>
    </th>
  )
}

function Badge({ text, color }) {
  const colors = {
    EXCELENTE: { bg: '#dcfce7', fg: '#166534' }, EN_META: { bg: '#dbeafe', fg: '#1e40af' },
    BAJO_META: { bg: '#fef3c7', fg: '#92400e' }, REVISAR: { bg: '#fecaca', fg: '#991b1b' },
    BAJO: { bg: '#dcfce7', fg: '#166534' }, MEDIO: { bg: '#fef3c7', fg: '#92400e' },
    ALTO: { bg: '#fed7aa', fg: '#9a3412' }, CRITICO: { bg: '#fecaca', fg: '#991b1b' },
    adecuado: { bg: '#dcfce7', fg: '#166534' }, deficit_leve: { bg: '#fef3c7', fg: '#92400e' },
    deficit_severo: { bg: '#fecaca', fg: '#991b1b' },
    optimo: { bg: '#dcfce7', fg: '#166534' }, saturado: { bg: '#dbeafe', fg: '#1e40af' },
    seco: { bg: '#fef3c7', fg: '#92400e' }, critico: { bg: '#fecaca', fg: '#991b1b' },
    sin_datos: { bg: '#f3f4f6', fg: '#6b7280' },
  }
  const c = colors[text] || colors[color] || { bg: '#f3f4f6', fg: '#6b7280' }
  return (
    <span style={{
      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: c.bg, color: c.fg, whiteSpace: 'nowrap'
    }}>{text}</span>
  )
}

function Spinner() {
  return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 size={32} className="animate-spin" style={{ color: '#14532d' }} /></div>
}

function formatNum(n) { return n != null ? Number(n).toLocaleString('es-DO', { maximumFractionDigits: 2 }) : '—' }
function formatCur(n) { return n != null ? `RD$ ${Number(n).toLocaleString('es-DO', { maximumFractionDigits: 2 })}` : '—' }

const MONTH_NAMES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function Analytics() {
  const now = new Date()
  const [tab, setTab] = useState('resumen')
  const [loading, setLoading] = useState(true)

  // Filters
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
  const anos = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  // Data stores
  const [tendencia, setTendencia] = useState([])
  const [trabajadores, setTrabajadores] = useState([])
  const [insumos, setInsumos] = useState({ productos: [], top10_by_cost: [] })
  const [campos, setCampos] = useState([])
  const [costoKg, setCostoKg] = useState([])
  const [balance, setBalance] = useState([])
  const [plagas, setPlagas] = useState([])
  const [productividad, setProductividad] = useState({})
  const [rendimiento, setRendimiento] = useState({ por_actividad: [], por_insumo: [], resumen_campos: [] })

  // Sorting
  const [sortConfig, setSortConfig] = useState({ key: 'cost_per_ha', dir: 'asc' })

  // Radar selection
  const [radarCampos, setRadarCampos] = useState([])

  async function loadAll() {
    setLoading(true)
    try {
      const fd = `${ano}-${String(mes).padStart(2, '0')}-01`
      const lastDay = new Date(ano, mes, 0).getDate()
      const fh = `${ano}-${String(mes).padStart(2, '0')}-${lastDay}`

      const [tend, prod, ins, comp, ckg, bal, pest, rend] = await Promise.all([
        apiFetch('/analytics/tendencia-costos?meses=12'),
        apiFetch(`/analytics/productividad-trabajadores?mes=${mes}&ano=${ano}`),
        apiFetch(`/analytics/eficiencia-insumos?fecha_desde=${fd}&fecha_hasta=${fh}`),
        apiFetch(`/analytics/comparativo-campos?ano=${ano}`),
        apiFetch(`/analytics/costo-por-kg?temporada=${ano}`),
        apiFetch(`/analytics/balance-hidrico-resumen?ano=${ano}`),
        apiFetch(`/analytics/presion-plagas?fecha_desde=${fd}&fecha_hasta=${fh}`),
        apiFetch(`/analytics/rendimiento-por-ha?ano=${ano}&mes=${mes}`),
      ])
      setTendencia(tend.tendencia || [])
      setTrabajadores(prod.trabajadores || [])
      setProductividad(prod)
      setInsumos(ins)
      setCampos(comp.campos || [])
      setCostoKg(ckg.campos || [])
      setBalance(bal.campos || [])
      setPlagas(pest.campos || [])
      setRendimiento(rend || { por_actividad: [], por_insumo: [], resumen_campos: [] })
      if (comp.campos?.length >= 2) {
        setRadarCampos(comp.campos.slice(0, 3).map(c => c.campo_id))
      }
    } catch (e) {
      toast.error('Error cargando analytics: ' + e.message)
    }
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [mes, ano])

  function handleSort(key) {
    setSortConfig(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc'
    }))
  }

  const sortedCampos = useMemo(() => {
    const arr = [...campos]
    arr.sort((a, b) => {
      const va = a[sortConfig.key] ?? 0
      const vb = b[sortConfig.key] ?? 0
      if (typeof va === 'string') return sortConfig.dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      return sortConfig.dir === 'asc' ? va - vb : vb - va
    })
    return arr
  }, [campos, sortConfig])

  // ── Radar data ──
  const radarData = useMemo(() => {
    if (!radarCampos.length) return []
    const maxCost = Math.max(...campos.map(c => c.cost_per_ha), 1)
    const maxLabor = Math.max(...campos.map(c => c.labor_cost), 1)
    const maxInput = Math.max(...campos.map(c => c.input_cost), 1)
    const pressureMap = { BAJO: 25, MEDIO: 50, ALTO: 75, CRITICO: 100 }
    const dims = ['Costo/ha', 'Mano de Obra', 'Insumos', 'Riego', 'Presión Plagas']

    return dims.map(dim => {
      const entry = { dimension: dim }
      radarCampos.forEach(cid => {
        const c = campos.find(x => x.campo_id === cid)
        if (!c) return
        if (dim === 'Costo/ha') entry[cid] = Math.round((c.cost_per_ha / maxCost) * 100)
        else if (dim === 'Mano de Obra') entry[cid] = Math.round((c.labor_cost / maxLabor) * 100)
        else if (dim === 'Insumos') entry[cid] = Math.round((c.input_cost / maxInput) * 100)
        else if (dim === 'Riego') entry[cid] = Math.min(100, Math.abs(c.irrigation_deficit))
        else if (dim === 'Presión Plagas') entry[cid] = pressureMap[c.pest_pressure] || 0
      })
      return entry
    })
  }, [radarCampos, campos])

  // ── Chart data prep ──
  const tendenciaChart = tendencia.map(t => ({
    name: `${MONTH_NAMES[t.mes]} ${t.ano}`,
    'Mano de Obra': t.costo_mo,
    'Insumos': t.costo_insumos,
    'Equipo': t.costo_equipo,
    'Total': t.costo_total,
  }))

  const topWorkersChart = trabajadores.slice(0, 10).map(w => ({
    name: w.nombre.split(' ').slice(0, 2).join(' '),
    horas: w.total_horas,
    ganado: w.total_ganado,
    category: w.performance_category,
  }))

  const topInsumosChart = (insumos.top10_by_cost || []).map(p => ({
    name: p.nombre?.length > 25 ? p.nombre.slice(0, 25) + '…' : p.nombre,
    costo: p.total_cost,
  }))

  // ── Computed KPIs ──
  const avgCostoKg = costoKg.length ? (costoKg.reduce((s, c) => s + c.cost_per_kg_estimate, 0) / costoKg.length).toFixed(3) : '—'
  const topWorker = trabajadores[0]?.nombre || '—'
  const topProducto = insumos.top10_by_cost?.[0]?.nombre || '—'
  const irrigationEff = balance.length
    ? Math.round(balance.reduce((s, b) => s + (b.irrigation_ratio || 0), 0) / balance.length * 100)
    : 0

  if (loading) return <Spinner />

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1F3A5F', margin: 0 }}>
            <BarChart3 size={28} style={{ verticalAlign: 'middle', marginRight: 10, color: '#14532d' }} />
            Analytics Avanzado
          </h1>
          <p style={{ color: '#6b7280', fontSize: 14, margin: '4px 0 0' }}>
            {MESES[mes - 1]} {ano} • Finca Aguacate Hass CORVUS
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Calendar size={16} color="#6b7280" />
          <select className="select" style={{ width: 140, height: 36, fontSize: 13 }} value={mes} onChange={e => setMes(Number(e.target.value))}>
            {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <select className="select" style={{ width: 90, height: 36, fontSize: 13 }} value={ano} onChange={e => setAno(Number(e.target.value))}>
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={loadAll} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
            border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 500
          }}>
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e5e7eb', marginBottom: 24 }}>
        {['resumen', 'productividad', 'insumos', 'campos', 'rendimiento'].map(t => (
          <TabButton key={t} active={tab === t} onClick={() => setTab(t)}>
            {{ resumen: 'Resumen', productividad: 'Productividad', insumos: 'Insumos', campos: 'Campos', rendimiento: 'Rendimiento/ha' }[t]}
          </TabButton>
        ))}
      </div>

      {/* ═══ TAB: RESUMEN ═══ */}
      {tab === 'resumen' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <KpiCard title="Costo/kg Estimado" value={`$${avgCostoKg}`} subtitle="Promedio finca vs benchmark $0.55" icon={TrendingUp} color="#2D6A4F" />
            <KpiCard title="Top Trabajador" value={topWorker.split(' ').slice(0, 2).join(' ')} subtitle={`${trabajadores[0]?.total_horas || 0}h trabajadas`} icon={Users} color="#219EBC" />
            <KpiCard title="Insumo #1 (Costo)" value={topProducto.length > 20 ? topProducto.slice(0, 20) + '…' : topProducto} subtitle={formatCur(insumos.top10_by_cost?.[0]?.total_cost)} icon={Package} color="#F4A261" />
            <KpiCard title="Eficiencia Riego" value={`${irrigationEff}%`} subtitle="Ratio irrigación/necesidad" icon={Droplets} color="#219EBC" />
          </div>

          {/* Tendencia costos */}
          <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1F3A5F', margin: '0 0 16px' }}>Tendencia de Costos (12 meses)</h3>
            {tendenciaChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={tendenciaChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => formatCur(v)} />
                  <Legend />
                  <Area type="monotone" dataKey="Mano de Obra" stackId="1" stroke={CHART_COLORS.mo} fill={CHART_COLORS.mo} fillOpacity={0.6} />
                  <Area type="monotone" dataKey="Insumos" stackId="1" stroke={CHART_COLORS.insumos} fill={CHART_COLORS.insumos} fillOpacity={0.6} />
                  <Area type="monotone" dataKey="Equipo" stackId="1" stroke={CHART_COLORS.equipo} fill={CHART_COLORS.equipo} fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <p style={{ color: '#9ca3af', textAlign: 'center', padding: 40 }}>Sin datos de tendencia</p>}
          </div>

          {/* Pest pressure summary */}
          <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1F3A5F', margin: '0 0 16px' }}>
              <Bug size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Presión Fitosanitaria por Campo
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {plagas.map(p => (
                <div key={p.campo_id} style={{
                  padding: '12px 16px', borderRadius: 8, border: '1px solid #e5e7eb',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.nombre || p.campo_id}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{p.num_visits} visitas • {p.spray_count} apps</div>
                  </div>
                  <Badge text={p.risk_level} />
                </div>
              ))}
              {plagas.length === 0 && <p style={{ color: '#9ca3af' }}>Sin datos</p>}
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB: PRODUCTIVIDAD ═══ */}
      {tab === 'productividad' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Bar chart */}
          <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1F3A5F', margin: '0 0 16px' }}>
              Top 10 Trabajadores — Horas y Ganado
            </h3>
            {topWorkersChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={topWorkersChart} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip formatter={v => formatNum(v)} />
                  <Legend />
                  <Bar dataKey="horas" name="Horas" fill="#2D6A4F" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="ganado" name="RD$ Ganado" fill="#219EBC" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p style={{ color: '#9ca3af', textAlign: 'center', padding: 40 }}>Sin datos</p>}
          </div>

          {/* Worker ranking table */}
          <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb', overflowX: 'auto' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1F3A5F', margin: '0 0 16px' }}>
              Ranking de Productividad — {MESES[mes - 1]} {ano}
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>#</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>Trabajador</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>Jornadas</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>Horas</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>RD$ Ganado</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>Campos</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>Score</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>Rendimiento</th>
                </tr>
              </thead>
              <tbody>
                {trabajadores.map((w, i) => (
                  <tr key={w.trabajador_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{i + 1}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>{w.nombre}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{w.total_jornadas}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatNum(w.total_horas)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatCur(w.total_ganado)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{w.campos_trabajados}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{w.score}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}><Badge text={w.performance_category} /></td>
                  </tr>
                ))}
                {trabajadores.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Sin datos de productividad</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ TAB: INSUMOS ═══ */}
      {tab === 'insumos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Top 10 bar chart */}
          <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1F3A5F', margin: '0 0 16px' }}>
              Top 10 Insumos por Costo
            </h3>
            {topInsumosChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={topInsumosChart} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={180} />
                  <Tooltip formatter={v => formatCur(v)} />
                  <Bar dataKey="costo" name="Costo Total" radius={[0, 4, 4, 0]}>
                    {topInsumosChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p style={{ color: '#9ca3af', textAlign: 'center', padding: 40 }}>Sin datos</p>}
          </div>

          {/* Products table */}
          <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb', overflowX: 'auto' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1F3A5F', margin: '0 0 16px' }}>
              Detalle de Consumo de Insumos
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Producto', 'Unidad', 'Qty Consumida', 'Costo Total', 'Campos', 'Costo/ha', 'Dosis/ha'].map(h => (
                    <th key={h} style={{
                      padding: '10px 12px', textAlign: h === 'Producto' || h === 'Unidad' ? 'left' : 'right',
                      fontSize: 12, fontWeight: 600, color: '#6b7280',
                      borderBottom: '1px solid #e5e7eb', background: '#f9fafb'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(insumos.productos || []).map(p => (
                  <tr key={p.producto_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>{p.nombre}</td>
                    <td style={{ padding: '10px 12px' }}>{p.unidad}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatNum(p.total_consumed_qty)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatCur(p.total_cost)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{p.campos_applied}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatCur(p.cost_per_ha)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatNum(p.avg_dosis_per_ha)}</td>
                  </tr>
                ))}
                {(!insumos.productos || insumos.productos.length === 0) && (
                  <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Sin datos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ TAB: CAMPOS ═══ */}
      {tab === 'campos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Radar comparison */}
          {campos.length >= 2 && (
            <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1F3A5F', margin: 0 }}>
                  Comparación Multidimensional
                </h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {campos.map((c, i) => (
                    <label key={c.campo_id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={radarCampos.includes(c.campo_id)}
                        onChange={e => {
                          if (e.target.checked) {
                            if (radarCampos.length < 4) setRadarCampos([...radarCampos, c.campo_id])
                          } else {
                            setRadarCampos(radarCampos.filter(x => x !== c.campo_id))
                          }
                        }}
                      />
                      <span style={{ color: COLORS[i % COLORS.length], fontWeight: 500 }}>{c.nombre || c.campo_id}</span>
                    </label>
                  ))}
                </div>
              </div>
              {radarData.length > 0 && radarCampos.length >= 2 ? (
                <ResponsiveContainer width="100%" height={360}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    {radarCampos.map((cid, i) => (
                      <Radar key={cid} name={campos.find(c => c.campo_id === cid)?.nombre || cid}
                        dataKey={cid} stroke={COLORS[i % COLORS.length]}
                        fill={COLORS[i % COLORS.length]} fillOpacity={0.15} />
                    ))}
                    <Legend />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              ) : <p style={{ color: '#9ca3af', textAlign: 'center', padding: 30 }}>Selecciona al menos 2 campos para comparar</p>}
            </div>
          )}

          {/* Full comparison table */}
          <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb', overflowX: 'auto' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1F3A5F', margin: '0 0 16px' }}>
              <MapPin size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Comparativo de Campos — Año {ano}
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  <SortHeader label="Campo" sortKey="nombre" sortConfig={sortConfig} onSort={handleSort} />
                  <SortHeader label="Área (ha)" sortKey="area_ha" sortConfig={sortConfig} onSort={handleSort} />
                  <SortHeader label="Costo/ha" sortKey="cost_per_ha" sortConfig={sortConfig} onSort={handleSort} />
                  <SortHeader label="# OTs" sortKey="num_ots" sortConfig={sortConfig} onSort={handleSort} />
                  <SortHeader label="M. Obra" sortKey="labor_cost" sortConfig={sortConfig} onSort={handleSort} />
                  <SortHeader label="Insumos" sortKey="input_cost" sortConfig={sortConfig} onSort={handleSort} />
                  <SortHeader label="Equipo" sortKey="equipment_cost" sortConfig={sortConfig} onSort={handleSort} />
                  <SortHeader label="Servicios" sortKey="service_cost" sortConfig={sortConfig} onSort={handleSort} />
                  <SortHeader label="Costo Total" sortKey="total_cost" sortConfig={sortConfig} onSort={handleSort} />
                  <th style={{ padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', textAlign: 'center' }}>Suelo</th>
                  <th style={{ padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', textAlign: 'center' }}>Plagas</th>
                  <SortHeader label="Déficit Riego" sortKey="irrigation_deficit" sortConfig={sortConfig} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {sortedCampos.map(c => (
                  <tr key={c.campo_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{c.nombre || c.campo_id}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatNum(c.area_ha)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{formatCur(c.cost_per_ha)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{c.num_ots}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatCur(c.labor_cost)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatCur(c.input_cost)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatCur(c.equipment_cost)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatCur(c.service_cost)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{formatCur(c.total_cost)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}><Badge text={c.soil_moisture_status} /></td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}><Badge text={c.pest_pressure} /></td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatNum(c.irrigation_deficit)} mm</td>
                  </tr>
                ))}
                {sortedCampos.length === 0 && (
                  <tr><td colSpan={12} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Sin datos de campos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ TAB: RENDIMIENTO POR HECTÁREA ═══ */}
      {tab === 'rendimiento' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Resumen por campo — bar chart */}
          <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1F3A5F', margin: '0 0 16px' }}>
              <Layers size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Costo por Hectárea por Campo — {MESES[mes - 1]} {ano}
            </h3>
            {rendimiento.resumen_campos.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(280, rendimiento.resumen_campos.length * 44)}>
                <BarChart data={rendimiento.resumen_campos} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="campo" tick={{ fontSize: 11 }} width={140} />
                  <Tooltip formatter={v => formatCur(v)} />
                  <Legend />
                  <Bar dataKey="costo_actividades_ha" name="Actividades/ha" stackId="a" fill="#2D6A4F" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="costo_insumos_ha" name="Insumos/ha" stackId="a" fill="#219EBC" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p style={{ color: '#9ca3af', textAlign: 'center', padding: 40 }}>Sin datos</p>}
          </div>

          {/* Tabla: Rendimiento por Actividad */}
          <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb', overflowX: 'auto' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1F3A5F', margin: '0 0 16px' }}>
              Desglose por Actividad
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Campo', 'Actividad', 'OTs', 'M.Obra', 'Insumos', 'Equipo', 'Costo Total', 'Costo/ha'].map(h => (
                    <th key={h} style={{
                      padding: '10px 12px', textAlign: h === 'Campo' || h === 'Actividad' ? 'left' : 'right',
                      fontSize: 12, fontWeight: 600, color: '#6b7280',
                      borderBottom: '1px solid #e5e7eb', background: '#f9fafb', whiteSpace: 'nowrap'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rendimiento.por_actividad.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>{r.campo}</td>
                    <td style={{ padding: '10px 12px' }}>{r.actividad}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{r.num_ots}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatCur(r.costo_mo)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatCur(r.costo_insumos)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatCur(r.costo_equipo)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatCur(r.costo_total)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#14532d' }}>{formatCur(r.costo_total_ha)}</td>
                  </tr>
                ))}
                {rendimiento.por_actividad.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Sin datos de actividades</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Tabla: Insumos por Hectárea */}
          <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb', overflowX: 'auto' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1F3A5F', margin: '0 0 16px' }}>
              Desglose por Insumo
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Campo', 'Producto', 'Unidad', 'Qty Total', 'Costo Total', 'Apps', 'Qty/ha', 'Costo/ha'].map(h => (
                    <th key={h} style={{
                      padding: '10px 12px', textAlign: h === 'Campo' || h === 'Producto' || h === 'Unidad' ? 'left' : 'right',
                      fontSize: 12, fontWeight: 600, color: '#6b7280',
                      borderBottom: '1px solid #e5e7eb', background: '#f9fafb', whiteSpace: 'nowrap'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rendimiento.por_insumo.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>{r.campo}</td>
                    <td style={{ padding: '10px 12px' }}>{r.producto}</td>
                    <td style={{ padding: '10px 12px' }}>{r.unidad}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatNum(r.cantidad_total)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatCur(r.costo_total)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{r.num_aplicaciones}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatNum(r.cantidad_ha)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#14532d' }}>{formatCur(r.costo_ha)}</td>
                  </tr>
                ))}
                {rendimiento.por_insumo.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Sin datos de insumos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
