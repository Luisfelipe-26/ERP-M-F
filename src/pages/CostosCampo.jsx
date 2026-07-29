import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { Download, Filter, ChevronRight, BarChart3, Table2, RefreshCw, TrendingUp, MapPin } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const fmt = n => `RD$ ${Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 0 })}`
const fmtN = n => Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 0 })
const COLORS = ['#166534', '#1e40af', '#b45309', '#7c3aed', '#be185d', '#0e7490', '#4338ca', '#a16207',
  '#15803d', '#1d4ed8', '#d97706', '#6d28d9', '#be123c', '#0891b2', '#4f46e5', '#ca8a04']

export default function CostosCampo() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState('matriz') // matriz | detalle | chart
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [bloqueFilter, setBloqueFilter] = useState('')
  const [campoFilter, setCampoFilter] = useState('')
  const [campoDetalle, setCampoDetalle] = useState(null)
  const [detalleData, setDetalleData] = useState(null)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (fechaDesde) params.fecha_desde = fechaDesde
      if (fechaHasta) params.fecha_hasta = fechaHasta
      if (bloqueFilter) params.bloque = bloqueFilter
      if (campoFilter) params.campo_id = campoFilter
      const res = await api.get('/reportes/costos-campo-actividad', { params })
      setData(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [fechaDesde, fechaHasta, bloqueFilter, campoFilter])

  useEffect(() => { load() }, [load])

  async function loadCampoDetalle(campoId) {
    setCampoDetalle(campoId)
    try {
      const params = {}
      if (fechaDesde) params.fecha_desde = fechaDesde
      if (fechaHasta) params.fecha_hasta = fechaHasta
      const res = await api.get(`/reportes/resumen-campo/${campoId}`, { params })
      setDetalleData(res.data)
    } catch (e) {
      console.error(e)
    }
  }

  async function exportCSV(tipo = 'detalle') {
    const params = new URLSearchParams()
    if (fechaDesde) params.set('fecha_desde', fechaDesde)
    if (fechaHasta) params.set('fecha_hasta', fechaHasta)
    if (bloqueFilter) params.set('bloque', bloqueFilter)
    if (campoFilter) params.set('campo_id', campoFilter)
    params.set('vista', tipo)
    try {
      const res = await api.get(`/reportes/costos-campo-actividad/csv?${params}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a'); a.href = url; a.download = `costos_${tipo}.csv`
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url)
    } catch { /* silent */ }
  }

  // Build matrix from flat rows
  function buildMatrix() {
    if (!data) return { matrix: {}, campos: [], actividades: [], campoTotals: {}, actTotals: {}, grandTotal: 0 }
    const matrix = {}
    const campoTotals = {}
    const actTotals = {}
    let grandTotal = 0

    for (const r of data.rows) {
      if (!matrix[r.campo_id]) matrix[r.campo_id] = {}
      matrix[r.campo_id][r.actividad_id] = r
      campoTotals[r.campo_id] = (campoTotals[r.campo_id] || 0) + r.costo_total
      actTotals[r.actividad_id] = (actTotals[r.actividad_id] || 0) + r.costo_total
      grandTotal += r.costo_total
    }

    return { matrix, campos: data.campos, actividades: data.actividades, campoTotals, actTotals, grandTotal }
  }

  // Chart data: stacked bar by campo
  function buildChartData() {
    if (!data) return []
    const { campos, actividades } = data
    const lookup = {}
    for (const r of data.rows) {
      if (!lookup[r.campo_id]) lookup[r.campo_id] = { campo: r.campo_nombre || r.campo_id }
      lookup[r.campo_id][r.actividad_nombre] = r.costo_total
    }
    return campos.map(c => lookup[c.campo_id] || { campo: c.campo_nombre })
  }

  const bloques = data ? [...new Set(data.campos.map(c => c.bloque).filter(Boolean))].sort() : []

  if (campoDetalle && detalleData) {
    return <CampoDetalleView
      data={detalleData}
      onBack={() => { setCampoDetalle(null); setDetalleData(null) }}
      fmt={fmt}
    />
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 700, color: '#111827' }}>
            <TrendingUp size={24} style={{ verticalAlign: 'text-bottom', marginRight: 8 }} />
            Costos por Campo
          </h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>
            Análisis de costos por campo y actividad — Inversiones Corvus
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={() => exportCSV('detalle')}>
            <Download size={14} /> CSV Detalle
          </button>
          <button className="btn-secondary" onClick={() => exportCSV('matriz')}>
            <Download size={14} /> CSV Matriz
          </button>
          <button className="btn-secondary" onClick={load} disabled={loading}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Filter size={16} color="#6b7280" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Desde</label>
            <input type="date" className="input" style={{ width: 150, padding: '4px 8px', fontSize: 13 }}
              value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Hasta</label>
            <input type="date" className="input" style={{ width: 150, padding: '4px 8px', fontSize: 13 }}
              value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
          </div>
          {bloques.length > 0 && (
            <select className="input" style={{ width: 120, padding: '4px 8px', fontSize: 13 }}
              value={bloqueFilter} onChange={e => setBloqueFilter(e.target.value)}>
              <option value="">Todo bloque</option>
              {bloques.map(b => <option key={b} value={b}>Bloque {b}</option>)}
            </select>
          )}
          <select className="input" style={{ width: 140, padding: '4px 8px', fontSize: 13 }}
            value={campoFilter} onChange={e => setCampoFilter(e.target.value)}>
            <option value="">Todo campo</option>
            {data?.campos.map(c => <option key={c.campo_id} value={c.campo_id}>{c.campo_nombre}</option>)}
          </select>
          {(fechaDesde || fechaHasta || bloqueFilter || campoFilter) && (
            <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }}
              onClick={() => { setFechaDesde(''); setFechaHasta(''); setBloqueFilter(''); setCampoFilter('') }}>
              Limpiar filtros
            </button>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {[
              { key: 'matriz', icon: Table2, label: 'Matriz' },
              { key: 'detalle', icon: BarChart3, label: 'Detalle' },
              { key: 'chart', icon: TrendingUp, label: 'Gráfico' },
            ].map(({ key, icon: Icon, label }) => (
              <button key={key}
                style={{
                  padding: '4px 12px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 6,
                  background: vista === key ? '#166534' : '#fff',
                  color: vista === key ? '#fff' : '#374151',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600
                }}
                onClick={() => setVista(key)}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      {data?.totales && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Costo Total', value: fmt(data.totales.costo_total), color: '#111827', border: '#6b7280' },
            { label: 'Mano de Obra', value: fmt(data.totales.costo_mo), color: '#166534', border: '#86efac' },
            { label: 'Insumos', value: fmt(data.totales.costo_insumos), color: '#1e40af', border: '#93c5fd' },
            { label: 'Órdenes', value: fmtN(data.totales.num_ordenes), color: '#7c3aed', border: '#c4b5fd' },
            { label: 'Horas MO', value: fmtN(data.totales.horas_mo), color: '#b45309', border: '#fcd34d' },
          ].map(({ label, value, color, border }) => (
            <div key={label} className="card" style={{ padding: '10px 14px', borderLeft: `4px solid ${border}` }}>
              <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Content based on view */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
          <p>Cargando datos...</p>
        </div>
      ) : !data || data.rows.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <p>No hay datos de costos para los filtros seleccionados.</p>
          <p style={{ fontSize: 13 }}>Registra órdenes de trabajo para ver el análisis aquí.</p>
        </div>
      ) : vista === 'matriz' ? (
        <MatrizView data={data} buildMatrix={buildMatrix} onCampoClick={loadCampoDetalle} fmt={fmt} />
      ) : vista === 'detalle' ? (
        <DetalleView data={data} onCampoClick={loadCampoDetalle} fmt={fmt} />
      ) : (
        <ChartView data={data} buildChartData={buildChartData} fmt={fmt} />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}


/* ========= MATRIZ VIEW ========= */
function MatrizView({ data, buildMatrix, onCampoClick, fmt }) {
  const { matrix, campos, actividades, campoTotals, actTotals, grandTotal } = buildMatrix()

  return (
    <div className="card" style={{ overflow: 'auto' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#111827' }}>
        Matriz de Costos: Campo × Actividad
      </h3>
      <table className="table" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
        <thead>
          <tr>
            <th style={{ position: 'sticky', left: 0, background: '#f9fafb', zIndex: 2, minWidth: 120 }}>Campo</th>
            <th style={{ textAlign: 'center', minWidth: 50 }}>Bloque</th>
            <th style={{ textAlign: 'right', minWidth: 60 }}>Área (ha)</th>
            {actividades.map(a => (
              <th key={a.actividad_id} style={{ textAlign: 'right', minWidth: 100, maxWidth: 140 }}
                title={a.actividad_nombre}>
                {a.actividad_nombre.length > 18 ? a.actividad_nombre.slice(0, 16) + '…' : a.actividad_nombre}
              </th>
            ))}
            <th style={{ textAlign: 'right', minWidth: 100, fontWeight: 800, background: '#f0fdf4' }}>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {campos.map(c => {
            const total = campoTotals[c.campo_id] || 0
            return (
              <tr key={c.campo_id} style={{ cursor: 'pointer' }}
                onClick={() => onCampoClick(c.campo_id)}
                onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <td style={{ position: 'sticky', left: 0, background: 'inherit', zIndex: 1, fontWeight: 600, color: '#166534' }}>
                  <MapPin size={12} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />
                  {c.campo_nombre || c.campo_id}
                </td>
                <td style={{ textAlign: 'center', color: '#6b7280' }}>{c.bloque}</td>
                <td style={{ textAlign: 'right', color: '#6b7280' }}>{c.area_ha}</td>
                {actividades.map(a => {
                  const cell = matrix[c.campo_id]?.[a.actividad_id]
                  const val = cell?.costo_total || 0
                  const intensity = grandTotal > 0 ? Math.min(val / (grandTotal * 0.08), 1) : 0
                  return (
                    <td key={a.actividad_id} style={{
                      textAlign: 'right',
                      color: val > 0 ? '#111827' : '#d1d5db',
                      background: val > 0 ? `rgba(22, 101, 52, ${intensity * 0.15})` : '',
                      fontWeight: val > 0 ? 500 : 400,
                    }}
                    title={cell ? `${cell.num_ordenes} OTs · MO: ${fmt(cell.costo_mo)} · Ins: ${fmt(cell.costo_insumos)}` : 'Sin datos'}>
                      {val > 0 ? fmtN(Math.round(val)) : '—'}
                    </td>
                  )
                })}
                <td style={{ textAlign: 'right', fontWeight: 800, color: '#166534', background: '#f0fdf4' }}>
                  {fmtN(Math.round(total))}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr style={{ background: '#f9fafb', fontWeight: 800 }}>
            <td style={{ position: 'sticky', left: 0, background: '#f9fafb', zIndex: 1 }}>TOTAL</td>
            <td></td>
            <td style={{ textAlign: 'right', color: '#6b7280' }}>
              {campos.reduce((s, c) => s + (c.area_ha || 0), 0).toFixed(1)}
            </td>
            {actividades.map(a => (
              <td key={a.actividad_id} style={{ textAlign: 'right', color: '#1e40af' }}>
                {fmtN(Math.round(actTotals[a.actividad_id] || 0))}
              </td>
            ))}
            <td style={{ textAlign: 'right', color: '#166534', fontSize: 14, background: '#f0fdf4' }}>
              {fmt(grandTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8, marginBottom: 0 }}>
        💡 Click en cualquier campo para ver su detalle completo. Hover sobre celdas para ver desglose MO/Insumos.
      </p>
    </div>
  )
}


/* ========= DETALLE VIEW ========= */
function DetalleView({ data, onCampoClick, fmt }) {
  return (
    <div className="card" style={{ overflow: 'auto' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#111827' }}>
        Detalle de Costos: Campo × Actividad
      </h3>
      <table className="table" style={{ fontSize: 12 }}>
        <thead>
          <tr>
            <th>Campo</th>
            <th>Bloque</th>
            <th>Actividad</th>
            <th>Tipo</th>
            <th style={{ textAlign: 'right' }}># OTs</th>
            <th style={{ textAlign: 'right' }}>Horas MO</th>
            <th style={{ textAlign: 'right' }}>Costo MO</th>
            <th style={{ textAlign: 'right' }}>Costo Insumos</th>
            <th style={{ textAlign: 'right' }}>Costo Total</th>
            <th style={{ textAlign: 'right' }}>Costo/ha</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={i} style={{ cursor: 'pointer' }}
              onClick={() => onCampoClick(r.campo_id)}
              onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
              onMouseLeave={e => e.currentTarget.style.background = ''}>
              <td style={{ fontWeight: 600, color: '#166534' }}>{r.campo_nombre}</td>
              <td style={{ color: '#6b7280' }}>{r.bloque}</td>
              <td>{r.actividad_nombre}</td>
              <td><span className={`badge badge-${r.tipo_actividad === 'Labor' ? 'info' : r.tipo_actividad === 'Nutricion' ? 'success' : 'warning'}`}>{r.tipo_actividad}</span></td>
              <td style={{ textAlign: 'right' }}>{r.num_ordenes}</td>
              <td style={{ textAlign: 'right' }}>{r.horas_mo}</td>
              <td style={{ textAlign: 'right' }}>{fmt(r.costo_mo)}</td>
              <td style={{ textAlign: 'right' }}>{fmt(r.costo_insumos)}</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(r.costo_total)}</td>
              <td style={{ textAlign: 'right', color: '#6b7280' }}>{fmt(r.costo_ha)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: '#f9fafb', fontWeight: 800 }}>
            <td colSpan={4}>TOTAL</td>
            <td style={{ textAlign: 'right' }}>{data.totales.num_ordenes}</td>
            <td style={{ textAlign: 'right' }}>{data.totales.horas_mo}</td>
            <td style={{ textAlign: 'right' }}>{fmt(data.totales.costo_mo)}</td>
            <td style={{ textAlign: 'right' }}>{fmt(data.totales.costo_insumos)}</td>
            <td style={{ textAlign: 'right', color: '#166534', fontSize: 14 }}>{fmt(data.totales.costo_total)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}


/* ========= CHART VIEW ========= */
function ChartView({ data, buildChartData, fmt }) {
  const chartData = buildChartData()
  const actNames = data.actividades.map(a => a.actividad_nombre)

  // Also build a campo-totals bar chart
  const campoTotals = {}
  for (const r of data.rows) {
    if (!campoTotals[r.campo_id]) campoTotals[r.campo_id] = { campo: r.campo_nombre, costo_mo: 0, costo_insumos: 0 }
    campoTotals[r.campo_id].costo_mo += r.costo_mo
    campoTotals[r.campo_id].costo_insumos += r.costo_insumos
  }
  const campoBarData = Object.values(campoTotals).sort((a, b) => (b.costo_mo + b.costo_insumos) - (a.costo_mo + a.costo_insumos))

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div className="card">
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#111827' }}>
          Costo por Campo (MO vs Insumos)
        </h3>
        <ResponsiveContainer width="100%" height={Math.max(300, campoBarData.length * 35)}>
          <BarChart data={campoBarData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="campo" width={100} tick={{ fontSize: 11 }} />
            <Tooltip formatter={v => [fmt(v)]} />
            <Legend />
            <Bar dataKey="costo_mo" name="Mano de Obra" stackId="a" fill="#166534" radius={[0, 0, 0, 0]} />
            <Bar dataKey="costo_insumos" name="Insumos" stackId="a" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {chartData.length > 0 && (
        <div className="card">
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#111827' }}>
            Distribución por Actividad en cada Campo
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData} margin={{ left: 10, right: 20 }}>
              <XAxis dataKey="campo" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} width={42} />
              <Tooltip formatter={v => [fmt(v)]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {actNames.map((name, i) => (
                <Bar key={name} dataKey={name} stackId="a" fill={COLORS[i % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}


/* ========= CAMPO DETALLE VIEW ========= */
function CampoDetalleView({ data, onBack, fmt }) {
  const { campo, actividades, ordenes, totales } = data

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn-secondary" onClick={onBack} style={{ padding: '6px 12px' }}>
          ← Volver
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#166534' }}>
            <MapPin size={22} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
            {campo.nombre || campo.id_campo}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
            Bloque {campo.bloque} · {campo.area_ha} ha · {campo.n_plantas} plantas · {campo.variedad} · Siembra {campo.ano_siembra}
          </p>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Costo Total', value: fmt(totales.costo_total), color: '#111827' },
          { label: 'Costo/ha', value: fmt(totales.costo_ha), color: '#7c3aed' },
          { label: 'Mano de Obra', value: fmt(totales.costo_mo), color: '#166534' },
          { label: 'Insumos', value: fmt(totales.costo_insumos), color: '#1e40af' },
          { label: '# Órdenes', value: totales.num_ordenes, color: '#b45309' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ padding: '10px 14px' }}>
            <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Activities breakdown */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>Costos por Actividad</h3>
        <table className="table" style={{ fontSize: 12 }}>
          <thead>
            <tr>
              <th>Actividad</th>
              <th>Tipo</th>
              <th style={{ textAlign: 'right' }}># OTs</th>
              <th style={{ textAlign: 'right' }}>Horas</th>
              <th style={{ textAlign: 'right' }}>Costo MO</th>
              <th style={{ textAlign: 'right' }}>Costo Insumos</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th style={{ textAlign: 'right' }}>Costo/ha</th>
              <th style={{ textAlign: 'right' }}>% del Total</th>
            </tr>
          </thead>
          <tbody>
            {actividades.sort((a, b) => b.costo_total - a.costo_total).map((r, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{r.actividad_nombre}</td>
                <td><span className={`badge badge-${r.tipo_actividad === 'Labor' ? 'info' : r.tipo_actividad === 'Nutricion' ? 'success' : 'warning'}`}>{r.tipo_actividad}</span></td>
                <td style={{ textAlign: 'right' }}>{r.num_ordenes}</td>
                <td style={{ textAlign: 'right' }}>{r.horas_mo}</td>
                <td style={{ textAlign: 'right' }}>{fmt(r.costo_mo)}</td>
                <td style={{ textAlign: 'right' }}>{fmt(r.costo_insumos)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(r.costo_total)}</td>
                <td style={{ textAlign: 'right', color: '#6b7280' }}>{fmt(r.costo_ha)}</td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                    <div style={{ width: 60, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        width: `${totales.costo_total > 0 ? (r.costo_total / totales.costo_total * 100) : 0}%`,
                        height: '100%', background: '#166534', borderRadius: 3
                      }} />
                    </div>
                    <span style={{ fontSize: 11, color: '#6b7280', minWidth: 32 }}>
                      {totales.costo_total > 0 ? (r.costo_total / totales.costo_total * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 800, background: '#f9fafb' }}>
              <td colSpan={2}>TOTAL</td>
              <td style={{ textAlign: 'right' }}>{totales.num_ordenes}</td>
              <td></td>
              <td style={{ textAlign: 'right' }}>{fmt(totales.costo_mo)}</td>
              <td style={{ textAlign: 'right' }}>{fmt(totales.costo_insumos)}</td>
              <td style={{ textAlign: 'right', color: '#166534' }}>{fmt(totales.costo_total)}</td>
              <td style={{ textAlign: 'right' }}>{fmt(totales.costo_ha)}</td>
              <td style={{ textAlign: 'right' }}>100%</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Recent OTs */}
      {ordenes.length > 0 && (
        <div className="card">
          <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>Últimas Órdenes de Trabajo</h3>
          <table className="table" style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <th>OT #</th>
                <th>Fecha</th>
                <th>Actividad</th>
                <th>Estado</th>
                <th>Supervisor</th>
                <th style={{ textAlign: 'right' }}>MO</th>
                <th style={{ textAlign: 'right' }}>Insumos</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {ordenes.map(o => (
                <tr key={o.ot_id}>
                  <td style={{ fontWeight: 600 }}>{o.ot_id}</td>
                  <td>{o.fecha ? new Date(o.fecha).toLocaleDateString('es-DO') : '—'}</td>
                  <td>{o.actividad_id}</td>
                  <td><span className={`badge badge-${o.estado === 'Cerrada' ? 'success' : o.estado === 'Abierta' ? 'warning' : 'info'}`}>{o.estado}</span></td>
                  <td>{o.supervisor || '—'}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(o.costo_mo)}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(o.costo_insumos)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(o.costo_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
