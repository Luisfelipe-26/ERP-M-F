import { MapPin } from 'lucide-react'

export default function MatrizView({ data, buildMatrix, onCampoClick, fmt }) {
  const fmtN = n => Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 0 })
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