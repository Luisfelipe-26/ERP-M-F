export default function DetalleView({ data, onCampoClick, fmt }) {
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