import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar, Plus, Filter, RefreshCw, BarChart3, Clock, CheckCircle2,
  AlertTriangle, Eye, Edit2, Trash2, Layers, DollarSign, LayoutGrid, ListFilter
} from 'lucide-react'
import toast from 'react-hot-toast'
import api, { planificacionesApi, apiError, PlanificacionLabor, PlanificacionLaborDetail, GanttPlanItem } from '../../api'
import PlanificacionModal from './PlanificacionModal'
import PlanificacionDetailModal from './PlanificacionDetailModal'
import PlanificacionReprogramarModal from './PlanificacionReprogramarModal'
import PlanificacionKanban from './PlanificacionKanban'
import PlanificacionGantt from './PlanificacionGantt'

const fmt = (n: any) => `RD$ ${Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function PlanificacionList() {
  const navigate = useNavigate()
  const now = new Date()
  const [anio, setAnio] = useState<number>(now.getFullYear())
  const [semana, setSemana] = useState<string>('')
  const [estadoFilter, setEstadoFilter] = useState<string>('')
  const [search, setSearch] = useState<string>('')
  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'gantt'>('table')

  const [loading, setLoading] = useState<boolean>(true)
  const [planificaciones, setPlanificaciones] = useState<PlanificacionLabor[]>([])
  const [ganttData, setGanttData] = useState<GanttPlanItem[]>([])

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false)
  const [planToEdit, setPlanToEdit] = useState<PlanificacionLaborDetail | null>(null)
  const [detailPlanId, setDetailPlanId] = useState<number | null>(null)
  const [reprogramarPlan, setReprogramarPlan] = useState<PlanificacionLabor | null>(null)

  async function loadData() {
    setLoading(true)
    try {
      const params: any = { anio }
      if (semana) params.semana = Number(semana)
      if (estadoFilter) params.estado = estadoFilter

      const [resList, resGantt] = await Promise.all([
        planificacionesApi.listar(params),
        planificacionesApi.gantt({ anio }),
      ])
      setPlanificaciones(resList.data || [])
      setGanttData(resGantt.data || [])
    } catch (err: any) {
      toast.error(apiError(err, 'Error al cargar planificaciones'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [anio, semana, estadoFilter])

  async function handleVerificarVencidas() {
    try {
      const res = await planificacionesApi.verificarVencidas()
      toast.success(res.data.detail || 'Verificación completada')
      loadData()
    } catch (err: any) {
      toast.error(apiError(err, 'Error al verificar vencidas'))
    }
  }

  async function handleDeletePlan(p: PlanificacionLabor) {
    if (!confirm(`¿Eliminar la planificación ${p.numero} (${p.actividad_nombre || p.actividad_id})?`)) return
    try {
      await planificacionesApi.eliminar(p.id)
      toast.success('Planificación eliminada')
      loadData()
    } catch (err: any) {
      toast.error(apiError(err, 'Error al eliminar planificación'))
    }
  }

  // Filtered in-memory by search
  const filteredList = planificaciones.filter(p => {
    if (!search) return true
    const term = search.toLowerCase()
    return (
      p.numero.toLowerCase().includes(term) ||
      (p.actividad_nombre && p.actividad_nombre.toLowerCase().includes(term)) ||
      (p.responsable_nombre && p.responsable_nombre.toLowerCase().includes(term)) ||
      p.actividad_id.toLowerCase().includes(term)
    )
  })

  // KPI calculations
  const totalLabores = planificaciones.length
  const completadas = planificaciones.filter(p => p.estado === 'Completa').length
  const pendientes = planificaciones.filter(p => p.estado === 'Pendiente' || p.estado === 'Parcial').length
  const vencidas = planificaciones.filter(p => p.estado === 'Vencida').length
  const cumplimientoPct = totalLabores > 0 ? Math.round((completadas / totalLabores) * 100) : 0
  const totalCostoEst = planificaciones.reduce((acc, p) => acc + Number(p.costo_total_estimado || 0), 0)

  // PLACEHOLDER_PAGE_RENDER
  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Page Header & Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a' }}>Planificación de Labores</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            Cronograma semanal, distribución en lotes, insumos y vinculación con órdenes de trabajo.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => navigate('/planificacion/reportes')}>
            <BarChart3 size={15} /> Métricas & Reportes
          </button>
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={handleVerificarVencidas}>
            <Clock size={15} /> Verificar Vencidas
          </button>
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => { setPlanToEdit(null); setShowCreateModal(true) }}>
            <Plus size={16} /> Planificar Labor
          </button>
        </div>
      </div>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ background: 'white', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Planificadas</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{totalLabores}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Año {anio}</div>
        </div>
        <div style={{ background: 'white', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>Pendientes / En Curso</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#2563eb', marginTop: 4 }}>{pendientes}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Activas en cronograma</div>
        </div>
        <div style={{ background: 'white', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Cumplimiento</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>{cumplimientoPct}%</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{completadas} completadas</div>
        </div>
        <div style={{ background: 'white', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>Vencidas / Alertas</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#dc2626', marginTop: 4 }}>{vencidas}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Requieren reprogramación</div>
        </div>
        <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #cbd5e1' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Presupuesto Total Est.</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginTop: 6 }}>{fmt(totalCostoEst)}</div>
        </div>
      </div>
      {/* Filter & View Switcher Bar */}
      <div style={{ background: 'white', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <input type="number" value={anio} onChange={e => setAnio(Number(e.target.value))} style={{ width: 80, height: 32, borderRadius: 5, border: '1px solid #cbd5e1', padding: '0 6px', fontSize: 12 }} title="Año" />
          <input type="number" min={1} max={53} value={semana} placeholder="Semana..." onChange={e => setSemana(e.target.value)} style={{ width: 85, height: 32, borderRadius: 5, border: '1px solid #cbd5e1', padding: '0 6px', fontSize: 12 }} />
          <select value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)} style={{ height: 32, borderRadius: 5, border: '1px solid #cbd5e1', padding: '0 6px', fontSize: 12 }}>
            <option value="">Todos los Estados</option>
            <option value="Pendiente">Pendientes</option>
            <option value="Parcial">Parciales</option>
            <option value="Completa">Completadas</option>
            <option value="Vencida">Vencidas</option>
            <option value="Reprogramada">Reprogramadas</option>
          </select>
          <input type="text" placeholder="Buscar por labor, actividad..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200, height: 32, borderRadius: 5, border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 12 }} />
          <button className="btn-secondary" style={{ height: 32, padding: '0 8px' }} onClick={loadData} title="Refrescar"><RefreshCw size={13} /></button>
        </div>
        <div style={{ display: 'flex', background: '#f1f5f9', padding: 2, borderRadius: 5 }}>
          {(['table', 'kanban', 'gantt'] as const).map(mode => (
            <button key={mode} type="button" onClick={() => setViewMode(mode)} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', background: viewMode === mode ? 'white' : 'transparent', color: viewMode === mode ? '#0f172a' : '#64748b', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
              {mode === 'table' ? '📋 Tabla' : mode === 'kanban' ? '📊 Kanban' : '📅 Gantt'}
            </button>
          ))}
        </div>
      </div>
      {/* Content View */}
      {loading ? (
        <div style={{ background: 'white', padding: 30, borderRadius: 8, textAlign: 'center', color: '#64748b' }}>Cargando planificación...</div>
      ) : viewMode === 'kanban' ? (
        <PlanificacionKanban planificaciones={filteredList} onSelect={p => setDetailPlanId(p.id)} onReprogramar={p => setReprogramarPlan(p)} />
      ) : viewMode === 'gantt' ? (
        <PlanificacionGantt items={ganttData} anio={anio} onSelectItem={id => setDetailPlanId(id)} />
      ) : (
        /* Table View */
        <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}># Labor</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Semana</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Actividad</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Lotes / Área</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Supervisor</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Costo Est.</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Avance</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Estado</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map(p => {
                const b = (p.estado === 'Completa' ? { bg: '#dcfce7', color: '#166534' } : p.estado === 'Vencida' ? { bg: '#fee2e2', color: '#991b1b' } : p.estado === 'Parcial' ? { bg: '#dbeafe', color: '#1e40af' } : { bg: '#fef3c7', color: '#92400e' })
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#2563eb' }}>
                      <span role="button" tabIndex={0} style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setDetailPlanId(p.id)}>{p.numero}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}><div style={{ fontWeight: 600 }}>Sem {p.semana}/{p.anio}</div><div style={{ fontSize: 10, color: '#64748b' }}>{p.fecha_inicio_estimada || '—'}</div></td>
                    <td style={{ padding: '10px 12px' }}><div style={{ fontWeight: 600 }}>{p.actividad_nombre || p.actividad_id}</div><div style={{ fontSize: 10, color: '#64748b' }}>{p.etapa_fenologica || 'General'}</div></td>
                    <td style={{ padding: '10px 12px' }}><div>{p.campos_count || 0} lotes</div><div style={{ fontSize: 10, color: '#64748b' }}>{p.total_area_ha || 0} ha</div></td>
                    <td style={{ padding: '10px 12px', color: '#475569' }}>{p.responsable_nombre || '—'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{fmt(p.costo_total_estimado)}</td>
                    <td style={{ padding: '10px 12px', width: 100 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}><div style={{ width: `${Math.min(100, p.porcentaje_avance)}%`, height: '100%', background: p.porcentaje_avance >= 100 ? '#16a34a' : '#2563eb' }} /></div>
                        <span style={{ fontSize: 10, fontWeight: 700 }}>{p.porcentaje_avance}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: b.bg, color: b.color }}>{p.estado}</span></td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                        <button type="button" className="btn-secondary" style={{ padding: '2px 5px' }} title="Ver" onClick={() => setDetailPlanId(p.id)}><Eye size={12} /></button>
                        <button type="button" className="btn-secondary" style={{ padding: '2px 5px' }} title="Reprogramar" onClick={() => setReprogramarPlan(p)}><Calendar size={12} /></button>
                        <button type="button" className="btn-secondary" style={{ padding: '2px 5px' }} title="Generar OT" onClick={() => navigate(`/ordenes/nueva?planificacion_id=${p.id}&actividad_id=${p.actividad_id}`)}><Plus size={12} /></button>
                        <button type="button" className="btn-secondary" style={{ padding: '2px 5px' }} title="Eliminar" onClick={() => handleDeletePlan(p)}><Trash2 size={12} color="#ef4444" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filteredList.length === 0 && (<tr><td colSpan={9} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>Sin labores planificadas</td></tr>)}
            </tbody>
          </table>
        </div>
      )}
      {/* Modales */}
      {(showCreateModal || planToEdit) && (
        <PlanificacionModal
          planToEdit={planToEdit}
          initialYear={anio}
          initialWeek={semana ? Number(semana) : undefined}
          onClose={() => { setShowCreateModal(false); setPlanToEdit(null) }}
          onSuccess={() => { setShowCreateModal(false); setPlanToEdit(null); loadData() }}
        />
      )}

      {detailPlanId && (
        <PlanificacionDetailModal
          planId={detailPlanId}
          onClose={() => setDetailPlanId(null)}
          onEdit={p => { setDetailPlanId(null); setPlanToEdit(p) }}
          onReprogramar={p => { setDetailPlanId(null); setReprogramarPlan(p) }}
          onRefresh={loadData}
        />
      )}

      {reprogramarPlan && (
        <PlanificacionReprogramarModal
          plan={reprogramarPlan}
          onClose={() => setReprogramarPlan(null)}
          onSuccess={() => { setReprogramarPlan(null); loadData() }}
        />
      )}
    </div>
  )
}
