import React, { useState } from 'react'
import { GanttPlanItem } from '../../api'

interface Props {
  items: GanttPlanItem[]
  anio: number
  onSelectItem: (id: number) => void
}

const STATUS_COLORS: Record<string, string> = {
  Pendiente: '#f59e0b',
  Parcial: '#3b82f6',
  Completa: '#10b981',
  Vencida: '#ef4444',
  Reprogramada: '#f97316',
  Cancelada: '#94a3b8',
}

export default function PlanificacionGantt({ items, anio, onSelectItem }: Props) {
  const [quarter, setQuarter] = useState<number>(1)

  const startWeek = (quarter - 1) * 13 + 1
  const endWeek = quarter * 13
  const weeks = Array.from({ length: 13 }, (_, i) => startWeek + i)
  const visibleItems = items.filter(it => it.semana >= startWeek && it.semana <= endWeek)

  return (
    <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', padding: 12 }}>
      {/* Quarter Switcher & Legend */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[1, 2, 3, 4].map(q => (
            <button
              key={q}
              type="button"
              onClick={() => setQuarter(q)}
              style={{
                padding: '4px 10px',
                borderRadius: 5,
                border: '1px solid',
                borderColor: quarter === q ? '#2563eb' : '#cbd5e1',
                background: quarter === q ? '#2563eb' : 'white',
                color: quarter === q ? 'white' : '#334155',
                fontWeight: 700,
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              Q{q} (S{(q - 1) * 13 + 1} - S{q * 13})
            </button>
          ))}
        </div>

        {/* Status Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
          {Object.entries(STATUS_COLORS).map(([k, col]) => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: col, display: 'inline-block' }} />
              {k}
            </span>
          ))}
        </div>
      </div>

      {/* Gantt Matrix */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700, fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '6px 10px', textAlign: 'left', width: 220, borderRight: '1px solid #e2e8f0' }}>Labor</th>
              {weeks.map(w => (
                <th key={w} style={{ padding: '4px 2px', textAlign: 'center', minWidth: 36, borderRight: '1px solid #f1f5f9', color: '#475569' }}>
                  S{w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleItems.map(item => {
              const bg = STATUS_COLORS[item.estado] || '#64748b'
              return (
                <tr
                  key={item.id}
                  style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                  onClick={() => onSelectItem(item.id)}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                >
                  <td style={{ padding: '6px 10px', borderRight: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.numero}</div>
                    <div style={{ fontSize: 10, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>
                      {item.actividad}
                    </div>
                  </td>
                  {weeks.map(w => {
                    const isLaborWeek = item.semana === w
                    return (
                      <td key={w} style={{ padding: 2, textAlign: 'center', borderRight: '1px solid #f1f5f9', position: 'relative' }}>
                        {isLaborWeek && (
                          <div
                            style={{
                              background: bg,
                              color: 'white',
                              borderRadius: 3,
                              padding: '3px 1px',
                              fontSize: 9,
                              fontWeight: 700,
                              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                              overflow: 'hidden',
                              position: 'relative',
                            }}
                            title={`${item.numero}: ${item.actividad} (${item.estado} - ${item.porcentaje_avance}%)`}
                          >
                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${item.porcentaje_avance}%`, background: 'rgba(255,255,255,0.3)' }} />
                            <span style={{ position: 'relative', zIndex: 1 }}>{item.porcentaje_avance}%</span>
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
            {visibleItems.length === 0 && (
              <tr><td colSpan={14} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No hay labores en este trimestre ({anio})</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
