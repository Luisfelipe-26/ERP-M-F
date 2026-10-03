import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import api, { planificacionesApi, apiError, PlanificacionLaborDetail } from '../../api'

interface Props {
  planToEdit?: PlanificacionLaborDetail | null
  initialWeek?: number
  initialYear?: number
  onClose: () => void
  onSuccess: () => void
}

export default function PlanificacionModal({ planToEdit, initialWeek, initialYear, onClose, onSuccess }: Props) {
  const isEdit = !!planToEdit
  const now = new Date()
  const currentYear = initialYear || planToEdit?.anio || now.getFullYear()
  const currentWeek = initialWeek || planToEdit?.semana || 1

  const [actividades, setActividades] = useState<any[]>([])
  const [camposList, setCamposList] = useState<any[]>([])
  const [trabajadores, setTrabajadores] = useState<any[]>([])
  const [productos, setProductos] = useState<any[]>([])
  const [presupuestos, setPresupuestos] = useState<any[]>([])
  const [existingPlans, setExistingPlans] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  // Form State
  const [anio, setAnio] = useState<number>(planToEdit?.anio || currentYear)
  const [semana, setSemana] = useState<number>(planToEdit?.semana || currentWeek)
  const [fechaInicio, setFechaInicio] = useState<string>(planToEdit?.fecha_inicio_estimada || '')
  const [fechaFin, setFechaFin] = useState<string>(planToEdit?.fecha_fin_estimada || '')
  const [actividadId, setActividadId] = useState<string>(planToEdit?.actividad_id || '')
  const [etapaFenologica, setEtapaFenologica] = useState<string>(planToEdit?.etapa_fenologica || 'General')
  const [prioridad, setPrioridad] = useState<string>(planToEdit?.prioridad || 'Normal')
  const [responsableId, setResponsableId] = useState<number | ''>(planToEdit?.responsable_id || '')
  const [presupuestoId, setPresupuestoId] = useState<number | ''>(planToEdit?.presupuesto_id || '')
  const [cuentaCodigo, setCuentaCodigo] = useState<string>(planToEdit?.cuenta_codigo || '')
  const [laborPreviaId, setLaborPreviaId] = useState<number | ''>(planToEdit?.labor_previa_id || '')
  const [observaciones, setObservaciones] = useState<string>(planToEdit?.observaciones || '')

  // Recurrencia
  const [esRecurrente, setEsRecurrente] = useState<boolean>(planToEdit?.es_recurrente || false)
  const [frecuenciaSemanas, setFrecuenciaSemanas] = useState<number>(planToEdit?.frecuencia_semanas || 1)
  const [totalRepeticiones, setTotalRepeticiones] = useState<number>(planToEdit?.total_repeticiones || 4)

  // Selected campos
  const [selectedCampos, setSelectedCampos] = useState<string[]>(
    planToEdit?.campos?.map((c: any) => c.campo_id) || []
  )

  // Dynamic insumos list
  const [insumos, setInsumos] = useState<any[]>(
    planToEdit?.insumos?.map((i: any) => ({
      producto_id: i.producto_id,
      dosis_por_ha: i.dosis_por_ha || 0,
      cantidad_total: i.cantidad_total || 0,
      unidad: i.unidad || '',
      costo_unitario_estimado: i.costo_unitario_estimado || 0,
      costo_total_estimado: i.costo_total_estimado || 0,
    })) || []
  )

  const [costoMo, setCostoMo] = useState<number>(planToEdit?.costo_mo_estimado || 0)
  const [costoEquipo, setCostoEquipo] = useState<number>(planToEdit?.costo_equipo_estimado || 0)

  // Calculos
  const totalAreaHa = selectedCampos.reduce((acc, cId) => {
    const c = camposList.find((x: any) => x.id_campo === cId)
    return acc + (Number(c?.area_ha) || 0)
  }, 0)

  const totalInsumosCost = insumos.reduce((acc, i) => acc + (Number(i.costo_total_estimado) || 0), 0)
  const granTotalEstimado = Number(costoMo || 0) + Number(costoEquipo || 0) + totalInsumosCost

  useEffect(() => {
    Promise.all([
      api.get('/actividades'),
      api.get('/campos'),
      api.get('/trabajadores'),
      api.get('/productos'),
      api.get('/contabilidad/presupuestos-documento').catch(() => ({ data: [] })),
      planificacionesApi.listar({ anio }).catch(() => ({ data: [] })),
    ]).then(([act, cam, trab, prod, pres, plans]) => {
      setActividades(act.data || [])
      setCamposList(cam.data || [])
      setTrabajadores(trab.data || [])
      setProductos(prod.data || [])
      setPresupuestos(pres.data || [])
      setExistingPlans(plans.data || [])
    })
  }, [anio])

  function updateInsumoRow(idx: number, patch: any) {
    setInsumos(prev => {
      const next = [...prev]
      const curr = { ...next[idx], ...patch }
      if ('producto_id' in patch) {
        const p = productos.find(x => x.id_producto === patch.producto_id)
        if (p) {
          curr.unidad = p.unidad_medida || p.unidad || ''
          curr.costo_unitario_estimado = p.costo_promedio || p.precio_unitario || 0
        }
      }
      if ('dosis_por_ha' in patch || 'producto_id' in patch) {
        if (totalAreaHa > 0 && curr.dosis_por_ha > 0) {
          curr.cantidad_total = Number((curr.dosis_por_ha * totalAreaHa).toFixed(2))
        }
      }
      curr.costo_total_estimado = Number(((curr.cantidad_total || 0) * (curr.costo_unitario_estimado || 0)).toFixed(2))
      next[idx] = curr
      return next
    })
  }

  function addInsumoRow() {
    setInsumos(prev => [
      ...prev,
      { producto_id: '', dosis_por_ha: 0, cantidad_total: 0, unidad: '', costo_unitario_estimado: 0, costo_total_estimado: 0 }
    ])
  }

  function removeInsumoRow(idx: number) {
    setInsumos(prev => prev.filter((_, i) => i !== idx))
  }

  function toggleCampo(cId: string) {
    setSelectedCampos(prev => prev.includes(cId) ? prev.filter(x => x !== cId) : [...prev, cId])
  }

  useEffect(() => {
    if (totalAreaHa > 0) {
      setInsumos(prev => prev.map(i => {
        if (i.dosis_por_ha > 0) {
          const qty = Number((i.dosis_por_ha * totalAreaHa).toFixed(2))
          return { ...i, cantidad_total: qty, costo_total_estimado: Number((qty * (i.costo_unitario_estimado || 0)).toFixed(2)) }
        }
        return i
      }))
    }
  }, [totalAreaHa])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!actividadId) return toast.error('Selecciona una actividad obligatoria')
    if (selectedCampos.length === 0) return toast.error('Selecciona al menos un lote / campo')

    setSaving(true)
    try {
      const payload: any = {
        semana: Number(semana),
        anio: Number(anio),
        fecha_inicio_estimada: fechaInicio || null,
        fecha_fin_estimada: fechaFin || null,
        actividad_id: actividadId,
        etapa_fenologica: etapaFenologica || null,
        prioridad,
        responsable_id: responsableId ? Number(responsableId) : null,
        presupuesto_id: presupuestoId ? Number(presupuestoId) : null,
        cuenta_codigo: cuentaCodigo || null,
        labor_previa_id: laborPreviaId ? Number(laborPreviaId) : null,
        costo_mo_estimado: Number(costoMo) || 0,
        costo_insumos_estimado: Number(totalInsumosCost) || 0,
        costo_equipo_estimado: Number(costoEquipo) || 0,
        costo_total_estimado: Number(granTotalEstimado) || 0,
        es_recurrente: esRecurrente,
        frecuencia_semanas: esRecurrente ? Number(frecuenciaSemanas) : null,
        total_repeticiones: esRecurrente ? Number(totalRepeticiones) : null,
        observaciones: observaciones || null,
        campos_ids: selectedCampos,
        insumos: insumos.filter(i => i.producto_id).map(i => ({
          producto_id: i.producto_id,
          dosis_por_ha: Number(i.dosis_por_ha) || 0,
          cantidad_total: Number(i.cantidad_total) || 0,
          unidad: i.unidad || null,
          costo_unitario_estimado: Number(i.costo_unitario_estimado) || 0,
          costo_total_estimado: Number(i.costo_total_estimado) || 0,
        }))
      }

      if (isEdit && planToEdit) {
        await planificacionesApi.actualizar(planToEdit.id, payload)
        toast.success('Planificación actualizada correctamente')
      } else {
        await planificacionesApi.crear(payload)
        toast.success(esRecurrente ? 'Labores recurrentes planificadas' : 'Labor planificada con éxito')
      }
      onSuccess()
    } catch (err: any) {
      toast.error(apiError(err, 'Error al guardar la planificación'))
    } finally {
      setSaving(false)
    }
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', zIndex: 1060, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 860, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}>
        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1d4ed8' }}>
              <Calendar size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                {isEdit ? `Editar Labor Planificada (${planToEdit.numero})` : 'Nueva Planificación de Labor'}
              </h3>
              <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
                Programa labores agrícolas con cálculo automático de insumos y costos.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: 18 }}>
          {/* Row 1: Actividad & Fenología */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Actividad Agrícola *</label>
              <select value={actividadId} onChange={e => setActividadId(e.target.value)} required style={{ width: '100%', height: 34, borderRadius: 6, border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 12 }}>
                <option value="">-- Seleccionar Actividad --</option>
                {actividades.map(a => (<option key={a.id_act} value={a.id_act}>[{a.id_act}] {a.actividad}</option>))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Etapa Fenológica</label>
              <select value={etapaFenologica} onChange={e => setEtapaFenologica(e.target.value)} style={{ width: '100%', height: 34, borderRadius: 6, border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 12 }}>
                <option value="General">General</option><option value="Preparación">Preparación</option><option value="Siembra">Siembra</option><option value="Vegetativo">Vegetativo</option><option value="Floración">Floración</option><option value="Fructificación">Fructificación</option><option value="Maduración">Maduración</option><option value="Cosecha">Cosecha</option><option value="Poda">Poda</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Prioridad</label>
              <select value={prioridad} onChange={e => setPrioridad(e.target.value)} style={{ width: '100%', height: 34, borderRadius: 6, border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 12 }}>
                <option value="Baja">Baja</option><option value="Normal">Normal</option><option value="Alta">Alta</option><option value="Urgente">Urgente</option>
              </select>
            </div>
          </div>

          {/* Row 2: Período y Fechas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr 1.5fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Año</label>
              <input type="number" value={anio} onChange={e => setAnio(Number(e.target.value))} min={2020} max={2040} required style={{ width: '100%', height: 34, borderRadius: 6, border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 12 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Semana (1-53)</label>
              <input type="number" value={semana} onChange={e => setSemana(Number(e.target.value))} min={1} max={53} required style={{ width: '100%', height: 34, borderRadius: 6, border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 12 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Fecha Inicio</label>
              <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} style={{ width: '100%', height: 34, borderRadius: 6, border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 12 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Fecha Fin</label>
              <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} style={{ width: '100%', height: 34, borderRadius: 6, border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 12 }} />
            </div>
          </div>
          {/* Row 3: Responsable & Presupuesto & Dependencia */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1.5fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Supervisor</label>
              <select value={responsableId} onChange={e => setResponsableId(e.target.value ? Number(e.target.value) : '')} style={{ width: '100%', height: 34, borderRadius: 6, border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 12 }}>
                <option value="">-- Sin Asignar --</option>
                {trabajadores.map(t => (<option key={t.id_trabajador || t.id} value={t.id_trabajador || t.id}>{t.nombre} {t.apellido || ''}</option>))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Presupuesto</label>
              <select value={presupuestoId} onChange={e => setPresupuestoId(e.target.value ? Number(e.target.value) : '')} style={{ width: '100%', height: 34, borderRadius: 6, border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 12 }}>
                <option value="">-- Sin Presupuesto --</option>
                {presupuestos.map(p => (<option key={p.id} value={p.id}>{p.numero} - {p.nombre}</option>))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Depende de Labor Previa</label>
              <select value={laborPreviaId} onChange={e => setLaborPreviaId(e.target.value ? Number(e.target.value) : '')} style={{ width: '100%', height: 34, borderRadius: 6, border: '1px solid #cbd5e1', padding: '0 8px', fontSize: 12 }}>
                <option value="">-- Ninguna --</option>
                {existingPlans.filter(p => !planToEdit || p.id !== planToEdit.id).map(p => (<option key={p.id} value={p.id}>{p.numero} - {p.actividad_nombre || p.actividad_id} (Sem {p.semana})</option>))}
              </select>
            </div>
          </div>

          {/* Lotes / Campos */}
          <div style={{ marginBottom: 14, background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#1e293b', textTransform: 'uppercase' }}>
                🌱 LOTES ({selectedCampos.length} sel. — {totalAreaHa.toFixed(2)} ha total) *
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" style={{ fontSize: 10, padding: '2px 6px', background: '#e2e8f0', border: 'none', borderRadius: 4, cursor: 'pointer' }} onClick={() => setSelectedCampos(camposList.map(c => c.id_campo))}>Todos</button>
                <button type="button" style={{ fontSize: 10, padding: '2px 6px', background: '#e2e8f0', border: 'none', borderRadius: 4, cursor: 'pointer' }} onClick={() => setSelectedCampos([])}>Limpiar</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
              {camposList.map(c => {
                const checked = selectedCampos.includes(c.id_campo)
                return (
                  <label key={c.id_campo} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 4, background: checked ? '#dbeafe' : 'white', border: `1px solid ${checked ? '#93c5fd' : '#cbd5e1'}`, cursor: 'pointer', fontSize: 11 }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleCampo(c.id_campo)} />
                    <span><strong>{c.id_campo}</strong> ({c.area_ha || 0} ha)</span>
                  </label>
                )
              })}
            </div>
          </div>
          {/* Insumos */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#1e293b', textTransform: 'uppercase' }}>
                📦 INSUMOS ESTIMADOS Y CÁLCULO DE DOSIS
              </span>
              <button type="button" className="btn-secondary" style={{ fontSize: 10, padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 3 }} onClick={addInsumoRow}>
                <Plus size={12} /> Añadir Insumo
              </button>
            </div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Producto</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Dosis/ha</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Cant. Total</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Unidad</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Costo Unit.</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Costo Total</th>
                    <th style={{ padding: '6px 4px', width: 24 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {insumos.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '4px 6px' }}>
                        <select value={row.producto_id} onChange={e => updateInsumoRow(idx, { producto_id: e.target.value })} style={{ width: '100%', height: 28, borderRadius: 4, border: '1px solid #cbd5e1', padding: '0 4px', fontSize: 11 }}>
                          <option value="">-- Seleccionar --</option>
                          {productos.map(p => (<option key={p.id_producto} value={p.id_producto}>{p.nombre}</option>))}
                        </select>
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input type="number" step="0.01" value={row.dosis_por_ha || ''} onChange={e => updateInsumoRow(idx, { dosis_por_ha: parseFloat(e.target.value) || 0 })} placeholder="0.00" style={{ width: '100%', height: 28, borderRadius: 4, border: '1px solid #cbd5e1', padding: '0 4px', fontSize: 11, textAlign: 'right' }} />
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input type="number" step="0.01" value={row.cantidad_total || ''} onChange={e => updateInsumoRow(idx, { cantidad_total: parseFloat(e.target.value) || 0 })} placeholder="0.00" style={{ width: '100%', height: 28, borderRadius: 4, border: '1px solid #cbd5e1', padding: '0 4px', fontSize: 11, textAlign: 'right', fontWeight: 600 }} />
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input type="text" value={row.unidad || ''} onChange={e => updateInsumoRow(idx, { unidad: e.target.value })} placeholder="Kg/Lt" style={{ width: '100%', height: 28, borderRadius: 4, border: '1px solid #cbd5e1', padding: '0 4px', fontSize: 11 }} />
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input type="number" step="0.01" value={row.costo_unitario_estimado || ''} onChange={e => updateInsumoRow(idx, { costo_unitario_estimado: parseFloat(e.target.value) || 0 })} placeholder="0.00" style={{ width: '100%', height: 28, borderRadius: 4, border: '1px solid #cbd5e1', padding: '0 4px', fontSize: 11, textAlign: 'right' }} />
                      </td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, color: '#1e40af' }}>
                        RD$ {Number(row.costo_total_estimado || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '4px 4px', textAlign: 'center' }}>
                        <button type="button" onClick={() => removeInsumoRow(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  ))}
                  {insumos.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: 8, textAlign: 'center', color: '#94a3b8' }}>Sin insumos configurados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {/* Resumen de Costos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12, background: '#f8fafc', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b' }}>MO (RD$)</label>
              <input type="number" step="0.01" value={costoMo || ''} onChange={e => setCostoMo(parseFloat(e.target.value) || 0)} placeholder="0.00" style={{ width: '100%', height: 30, borderRadius: 4, border: '1px solid #cbd5e1', padding: '0 6px', fontSize: 12 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b' }}>INSUMOS (RD$)</label>
              <div style={{ height: 30, display: 'flex', alignItems: 'center', padding: '0 6px', background: '#e2e8f0', borderRadius: 4, fontSize: 12, fontWeight: 700, color: '#1e40af' }}>
                RD$ {totalInsumosCost.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#64748b' }}>EQUIPO (RD$)</label>
              <input type="number" step="0.01" value={costoEquipo || ''} onChange={e => setCostoEquipo(parseFloat(e.target.value) || 0)} placeholder="0.00" style={{ width: '100%', height: 30, borderRadius: 4, border: '1px solid #cbd5e1', padding: '0 6px', fontSize: 12 }} />
            </div>
            <div style={{ background: '#f0fdf4', padding: '4px 6px', borderRadius: 4, border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#166534' }}>TOTAL ESTIMADO</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#166534', marginTop: 2 }}>
                RD$ {granTotalEstimado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Recurrencia */}
          {!isEdit && (
            <div style={{ marginBottom: 12, padding: 8, background: esRecurrente ? '#faf5ff' : '#f8fafc', borderRadius: 6, border: `1px solid ${esRecurrente ? '#d8b4fe' : '#e2e8f0'}` }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 700, fontSize: 12, color: esRecurrente ? '#7e22ce' : '#334155' }}>
                <input type="checkbox" checked={esRecurrente} onChange={e => setEsRecurrente(e.target.checked)} />
                🔁 Generar como Labor Recurrente (Multi-semana)
              </label>
              {esRecurrente && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b21a8' }}>Frecuencia</label>
                    <select value={frecuenciaSemanas} onChange={e => setFrecuenciaSemanas(Number(e.target.value))} style={{ width: '100%', height: 30, borderRadius: 4, border: '1px solid #c084fc', padding: '0 6px', fontSize: 11 }}>
                      <option value={1}>Cada 1 semana (Semanal)</option>
                      <option value={2}>Cada 2 semanas (Quincenal)</option>
                      <option value={3}>Cada 3 semanas</option>
                      <option value={4}>Cada 4 semanas (Mensual)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b21a8' }}>Repeticiones</label>
                    <input type="number" min={2} max={52} value={totalRepeticiones} onChange={e => setTotalRepeticiones(Number(e.target.value))} style={{ width: '100%', height: 30, borderRadius: 4, border: '1px solid #c084fc', padding: '0 6px', fontSize: 11 }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Observaciones */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Observaciones</label>
            <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} placeholder="Instrucciones especiales..." style={{ width: '100%', borderRadius: 6, border: '1px solid #cbd5e1', padding: '6px 8px', fontSize: 12, resize: 'vertical' }} />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando...' : isEdit ? 'Actualizar' : 'Planificar Labor'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
