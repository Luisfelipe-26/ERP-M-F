import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api'
import toast from 'react-hot-toast'
import { ArrowLeft, CheckCircle, Clock } from 'lucide-react'

const fmt = n => `RD$ ${Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`

export default function OrdenDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)

  useEffect(() => {
    api.get(`/ordenes/${id}/detalle`).then(r => setData(r.data))
  }, [id])

  async function cambiarEstado(estado) {
    try {
      const res = await api.put(`/ordenes/${id}/estado`, null, { params: { estado } })
      const asientoRef = res.data?.asiento ? ` · Asiento: ${res.data.asiento}` : ''
      toast.success(`Estado: ${estado}${asientoRef}`)
      const r = await api.get(`/ordenes/${id}/detalle`)
      setData(r.data)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error al cambiar estado')
    }
  }

  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div>

  const { orden, mano_obra, detalles, asiento_contable } = data

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="btn-secondary" onClick={() => navigate('/ordenes')}><ArrowLeft size={16} /></button>
        <div>
          <h1 style={{ margin: '0 0 2px', fontSize: 24, fontWeight: 700, color: '#111827' }}>Orden de Trabajo #{orden.ot_id}</h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>
            {orden.fecha_ejecucion ? new Date(orden.fecha_ejecucion).toLocaleDateString('es-DO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {orden.estado !== 'Cerrada' && (
            <button className="btn-primary" onClick={() => cambiarEstado('Cerrada')}>
              <CheckCircle size={14} /> Cerrar OT
            </button>
          )}
          {orden.estado === 'Cerrada' && (
            <button className="btn-secondary" onClick={() => cambiarEstado('Abierta')}>
              <Clock size={14} /> Reabrir
            </button>
          )}
        </div>
      </div>

      {/* Header info */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          {[
            { label: 'Campo', value: orden.campo_id },
            { label: 'Actividad', value: orden.actividad_id },
            { label: 'Supervisor', value: orden.supervisor || '—' },
            { label: 'Estado', value: orden.estado },
            { label: 'Equipo', value: orden.equipo || '—' },
            { label: 'Horas MO', value: orden.horas_mo ? `${orden.horas_mo} hrs` : '—' },
            { label: 'Costo/ha', value: orden.costo_ha ? fmt(orden.costo_ha) : '—' },
            { label: 'Fecha Cierre', value: orden.fecha_cierre ? new Date(orden.fecha_cierre).toLocaleDateString('es-DO') : '—' },
            { label: 'Observaciones', value: orden.observaciones || '—' },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Costos resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Mano de Obra', value: orden.costo_mano_obra, color: '#166534', bg: '#dcfce7' },
          { label: 'Insumos', value: orden.costo_insumos, color: '#1e40af', bg: '#dbeafe' },
          { label: 'Costo Total', value: orden.costo_total, color: '#111827', bg: '#f3f4f6' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{ background: bg, borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{fmt(value)}</div>
          </div>
        ))}
      </div>

      {asiento_contable && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
          <span style={{ fontSize: 16 }}>📒</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 700, color: '#1e40af' }}>Asiento: {asiento_contable.numero}</span>
            <span style={{ color: '#6b7280', marginLeft: 8 }}>{asiento_contable.fecha}</span>
            <span style={{ color: '#6b7280', marginLeft: 8 }}>· {fmt(asiento_contable.total_debe)}</span>
          </div>
          <span style={{ background: asiento_contable.estado === 'contabilizado' ? '#dcfce7' : '#fef9c3', color: asiento_contable.estado === 'contabilizado' ? '#166534' : '#854d0e', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{asiento_contable.estado}</span>
        </div>
      )}

      {/* Mano de obra */}
      {mano_obra.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#166534' }}>Mano de Obra ({mano_obra.length} trabajadores)</h3>
          <table>
            <thead>
              <tr><th>Trabajador ID</th><th>Modalidad</th><th>Horas Netas</th><th>Costo/Hora</th><th>Costo MO</th></tr>
            </thead>
            <tbody>
              {mano_obra.map(m => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 600 }}>{m.trabajador_id}</td>
                  <td><span className={`badge ${m.modalidad === 'Jornada' ? 'badge-green' : 'badge-yellow'}`}>{m.modalidad}</span></td>
                  <td>{m.horas_netas ?? '—'}</td>
                  <td>{m.costo_hora ? `RD$ ${m.costo_hora}` : '—'}</td>
                  <td style={{ fontWeight: 700, color: '#166534' }}>{fmt(m.costo_mo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Insumos */}
      {detalles.length > 0 && (
        <div className="card">
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1e40af' }}>Insumos Utilizados ({detalles.length} productos)</h3>
          <table>
            <thead>
              <tr><th>Producto</th><th>Cantidad</th><th>Unidad</th><th>Costo Unitario</th><th>Costo Real</th></tr>
            </thead>
            <tbody>
              {detalles.map(d => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 600 }}>{d.producto_id}</td>
                  <td>{d.cantidad_usada ?? '—'}</td>
                  <td>{d.unidad || '—'}</td>
                  <td>{d.costo_unitario ? fmt(d.costo_unitario) : '—'}</td>
                  <td style={{ fontWeight: 700, color: '#1e40af' }}>{fmt(d.costo_real)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
