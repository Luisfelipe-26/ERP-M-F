import { MapPin } from 'lucide-react'

export default function CampoDetalleView({ data, onBack, fmt }) {
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