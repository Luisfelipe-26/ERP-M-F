import { useEffect, useState, useCallback } from 'react'
import api from '../api'
import toast from 'react-hot-toast'
import { Building2, Plus, Eye, Edit2, Trash2, X } from 'lucide-react'

const Modal = ({ title, subtitle = '', onClose, children, width = 700 }) => (
  <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="modal" style={{ maxWidth: width, width: '95%', maxHeight: '90vh', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h2>
          {subtitle && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>{subtitle}</p>}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}><X size={18} /></button>
      </div>
      {children}
    </div>
  </div>
)

const Label = ({ children }) => (
  <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>{children}</label>
)

const Badge = ({ color, children }) => {
  const colors = { green: { bg: '#dcfce7', fg: '#166534' }, blue: { bg: '#dbeafe', fg: '#1e40af' }, gray: { bg: '#f3f4f6', fg: '#374151' } }
  const c = colors[color] || colors.gray
  return <span style={{ background: c.bg, color: c.fg, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{children}</span>
}

const fmt = (n) => Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const CATS = ['equipo', 'vehiculo', 'planta_portadora', 'infraestructura', 'mueble', 'otro']

export default function ActivosFijos() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [detail, setDetail] = useState<any>(null)
  const [cuentas, setCuentas] = useState<any[]>([])
  const [campos, setCampos] = useState<any[]>([])
  const [depMes, setDepMes] = useState(new Date().getMonth() + 1)
  const [depAno, setDepAno] = useState(new Date().getFullYear())
  const [filtroCat, setFiltroCat] = useState('')
  const [filtroCampo, setFiltroCampo] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (filtroCat) params.categoria = filtroCat
      if (filtroCampo) params.campo_id = filtroCampo
      const [a, c, f] = await Promise.all([
        api.get('/contabilidad/activos-fijos', { params }),
        api.get('/contabilidad/cuentas'),
        api.get('/campos'),
      ])
      setItems(a.data)
      setCuentas(c.data.filter((x: any) => x.acepta_movimientos))
      setCampos(f.data)
    } catch { toast.error('Error al cargar activos') }
    finally { setLoading(false) }
  }, [filtroCat, filtroCampo])

  useEffect(() => { load() }, [load])

  const blank = { codigo: '', nombre: '', categoria: 'equipo', fecha_adquisicion: new Date().toISOString().slice(0, 10), costo_adquisicion: 0, vida_util_meses: 60, valor_residual: 0, metodo_depreciacion: 'lineal', campo_id: '', cuenta_activo_id: '', cuenta_depreciacion_id: '', cuenta_gasto_dep_id: '' }

  function openNew() { setEditing(blank); setShowModal(true) }
  function openEdit(a: any) { setEditing({ ...a, cuenta_activo_id: a.cuenta_activo_id || '', cuenta_depreciacion_id: a.cuenta_depreciacion_id || '', cuenta_gasto_dep_id: a.cuenta_gasto_dep_id || '', campo_id: a.campo_id || '' }); setShowModal(true) }

  async function save(e: any) {
    e.preventDefault()
    const payload = { ...editing, costo_adquisicion: Number(editing.costo_adquisicion), vida_util_meses: Number(editing.vida_util_meses), valor_residual: Number(editing.valor_residual), cuenta_activo_id: editing.cuenta_activo_id || null, cuenta_depreciacion_id: editing.cuenta_depreciacion_id || null, cuenta_gasto_dep_id: editing.cuenta_gasto_dep_id || null, campo_id: editing.campo_id || null }
    try {
      if (editing.id) await api.put(`/contabilidad/activos-fijos/${editing.id}`, payload)
      else await api.post('/contabilidad/activos-fijos', payload)
      toast.success(editing.id ? 'Activo actualizado' : 'Activo creado')
      setShowModal(false); load()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
  }

  async function del(id: number) {
    if (!confirm('¿Dar de baja este activo?')) return
    try { await api.delete(`/contabilidad/activos-fijos/${id}`); toast.success('Activo dado de baja'); load() }
    catch { toast.error('Error') }
  }

  async function viewDetail(id: number) {
    try { const { data } = await api.get(`/contabilidad/activos-fijos/${id}`); setDetail(data) }
    catch { toast.error('Error al cargar detalle') }
  }

  async function runDep() {
    if (!confirm(`¿Correr depreciación para ${depMes}/${depAno}? Se generarán asientos contables automáticos.`)) return
    try {
      const { data } = await api.post(`/contabilidad/activos-fijos/depreciar?mes=${depMes}&ano=${depAno}`)
      toast.success(`${data.depreciados} activos depreciados — RD$ ${fmt(data.total)}`)
      load()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
  }

  const totalCosto = items.reduce((s, a) => s + (a.costo_adquisicion || 0), 0)
  const totalDep = items.reduce((s, a) => s + (a.depreciacion_acumulada || 0), 0)
  const totalLibros = items.reduce((s, a) => s + (a.valor_en_libros || 0), 0)

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#111827' }}>
          <Building2 size={22} style={{ verticalAlign: 'text-bottom', marginRight: 8 }} />
          Activos Fijos
        </h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>Gestión de activos, depreciación y cuentas contables asociadas</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="card" style={{ padding: '10px 16px', margin: 0 }}><span style={{ fontSize: 11, color: '#6b7280' }}>Costo Total</span><div style={{ fontWeight: 700, fontSize: 17 }}>RD$ {fmt(totalCosto)}</div></div>
        <div className="card" style={{ padding: '10px 16px', margin: 0 }}><span style={{ fontSize: 11, color: '#6b7280' }}>Dep. Acumulada</span><div style={{ fontWeight: 700, fontSize: 17, color: '#dc2626' }}>RD$ {fmt(totalDep)}</div></div>
        <div className="card" style={{ padding: '10px 16px', margin: 0 }}><span style={{ fontSize: 11, color: '#6b7280' }}>Valor en Libros</span><div style={{ fontWeight: 700, fontSize: 17, color: '#166534' }}>RD$ {fmt(totalLibros)}</div></div>
        <div className="card" style={{ padding: '10px 16px', margin: 0 }}><span style={{ fontSize: 11, color: '#6b7280' }}>Activos</span><div style={{ fontWeight: 700, fontSize: 17 }}>{items.length}</div></div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="select" style={{ width: 160 }} value={filtroCat} onChange={e => setFiltroCat(e.target.value)}>
            <option value="">Todas las categorías</option>
            {CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="select" style={{ width: 140 }} value={filtroCampo} onChange={e => setFiltroCampo(e.target.value)}>
            <option value="">Todos los campos</option>
            {campos.map((c: any) => <option key={c.id_campo} value={c.id_campo}>{c.id_campo} — {c.nombre}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#6b7280' }}>Depreciar:</span>
          <input className="input" type="number" style={{ width: 60 }} value={depMes} onChange={e => setDepMes(Number(e.target.value))} min={1} max={12} />
          <input className="input" type="number" style={{ width: 80 }} value={depAno} onChange={e => setDepAno(Number(e.target.value))} />
          <button className="btn-secondary" onClick={runDep}>Correr Depreciación</button>
          <button className="btn-primary" onClick={openNew}><Plus size={14} /> Nuevo Activo</button>
        </div>
      </div>

      {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ fontSize: 12 }}>
            <thead><tr><th>Código</th><th>Nombre</th><th>Categoría</th><th>Campo</th><th>Fecha Adq.</th><th style={{ textAlign: 'right' }}>Costo</th><th style={{ textAlign: 'right' }}>Dep. Acum.</th><th style={{ textAlign: 'right' }}>Valor Libros</th><th style={{ textAlign: 'right' }}>Dep/Mes</th><th></th></tr></thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', color: '#9ca3af', padding: 30 }}>No hay activos fijos registrados</td></tr>
              ) : items.map(a => (
                <tr key={a.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{a.codigo}</td>
                  <td>{a.nombre}</td>
                  <td><Badge color="blue">{a.categoria || '—'}</Badge></td>
                  <td>{a.campo_nombre || a.campo_id || '—'}</td>
                  <td style={{ fontSize: 11 }}>{a.fecha_adquisicion || '—'}</td>
                  <td style={{ textAlign: 'right' }}>RD$ {fmt(a.costo_adquisicion)}</td>
                  <td style={{ textAlign: 'right', color: '#dc2626' }}>RD$ {fmt(a.depreciacion_acumulada)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>RD$ {fmt(a.valor_en_libros)}</td>
                  <td style={{ textAlign: 'right', fontSize: 11, color: '#6b7280' }}>RD$ {fmt(a.dep_mensual_estimada)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-icon" title="Ver" onClick={() => viewDetail(a.id)}><Eye size={14} /></button>
                    <button className="btn-icon" title="Editar" onClick={() => openEdit(a)}><Edit2 size={14} /></button>
                    <button className="btn-icon" title="Baja" onClick={() => del(a.id)}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
              {items.length > 0 && (
                <tr style={{ fontWeight: 700, background: '#f9fafb' }}>
                  <td colSpan={5}>TOTALES ({items.length} activos)</td>
                  <td style={{ textAlign: 'right' }}>RD$ {fmt(totalCosto)}</td>
                  <td style={{ textAlign: 'right', color: '#dc2626' }}>RD$ {fmt(totalDep)}</td>
                  <td style={{ textAlign: 'right' }}>RD$ {fmt(totalLibros)}</td>
                  <td colSpan={2}></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && editing && (
        <Modal title={editing.id ? 'Editar Activo Fijo' : 'Nuevo Activo Fijo'} onClose={() => setShowModal(false)} width={600}>
          <form onSubmit={save}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><Label>Código</Label><input className="input" required value={editing.codigo} onChange={e => setEditing({ ...editing, codigo: e.target.value })} /></div>
              <div><Label>Categoría</Label><select className="select" value={editing.categoria} onChange={e => setEditing({ ...editing, categoria: e.target.value })}>{CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div style={{ gridColumn: 'span 2' }}><Label>Nombre</Label><input className="input" required value={editing.nombre} onChange={e => setEditing({ ...editing, nombre: e.target.value })} /></div>
              <div><Label>Fecha Adquisición</Label><input className="input" type="date" required value={editing.fecha_adquisicion} onChange={e => setEditing({ ...editing, fecha_adquisicion: e.target.value })} /></div>
              <div><Label>Campo</Label><select className="select" value={editing.campo_id} onChange={e => setEditing({ ...editing, campo_id: e.target.value })}><option value="">— Sin campo —</option>{campos.map((c: any) => <option key={c.id_campo} value={c.id_campo}>{c.id_campo} — {c.nombre}</option>)}</select></div>
              <div><Label>Costo Adquisición (RD$)</Label><input className="input" type="number" step="0.01" min="0" required value={editing.costo_adquisicion} onChange={e => setEditing({ ...editing, costo_adquisicion: e.target.value })} /></div>
              <div><Label>Vida Útil (meses)</Label><input className="input" type="number" min="1" required value={editing.vida_util_meses} onChange={e => setEditing({ ...editing, vida_util_meses: e.target.value })} /></div>
              <div><Label>Valor Residual (RD$)</Label><input className="input" type="number" step="0.01" min="0" value={editing.valor_residual} onChange={e => setEditing({ ...editing, valor_residual: e.target.value })} /></div>
              <div><Label>Método</Label><select className="select" value={editing.metodo_depreciacion} onChange={e => setEditing({ ...editing, metodo_depreciacion: e.target.value })}><option value="lineal">Línea Recta</option></select></div>
            </div>
            <h4 style={{ fontSize: 13, fontWeight: 700, margin: '16px 0 8px', color: '#374151' }}>Cuentas Contables</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><Label>Cuenta Activo</Label><select className="select" value={editing.cuenta_activo_id} onChange={e => setEditing({ ...editing, cuenta_activo_id: e.target.value ? Number(e.target.value) : '' })}><option value="">—</option>{cuentas.map((c: any) => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}</select></div>
              <div><Label>Cuenta Dep. Acumulada</Label><select className="select" value={editing.cuenta_depreciacion_id} onChange={e => setEditing({ ...editing, cuenta_depreciacion_id: e.target.value ? Number(e.target.value) : '' })}><option value="">—</option>{cuentas.map((c: any) => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}</select></div>
              <div style={{ gridColumn: 'span 2' }}><Label>Cuenta Gasto Depreciación</Label><select className="select" value={editing.cuenta_gasto_dep_id} onChange={e => setEditing({ ...editing, cuenta_gasto_dep_id: e.target.value ? Number(e.target.value) : '' })}><option value="">—</option>{cuentas.map((c: any) => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}</select></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button type="submit" className="btn-primary">{editing.id ? 'Guardar' : 'Crear'}</button>
            </div>
          </form>
        </Modal>
      )}

      {detail && (
        <Modal title={`Activo: ${detail.codigo}`} subtitle={detail.nombre} onClose={() => setDetail(null)} width={650}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16, fontSize: 13 }}>
            <div>Categoría: <strong>{detail.categoria}</strong></div>
            <div>Campo: <strong>{detail.campo_nombre || detail.campo_id || '—'}</strong></div>
            <div>Costo: <strong>RD$ {fmt(detail.costo_adquisicion)}</strong></div>
            <div>Valor Residual: <strong>RD$ {fmt(detail.valor_residual)}</strong></div>
            <div>Dep. Acumulada: <strong style={{ color: '#dc2626' }}>RD$ {fmt(detail.depreciacion_acumulada)}</strong></div>
            <div>Valor en Libros: <strong style={{ color: '#166534' }}>RD$ {fmt(detail.valor_en_libros)}</strong></div>
            <div>Vida Útil: <strong>{detail.vida_util_meses} meses</strong></div>
            <div>Dep. Mensual: <strong>RD$ {fmt(detail.dep_mensual_estimada)}</strong></div>
          </div>
          <h4 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 8px' }}>Historial de Depreciación</h4>
          <table style={{ fontSize: 12 }}>
            <thead><tr><th>Período</th><th style={{ textAlign: 'right' }}>Monto</th><th style={{ textAlign: 'right' }}>Dep. Acum. Post</th><th>Asiento</th></tr></thead>
            <tbody>
              {(!detail.historial || detail.historial.length === 0) ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#9ca3af', padding: 16 }}>Sin depreciaciones registradas</td></tr>
              ) : detail.historial.map((h: any) => (
                <tr key={h.id}>
                  <td>{h.periodo_nombre || h.periodo_id}</td>
                  <td style={{ textAlign: 'right' }}>RD$ {fmt(h.monto)}</td>
                  <td style={{ textAlign: 'right' }}>RD$ {fmt(h.depreciacion_acumulada_post)}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{h.asiento_id || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Modal>
      )}
    </div>
  )
}
