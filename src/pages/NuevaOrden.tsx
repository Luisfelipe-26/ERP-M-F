import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import api from '../api'
import toast from 'react-hot-toast'
import { Plus, Trash2, ArrowLeft, ClipboardList, Save } from 'lucide-react'

const UNIDADES_AJUSTE = ['Metros lineales', 'Tanques', 'Tarea', 'Unidades']

export default function NuevaOrden() {
  const navigate = useNavigate()
  const { editId } = useParams()
  const [searchParams] = useSearchParams()
  const duplicarId = searchParams.get('duplicar')
  const isEdit = !!editId
  const [campos, setCampos] = useState([])
  const [actividades, setActividades] = useState([])
  const [trabajadores, setTrabajadores] = useState([])
  const [productos, setProductos] = useState([])
  const [saving, setSaving] = useState(false)
  const [nextOtId, setNextOtId] = useState(null)

  // Draft key for localStorage persistence
  const draftKey = isEdit ? `corvus_ot_draft_${editId}` : 'corvus_ot_draft_new'
  const savedDraft = !isEdit ? (() => { try { return JSON.parse(localStorage.getItem(draftKey)) } catch { return null } })() : null

  const [form, setForm] = useState(savedDraft?.form || {
    fecha_ejecucion: new Date().toISOString().split('T')[0],
    hora_inicio: '',
    campo_id: '',
    actividad_id: '',
    supervisor: '',
    estado: 'Abierta',
    equipo: '',
    horas_equipo: '',
    tarifa_equipo: '',
    observaciones: '',
  })

  const [manoObra, setManoObra] = useState(savedDraft?.manoObra || [])
  const [detalles, setDetalles] = useState(savedDraft?.detalles || [])

  // Auto-save draft to localStorage on every change (only for new OTs)
  useEffect(() => {
    if (isEdit) return
    const draft = { form, manoObra, detalles, savedAt: new Date().toISOString() }
    localStorage.setItem(draftKey, JSON.stringify(draft))
  }, [form, manoObra, detalles])

  useEffect(() => {
    Promise.all([
      api.get('/campos'),
      api.get('/actividades'),
      api.get('/trabajadores'),
      api.get('/productos'),
      !isEdit ? api.get('/ordenes/preview/next-id') : Promise.resolve({ data: { next_ot_id: Number(editId) } }),
    ]).then(([c, a, t, p, n]) => {
      setCampos(c.data)
      setActividades(a.data)
      setTrabajadores(t.data)
      setProductos(p.data)
      setNextOtId(n.data.next_ot_id)

      // Load existing OT data for editing
      if (isEdit) {
        api.get(`/ordenes/${editId}/detalle`).then(({ data: det }) => {
          const o = det.orden
          setForm({
            fecha_ejecucion: o.fecha_ejecucion ? o.fecha_ejecucion.split('T')[0] : '',
            hora_inicio: o.hora_inicio || '',
            campo_id: o.campo_id || '',
            actividad_id: o.actividad_id || '',
            supervisor: o.supervisor || '',
            estado: o.estado || 'Abierta',
            equipo: o.equipo || '',
            horas_equipo: o.horas_equipo || '',
            tarifa_equipo: o.tarifa_equipo || '',
            observaciones: o.observaciones || '',
          })
          // Load MO rows
          const act = a.data.find(x => x.id_act === o.actividad_id)
          setManoObra(det.mano_obra.map(m => ({
            trabajador_id: m.trabajador_id,
            modalidad: m.modalidad || 'Jornada',
            horas_netas: m.horas_netas || 8,
            hora_inicio_mo: m.hora_inicio || o.hora_inicio || '',
            hora_fin_mo: m.hora_fin || '',
            pausa_minutos: m.pausa_minutos || 0,
            costo_hora: act ? (act.tarifa_jornada || 530) / 8 : (m.costo_hora || 62.50),
            cantidad_ajuste: m.modalidad === 'Ajuste' ? m.horas_netas : '',
            unidad_ajuste: m.observacion ? m.observacion.split(' ')[1] || 'Tarea' : 'Tarea',
            costo_mo: m.modalidad === 'Ajuste' && m.horas_netas ? m.costo_mo / m.horas_netas : m.costo_mo,
            _manualCosto: false,
          })))
          // Load detalles
          setDetalles(det.detalles.map(d => ({
            producto_id: d.producto_id,
            cantidad_usada: d.cantidad_usada,
            unidad: d.unidad || 'L',
            costo_unitario: d.costo_unitario,
            costo_real: d.costo_real,
            _manualCosto: false,
          })))
        }).catch(() => toast.error('Error al cargar la orden'))
      }

      // Load data for duplication (new OT with copied data)
      if (!isEdit && duplicarId) {
        api.get(`/ordenes/${duplicarId}/detalle`).then(({ data: det }) => {
          const o = det.orden
          setForm(prev => ({
            ...prev,
            campo_id: o.campo_id || '',
            actividad_id: o.actividad_id || '',
            supervisor: o.supervisor || '',
            estado: 'Abierta',
            equipo: o.equipo || '',
            horas_equipo: o.horas_equipo || '',
            tarifa_equipo: o.tarifa_equipo || '',
            observaciones: '',
          }))
          const act = a.data.find(x => x.id_act === o.actividad_id)
          setManoObra(det.mano_obra.map(m => ({
            trabajador_id: m.trabajador_id,
            modalidad: m.modalidad || 'Jornada',
            horas_netas: m.horas_netas || 8,
            hora_inicio_mo: '',
            hora_fin_mo: '',
            pausa_minutos: m.pausa_minutos || 0,
            costo_hora: act ? (act.tarifa_jornada || 530) / 8 : (m.costo_hora || 62.50),
            cantidad_ajuste: m.modalidad === 'Ajuste' ? m.horas_netas : '',
            unidad_ajuste: m.observacion ? m.observacion.split(' ')[1] || 'Tarea' : 'Tarea',
            costo_mo: m.modalidad === 'Ajuste' && m.horas_netas ? m.costo_mo / m.horas_netas : m.costo_mo,
            _manualCosto: false,
          })))
          setDetalles(det.detalles.map(d => ({
            producto_id: d.producto_id,
            cantidad_usada: d.cantidad_usada,
            unidad: d.unidad || 'L',
            costo_unitario: d.costo_unitario,
            costo_real: d.costo_real,
            _manualCosto: false,
          })))
          toast.success(`Datos copiados de OT-${duplicarId}`)
        }).catch(() => toast.error('Error al cargar OT para duplicar'))
      }
    })
  }, [])

  const actividadSel = actividades.find(a => a.id_act === form.actividad_id)

  function addMO() {
    const tarifa = actividadSel?.tarifa_jornada || 530
    const costoHora = tarifa / 8
    setManoObra([...manoObra, {
      trabajador_id: '', modalidad: 'Jornada',
      horas_netas: 8, hora_inicio_mo: form.hora_inicio || '', hora_fin_mo: '',
      pausa_minutos: 0,
      costo_hora: costoHora,
      cantidad_ajuste: '', unidad_ajuste: 'Tarea',
      costo_mo: tarifa, _manualCosto: false
    }])
  }

  function calcCostoMO(row) {
    if (row._manualCosto) return row.costo_mo
    if (row.modalidad === 'Ajuste' && actividadSel?.tarifa_ajuste) {
      return actividadSel.tarifa_ajuste
    }
    return (row.costo_hora || 0) * (row.horas_netas || 0)
  }

  function calcHorasFromTime(horaInicio, horaFin, pausaMin = 0) {
    if (!horaInicio || !horaFin) return null
    const [h1, m1] = horaInicio.split(':').map(Number)
    const [h2, m2] = horaFin.split(':').map(Number)
    let mins = (h2 * 60 + m2) - (h1 * 60 + m1)
    if (mins < 0) mins += 24 * 60
    mins -= Number(pausaMin) || 0
    if (mins < 0) mins = 0
    return Math.round((mins / 60) * 100) / 100 // horas exactas, 2 decimales
  }

  function updateMO(i, key, val) {
    const updated = [...manoObra]
    updated[i] = { ...updated[i], [key]: val }

    if (key === 'trabajador_id') {
      // No cambiar costo_hora — viene de la actividad, no del trabajador
      updated[i]._manualCosto = false
    }

    // Auto-calc hours from time inputs
    if ((key === 'hora_inicio_mo' || key === 'hora_fin_mo' || key === 'pausa_minutos') && updated[i].modalidad === 'Jornada') {
      const horas = calcHorasFromTime(
        key === 'hora_inicio_mo' ? val : updated[i].hora_inicio_mo,
        key === 'hora_fin_mo' ? val : updated[i].hora_fin_mo,
        key === 'pausa_minutos' ? val : updated[i].pausa_minutos
      )
      if (horas !== null) {
        updated[i].horas_netas = horas
        if (!updated[i]._manualCosto) {
          updated[i].costo_mo = (updated[i].costo_hora || 0) * horas
        }
      }
    }

    if (key === 'modalidad') {
      updated[i]._manualCosto = false
      if (val === 'Ajuste' && actividadSel?.tarifa_ajuste) {
        updated[i].costo_mo = actividadSel.tarifa_ajuste
      } else if (val === 'Jornada' && actividadSel?.tarifa_jornada) {
        updated[i].costo_mo = actividadSel.tarifa_jornada
        updated[i].costo_hora = actividadSel.tarifa_jornada / 8
        updated[i].hora_inicio_mo = form.hora_inicio || ''
        updated[i].horas_netas = 8
      } else {
        updated[i].costo_mo = (updated[i].costo_hora || 0) * (updated[i].horas_netas || 0)
      }
    } else if (key === 'cantidad_ajuste' && updated[i].modalidad === 'Ajuste') {
      // Cantidad ajuste no cambia el costo — es solo registro de medida
      // El costo es fijo = tarifa_ajuste de la actividad
    } else if (key === 'costo_mo') {
      updated[i].costo_mo = Number(val)
      updated[i]._manualCosto = true
    } else if (!updated[i]._manualCosto && key !== 'hora_inicio_mo' && key !== 'hora_fin_mo') {
      updated[i].costo_mo = calcCostoMO(updated[i])
    }

    setManoObra(updated)
  }

  function onActividadChange(newActId) {
    setForm(f => ({ ...f, actividad_id: newActId }))
    const newAct = actividades.find(a => a.id_act === newActId)
    if (newAct && manoObra.length > 0) {
      setManoObra(prev => prev.map(m => {
        if (m._manualCosto) return m
        if (m.modalidad === 'Ajuste' && newAct.tarifa_ajuste) {
          return { ...m, costo_mo: newAct.tarifa_ajuste }
        }
        if (m.modalidad === 'Jornada' && newAct.tarifa_jornada) {
          return { ...m, costo_hora: newAct.tarifa_jornada / 8, costo_mo: newAct.tarifa_jornada }
        }
        return { ...m, costo_mo: (m.costo_hora || 0) * (m.horas_netas || 0) }
      }))
    }
  }

  function removeMO(i) { setManoObra(manoObra.filter((_, idx) => idx !== i)) }

  function addDetalle() {
    setDetalles([...detalles, { producto_id: '', cantidad_usada: '', unidad: 'L', costo_unitario: '', costo_real: '' }])
  }

  function updateDet(i, key, val) {
    const updated = [...detalles]
    updated[i] = { ...updated[i], [key]: val }
    if (key === 'producto_id') {
      const p = productos.find(p => p.id_prod === val)
      if (p) {
        updated[i].costo_unitario = p.costo_unitario
        updated[i].unidad = p.unidad
        updated[i]._manualCosto = false
      }
    }
    if ((key === 'cantidad_usada' || key === 'costo_unitario') && !updated[i]._manualCosto) {
      updated[i].costo_real = (updated[i].cantidad_usada || 0) * (updated[i].costo_unitario || 0)
    }
    if (key === 'costo_real') {
      updated[i].costo_real = Number(val)
      updated[i]._manualCosto = true
    }
    setDetalles(updated)
  }

  function removeDet(i) { setDetalles(detalles.filter((_, idx) => idx !== i)) }

  const totalMO = manoObra.reduce((s, m) => {
    if (m.modalidad === 'Ajuste') {
      return s + ((Number(m.cantidad_ajuste) || 0) * (Number(m.costo_mo) || 0))
    }
    return s + (Number(m.costo_mo) || 0)
  }, 0)
  const totalInsumos = detalles.reduce((s, d) => s + (Number(d.costo_real) || 0), 0)

  async function save(e) {
    e.preventDefault()
    if (!form.campo_id || !form.actividad_id) {
      toast.error('Campo y Actividad son obligatorios'); return
    }
    const moInvalid = manoObra.some(m => !m.trabajador_id)
    if (moInvalid) { toast.error('Seleccione un trabajador en cada fila de mano de obra'); return }
    const detInvalid = detalles.some(d => !d.producto_id || !d.cantidad_usada || Number(d.cantidad_usada) <= 0)
    if (detInvalid) { toast.error('Todos los insumos deben tener producto y cantidad mayor a 0'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        fecha_ejecucion: form.fecha_ejecucion || null,
        hora_inicio: form.hora_inicio || null,
        horas_equipo: form.horas_equipo ? Number(form.horas_equipo) : null,
        tarifa_equipo: form.tarifa_equipo ? Number(form.tarifa_equipo) : null,
        mano_obra: manoObra.map(m => ({
          trabajador_id: m.trabajador_id,
          modalidad: m.modalidad,
          horas_netas: m.modalidad === 'Jornada' ? Number(m.horas_netas) : Number(m.cantidad_ajuste) || 0,
          hora_inicio: m.hora_inicio_mo || null,
          hora_fin: m.hora_fin_mo || null,
          costo_hora: Number(m.costo_hora),
          costo_mo: m.modalidad === 'Ajuste'
            ? (Number(m.cantidad_ajuste) || 0) * (Number(m.costo_mo) || 0)
            : Number(m.costo_mo),
          observacion: m.modalidad === 'Ajuste' ? `${m.cantidad_ajuste || ''} ${m.unidad_ajuste || ''} × RD$ ${m.costo_mo}` : null,
        })),
        detalles: detalles.map(d => ({
          ...d,
          cantidad_usada: Number(d.cantidad_usada),
          costo_unitario: Number(d.costo_unitario),
          costo_real: Number(d.costo_real),
        })),
      }
      if (isEdit) {
        const { data } = await api.put(`/ordenes/${editId}`, payload)
        toast.success(`Orden #${data.ot_id} actualizada`)
        if (data.warnings) data.warnings.forEach(w => toast(w, { icon: '⚠️', duration: 6000 }))
      } else {
        const { data } = await api.post('/ordenes', payload)
        toast.success(`Orden #${data.ot_id} creada exitosamente`)
        if (data.warnings) data.warnings.forEach(w => toast(w, { icon: '⚠️', duration: 6000 }))
      }
      localStorage.removeItem(draftKey)
      navigate('/ordenes')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al crear la orden')
    } finally { setSaving(false) }
  }

  const supervisores = ['Fraidys Del Jesus', 'Esterlin Del Jesus', 'Percido Valerio', 'Manuel Guarionex Tejeda', 'Vital Sanchez']
  const equipos = ['Estacionaria', 'Bomba mochila', 'Motosierra', 'Desbrozadora', 'Motor LX', 'Pala', 'Machetes']

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="btn-secondary" onClick={() => navigate('/ordenes')}><ArrowLeft size={16} /></button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: '0 0 2px', fontSize: 24, fontWeight: 700, color: '#111827' }}>{isEdit ? `Editar Orden #${editId}` : duplicarId ? `Duplicar OT-${duplicarId} → Nueva Orden` : 'Nueva Orden de Trabajo'}</h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>
            Complete todos los datos de la jornada
            {savedDraft && !isEdit && (
              <span style={{ marginLeft: 12, background: '#fef9c3', color: '#854d0e', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                📋 Borrador recuperado
                <button onClick={() => { localStorage.removeItem(draftKey); window.location.reload() }}
                  style={{ marginLeft: 8, background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                  ✕ Descartar
                </button>
              </span>
            )}
          </p>
        </div>
        <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: 12, padding: '8px 20px', textAlign: 'center', minWidth: 120 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>N° Orden</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#166534', lineHeight: 1 }}>{nextOtId !== null ? nextOtId : '—'}</div>
        </div>
      </div>

      <form onSubmit={save}>
        {/* Info básica */}
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#166534' }}>Información General</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Fecha de Ejecución *</label>
              <input className="input" type="date" value={form.fecha_ejecucion} onChange={e => setForm({ ...form, fecha_ejecucion: e.target.value })} required />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Hora de Inicio</label>
              <input className="input" type="time" value={form.hora_inicio} onChange={e => setForm({ ...form, hora_inicio: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Campo *</label>
              <select className="select" value={form.campo_id} onChange={e => setForm({ ...form, campo_id: e.target.value })} required>
                <option value="">Seleccionar campo...</option>
                {campos.map(c => <option key={c.id_campo} value={c.id_campo}>{c.id_campo} - {c.nombre || c.id_campo}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Actividad *</label>
              <select className="select" value={form.actividad_id} onChange={e => onActividadChange(e.target.value)} required>
                <option value="">Seleccionar actividad...</option>
                {actividades.map(a => <option key={a.id_act} value={a.id_act}>{a.actividad}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Supervisor</label>
              <input className="input" list="supervisores-list" value={form.supervisor} onChange={e => setForm({ ...form, supervisor: e.target.value })} />
              <datalist id="supervisores-list">{supervisores.map(s => <option key={s} value={s} />)}</datalist>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Estado</label>
              <select className="select" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                <option>Abierta</option><option>En Proceso</option><option>Cerrada</option><option>En Pausa</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Equipo</label>
              <input className="input" list="equipos-list" value={form.equipo} onChange={e => setForm({ ...form, equipo: e.target.value })} />
              <datalist id="equipos-list">{equipos.map(eq => <option key={eq} value={eq} />)}</datalist>
            </div>
            <div>
              {actividadSel && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '6px 10px', fontSize: 11 }}>
                  <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: 2 }}>Tarifas: {actividadSel.actividad.length > 22 ? actividadSel.actividad.slice(0,20)+'…' : actividadSel.actividad}</div>
                  <div style={{ color: '#6b7280' }}>
                    Jornada: <strong>RD$ {actividadSel.tarifa_jornada?.toLocaleString('es-DO') || '—'}</strong>
                    {actividadSel.tarifa_ajuste && <> · Ajuste: <strong>RD$ {actividadSel.tarifa_ajuste.toLocaleString('es-DO')}</strong></>}
                  </div>
                </div>
              )}
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Observaciones</label>
              <input className="input" value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Mano de obra */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#166534' }}>Mano de Obra</h3>
            <button type="button" className="btn-secondary" onClick={addMO}><Plus size={14} /> Agregar Trabajador</button>
          </div>
          {manoObra.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: 13, margin: 0 }}>Sin trabajadores asignados</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {manoObra.map((m, i) => {
                const isAjuste = m.modalidad === 'Ajuste'
                return (
                  <div key={i} style={{ background: isAjuste ? '#fefce8' : '#f9fafb', border: `1px solid ${isAjuste ? '#fde047' : '#e5e7eb'}`, borderRadius: 10, padding: '10px 14px' }}>
                    {/* Row 1: Worker + Modalidad */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.2fr auto', gap: 10, alignItems: 'end' }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>TRABAJADOR</label>
                        <select className="select" value={m.trabajador_id} onChange={e => updateMO(i, 'trabajador_id', e.target.value)} required>
                          <option value="">Seleccionar...</option>
                          {trabajadores.map(t => <option key={t.id_trab} value={t.id_trab}>{t.nombre} ({t.cargo})</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>MODALIDAD</label>
                        <select className="select" value={m.modalidad} onChange={e => updateMO(i, 'modalidad', e.target.value)}
                          style={{ background: isAjuste ? '#fef9c3' : '', fontWeight: 700 }}>
                          <option value="Jornada">⏱ Jornada (por horas)</option>
                          <option value="Ajuste" disabled={!actividadSel?.tarifa_ajuste}>
                            📏 Ajuste {actividadSel?.tarifa_ajuste ? `(RD$ ${actividadSel.tarifa_ajuste.toLocaleString('es-DO')})` : '(sin tarifa)'}
                          </option>
                        </select>
                      </div>
                      <button type="button" className="btn-danger" onClick={() => removeMO(i)} style={{ padding: '6px 8px' }}><Trash2 size={13} /></button>
                    </div>

                    {/* Row 2: Dynamic fields based on modalidad */}
                    <div style={{ display: 'grid', gridTemplateColumns: isAjuste ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 10, marginTop: 10 }}>
                      {!isAjuste ? (
                        <>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3 }}>HORA INICIO</label>
                            <input className="input" type="time" value={m.hora_inicio_mo} onChange={e => updateMO(i, 'hora_inicio_mo', e.target.value)} />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3 }}>HORA FIN</label>
                            <input className="input" type="time" value={m.hora_fin_mo} onChange={e => updateMO(i, 'hora_fin_mo', e.target.value)} />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 600, color: '#dc2626', display: 'block', marginBottom: 3 }}>PAUSA (min)</label>
                            <input className="input" type="number" step="5" min="0" value={m.pausa_minutos || 0}
                              onChange={e => updateMO(i, 'pausa_minutos', e.target.value)}
                              style={{ color: '#dc2626' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3 }}>HORAS NETAS</label>
                            <div className="input" style={{ fontWeight: 700, background: '#f3f4f6', cursor: 'default', display: 'flex', alignItems: 'center' }}>
                              {m.hora_inicio_mo && m.hora_fin_mo
                                ? calcHorasFromTime(m.hora_inicio_mo, m.hora_fin_mo, m.pausa_minutos)
                                : m.horas_netas}
                            </div>
                          </div>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3 }}>COSTO MO (RD$)</label>
                            <input className="input" type="number" step="0.01" value={m.costo_mo}
                              onChange={e => updateMO(i, 'costo_mo', e.target.value)}
                              style={{ fontWeight: 700, color: '#166534', fontSize: 15 }} />
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 600, color: '#b45309', display: 'block', marginBottom: 3 }}>CANTIDAD</label>
                            <input className="input" type="number" step="0.01" min="0" value={m.cantidad_ajuste}
                              onChange={e => updateMO(i, 'cantidad_ajuste', e.target.value)}
                              placeholder="Ej: 5" style={{ fontWeight: 700 }} />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 600, color: '#b45309', display: 'block', marginBottom: 3 }}>UNIDAD DE MEDIDA</label>
                            <select className="select" value={m.unidad_ajuste} onChange={e => updateMO(i, 'unidad_ajuste', e.target.value)}
                              style={{ background: '#fef9c3' }}>
                              {UNIDADES_AJUSTE.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 600, color: '#b45309', display: 'block', marginBottom: 3 }}>COSTO / UNID (RD$)</label>
                            <input className="input" type="number" step="0.01" value={m.costo_mo}
                              onChange={e => updateMO(i, 'costo_mo', e.target.value)}
                              style={{ fontWeight: 700, color: '#b45309' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 600, color: '#166534', display: 'block', marginBottom: 3 }}>IMPORTE (RD$)</label>
                            <div style={{ padding: '8px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, fontWeight: 800, color: '#166534', fontSize: 15, textAlign: 'right' }}>
                              {((Number(m.cantidad_ajuste) || 0) * (Number(m.costo_mo) || 0)).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
              <div style={{ textAlign: 'right', fontWeight: 700, color: '#166534', fontSize: 14, marginTop: 4 }}>
                Total MO: RD$ {totalMO.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </div>
            </div>
          )}
        </div>

        {/* Insumos */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#166534' }}>Insumos Utilizados</h3>
            <button type="button" className="btn-secondary" onClick={addDetalle}><Plus size={14} /> Agregar Producto</button>
          </div>
          {detalles.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: 13, margin: 0 }}>Sin insumos registrados</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {detalles.map((d, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
                  <div>
                    {i === 0 && <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>PRODUCTO</label>}
                    <select className="select" value={d.producto_id} onChange={e => updateDet(i, 'producto_id', e.target.value)} required>
                      <option value="">Seleccionar...</option>
                      {productos.map(p => <option key={p.id_prod} value={p.id_prod}>{p.producto}</option>)}
                    </select>
                  </div>
                  <div>
                    {i === 0 && <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>CANTIDAD</label>}
                    <input className="input" type="number" step="0.01" min="0" value={d.cantidad_usada} onChange={e => updateDet(i, 'cantidad_usada', e.target.value)} />
                  </div>
                  <div>
                    {i === 0 && <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>UNIDAD</label>}
                    <select className="select" value={d.unidad} onChange={e => updateDet(i, 'unidad', e.target.value)}>
                      <option>L</option><option>Kg</option><option>unidad</option>
                    </select>
                  </div>
                  <div>
                    {i === 0 && <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>COSTO UNIT.</label>}
                    <input className="input" type="number" step="0.01" value={d.costo_unitario} onChange={e => updateDet(i, 'costo_unitario', e.target.value)} />
                  </div>
                  <div>
                    {i === 0 && <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>COSTO REAL</label>}
                    <input className="input" type="number" step="0.01" value={d.costo_real} onChange={e => updateDet(i, 'costo_real', e.target.value)} style={{ fontWeight: 700, color: '#1e40af' }} />
                  </div>
                  <button type="button" className="btn-danger" onClick={() => removeDet(i)} style={{ marginTop: i === 0 ? 20 : 0 }}><Trash2 size={13} /></button>
                </div>
              ))}
              <div style={{ textAlign: 'right', fontWeight: 700, color: '#1e40af', fontSize: 14, marginTop: 4 }}>
                Total Insumos: RD$ {totalInsumos.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </div>
            </div>
          )}
        </div>

        {/* Resumen */}
        <div className="card" style={{ background: '#f0fdf4', border: '1.5px solid #86efac' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
              <div style={{ background: 'white', border: '2px solid #86efac', borderRadius: 10, padding: '6px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>OT #</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#166534' }}>{nextOtId ?? '—'}</div>
              </div>
              <div><div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>MANO DE OBRA</div><div style={{ fontSize: 20, fontWeight: 700, color: '#166534' }}>RD$ {totalMO.toLocaleString('es-DO')}</div></div>
              <div><div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>INSUMOS</div><div style={{ fontSize: 20, fontWeight: 700, color: '#1e40af' }}>RD$ {totalInsumos.toLocaleString('es-DO')}</div></div>
              <div><div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>TOTAL OT</div><div style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>RD$ {(totalMO + totalInsumos).toLocaleString('es-DO')}</div></div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn-secondary" onClick={() => navigate('/ordenes')}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={saving} style={{ padding: '10px 24px', fontSize: 15 }}>
                {saving ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Orden de Trabajo'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
