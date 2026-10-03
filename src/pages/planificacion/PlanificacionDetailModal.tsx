import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Calendar, Plus, Edit2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { planificacionesApi, apiError, PlanificacionLaborDetail } from '../../api'

interface Props {
  planId: number
  onClose: () => void
  onEdit: (plan: PlanificacionLaborDetail) => void
  onReprogramar: (plan: PlanificacionLaborDetail) => void
  onRefresh: () => void
}

const fmt = (n: any) => `RD$ ${Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function PlanificacionDetailModal({ planId, onClose, onEdit, onReprogramar, onRefresh }: Props) {
  const navigate = useNavigate()
  const [data, setData] = useState<PlanificacionLaborDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    planificacionesApi.obtener(planId)
      .then(res => setData(res.data))
      .catch(err => { toast.error(apiError(err, 'Error al cargar')); onClose() })
      .finally(() => setLoading(false))
  }, [planId])

  if (loading || !data) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'white', padding: 24, borderRadius: 12, color: '#64748b' }}>Cargando...</div>
      </div>
    )
  }

  const ST_COL: Record<string, { bg: string; color: string }> = {
    Pendiente: { bg: '#fef3c7', color: '#92400e' },
    Parcial: { bg: '#dbeafe', color: '#1e40af' },
    Completa: { bg: '#dcfce7', color: '#166534' },
    Vencida: { bg: '#fee2e2', color: '#991b1b' },
    Reprogramada: { bg: '#ffedd5', color: '#c2410c' },
    Cancelada: { bg: '#f1f5f9', color: '#475569' },
  }
  const st = ST_COL[data.estado] || ST_COL.Pendiente

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 760, maxHeight: '90vh', overflowY: 'auto', border: '1px solid #e2e8f0', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#f8fafc' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 17, fontWeight: 800 }}>{data.numero}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: st.bg, color: st.color }}>{data.estado}</span>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#f1f5f9' }}>{data.prioridad}</span>
            </div>
            <h3 style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 700 }}>{data.actividad_nombre || data.actividad_id}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
        </div>
        <div style={{ padding: 18 }}>
          {/* Cards Resumen */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14, background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11 }}>
            <div>
              <div style={{ color: '#64748b', fontWeight: 600 }}>PERÍODO</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Sem {data.semana} / {data.anio}</div>
              <div style={{ color: '#64748b' }}>{data.fecha_inicio_estimada || '—'}</div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontWeight: 600 }}>ETAPA / RESP.</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{data.etapa_fenologica || 'General'}</div>
              <div style={{ color: '#64748b' }}>{data.responsable_nombre || 'Sin asignar'}</div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontWeight: 600 }}>PRESUPUESTO</div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{data.presupuesto_nombre || '—'}</div>
              <div style={{ color: '#64748b' }}>{data.cuenta_codigo || '—'}</div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontWeight: 600 }}>AVANCE</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: data.porcentaje_avance >= 100 ? '#166534' : '#1e40af' }}>{data.porcentaje_avance}%</div>
              <div style={{ color: '#64748b' }}>{data.campos_completados_count}/{data.campos_count} lotes</div>
            </div>
          </div>

          {/* Lotes & Insumos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 6 }}>🌱 LOTES ({data.campos?.length || 0})</div>
              {data.campos?.map(c => (
                <div key={c.id || c.campo_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span>{c.campo_id} {c.campo_nombre ? `(${c.campo_nombre})` : ''}</span>
                  <span style={{ fontWeight: 600 }}>{c.area_ha || 0} ha {c.completado ? '✅' : '⏳'}</span>
                </div>
              ))}
            </div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 6 }}>📦 INSUMOS ({data.insumos?.length || 0})</div>
              {data.insumos?.map(i => (
                <div key={i.id || i.producto_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span>{i.producto_nombre || i.producto_id}</span>
                  <span style={{ fontWeight: 600 }}>{i.cantidad_total} {i.unidad || ''} ({fmt(i.costo_total_estimado)})</span>
                </div>
              ))}
              {(!data.insumos || data.insumos.length === 0) && <div style={{ fontSize: 11, color: '#94a3b8' }}>Sin insumos</div>}
            </div>
          </div>
          {/* Comparativa Costos */}
          <div style={{ background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontSize: 11 }}>
              <div><div>MO Plan / Real</div><div style={{ fontWeight: 700 }}>{fmt(data.costo_mo_estimado)}</div><div style={{ color: '#166534' }}>{fmt(data.costo_real_mo)}</div></div>
              <div><div>Insumos Plan / Real</div><div style={{ fontWeight: 700 }}>{fmt(data.costo_insumos_estimado)}</div><div style={{ color: '#1e40af' }}>{fmt(data.costo_real_insumos)}</div></div>
              <div><div>Equipo Plan / Real</div><div style={{ fontWeight: 700 }}>{fmt(data.costo_equipo_estimado)}</div><div style={{ color: '#7c3aed' }}>{fmt(data.costo_real_equipo)}</div></div>
              <div><div style={{ fontWeight: 700, color: '#166534' }}>Total Plan / Real</div><div style={{ fontWeight: 800 }}>{fmt(data.costo_total_estimado)}</div><div style={{ fontWeight: 800, color: '#166534' }}>{fmt(data.costo_real_total)}</div></div>
            </div>
          </div>

          {/* OTs */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>📋 ÓRDENES DE TRABAJO ({data.ordenes?.length || 0})</span>
              <button type="button" className="btn-primary" style={{ fontSize: 11, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 3 }} onClick={() => { onClose(); navigate(`/ordenes/nueva?planificacion_id=${data.id}&actividad_id=${data.actividad_id}`) }}>
                <Plus size={13} /> Generar OT
              </button>
            </div>
            {data.ordenes && data.ordenes.length > 0 ? (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead><tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}><th style={{ padding: '6px 10px', textAlign: 'left' }}>OT</th><th style={{ padding: '6px 10px', textAlign: 'left' }}>Fecha</th><th style={{ padding: '6px 10px', textAlign: 'left' }}>Campo</th><th style={{ padding: '6px 10px', textAlign: 'center' }}>Estado</th><th style={{ padding: '6px 10px', textAlign: 'right' }}>Costo Real</th><th style={{ padding: '6px 10px', textAlign: 'center' }}>Acción</th></tr></thead>
                  <tbody>
                    {data.ordenes.map((ot: any) => (
                      <tr key={ot.ot_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 10px', fontWeight: 700 }}>OT-{ot.ot_id}</td>
                        <td style={{ padding: '6px 10px' }}>{ot.fecha_ejecucion?.split('T')[0] || '—'}</td>
                        <td style={{ padding: '6px 10px' }}>{ot.campo_id}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'center' }}><span style={{ fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 3, background: ot.estado === 'Cerrada' ? '#dcfce7' : '#dbeafe', color: ot.estado === 'Cerrada' ? '#166534' : '#1e40af' }}>{ot.estado}</span></td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700 }}>{fmt(ot.costo_total)}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'center' }}><button type="button" className="btn-secondary" style={{ fontSize: 10, padding: '1px 5px' }} onClick={() => { onClose(); navigate(`/ordenes/${ot.ot_id}`) }}>Ver</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: 8, fontSize: 11, color: '#94a3b8', border: '1px dashed #e2e8f0', borderRadius: 6, textAlign: 'center' }}>No hay OTs vinculadas aún</div>
            )}
          </div>

          {/* Reprogramaciones */}
          {data.reprogramaciones && data.reprogramaciones.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#d97706', marginBottom: 4 }}>📜 BITÁCORA DE REPROGRAMACIONES</div>
              <div style={{ background: '#fffbeb', border: '1px solid #fed7aa', borderRadius: 6, padding: 8, fontSize: 11 }}>
                {data.reprogramaciones.map((r: any) => (
                  <div key={r.id} style={{ marginBottom: 4 }}>
                    <strong>Sem {r.semana_anterior}/{r.anio_anterior} → Sem {r.semana_nueva}/{r.anio_nuevo}</strong> ({r.usuario_nombre} - {r.fecha_cambio?.split('T')[0]}): <em>"{r.motivo}"</em>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
            <button type="button" className="btn-secondary" onClick={() => onReprogramar(data)}>
              <Calendar size={13} style={{ marginRight: 4 }} /> Reprogramar
            </button>
            <button type="button" className="btn-secondary" onClick={() => onEdit(data)}>
              <Edit2 size={13} style={{ marginRight: 4 }} /> Editar
            </button>
            <button type="button" className="btn-primary" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
