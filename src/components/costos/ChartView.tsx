import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#166534', '#1e40af', '#b45309', '#7c3aed', '#be185d', '#0e7490', '#4338ca', '#a16207',
  '#15803d', '#1d4ed8', '#d97706', '#6d28d9', '#be123c', '#0891b2', '#4f46e5', '#ca8a04']

export default function ChartView({ data, buildChartData, fmt }) {
  const chartData = buildChartData()
  const actNames = data.actividades.map(a => a.actividad_nombre)

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