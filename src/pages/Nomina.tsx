import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import toast from 'react-hot-toast'
import { Download, X, Eye, Edit2, Save, XCircle } from 'lucide-react'

const fmt = n => `RD$ ${Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-DO') : '—'
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const ESTADO_COLORS = {
  Abierta:    { bg: '#fef9c3', color: '#854d0e' },
  'En Proceso': { bg: '#dbeafe', color: '#1e40af' },
  Cerrada:    { bg: '#dcfce7', color: '#166534' },
  'En Pausa':   { bg: '#f3f4f6', color: '#374151' },
}

function ModalDetalleTrabajador({ trabajador, mes, ano, onClose }) {
  const [jornadas, setJornadas] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  function loadDetalle() {
    setLoading(true)
    api.get(`/dashboard/nomina-detalle/${trabajador.id_trab}`, { params: { mes, ano } })
      .then(({ data }) => setJornadas(data))
      .catch(() => toast.error('Error al cargar detalle'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadDetalle() }, [trabajador.id_trab, mes, ano])

  const totalHoras = jornadas.reduce((s, j) => s + (j.horas_netas || 0), 0)
  const totalCosto = jornadas.reduce((s, j) => s + (j.costo_mo || 0), 0)

  function startEdit(j) {
    setEditingId(j.mo_id)
    setEditForm({
      hora_inicio: j.hora_inicio || '',
      hora_fin: j.hora_fin || '',
      pausa_min: j.pausa_min || 0,
      horas_netas: j.horas_netas || 0,
      costo_hora: j.costo_hora || 0,
      modalidad: j.modalidad || 'Jornada',
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm({})
  }

  function calcHoras(hi, hf, pausa) {
    if (!hi || !hf) return null
    const [h1, m1] = hi.split(':').map(Number)
    const [h2, m2] = hf.split(':').map(Number)
    const mins = (h2 * 60 + m2) - (h1 * 60 + m1) - (Number(pausa) || 0)
    return mins > 0 ? Math.round((mins / 60) * 100) / 100 : 0
  }

  function setField(k, v) {
    setEditForm(prev => {
      const next = { ...prev, [k]: v }
      if (k === 'hora_inicio' || k === 'hora_fin' || k === 'pausa_min') {
        const hi = k === 'hora_inicio' ? v : prev.hora_inicio
        const hf = k === 'hora_fin' ? v : prev.hora_fin
        const pa = k === 'pausa_min' ? v : prev.pausa_min
        const horas = calcHoras(hi, hf, pa)
        if (horas !== null) next.horas_netas = horas
      }
      const h = k === 'horas_netas' ? Number(v) : Number(next.horas_netas)
      const c = k === 'costo_hora' ? Number(v) : Number(next.costo_hora)
      next._costo_mo = Math.round(h * c * 100) / 100
      return next
    })
  }

  async function saveEdit(j) {
    setSaving(true)
    try {
      const payload = {
        hora_inicio: editForm.hora_inicio,
        hora_fin: editForm.hora_fin,
        pausa_min: Number(editForm.pausa_min) || 0,
        horas_netas: Number(editForm.horas_netas),
        costo_hora: Number(editForm.costo_hora),
        modalidad: editForm.modalidad,
      }
      await api.patch(`/ordenes/${j.ot_id}/mano-obra/${j.mo_id}`, payload)
      toast.success('Jornada actualizada')
      setEditingId(null)
      setEditForm({})
      loadDetalle()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = { width: 60, padding: '3px 5px', fontSize: 11, borderRadius: 4, border: '1px solid #d1d5db', textAlign: 'center' }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 900, width: '95%', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{trabajador.nombre}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
              {trabajador.cargo || 'Sin cargo'} · {MESES[mes - 1]} {ano} · {jornadas.length} jornada{jornadas.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '8px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 2 }}>Total Ganado</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#166534' }}>{fmt(totalCosto)}</div>
          </div>
          <div style={{ background: '#eff6ff', borderRadius: 8, padding: '8px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 2 }}>Horas Trabajadas</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1e40af' }}>{totalHoras.toFixed(1)}h</div>
          </div>
          <div style={{ background: '#fef3c7', borderRadius: 8, padding: '8px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 2 }}>Jornadas</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#92400e' }}>{jornadas.length}</div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <th>OT #</th>
                <th>Fecha</th>
                <th>Campo</th>
                <th>Actividad</th>
                <th>Horario</th>
                <th style={{ textAlign: 'right' }}>Pausa</th>
                <th style={{ textAlign: 'right' }}>Horas</th>
                <th>Modalidad</th>
                <th style={{ textAlign: 'right' }}>Costo/h</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>Cargando...</td></tr>
              ) : jornadas.length === 0 ? (
                <tr><td colSpan={12} style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>Sin jornadas en este período</td></tr>
              ) : jornadas.map((j) => {
                const ec = ESTADO_COLORS[j.estado_ot] || ESTADO_COLORS['Abierta']
                const isEditing = editingId === j.mo_id

                if (isEditing) {
                  const costoMo = editForm._costo_mo ?? Math.round(Number(editForm.horas_netas) * Number(editForm.costo_hora) * 100) / 100
                  return (
                    <tr key={j.mo_id} style={{ background: '#eff6ff' }}>
                      <td style={{ fontWeight: 700, color: '#166534' }}>#{j.ot_id}</td>
                      <td>{fmtDate(j.fecha)}</td>
                      <td style={{ fontWeight: 600 }}>{j.campo_id || '—'}</td>
                      <td style={{ color: '#4b5563' }}>{j.actividad_id || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                          <input style={inputStyle} type="time" value={editForm.hora_inicio} onChange={e => setField('hora_inicio', e.target.value)} />
                          <span style={{ color: '#9ca3af' }}>–</span>
                          <input style={inputStyle} type="time" value={editForm.hora_fin} onChange={e => setField('hora_fin', e.target.value)} />
                        </div>
                      </td>
                      <td><input style={{ ...inputStyle, width: 45, textAlign: 'right' }} type="number" step="1" min="0" value={editForm.pausa_min} onChange={e => setField('pausa_min', e.target.value)} /></td>
                      <td><input style={{ ...inputStyle, width: 50, textAlign: 'right' }} type="number" step="0.1" min="0" value={editForm.horas_netas} onChange={e => setField('horas_netas', e.target.value)} /></td>
                      <td>
                        <select style={{ ...inputStyle, width: 80 }} value={editForm.modalidad} onChange={e => setField('modalidad', e.target.value)}>
                          <option value="Jornada">Jornada</option>
                          <option value="Ajuste">Ajuste</option>
                          <option value="Destajo">Destajo</option>
                          <option value="Hora Extra">Hora Extra</option>
                        </select>
                      </td>
                      <td><input style={{ ...inputStyle, width: 65, textAlign: 'right' }} type="number" step="0.01" min="0" value={editForm.costo_hora} onChange={e => setField('costo_hora', e.target.value)} /></td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#1e40af' }}>{fmt(costoMo)}</td>
                      <td><span style={{ background: ec.bg, color: ec.color, borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>{j.estado_ot}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn-primary" style={{ padding: '3px 6px', fontSize: 10 }} onClick={() => saveEdit(j)} disabled={saving} title="Guardar"><Save size={11} /></button>
                          <button className="btn-secondary" style={{ padding: '3px 6px' }} onClick={cancelEdit} title="Cancelar"><XCircle size={11} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr key={j.mo_id}>
                    <td style={{ fontWeight: 700, color: '#166534' }}>#{j.ot_id}</td>
                    <td>{fmtDate(j.fecha)}</td>
                    <td style={{ fontWeight: 600 }}>{j.campo_id || '—'}</td>
                    <td style={{ color: '#4b5563' }}>{j.actividad_id || '—'}</td>
                    <td style={{ color: '#6b7280' }}>{j.hora_inicio || '—'} – {j.hora_fin || '—'}</td>
                    <td style={{ textAlign: 'right', color: '#6b7280' }}>{j.pausa_min ? `${j.pausa_min}m` : '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{(j.horas_netas || 0).toFixed(1)}</td>
                    <td><span style={{ background: '#f3f4f6', borderRadius: 4, padding: '2px 6px', fontSize: 10, fontWeight: 600 }}>{j.modalidad || 'Jornada'}</span></td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(j.costo_hora)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#166534' }}>{fmt(j.costo_mo)}</td>
                    <td><span style={{ background: ec.bg, color: ec.color, borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>{j.estado_ot}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-secondary" style={{ padding: '3px 6px' }} onClick={() => { onClose(); navigate(`/ordenes/${j.ot_id}`) }} title="Ver OT"><Eye size={11} /></button>
                        <button className="btn-secondary" style={{ padding: '3px 6px', color: '#1e40af' }} onClick={() => startEdit(j)} title="Editar jornada"><Edit2 size={11} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {jornadas.length > 0 && (
              <tfoot>
                <tr style={{ background: '#f9fafb', fontWeight: 700 }}>
                  <td colSpan={6} style={{ padding: '10px 12px', fontSize: 11, color: '#6b7280' }}>TOTAL</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#1e40af' }}>{totalHoras.toFixed(1)}h</td>
                  <td colSpan={2}></td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#166534', fontSize: 14 }}>{fmt(totalCosto)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <button className="btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

export default function Nomina() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
  const [nomina, setNomina] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalTrabajador, setModalTrabajador] = useState(null)

  useEffect(() => { load() }, [mes, ano])

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/dashboard/nomina-mensual', { params: { mes, ano } })
      setNomina(data)
    } catch { toast.error('Error al cargar nómina') }
    finally { setLoading(false) }
  }

  async function exportCSV() {
    try {
      const res = await api.get(`/dashboard/export/nomina-csv?mes=${mes}&ano=${ano}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a'); a.href = url; a.download = `nomina_${String(mes).padStart(2,'0')}_${ano}.csv`
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url)
    } catch { toast.error('Error al exportar nómina') }
  }

  const total = nomina.reduce((s, r) => s + r.total_ganado, 0)
  const totalJornadas = nomina.reduce((s, r) => s + r.num_jornadas, 0)
  const activos = nomina.filter(r => r.num_jornadas > 0)

  const anos = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#111827' }}>Nómina de Jornales</h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>
            {MESES[mes-1]} {ano} · {activos.length} trabajadores activos · {totalJornadas} jornadas
          </p>
        </div>
        <button className="btn-secondary" onClick={exportCSV}><Download size={15} /> Exportar CSV</button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <select className="select" style={{ width: 160 }} value={mes} onChange={e => setMes(Number(e.target.value))}>
          {MESES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select className="select" style={{ width: 100 }} value={ano} onChange={e => setAno(Number(e.target.value))}>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Total Nómina', value: fmt(total), sub: `${MESES[mes-1]} ${ano}`, color: '#166534', bg: '#dcfce7', border: '#86efac' },
          { label: 'Trabajadores Activos', value: activos.length, sub: `de ${nomina.length} en nómina`, color: '#1e40af', bg: '#dbeafe', border: '#93c5fd' },
          { label: 'Total Jornadas', value: totalJornadas, sub: 'en el período', color: '#92400e', bg: '#fef3c7', border: '#fde68a' },
        ].map(({ label, value, sub, color, bg, border }) => (
          <div key={label} className="card" style={{ borderLeft: `4px solid ${border}` }}>
            <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Trabajador</th>
              <th>Cargo</th>
              <th style={{ textAlign: 'center' }}>Jornadas</th>
              <th style={{ textAlign: 'right' }}>Total Ganado</th>
              <th style={{ textAlign: 'right' }}>% del total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Cargando...</td></tr>
            ) : nomina.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No hay registros para este período</td></tr>
            ) : nomina.map(r => {
              const pct = total > 0 ? (r.total_ganado / total * 100) : 0
              const activo = r.num_jornadas > 0
              return (
                <tr key={r.id_trab} style={{ opacity: activo ? 1 : 0.45, cursor: activo ? 'pointer' : 'default' }}
                  onClick={() => activo && setModalTrabajador(r)}
                  onMouseEnter={e => { if (activo) e.currentTarget.style.background = '#f0fdf4' }}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td><span style={{ fontWeight: 700, color: '#166534', fontSize: 12 }}>{r.id_trab}</span></td>
                  <td style={{ fontWeight: 500 }}>{r.nombre}</td>
                  <td><span className="badge badge-blue" style={{ fontSize: 11 }}>{r.cargo || '—'}</span></td>
                  <td style={{ textAlign: 'center' }}>
                    {activo ? <span className="badge badge-green">{r.num_jornadas}</span> : <span style={{ color: '#9ca3af', fontSize: 12 }}>Sin jornadas</span>}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: activo ? '#166534' : '#9ca3af' }}>
                    {activo ? fmt(r.total_ganado) : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {activo ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                        <div style={{ width: 60, height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: '#166534', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 12, color: '#6b7280', minWidth: 36 }}>{pct.toFixed(1)}%</span>
                      </div>
                    ) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
          {total > 0 && (
            <tfoot>
              <tr style={{ background: '#f9fafb', fontWeight: 700 }}>
                <td colSpan={3} style={{ padding: '12px', fontSize: 12, color: '#6b7280' }}>TOTAL NÓMINA</td>
                <td style={{ padding: '12px', textAlign: 'center', color: '#166534' }}>{totalJornadas}</td>
                <td style={{ padding: '12px', textAlign: 'right', color: '#166534', fontSize: 16 }}>{fmt(total)}</td>
                <td style={{ padding: '12px', textAlign: 'right', color: '#6b7280' }}>100%</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {modalTrabajador && (
        <ModalDetalleTrabajador
          trabajador={modalTrabajador}
          mes={mes} ano={ano}
          onClose={() => setModalTrabajador(null)}
        />
      )}
    </div>
  )
}
