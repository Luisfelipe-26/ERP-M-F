import React from 'react'
import { Calendar, Clock, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react'
import { PlanificacionLabor } from '../../api'

interface Props {
  planificaciones: PlanificacionLabor[]
  onSelect: (plan: PlanificacionLabor) => void
  onReprogramar: (plan: PlanificacionLabor) => void
}

const COLUMNS = [
  { id: 'Pendiente', label: 'Pendiente', color: '#f59e0b', bg: '#fffbeb' },
  { id: 'Parcial', label: 'En Proceso / Parcial', color: '#3b82f6', bg: '#eff6ff' },
  { id: 'Completa', label: 'Completada', color: '#10b981', bg: '#ecfdf5' },
  { id: 'Vencida', label: 'Vencida', color: '#ef4444', bg: '#fef2f2' },
  { id: 'Reprogramada', label: 'Reprogramada', color: '#f97316', bg: '#fff7ed' },
]

export default function PlanificacionKanban({ planificaciones, onSelect, onReprogramar }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, alignItems: 'flex-start' }}>
      {COLUMNS.map(col => {
        const items = planificaciones.filter(p => p.estado === col.id)
        return (
          <div key={col.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, minHeight: 350 }}>
            {/* Column Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: `2px solid ${col.color}` }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{col.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, background: col.bg, color: col.color, padding: '2px 7px', borderRadius: 10, border: `1px solid ${col.color}40` }}>
                {items.length}
              </span>
            </div>

            {/* Cards List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map(p => (
                <div
                  key={p.id}
                  onClick={() => onSelect(p)}
                  style={{
                    background: 'white',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                    padding: 10,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    cursor: 'pointer',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'none' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#3b82f6' }}>{p.numero}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: p.prioridad === 'Urgente' ? '#fee2e2' : p.prioridad === 'Alta' ? '#ffedd5' : '#f1f5f9', color: p.prioridad === 'Urgente' ? '#991b1b' : p.prioridad === 'Alta' ? '#c2410c' : '#475569' }}>
                      {p.prioridad}
                    </span>
                  </div>

                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                    {p.actividad_nombre || p.actividad_id}
                  </div>

                  <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                    <Calendar size={12} /> Sem {p.semana} / {p.anio}
                    {p.etapa_fenologica && <span>• {p.etapa_fenologica}</span>}
                  </div>

                  {/* Lotes & Progress */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                    <span>🌱 {p.campos_count || 0} lotes ({p.total_area_ha || 0} ha)</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{p.porcentaje_avance}%</span>
                  </div>

                  <div style={{ width: '100%', height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ width: `${Math.min(100, p.porcentaje_avance)}%`, height: '100%', background: p.porcentaje_avance >= 100 ? '#10b981' : '#3b82f6' }} />
                  </div>

                  {/* Footer actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 6 }} onClick={e => e.stopPropagation()}>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>
                      {p.ordenes_count > 0 ? `${p.ordenes_count} OT(s)` : 'Sin OTs'}
                    </span>
                    <button
                      type="button"
                      style={{ fontSize: 10, padding: '2px 6px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'pointer' }}
                      onClick={() => onReprogramar(p)}
                    >
                      Reprogramar
                    </button>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: 12, border: '1px dashed #e2e8f0', borderRadius: 6 }}>
                  Sin labores
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
