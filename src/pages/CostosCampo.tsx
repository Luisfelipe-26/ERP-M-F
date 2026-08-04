import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { Download, Filter, BarChart3, Table2, RefreshCw, TrendingUp } from 'lucide-react'
import MatrizView from '../components/costos/MatrizView'
import DetalleView from '../components/costos/DetalleView'
import ChartView from '../components/costos/ChartView'
import CampoDetalleView from '../components/costos/CampoDetalleView'

const fmt = n => `RD$ ${Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 0 })}`
const fmtN = n => Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 0 })

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
