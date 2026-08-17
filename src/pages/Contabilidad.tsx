import { useEffect, useState, useCallback } from 'react'
import api from '../api'
import toast from 'react-hot-toast'
import {
  BookOpen, Plus, Search, RefreshCw, X, ChevronDown, ChevronRight,
  Check, Lock, Unlock, FileText, Calendar, Settings, BarChart3,
  Edit2, Trash2, Eye, Filter, Download, Clock
} from 'lucide-react'

/* ═══════════════════ Shared ═══════════════════ */

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
  const colors = {
    green: { bg: '#dcfce7', fg: '#166534' },
    red: { bg: '#fee2e2', fg: '#991b1b' },
    yellow: { bg: '#fef9c3', fg: '#854d0e' },
    blue: { bg: '#dbeafe', fg: '#1e40af' },
    gray: { bg: '#f3f4f6', fg: '#374151' },
  }
  const c = colors[color] || colors.gray
  return <span style={{ background: c.bg, color: c.fg, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{children}</span>
}

const fmt = (n) => Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const TABS = [
  { key: 'cuentas', label: 'Plan de Cuentas', icon: BookOpen },
  { key: 'asientos', label: 'Asientos', icon: FileText },
  { key: 'periodos', label: 'Períodos', icon: Calendar },
  { key: 'reportes', label: 'Reportes', icon: BarChart3 },
  { key: 'antiguedad', label: 'Antigüedad', icon: Clock },
  { key: 'config', label: 'Configuración', icon: Settings },
]

/* ═══════════════════ TAB: Plan de Cuentas ═══════════════════ */

function TabCuentas() {
  const [cuentas, setCuentas] = useState([])
  const [loading, setLoading] = useState(true)
  const [buscar, setBuscar] = useState('')
  const [expandidas, setExpandidas] = useState(new Set())
  const [modal, setModal] = useState(null) // null | 'new' | cuenta
  const [form, setForm] = useState({ codigo: '', nombre: '', tipo: 'activo', naturaleza: 'deudora', grupo: '', nivel: 1, cuenta_padre_id: '', acepta_movimientos: true })

  const load = useCallback(async () => {
    setLoading(true)
    try { const { data } = await api.get('/contabilidad/cuentas?activo=true'); setCuentas(data) }
    catch { toast.error('Error al cargar cuentas') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const cuentasGrupo = cuentas.filter(c => !c.acepta_movimientos)
  const tree = buildTree(cuentas)

  function buildTree(list) {
    const map = {}
    const roots = []
    list.forEach(c => { map[c.id] = { ...c, children: [] } })
    list.forEach(c => {
      if (c.cuenta_padre_id && map[c.cuenta_padre_id]) {
        map[c.cuenta_padre_id].children.push(map[c.id])
      } else {
        roots.push(map[c.id])
      }
    })
    return roots
  }

  function toggleExpand(id) {
    const s = new Set(expandidas)
    s.has(id) ? s.delete(id) : s.add(id)
    setExpandidas(s)
  }

  function expandAll() {
    setExpandidas(new Set(cuentas.filter(c => !c.acepta_movimientos).map(c => c.id)))
  }

  function openNew() {
    setForm({ codigo: '', nombre: '', tipo: 'activo', naturaleza: 'deudora', grupo: '', nivel: 1, cuenta_padre_id: '', acepta_movimientos: true })
    setModal('new')
  }

  function openEdit(c) {
    setForm({ codigo: c.codigo, nombre: c.nombre, tipo: c.tipo, naturaleza: c.naturaleza, grupo: c.grupo || '', nivel: c.nivel, cuenta_padre_id: c.cuenta_padre_id || '', acepta_movimientos: c.acepta_movimientos })
    setModal(c)
  }

  async function save(e) {
    e.preventDefault()
    if (!form.codigo || !form.nombre) return toast.error('Código y nombre son obligatorios')
    const payload = { ...form, cuenta_padre_id: form.cuenta_padre_id ? Number(form.cuenta_padre_id) : null }
    try {
      if (modal === 'new') {
        await api.post('/contabilidad/cuentas', payload)
        toast.success('Cuenta creada')
      } else {
        await api.put(`/contabilidad/cuentas/${modal.codigo}`, payload)
        toast.success('Cuenta actualizada')
      }
      setModal(null)
      load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  async function eliminar(c) {
    if (!confirm(`¿Eliminar/desactivar cuenta ${c.codigo} — ${c.nombre}?`)) return
    try { await api.delete(`/contabilidad/cuentas/${c.codigo}`); toast.success('Cuenta eliminada'); load() }
    catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  const filtered = buscar
    ? cuentas.filter(c => c.codigo.includes(buscar) || c.nombre.toLowerCase().includes(buscar.toLowerCase()))
    : null

  function renderTree(nodes, depth = 0) {
    return nodes.map(n => {
      const hasChildren = n.children && n.children.length > 0
      const isExpanded = expandidas.has(n.id)
      return (
        <div key={n.id}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
            paddingLeft: 10 + depth * 20, borderBottom: '1px solid #f3f4f6',
            cursor: hasChildren ? 'pointer' : 'default',
            background: !n.acepta_movimientos ? '#f9fafb' : 'white',
          }}
            onClick={() => hasChildren && toggleExpand(n.id)}
            onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
            onMouseLeave={e => e.currentTarget.style.background = !n.acepta_movimientos ? '#f9fafb' : 'white'}
          >
            <span style={{ width: 16, display: 'flex', alignItems: 'center' }}>
              {hasChildren && (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
            </span>
            <span style={{ fontWeight: !n.acepta_movimientos ? 700 : 500, fontSize: 13, fontFamily: 'monospace', color: '#374151', minWidth: 80 }}>{n.codigo}</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: !n.acepta_movimientos ? 600 : 400 }}>{n.nombre}</span>
            <Badge color={n.tipo === 'activo' ? 'blue' : n.tipo === 'pasivo' ? 'red' : n.tipo === 'ingreso' ? 'green' : n.tipo === 'costo' ? 'yellow' : 'gray'}>{n.tipo}</Badge>
            <span style={{ fontSize: 11, color: '#9ca3af', width: 55, textAlign: 'center' }}>{n.naturaleza === 'deudora' ? 'Deudora' : 'Acreed.'}</span>
            <div style={{ display: 'flex', gap: 2 }} onClick={e => e.stopPropagation()}>
              <button className="btn-secondary" style={{ padding: '2px 6px' }} onClick={() => openEdit(n)}><Edit2 size={11} /></button>
              <button className="btn-danger" style={{ padding: '2px 6px' }} onClick={() => eliminar(n)}><Trash2 size={11} /></button>
            </div>
          </div>
          {hasChildren && isExpanded && renderTree(n.children, depth + 1)}
        </div>
      )
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input className="input" style={{ paddingLeft: 30 }} placeholder="Buscar por código o nombre..." value={buscar} onChange={e => setBuscar(e.target.value)} />
        </div>
        <button className="btn-secondary" onClick={expandAll} title="Expandir todo"><ChevronDown size={14} /></button>
        <button className="btn-secondary" onClick={() => setExpandidas(new Set())} title="Colapsar todo"><ChevronRight size={14} /></button>
        <button className="btn-secondary" onClick={load}><RefreshCw size={14} /></button>
        <button className="btn-primary" onClick={openNew}><Plus size={14} /> Nueva Cuenta</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', fontSize: 13 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontWeight: 700, fontSize: 11, color: '#6b7280', textTransform: 'uppercase' }}>
          <span style={{ width: 16 }}></span>
          <span style={{ minWidth: 80 }}>Código</span>
          <span style={{ flex: 1 }}>Nombre</span>
          <span style={{ width: 60, textAlign: 'center' }}>Tipo</span>
          <span style={{ width: 55, textAlign: 'center' }}>Nat.</span>
          <span style={{ width: 52 }}></span>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div>
        ) : filtered ? (
          filtered.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderBottom: '1px solid #f3f4f6' }}>
              <span style={{ width: 16 }}></span>
              <span style={{ fontFamily: 'monospace', fontSize: 13, minWidth: 80 }}>{c.codigo}</span>
              <span style={{ flex: 1, fontSize: 13 }}>{c.nombre}</span>
              <Badge color={c.tipo === 'activo' ? 'blue' : c.tipo === 'pasivo' ? 'red' : c.tipo === 'ingreso' ? 'green' : c.tipo === 'costo' ? 'yellow' : 'gray'}>{c.tipo}</Badge>
              <span style={{ fontSize: 11, color: '#9ca3af', width: 55, textAlign: 'center' }}>{c.naturaleza === 'deudora' ? 'Deudora' : 'Acreed.'}</span>
              <div style={{ display: 'flex', gap: 2 }}>
                <button className="btn-secondary" style={{ padding: '2px 6px' }} onClick={() => openEdit(c)}><Edit2 size={11} /></button>
                <button className="btn-danger" style={{ padding: '2px 6px' }} onClick={() => eliminar(c)}><Trash2 size={11} /></button>
              </div>
            </div>
          ))
        ) : renderTree(tree)}
      </div>
      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>{cuentas.length} cuentas activas</p>

      {modal && (
        <Modal title={modal === 'new' ? 'Nueva Cuenta Contable' : `Editar — ${modal.codigo}`} onClose={() => setModal(null)} width={550}>
          <form onSubmit={save}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <Label>Código *</Label>
                <input className="input" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} required disabled={modal !== 'new'} />
              </div>
              <div>
                <Label>Nivel</Label>
                <input className="input" type="number" min="1" max="6" value={form.nivel} onChange={e => setForm({ ...form, nivel: Number(e.target.value) })} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <Label>Nombre *</Label>
                <input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
              </div>
              <div>
                <Label>Tipo</Label>
                <select className="select" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                  <option value="activo">Activo</option>
                  <option value="pasivo">Pasivo</option>
                  <option value="patrimonio">Patrimonio</option>
                  <option value="ingreso">Ingreso</option>
                  <option value="costo">Costo</option>
                  <option value="gasto">Gasto</option>
                </select>
              </div>
              <div>
                <Label>Naturaleza</Label>
                <select className="select" value={form.naturaleza} onChange={e => setForm({ ...form, naturaleza: e.target.value })}>
                  <option value="deudora">Deudora</option>
                  <option value="acreedora">Acreedora</option>
                </select>
              </div>
              <div>
                <Label>Cuenta Padre</Label>
                <select className="select" value={form.cuenta_padre_id} onChange={e => setForm({ ...form, cuenta_padre_id: e.target.value })}>
                  <option value="">— Ninguna (raíz) —</option>
                  {cuentasGrupo.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
                </select>
              </div>
              <div>
                <Label>Grupo</Label>
                <input className="input" value={form.grupo} onChange={e => setForm({ ...form, grupo: e.target.value })} placeholder="Ej: Circulante" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="acepta_mov" checked={form.acepta_movimientos} onChange={e => setForm({ ...form, acepta_movimientos: e.target.checked })} />
                <label htmlFor="acepta_mov" style={{ fontSize: 13 }}>Acepta movimientos (cuenta de detalle)</label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" className="btn-primary">{modal === 'new' ? 'Crear Cuenta' : 'Guardar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

/* ═══════════════════ TAB: Asientos ═══════════════════ */

function TabAsientos() {
  const [data, setData] = useState({ total: 0, items: [] })
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [modalNew, setModalNew] = useState(false)
  const [modalVer, setModalVer] = useState(null)
  const [cuentas, setCuentas] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filtroEstado) params.set('estado', filtroEstado)
      params.set('limit', String(pageSize))
      params.set('skip', String(page * pageSize))
      const { data: d } = await api.get(`/contabilidad/asientos?${params}`)
      setData(d)
    } catch { toast.error('Error al cargar asientos') }
    finally { setLoading(false) }
  }, [filtroEstado, page])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    api.get('/contabilidad/cuentas').then(r => setCuentas(r.data.filter(c => c.acepta_movimientos))).catch(() => {})
  }, [])

  async function contabilizar(numero) {
    if (!confirm(`¿Contabilizar asiento ${numero}?`)) return
    try { await api.post(`/contabilidad/asientos/${numero}/contabilizar`); toast.success('Contabilizado'); load() }
    catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  async function anular(numero) {
    if (!confirm(`¿Anular asiento ${numero}? Se generará un asiento de reverso.`)) return
    try { await api.post(`/contabilidad/asientos/${numero}/anular`); toast.success('Anulado'); load() }
    catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
        <select className="select" style={{ width: 160 }} value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPage(0) }}>
          <option value="">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="contabilizado">Contabilizado</option>
          <option value="anulado">Anulado</option>
        </select>
        <div style={{ flex: 1 }} />
        <button className="btn-secondary" onClick={load}><RefreshCw size={14} /></button>
        <button className="btn-primary" onClick={() => setModalNew(true)}><Plus size={14} /> Nuevo Asiento</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>Número</th>
              <th>Fecha</th>
              <th>Descripción</th>
              <th style={{ textAlign: 'right' }}>Debe</th>
              <th style={{ textAlign: 'right' }}>Haber</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Cargando...</td></tr>
            ) : data.items.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Sin asientos</td></tr>
            ) : data.items.map(a => (
              <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => setModalVer(a)}
                onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#166534' }}>{a.numero}</td>
                <td style={{ fontSize: 12 }}>{a.fecha}</td>
                <td style={{ fontSize: 12, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.descripcion || '—'}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12 }}>{fmt(a.total_debe)}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12 }}>{fmt(a.total_haber)}</td>
                <td>
                  <Badge color={a.estado === 'contabilizado' ? 'green' : a.estado === 'borrador' ? 'yellow' : 'red'}>{a.estado}</Badge>
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-secondary" style={{ padding: '4px 6px' }} onClick={() => setModalVer(a)}><Eye size={12} /></button>
                    {a.estado === 'borrador' && (
                      <button className="btn-primary" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => contabilizar(a.numero)}><Check size={12} /></button>
                    )}
                    {a.estado !== 'anulado' && (
                      <button className="btn-danger" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => anular(a.numero)}><X size={12} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.total > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, data.total)} de {data.total} asiento{data.total !== 1 ? 's' : ''}
          </p>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} disabled={page === 0}
              onClick={() => setPage(p => p - 1)}>← Anterior</button>
            <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} disabled={(page + 1) * pageSize >= data.total}
              onClick={() => setPage(p => p + 1)}>Siguiente →</button>
          </div>
        </div>
      )}

      {modalNew && <ModalNuevoAsiento cuentas={cuentas} onClose={() => setModalNew(false)} onDone={() => { setModalNew(false); setPage(0); load() }} />}
      {modalVer && <ModalVerAsiento asiento={modalVer} onClose={() => setModalVer(null)} />}
    </div>
  )
}

function ModalNuevoAsiento({ cuentas, onClose, onDone }) {
  const [form, setForm] = useState({ fecha: new Date().toISOString().slice(0, 10), tipo: 'manual', origen: 'MAN', descripcion: '' })
  const [lineas, setLineas] = useState([
    { cuenta_id: '', debe: '', haber: '', descripcion_linea: '' },
    { cuenta_id: '', debe: '', haber: '', descripcion_linea: '' },
  ])
  const [saving, setSaving] = useState(false)

  function addLinea() { setLineas([...lineas, { cuenta_id: '', debe: '', haber: '', descripcion_linea: '' }]) }
  function removeLinea(i) { if (lineas.length > 2) setLineas(lineas.filter((_, idx) => idx !== i)) }
  function setLinea(i, k, v) { const nl = [...lineas]; nl[i] = { ...nl[i], [k]: v }; setLineas(nl) }

  const totalDebe = lineas.reduce((s, l) => s + (Number(l.debe) || 0), 0)
  const totalHaber = lineas.reduce((s, l) => s + (Number(l.haber) || 0), 0)
  const cuadra = Math.abs(totalDebe - totalHaber) < 0.005 && totalDebe > 0

  async function submit(e) {
    e.preventDefault()
    if (!cuadra) return toast.error('La partida doble no cuadra')
    setSaving(true)
    try {
      const payload = {
        ...form,
        lineas: lineas.filter(l => l.cuenta_id).map(l => ({
          cuenta_id: Number(l.cuenta_id),
          debe: Number(l.debe) || 0,
          haber: Number(l.haber) || 0,
          descripcion_linea: l.descripcion_linea || null,
        }))
      }
      await api.post('/contabilidad/asientos', payload)
      toast.success('Asiento creado')
      onDone()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  return (
    <Modal title="Nuevo Asiento Contable" onClose={onClose} width={850}>
      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
          <div>
            <Label>Fecha *</Label>
            <input className="input" type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} required />
          </div>
          <div>
            <Label>Tipo</Label>
            <select className="select" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
              <option value="manual">Manual</option>
              <option value="ajuste">Ajuste</option>
              <option value="cierre">Cierre</option>
            </select>
          </div>
          <div>
            <Label>Origen</Label>
            <input className="input" value={form.origen} onChange={e => setForm({ ...form, origen: e.target.value })} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <Label>Descripción</Label>
            <input className="input" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Concepto del asiento" />
          </div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Label>Líneas del Asiento</Label>
            <button type="button" className="btn-secondary" style={{ fontSize: 11 }} onClick={addLinea}><Plus size={12} /> Agregar línea</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ fontSize: 12, width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ fontSize: 11, minWidth: 200 }}>Cuenta</th>
                  <th style={{ fontSize: 11, textAlign: 'right', width: 120 }}>Debe</th>
                  <th style={{ fontSize: 11, textAlign: 'right', width: 120 }}>Haber</th>
                  <th style={{ fontSize: 11, width: 160 }}>Descripción</th>
                  <th style={{ width: 30 }}></th>
                </tr>
              </thead>
              <tbody>
                {lineas.map((l, i) => (
                  <tr key={i}>
                    <td>
                      <select className="select" style={{ fontSize: 12 }} value={l.cuenta_id} onChange={e => setLinea(i, 'cuenta_id', e.target.value)}>
                        <option value="">Seleccionar...</option>
                        {cuentas.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
                      </select>
                    </td>
                    <td><input className="input" type="number" step="0.01" min="0" style={{ textAlign: 'right', fontSize: 12 }} value={l.debe} onChange={e => setLinea(i, 'debe', e.target.value)} placeholder="0.00" /></td>
                    <td><input className="input" type="number" step="0.01" min="0" style={{ textAlign: 'right', fontSize: 12 }} value={l.haber} onChange={e => setLinea(i, 'haber', e.target.value)} placeholder="0.00" /></td>
                    <td><input className="input" style={{ fontSize: 12 }} value={l.descripcion_linea} onChange={e => setLinea(i, 'descripcion_linea', e.target.value)} /></td>
                    <td><button type="button" className="btn-danger" style={{ padding: '2px 6px' }} onClick={() => removeLinea(i)} disabled={lineas.length <= 2}><Trash2 size={11} /></button></td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 700, borderTop: '2px solid #e5e7eb' }}>
                  <td style={{ textAlign: 'right', paddingRight: 8 }}>Totales:</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(totalDebe)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(totalHaber)}</td>
                  <td colSpan={2}>
                    {cuadra ? (
                      <Badge color="green">Cuadra</Badge>
                    ) : (
                      <Badge color="red">Diferencia: {fmt(Math.abs(totalDebe - totalHaber))}</Badge>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving || !cuadra}>{saving ? 'Guardando...' : 'Crear Asiento'}</button>
        </div>
      </form>
    </Modal>
  )
}

function ModalVerAsiento({ asiento, onClose }) {
  return (
    <Modal title={`Asiento ${asiento.numero}`} subtitle={`${asiento.fecha} — ${asiento.descripcion || ''}`} onClose={onClose} width={750}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 14px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Estado</div>
          <Badge color={asiento.estado === 'contabilizado' ? 'green' : asiento.estado === 'borrador' ? 'yellow' : 'red'}>{asiento.estado}</Badge>
        </div>
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 14px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Tipo</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{asiento.tipo}</div>
        </div>
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 14px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Origen</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{asiento.origen || '—'}</div>
        </div>
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 14px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Creado por</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{asiento.creado_por || '—'}</div>
        </div>
      </div>
      <table style={{ fontSize: 12, width: '100%' }}>
        <thead>
          <tr>
            <th style={{ fontSize: 11 }}>Cuenta</th>
            <th style={{ fontSize: 11 }}>Descripción</th>
            <th style={{ fontSize: 11, textAlign: 'right' }}>Debe</th>
            <th style={{ fontSize: 11, textAlign: 'right' }}>Haber</th>
          </tr>
        </thead>
        <tbody>
          {(asiento.lineas || []).map((l, i) => (
            <tr key={i}>
              <td style={{ fontFamily: 'monospace' }}>{l.cuenta_codigo} — {l.cuenta_nombre}</td>
              <td style={{ color: '#6b7280' }}>{l.descripcion_linea || ''}</td>
              <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: l.debe > 0 ? 600 : 400 }}>{fmt(l.debe)}</td>
              <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: l.haber > 0 ? 600 : 400 }}>{fmt(l.haber)}</td>
            </tr>
          ))}
          <tr style={{ fontWeight: 700, borderTop: '2px solid #e5e7eb' }}>
            <td colSpan={2} style={{ textAlign: 'right' }}>Totales:</td>
            <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(asiento.total_debe)}</td>
            <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(asiento.total_haber)}</td>
          </tr>
        </tbody>
      </table>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn-secondary" onClick={onClose}>Cerrar</button>
      </div>
    </Modal>
  )
}

/* ═══════════════════ TAB: Períodos ═══════════════════ */

function TabPeriodos() {
  const [periodos, setPeriodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [anioGenerar, setAnioGenerar] = useState(new Date().getFullYear())

  const load = useCallback(async () => {
    setLoading(true)
    try { const { data } = await api.get(`/contabilidad/periodos?anio=${anio}`); setPeriodos(data) }
    catch { toast.error('Error') }
    finally { setLoading(false) }
  }, [anio])

  useEffect(() => { load() }, [load])

  async function generar() {
    try {
      const { data } = await api.post(`/contabilidad/periodos/generar?anio=${anioGenerar}`)
      toast.success(`${data.creados} período(s) creado(s)`)
      setAnio(anioGenerar)
      load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  async function cerrar(id) {
    if (!confirm('¿Cerrar este período? No se podrán crear asientos en él.')) return
    try { await api.post(`/contabilidad/periodos/${id}/cerrar`); toast.success('Período cerrado'); load() }
    catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  async function reabrir(id) {
    if (!confirm('¿Reabrir este período?')) return
    try { await api.post(`/contabilidad/periodos/${id}/reabrir`); toast.success('Período reabierto'); load() }
    catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <Label>Año:</Label>
        <input className="input" type="number" style={{ width: 90 }} value={anio} onChange={e => setAnio(Number(e.target.value))} />
        <button className="btn-secondary" onClick={load}><RefreshCw size={14} /></button>
        <div style={{ flex: 1 }} />
        <input className="input" type="number" style={{ width: 90 }} value={anioGenerar} onChange={e => setAnioGenerar(Number(e.target.value))} />
        <button className="btn-primary" onClick={generar}><Plus size={14} /> Generar Períodos</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead><tr><th>Período</th><th>Inicio</th><th>Fin</th><th>Estado</th><th>Cerrado por</th><th></th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Cargando...</td></tr>
            ) : periodos.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No hay períodos para {anio}. Genérelos.</td></tr>
            ) : periodos.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                <td style={{ fontSize: 12 }}>{p.fecha_inicio}</td>
                <td style={{ fontSize: 12 }}>{p.fecha_fin}</td>
                <td><Badge color={p.estado === 'abierto' ? 'green' : 'red'}>{p.estado}</Badge></td>
                <td style={{ fontSize: 12, color: '#6b7280' }}>{p.cerrado_por || '—'}</td>
                <td>
                  {p.estado === 'abierto' ? (
                    <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => cerrar(p.id)}><Lock size={12} /> Cerrar</button>
                  ) : (
                    <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => reabrir(p.id)}><Unlock size={12} /> Reabrir</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ═══════════════════ TAB: Reportes ═══════════════════ */

function TabReportes() {
  const [reporte, setReporte] = useState('balance-comprobacion')
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [cuentaLM, setCuentaLM] = useState('')
  const [cuentas, setCuentas] = useState([])

  useEffect(() => {
    api.get('/contabilidad/cuentas').then(r => setCuentas(r.data.filter(c => c.acepta_movimientos))).catch(() => {})
  }, [])

  async function generar() {
    setLoading(true)
    setData(null)
    try {
      let url = ''
      if (reporte === 'balance-comprobacion') url = `/contabilidad/balance-comprobacion?anio=${anio}&mes=${mes}`
      else if (reporte === 'balance-general') url = `/contabilidad/balance-general?anio=${anio}&mes=${mes}`
      else if (reporte === 'estado-resultados') url = `/contabilidad/estado-resultados?anio=${anio}&mes=${mes}`
      else if (reporte === 'libro-mayor') url = `/contabilidad/libro-mayor?cuenta_id=${cuentaLM}&limit=200`
      const { data: d } = await api.get(url)
      setData(d)
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al generar reporte') }
    finally { setLoading(false) }
  }

  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <select className="select" style={{ width: 200 }} value={reporte} onChange={e => { setReporte(e.target.value); setData(null) }}>
          <option value="balance-comprobacion">Balance de Comprobación</option>
          <option value="balance-general">Balance General</option>
          <option value="estado-resultados">Estado de Resultados</option>
          <option value="libro-mayor">Libro Mayor</option>
        </select>
        {reporte !== 'libro-mayor' && (
          <>
            <input className="input" type="number" style={{ width: 80 }} value={anio} onChange={e => setAnio(Number(e.target.value))} />
            <select className="select" style={{ width: 130 }} value={mes} onChange={e => setMes(Number(e.target.value))}>
              {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </>
        )}
        {reporte === 'libro-mayor' && (
          <select className="select" style={{ width: 280 }} value={cuentaLM} onChange={e => setCuentaLM(e.target.value)}>
            <option value="">Seleccionar cuenta...</option>
            {cuentas.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
          </select>
        )}
        <button className="btn-primary" onClick={generar} disabled={loading || (reporte === 'libro-mayor' && !cuentaLM)}>
          {loading ? 'Generando...' : 'Generar'}
        </button>
      </div>

      {data && reporte === 'balance-comprobacion' && <ReporteBalanceComprobacion data={data} />}
      {data && reporte === 'balance-general' && <ReporteBalanceGeneral data={data} />}
      {data && reporte === 'estado-resultados' && <ReporteEstadoResultados data={data} />}
      {data && reporte === 'libro-mayor' && <ReporteLibroMayor data={data} />}
    </div>
  )
}

function ReporteBalanceComprobacion({ data }) {
  if (!data || data.length === 0) return <p style={{ color: '#9ca3af', textAlign: 'center', padding: 40 }}>Sin datos para este período</p>
  const totD = data.reduce((s, r) => s + r.sumas_debe, 0)
  const totH = data.reduce((s, r) => s + r.sumas_haber, 0)
  const totSD = data.reduce((s, r) => s + r.saldo_deudor, 0)
  const totSA = data.reduce((s, r) => s + r.saldo_acreedor, 0)
  return (
    <div className="card" style={{ padding: 0, overflow: 'auto' }}>
      <table style={{ fontSize: 12 }}>
        <thead>
          <tr>
            <th>Código</th><th>Cuenta</th>
            <th style={{ textAlign: 'right' }}>Sumas Debe</th><th style={{ textAlign: 'right' }}>Sumas Haber</th>
            <th style={{ textAlign: 'right' }}>Saldo Deudor</th><th style={{ textAlign: 'right' }}>Saldo Acreedor</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={i}>
              <td style={{ fontFamily: 'monospace' }}>{r.codigo}</td>
              <td>{r.nombre}</td>
              <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(r.sumas_debe)}</td>
              <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(r.sumas_haber)}</td>
              <td style={{ textAlign: 'right', fontFamily: 'monospace', color: r.saldo_deudor > 0 ? '#166534' : '' }}>{fmt(r.saldo_deudor)}</td>
              <td style={{ textAlign: 'right', fontFamily: 'monospace', color: r.saldo_acreedor > 0 ? '#991b1b' : '' }}>{fmt(r.saldo_acreedor)}</td>
            </tr>
          ))}
          <tr style={{ fontWeight: 700, borderTop: '2px solid #374151', background: '#f9fafb' }}>
            <td colSpan={2}>Totales</td>
            <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(totD)}</td>
            <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(totH)}</td>
            <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(totSD)}</td>
            <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(totSA)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function ReporteBalanceGeneral({ data }) {
  if (!data) return null
  const Section = ({ title, items, total, color }) => (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color, marginBottom: 8, borderBottom: `2px solid ${color}`, paddingBottom: 4 }}>{title}</h3>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
          <span><span style={{ fontFamily: 'monospace', color: '#6b7280', marginRight: 8 }}>{it.codigo}</span>{it.nombre}</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{fmt(it.saldo)}</span>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontWeight: 700, fontSize: 13, borderTop: '2px solid #e5e7eb', marginTop: 4 }}>
        <span>Total {title}</span>
        <span style={{ fontFamily: 'monospace' }}>{fmt(total)}</span>
      </div>
    </div>
  )
  return (
    <div className="card">
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Balance General</h3>
        <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Período: {data.periodo}</p>
        {data.cuadra ? <Badge color="green">Cuadra</Badge> : <Badge color="red">No cuadra</Badge>}
      </div>
      <Section title="Activos" items={data.activos} total={data.total_activos} color="#166534" />
      <Section title="Pasivos" items={data.pasivos} total={data.total_pasivos} color="#991b1b" />
      <Section title="Patrimonio" items={data.patrimonio} total={data.total_patrimonio} color="#1e40af" />
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: 700, fontSize: 14, borderTop: '3px double #374151', marginTop: 8 }}>
        <span>Pasivos + Patrimonio</span>
        <span style={{ fontFamily: 'monospace' }}>{fmt(data.total_pasivos + data.total_patrimonio)}</span>
      </div>
    </div>
  )
}

function ReporteEstadoResultados({ data }) {
  if (!data) return null
  const LineItems = ({ items }) => items.map((it, i) => (
    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 12px', fontSize: 13, borderBottom: '1px solid #f3f4f6' }}>
      <span><span style={{ fontFamily: 'monospace', color: '#6b7280', marginRight: 8 }}>{it.codigo}</span>{it.nombre}</span>
      <span style={{ fontFamily: 'monospace' }}>{fmt(it.monto)}</span>
    </div>
  ))
  const TotalLine = ({ label, value, bold = false, border = false }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', fontWeight: bold ? 700 : 500, fontSize: 13, borderTop: border ? '2px solid #e5e7eb' : undefined, background: bold ? '#f9fafb' : undefined }}>
      <span>{label}</span>
      <span style={{ fontFamily: 'monospace', color: value < 0 ? '#991b1b' : '#166534' }}>{fmt(value)}</span>
    </div>
  )
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ textAlign: 'center', padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Estado de Resultados</h3>
        <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Período: {data.periodo}{data.campo_id ? ` — Campo: ${data.campo_id}` : ''}</p>
      </div>
      <div style={{ padding: '8px 12px', fontWeight: 700, fontSize: 12, color: '#166534', textTransform: 'uppercase', background: '#f0fdf4' }}>Ingresos</div>
      <LineItems items={data.ingresos} />
      <TotalLine label="Total Ingresos" value={data.total_ingresos} border />
      <div style={{ padding: '8px 12px', fontWeight: 700, fontSize: 12, color: '#854d0e', textTransform: 'uppercase', background: '#fefce8', marginTop: 8 }}>Costos</div>
      <LineItems items={data.costos} />
      <TotalLine label="Total Costos" value={data.total_costos} border />
      <TotalLine label="Utilidad Bruta" value={data.utilidad_bruta} bold border />
      <div style={{ padding: '8px 12px', fontWeight: 700, fontSize: 12, color: '#991b1b', textTransform: 'uppercase', background: '#fef2f2', marginTop: 8 }}>Gastos</div>
      <LineItems items={data.gastos} />
      <TotalLine label="Total Gastos" value={data.total_gastos} border />
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', fontWeight: 700, fontSize: 15, borderTop: '3px double #374151', background: '#f0fdf4' }}>
        <span>Utilidad Neta</span>
        <span style={{ fontFamily: 'monospace', color: data.utilidad_neta < 0 ? '#991b1b' : '#166534' }}>{fmt(data.utilidad_neta)}</span>
      </div>
    </div>
  )
}

function ReporteLibroMayor({ data }) {
  if (!data || !data.items || data.items.length === 0) return <p style={{ color: '#9ca3af', textAlign: 'center', padding: 40 }}>Sin movimientos para esta cuenta</p>
  return (
    <div className="card" style={{ padding: 0, overflow: 'auto' }}>
      <table style={{ fontSize: 12 }}>
        <thead>
          <tr>
            <th>Fecha</th><th>Asiento</th><th>Descripción</th>
            <th style={{ textAlign: 'right' }}>Debe</th><th style={{ textAlign: 'right' }}>Haber</th>
            <th style={{ textAlign: 'right' }}>Saldo</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((r, i) => (
            <tr key={i}>
              <td>{r.fecha}</td>
              <td style={{ fontFamily: 'monospace', color: '#166534', fontWeight: 600 }}>{r.asiento_numero}</td>
              <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.descripcion || '—'}</td>
              <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(r.debe)}</td>
              <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(r.haber)}</td>
              <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: r.saldo < 0 ? '#991b1b' : '#166534' }}>{fmt(r.saldo)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: 11, color: '#9ca3af', padding: '8px 12px' }}>{data.total} movimiento{data.total !== 1 ? 's' : ''}</p>
    </div>
  )
}

/* ═══════════════════ TAB: Configuración ═══════════════════ */

/* ═══════════════════ TAB: Antigüedad CxP/CxC ═══════════════════ */

function TabAntiguedad() {
  const [tipo, setTipo] = useState<'cxp' | 'cxc'>('cxp')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: d } = await api.get(`/contabilidad/antiguedad-${tipo}`)
      setData(d)
    } catch { toast.error('Error al cargar antigüedad') }
    finally { setLoading(false) }
  }, [tipo])

  useEffect(() => { load() }, [load])

  const BUCKETS = ['corriente', '31-60', '61-90', '91-120', '120+']
  const BUCKET_COLORS: Record<string, string> = { corriente: '#166534', '31-60': '#ca8a04', '61-90': '#ea580c', '91-120': '#dc2626', '120+': '#7f1d1d' }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
        <button className={tipo === 'cxp' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTipo('cxp')}>Cuentas por Pagar</button>
        <button className={tipo === 'cxc' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTipo('cxc')}>Cuentas por Cobrar</button>
        <button className="btn-secondary" onClick={load} style={{ marginLeft: 'auto' }}><RefreshCw size={14} /></button>
      </div>

      {data && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            {BUCKETS.map(b => (
              <div key={b} className="card" style={{ padding: '8px 14px', margin: 0, minWidth: 120, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>{b === 'corriente' ? '0-30 días' : `${b} días`}</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: BUCKET_COLORS[b] }}>RD$ {fmt(data.resumen[b])}</div>
              </div>
            ))}
            <div className="card" style={{ padding: '8px 14px', margin: 0, minWidth: 120, textAlign: 'center', background: '#f3f4f6' }}>
              <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Total</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>RD$ {fmt(data.total)}</div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ fontSize: 12 }}>
              <thead><tr><th>Número</th><th>{tipo === 'cxp' ? 'Proveedor' : 'Cliente'}</th><th>Fecha</th><th>Vencimiento</th><th style={{ textAlign: 'right' }}>Total</th><th style={{ textAlign: 'right' }}>Saldo</th><th style={{ textAlign: 'right' }}>Días</th><th>Antigüedad</th></tr></thead>
              <tbody>
                {data.detalle.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>Sin saldos pendientes</td></tr>
                ) : data.detalle.sort((a: any, b: any) => b.dias - a.dias).map((r: any) => (
                  <tr key={r.id}>
                    <td style={{ fontFamily: 'monospace' }}>{r.numero}</td>
                    <td>{tipo === 'cxp' ? r.proveedor : r.cliente}</td>
                    <td>{r.fecha_factura || r.fecha}</td>
                    <td>{r.fecha_vencimiento || '—'}</td>
                    <td style={{ textAlign: 'right' }}>RD$ {fmt(r.total)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>RD$ {fmt(r.saldo)}</td>
                    <td style={{ textAlign: 'right' }}>{r.dias}</td>
                    <td><span style={{ color: BUCKET_COLORS[r.bucket], fontWeight: 700, fontSize: 11 }}>{r.bucket === 'corriente' ? '0-30' : r.bucket}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}


function TabConfig() {
  const [empresa, setEmpresa] = useState(null)
  const [reglas, setReglas] = useState([])
  const [loading, setLoading] = useState(true)
  const [editEmpresa, setEditEmpresa] = useState(false)
  const [formEmpresa, setFormEmpresa] = useState({})
  const [cuentas, setCuentas] = useState<any[]>([])
  const [showReglaModal, setShowReglaModal] = useState(false)
  const [editingRegla, setEditingRegla] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [e, r, c] = await Promise.all([
        api.get('/contabilidad/empresa'),
        api.get('/contabilidad/reglas'),
        api.get('/contabilidad/cuentas'),
      ])
      setEmpresa(e.data)
      setReglas(r.data)
      setCuentas(c.data.filter((x: any) => x.acepta_movimientos))
      if (e.data) setFormEmpresa(e.data)
    } catch { toast.error('Error al cargar configuración') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function saveEmpresa(e) {
    e.preventDefault()
    try {
      const { id, ...payload } = formEmpresa as any
      await api.put('/contabilidad/empresa', payload)
      toast.success('Configuración guardada')
      setEditEmpresa(false)
      load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div>

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Datos de la Empresa</h3>
          {!editEmpresa && <button className="btn-secondary" style={{ fontSize: 11 }} onClick={() => setEditEmpresa(true)}><Edit2 size={12} /> Editar</button>}
        </div>
        {editEmpresa ? (
          <form onSubmit={saveEmpresa}>
            {['razon_social', 'nombre_comercial', 'rnc', 'direccion', 'telefono', 'email', 'moneda_funcional', 'regimen_fiscal'].map(k => (
              <div key={k} style={{ marginBottom: 10 }}>
                <Label>{k.replace(/_/g, ' ')}</Label>
                <input className="input" value={formEmpresa[k] || ''} onChange={e => setFormEmpresa({ ...formEmpresa, [k]: e.target.value })} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={() => setEditEmpresa(false)}>Cancelar</button>
              <button type="submit" className="btn-primary">Guardar</button>
            </div>
          </form>
        ) : empresa ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {[
              { l: 'Razón Social', v: empresa.razon_social },
              { l: 'Nombre Comercial', v: empresa.nombre_comercial },
              { l: 'RNC', v: empresa.rnc },
              { l: 'Dirección', v: empresa.direccion },
              { l: 'Teléfono', v: empresa.telefono },
              { l: 'Email', v: empresa.email },
              { l: 'Moneda', v: empresa.moneda_funcional },
              { l: 'Régimen', v: empresa.regimen_fiscal },
            ].map(f => (
              <div key={f.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                <span style={{ color: '#6b7280' }}>{f.l}</span>
                <span style={{ fontWeight: 500 }}>{f.v || '—'}</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#9ca3af' }}>No configurada. Presione Editar.</p>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Reglas de Contabilización</h3>
          <button className="btn-primary" style={{ fontSize: 11 }} onClick={() => { setEditingRegla({ evento: '', concepto: '', cuenta_debe_id: '', cuenta_haber_id: '', descripcion: '' }); setShowReglaModal(true) }}><Plus size={12} /> Nueva Regla</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ fontSize: 12 }}>
            <thead><tr><th>Evento</th><th>Concepto</th><th>Cuenta Debe</th><th>Cuenta Haber</th><th></th></tr></thead>
            <tbody>
              {reglas.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>Sin reglas</td></tr>
              ) : reglas.map((r: any) => (
                <tr key={r.id}>
                  <td><Badge color="blue">{r.evento}</Badge></td>
                  <td style={{ fontSize: 12 }}>{r.concepto}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.cuenta_debe_codigo ? `${r.cuenta_debe_codigo} — ${r.cuenta_debe_nombre}` : r.cuenta_debe_id}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.cuenta_haber_codigo ? `${r.cuenta_haber_codigo} — ${r.cuenta_haber_nombre}` : r.cuenta_haber_id}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-icon" onClick={() => { setEditingRegla({ ...r, cuenta_debe_id: r.cuenta_debe_id, cuenta_haber_id: r.cuenta_haber_id }); setShowReglaModal(true) }}><Edit2 size={13} /></button>
                    <button className="btn-icon" onClick={async () => { if (!confirm('¿Desactivar regla?')) return; try { await api.delete(`/contabilidad/reglas/${r.id}`); toast.success('Regla desactivada'); load() } catch { toast.error('Error') } }}><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>{reglas.length} regla{reglas.length !== 1 ? 's' : ''} activa{reglas.length !== 1 ? 's' : ''}</p>
      </div>

      {showReglaModal && editingRegla && (
        <Modal title={editingRegla.id ? 'Editar Regla' : 'Nueva Regla'} onClose={() => setShowReglaModal(false)} width={500}>
          <form onSubmit={async (e: any) => { e.preventDefault(); const payload = { evento: editingRegla.evento, concepto: editingRegla.concepto, cuenta_debe_id: Number(editingRegla.cuenta_debe_id), cuenta_haber_id: Number(editingRegla.cuenta_haber_id), descripcion: editingRegla.descripcion || null }; try { if (editingRegla.id) await api.put(`/contabilidad/reglas/${editingRegla.id}`, payload); else await api.post('/contabilidad/reglas', payload); toast.success(editingRegla.id ? 'Regla actualizada' : 'Regla creada'); setShowReglaModal(false); load() } catch (err: any) { toast.error(err.response?.data?.detail || 'Error') } }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><Label>Evento</Label><input className="input" required value={editingRegla.evento} onChange={(e: any) => setEditingRegla({ ...editingRegla, evento: e.target.value })} placeholder="ej: compra, venta, nomina" /></div>
              <div><Label>Concepto</Label><input className="input" required value={editingRegla.concepto} onChange={(e: any) => setEditingRegla({ ...editingRegla, concepto: e.target.value })} placeholder="ej: factura_proveedor" /></div>
              <div><Label>Cuenta Debe</Label><select className="select" required value={editingRegla.cuenta_debe_id} onChange={(e: any) => setEditingRegla({ ...editingRegla, cuenta_debe_id: e.target.value })}><option value="">Seleccionar...</option>{cuentas.map((c: any) => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}</select></div>
              <div><Label>Cuenta Haber</Label><select className="select" required value={editingRegla.cuenta_haber_id} onChange={(e: any) => setEditingRegla({ ...editingRegla, cuenta_haber_id: e.target.value })}><option value="">Seleccionar...</option>{cuentas.map((c: any) => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}</select></div>
              <div style={{ gridColumn: 'span 2' }}><Label>Descripción</Label><input className="input" value={editingRegla.descripcion || ''} onChange={(e: any) => setEditingRegla({ ...editingRegla, descripcion: e.target.value })} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn-secondary" onClick={() => setShowReglaModal(false)}>Cancelar</button>
              <button type="submit" className="btn-primary">{editingRegla.id ? 'Guardar' : 'Crear'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

/* ═══════════════════ MAIN PAGE ═══════════════════ */

export default function Contabilidad() {
  const [tab, setTab] = useState('cuentas')

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#111827' }}>
          <BookOpen size={22} style={{ verticalAlign: 'text-bottom', marginRight: 8 }} />
          Contabilidad
        </h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>Plan de cuentas, asientos contables, períodos y reportes financieros</p>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e5e7eb', marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: tab === t.key ? '2px solid #166534' : '2px solid transparent',
              marginBottom: -2, fontWeight: tab === t.key ? 700 : 400,
              color: tab === t.key ? '#166534' : '#6b7280', fontSize: 13,
              transition: 'all 0.15s',
            }}>
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'cuentas' && <TabCuentas />}
      {tab === 'asientos' && <TabAsientos />}
      {tab === 'periodos' && <TabPeriodos />}
      {tab === 'reportes' && <TabReportes />}
      {tab === 'antiguedad' && <TabAntiguedad />}
      {tab === 'config' && <TabConfig />}
    </div>
  )
}
