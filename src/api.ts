import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api'
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.dispatchEvent(new Event('auth:logout'))
      window.location.href = '/login'
    }

    return Promise.reject(error)
  }
)

/**
 * Mensaje de error accionable a partir de un fallo de axios.
 *
 * Un "Error cargando X" genérico no distingue entre el servidor caído, un backend
 * desactualizado que revienta con 500, y simplemente no tener permiso: todos se ven
 * igual y obligan a abrir la consola para averiguarlo.
 */
export function apiError(err: any, contexto: string): string {
  const status = err?.response?.status
  if (!status) return `${contexto}: el servidor no respondió`

  const detail = err?.response?.data?.detail
  // FastAPI devuelve un array en los 422 de validación: [{loc: [...], msg: '...'}]
  const msg = typeof detail === 'string' ? detail
    : Array.isArray(detail) ? detail.map((d: any) => `${(d.loc || []).slice(1).join('.')}: ${d.msg}`).join(' · ')
    : detail?.detail
  if (status >= 500) return `${contexto}: el servidor falló (HTTP ${status}) — puede estar desactualizado`
  if (status === 403) return `${contexto}: no tienes permiso`
  if (status === 404) return `${contexto}: la ruta no existe en el servidor (HTTP 404)`
  if (status === 422) return `${contexto}: datos inválidos — ${msg}`
  return msg ? `${contexto}: ${msg}` : `${contexto} (HTTP ${status})`
}

/* ════════════════════════════════════════════════════════════════════════════
   PLANIFICACIÓN DE LABORES - TYPES & API METHODS
   ════════════════════════════════════════════════════════════════════════════ */

export interface PlanificacionCampo {
  id?: number
  planificacion_id?: number
  campo_id: string
  area_ha?: number
  completado?: boolean
  ot_id?: number
  campo_nombre?: string
  bloque?: string
}

export interface PlanificacionInsumo {
  id?: number
  planificacion_id?: number
  producto_id: string
  producto_nombre?: string
  dosis_por_ha?: number
  cantidad_total?: number
  unidad?: string
  costo_unitario_estimado?: number
  costo_total_estimado?: number
  observacion?: string
}

export interface PlanificacionReprogramacion {
  id?: number
  planificacion_id?: number
  semana_anterior: number
  anio_anterior: number
  semana_nueva: number
  anio_nuevo: number
  motivo: string
  usuario_id?: number
  usuario_nombre?: string
  fecha_cambio?: string
}

export interface PlanificacionLabor {
  id: number
  numero: string
  anio: number
  semana: number
  fecha_inicio_estimada?: string
  fecha_fin_estimada?: string
  actividad_id: string
  actividad_nombre?: string
  etapa_fenologica?: string
  prioridad: 'Baja' | 'Normal' | 'Alta' | 'Urgente'
  responsable_id?: number
  responsable_nombre?: string
  presupuesto_id?: number
  presupuesto_nombre?: string
  cuenta_id?: number
  cuenta_codigo?: string
  cuenta_nombre?: string
  labor_previa_id?: number
  labor_previa_numero?: string
  labor_previa_actividad?: string
  labor_previa_estado?: string
  labor_previa_completada?: boolean
  estado: 'Pendiente' | 'Parcial' | 'Completa' | 'Vencida' | 'Reprogramada' | 'Cancelada'
  es_recurrente: boolean
  frecuencia_semanas: number
  grupo_recurrencia_id?: string
  repeticion_num: number
  total_repeticiones: number
  reprogramada_de_id?: number
  motivo_reprogramacion?: string
  veces_reprogramada: number
  horas_mo_estimadas: number
  jornales_estimados: number
  costo_mo_estimado: number
  costo_insumos_estimado: number
  costo_equipo_estimado: number
  costo_total_estimado: number
  observaciones?: string
  created_at?: string
  campos_count: number
  campos_completados_count: number
  porcentaje_avance: number
  ots_count: number
  campos_resumen: string
  costo_real_total: number
  dias_atraso: number
}

export interface PlanificacionLaborDetail extends PlanificacionLabor {
  campos: PlanificacionCampo[]
  insumos: PlanificacionInsumo[]
  reprogramaciones: PlanificacionReprogramacion[]
  ordenes: any[]
  costo_real_mo: number
  costo_real_insumos: number
  costo_real_equipo: number
}

export interface GanttPlanItem {
  id: number
  numero: string
  semana: number
  anio: number
  actividad_id: string
  actividad_nombre?: string
  prioridad: string
  estado: string
  campos: string[]
  campos_resumen: string
  avance: number
  labor_previa_id?: number
  labor_previa_numero?: string
  responsable?: string
  costo_estimado: number
  costo_real: number
}

export interface TendenciaSemanalItem {
  semana: number
  total: number
  completadas: number
  reprogramadas: number
  vencidas: number
  costo_plan: number
  costo_real: number
}

export interface IndicadoresCumplimientoReport {
  anio: number
  total_planes: number
  pendientes: number
  parciales: number
  completas: number
  vencidas: number
  reprogramadas: number
  canceladas: number
  porcentaje_cumplimiento: number
  total_lotes_planificados: number
  lotes_completados: number
  porcentaje_cobertura_lotes: number
  costo_estimado_total: number
  costo_real_total: number
  variacion_costo: number
  jornales_estimados_total: number
  tendencia_semanal: TendenciaSemanalItem[]
}

export const planificacionesApi = {
  listar: (params?: any) => api.get<PlanificacionLabor[]>('/planificaciones', { params }),
  obtener: (id: number) => api.get<PlanificacionLaborDetail>(`/planificaciones/${id}`),
  crear: (data: any) => api.post<PlanificacionLabor>('/planificaciones', data),
  actualizar: (id: number, data: any) => api.put<PlanificacionLabor>(`/planificaciones/${id}`, data),
  reprogramar: (id: number, data: { semana_nueva: number; anio_nuevo: number; motivo: string }) =>
    api.post<PlanificacionLabor>(`/planificaciones/${id}/reprogramar`, data),
  eliminar: (id: number) => api.delete(`/planificaciones/${id}`),
  reporteIndicadores: (params?: any) =>
    api.get<IndicadoresCumplimientoReport>('/planificaciones/reportes/indicadores-cumplimiento', { params }),
  reporteGantt: (params?: any) =>
    api.get<{ anio: number; planes: GanttPlanItem[] }>('/planificaciones/reportes/gantt-actividades', { params }),
}

export default api
