import { useEffect, useState, useCallback } from 'react'
import api from '../api'
import toast from 'react-hot-toast'
import {
  BookOpen, Plus, Search, RefreshCw, X, ChevronDown, ChevronRight,
  Check, Lock, Unlock, FileText, Calendar, Settings, BarChart3,
  Edit2, Trash2, Eye, Filter, Download, Clock, Repeat, Landmark, FileSpreadsheet,
  TrendingUp, AlertTriangle, DollarSign
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

// Formato contable: negativos entre paréntesis. Devuelve {texto, negativo}.
const fmtCont = (n) => {
  const v = Number(n || 0)
  return { texto: v < 0 ? `(${fmt(Math.abs(v))})` : fmt(v), negativo: v < 0 }
}
const Monto = ({ v, bold = false }: any) => {
  const f = fmtCont(v)
  return <span style={{ fontFamily: 'monospace', fontWeight: bold ? 700 : 500, color: f.negativo ? '#991b1b' : undefined }}>{f.texto}</span>
}

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: TrendingUp },
  { key: 'cuentas', label: 'Plan de Cuentas', icon: BookOpen },
  { key: 'asientos', label: 'Asientos', icon: FileText },
  { key: 'periodos', label: 'Períodos', icon: Calendar },
  { key: 'reportes', label: 'Reportes', icon: BarChart3 },
  { key: 'antiguedad', label: 'Antigüedad', icon: Clock },
  { key: 'flujo', label: 'Flujo Efectivo', icon: BarChart3 },
  { key: 'recurrentes', label: 'Recurrentes', icon: Repeat },
  { key: 'dgii', label: 'DGII', icon: FileSpreadsheet },
  { key: 'conciliacion', label: 'Conciliación', icon: Landmark },
  { key: 'fsv', label: 'Estados Financieros', icon: Settings },
  { key: 'diarios', label: 'Diarios', icon: BookOpen },
  { key: 'dimensiones', label: 'Dimensiones', icon: Filter },
  { key: 'trazabilidad', label: 'Trazabilidad', icon: Eye },
  { key: 'config', label: 'Configuración', icon: Settings },
]

/* ═══════════════════ TAB: Dashboard Financiero ═══════════════════ */

function TabDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [alertas, setAlertas] = useState<any[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [d, n] = await Promise.allSettled([
        api.get('/contabilidad/dashboard-financiero'),
        api.get('/contabilidad/notificaciones'),
      ])
      if (d.status === 'fulfilled') setData(d.value.data)
      else throw new Error('dashboard')
      if (n.status === 'fulfilled') setAlertas(n.value.data.alertas || [])
    } catch { toast.error('Error al cargar dashboard') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando dashboard...</div>
  if (!data) return null

  const KPI = ({ label, value, sub, color, warn }: any) => (
    <div className="card" style={{ padding: '14px 18px', margin: 0, minWidth: 170, flex: '1 1 170px', borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 22, fontFamily: 'monospace', marginTop: 4 }}>RD$ {fmt(value)}</div>
      {sub && <div style={{ fontSize: 11, color: warn ? '#dc2626' : '#6b7280', marginTop: 2 }}>{sub}</div>}
    </div>
  )

  const maxBar = Math.max(...data.tendencia.map((t: any) => Math.max(t.ingresos, t.gastos)), 1)

  const NIVEL_COLORS: Record<string, { bg: string; fg: string; icon: string }> = {
    danger: { bg: '#fee2e2', fg: '#991b1b', icon: '#dc2626' },
    warning: { bg: '#fef9c3', fg: '#854d0e', icon: '#ca8a04' },
    info: { bg: '#dbeafe', fg: '#1e40af', icon: '#3b82f6' },
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <KPI label="Saldo Bancos" value={data.saldo_bancos} color="#166534" />
        <KPI label="Cuentas por Cobrar" value={data.total_cxc} sub={data.cxc_vencidas > 0 ? `RD$ ${fmt(data.cxc_vencidas)} vencidas (${data.num_cxc} doc.)` : `${data.num_cxc} documentos`} color="#1e40af" warn={data.cxc_vencidas > 0} />
        <KPI label="Cuentas por Pagar" value={data.total_cxp} sub={data.cxp_vencidas > 0 ? `RD$ ${fmt(data.cxp_vencidas)} vencidas (${data.num_cxp} doc.)` : `${data.num_cxp} documentos`} color="#dc2626" warn={data.cxp_vencidas > 0} />
        <KPI label="Ingresos del Año" value={data.ingresos_anio} color="#166534" />
        <KPI label="Utilidad del Año" value={data.utilidad_anio} sub={`Gastos: RD$ ${fmt(data.gastos_anio)}`} color={data.utilidad_anio >= 0 ? '#166534' : '#dc2626'} />
      </div>

      {alertas.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {alertas.map((a: any, i: number) => {
            const nc = NIVEL_COLORS[a.nivel] || NIVEL_COLORS.info
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 6, borderRadius: 6, background: nc.bg, border: `1px solid ${nc.fg}22` }}>
                <AlertTriangle size={16} style={{ color: nc.icon, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: nc.fg }}>{a.titulo}</div>
                  <div style={{ fontSize: 11, color: nc.fg + 'cc' }}>{a.detalle}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Tendencia Mensual {new Date().getFullYear()}</h3>
          <button className="btn-secondary" onClick={load} style={{ padding: '4px 8px' }}><RefreshCw size={14} /></button>
        </div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 11 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: '#166534', display: 'inline-block' }}></span> Ingresos</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: '#dc2626', display: 'inline-block' }}></span> Gastos</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 2, background: '#1e40af', display: 'inline-block' }}></span> Utilidad</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', minHeight: 180, minWidth: 600 }}>
            {data.tendencia.map((t: any) => (
              <div key={t.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 140 }}>
                  <div style={{ width: 14, background: '#166534', borderRadius: '3px 3px 0 0', height: `${Math.max(2, (t.ingresos / maxBar) * 130)}px`, transition: 'height 0.3s' }} title={`Ingresos: RD$ ${fmt(t.ingresos)}`}></div>
                  <div style={{ width: 14, background: '#dc2626', borderRadius: '3px 3px 0 0', height: `${Math.max(2, (t.gastos / maxBar) * 130)}px`, transition: 'height 0.3s' }} title={`Gastos: RD$ ${fmt(t.gastos)}`}></div>
                </div>
                <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>{t.mes}</div>
                <div style={{ fontSize: 9, color: t.utilidad >= 0 ? '#166534' : '#dc2626', fontWeight: 700, fontFamily: 'monospace' }}>{t.utilidad !== 0 ? fmt(t.utilidad) : ''}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 12, paddingTop: 12, borderTop: '1px solid #e5e7eb', fontSize: 13 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Total Ingresos</div>
            <div style={{ fontWeight: 700, color: '#166534', fontFamily: 'monospace' }}>RD$ {fmt(data.ingresos_anio)}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Total Gastos</div>
            <div style={{ fontWeight: 700, color: '#dc2626', fontFamily: 'monospace' }}>RD$ {fmt(data.gastos_anio)}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#6b7280' }}>Utilidad Neta</div>
            <div style={{ fontWeight: 700, color: data.utilidad_anio >= 0 ? '#166534' : '#dc2626', fontFamily: 'monospace' }}>RD$ {fmt(data.utilidad_anio)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}


/* ═══════════════════ TAB: Plan de Cuentas ═══════════════════ */

function TabCuentas() {
  const [cuentas, setCuentas] = useState([])
  const [partidas, setPartidas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [buscar, setBuscar] = useState('')
  const [expandidas, setExpandidas] = useState(new Set())
  const [modal, setModal] = useState(null) // null | 'new' | cuenta
  const [form, setForm] = useState({ codigo: '', nombre: '', tipo: 'activo', naturaleza: 'deudora', grupo: '', nivel: 1, cuenta_padre_id: '', partida_id: '', acepta_movimientos: true })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/contabilidad/cuentas?activo=true')
      setCuentas(data)
      api.get('/contabilidad/partidas').then(r => setPartidas(r.data)).catch(() => toast.error('Error al cargar partidas'))
    }
    catch { toast.error('Error al cargar cuentas') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const cuentasPorNivel = (nivel: number) => cuentas.filter((c: any) => c.nivel === nivel)
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

  function nextChildCode(parentId: any): string {
    if (!parentId) return ''
    const padre = cuentas.find((c: any) => c.id === Number(parentId))
    if (!padre) return ''
    const childNivel = (padre as any).nivel + 1
    const hijos = cuentas.filter((c: any) => c.cuenta_padre_id === Number(parentId))
    const maxSeq = hijos.reduce((max, h: any) => {
      const parts = h.codigo.split('.')
      const last = parseInt(parts[parts.length - 1], 10)
      return isNaN(last) ? max : Math.max(max, last)
    }, 0)
    const pad = childNivel <= 2 ? 1 : 2
    const next = String(maxSeq + 1).padStart(pad, '0')
    return `${(padre as any).codigo}.${next}`
  }

  function onNivelChange(nivel: number) {
    setForm(f => ({ ...f, nivel, cuenta_padre_id: '', codigo: '', acepta_movimientos: nivel === 4 }))
  }

  function onPadreChange(parentId: string) {
    if (!parentId) {
      setForm(f => ({ ...f, cuenta_padre_id: '', codigo: '' }))
      return
    }
    const padre = cuentas.find((c: any) => c.id === Number(parentId)) as any
    const codigo = nextChildCode(parentId)
    const nivel = padre ? padre.nivel + 1 : form.nivel
    setForm(f => ({ ...f, cuenta_padre_id: parentId, codigo, nivel, tipo: padre?.tipo || f.tipo, naturaleza: padre?.naturaleza || f.naturaleza, grupo: padre?.grupo || f.grupo }))
  }

  const padresParaNivel = cuentasPorNivel(form.nivel - 1)

  function openNew() {
    setForm({ codigo: '', nombre: '', tipo: 'activo', naturaleza: 'deudora', grupo: '', nivel: 1, cuenta_padre_id: '', partida_id: '', acepta_movimientos: false })
    setModal('new')
  }

  function openEdit(c) {
    setForm({ codigo: c.codigo, nombre: c.nombre, tipo: c.tipo, naturaleza: c.naturaleza, grupo: c.grupo || '', nivel: c.nivel, cuenta_padre_id: c.cuenta_padre_id || '', partida_id: c.partida_id || '', acepta_movimientos: c.acepta_movimientos })
    setModal(c)
  }

  async function save(e) {
    e.preventDefault()
    if (!form.codigo || !form.nombre) return toast.error('Código y nombre son obligatorios')
    if (form.nivel > 1 && !form.cuenta_padre_id) return toast.error('Debe seleccionar una cuenta padre para nivel ' + form.nivel)
    const payload = { ...form, acepta_movimientos: form.nivel === 4, cuenta_padre_id: form.cuenta_padre_id ? Number(form.cuenta_padre_id) : null, partida_id: form.partida_id ? Number(form.partida_id) : null }
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

  async function cargarCatalogo() {
    if (!confirm('¿Cargar el catálogo de cuentas estándar? Solo agrega las cuentas que falten (no duplica ni borra).')) return
    try {
      const r = await api.post('/contabilidad/cuentas/seed-catalogo')
      toast.success(`Catálogo cargado: ${r.data.creadas} cuentas nuevas (total ${r.data.total})`)
      load()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error al cargar catálogo') }
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
            <span style={{ flex: 1, fontSize: 13, fontWeight: !n.acepta_movimientos ? 600 : 400 }}>{n.nombre}{n.partida_nombre ? <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 6 }}>[{n.partida_nombre}]</span> : ''}</span>
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
        {cuentas.length > 0 && <button className="btn-secondary" onClick={cargarCatalogo} title="Cargar catálogo estándar (idempotente)"><Download size={14} /> Catálogo</button>}
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
        ) : cuentas.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
            <p style={{ marginBottom: 16 }}>No hay cuentas contables cargadas.</p>
            <button className="btn-primary" onClick={cargarCatalogo}><Download size={13} /> Cargar catálogo estándar</button>
            <p style={{ marginTop: 12, fontSize: 11 }}>Crea el plan de cuentas estándar para finca de aguacates (93 cuentas).</p>
          </div>
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
                <input className="input" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} required disabled={modal !== 'new'} readOnly={modal === 'new' && !!form.cuenta_padre_id} style={modal === 'new' && form.cuenta_padre_id ? { background: '#f3f4f6' } : {}} />
              </div>
              <div>
                <Label>Nivel</Label>
                <select className="select" value={form.nivel} onChange={e => modal === 'new' ? onNivelChange(Number(e.target.value)) : undefined} disabled={modal !== 'new'}>
                  <option value={1}>1 — Categoría</option>
                  <option value={2}>2 — Sub-categoría</option>
                  <option value={3}>3 — Grupo</option>
                  <option value={4}>4 — Detalle</option>
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <Label>Nombre *</Label>
                <input className="input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
              </div>
              <div>
                <Label>Tipo</Label>
                <select className="select" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} disabled={modal === 'new' && !!form.cuenta_padre_id}>
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
                <select className="select" value={form.naturaleza} onChange={e => setForm({ ...form, naturaleza: e.target.value })} disabled={modal === 'new' && !!form.cuenta_padre_id}>
                  <option value="deudora">Deudora</option>
                  <option value="acreedora">Acreedora</option>
                </select>
              </div>
              <div>
                <Label>Cuenta Padre</Label>
                <select className="select" value={form.cuenta_padre_id} onChange={e => modal === 'new' ? onPadreChange(e.target.value) : setForm({ ...form, cuenta_padre_id: e.target.value })}>
                  <option value="">{form.nivel <= 1 ? '— Ninguna (raíz) —' : '— Seleccionar cuenta padre —'}</option>
                  {padresParaNivel.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
                </select>
              </div>
              <div>
                <Label>Grupo</Label>
                <input className="input" value={form.grupo} onChange={e => setForm({ ...form, grupo: e.target.value })} placeholder="Ej: Circulante" />
              </div>
              <div>
                <Label>Partida Estado Financiero</Label>
                <select className="select" value={form.partida_id} onChange={e => setForm({ ...form, partida_id: e.target.value })}>
                  <option value="">— Sin partida —</option>
                  {(() => {
                    const tipoEstado = ['activo', 'pasivo', 'patrimonio'].includes(form.tipo) ? 'balance_general' : 'estado_resultados'
                    return partidas.filter(p => p.estado === tipoEstado).map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.clasificacion.replace(/_/g, ' ')})</option>)
                  })()}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="acepta_mov" checked={form.nivel === 4} disabled />
                <label htmlFor="acepta_mov" style={{ fontSize: 13, color: '#6b7280' }}>Acepta movimientos (solo nivel 4)</label>
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
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')
  const [filtroOrigen, setFiltroOrigen] = useState('')
  const [filtroDiario, setFiltroDiario] = useState('')
  const [page, setPage] = useState(0)
  const pageSize = 25
  const [modalNew, setModalNew] = useState(false)
  const [modalVer, setModalVer] = useState(null)
  const [cuentas, setCuentas] = useState([])
  const [diarios, setDiarios] = useState<any[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filtroEstado) params.set('estado', filtroEstado)
      if (filtroOrigen) params.set('origen', filtroOrigen)
      if (filtroDiario) params.set('diario_id', filtroDiario)
      if (filtroDesde) params.set('desde', filtroDesde)
      if (filtroHasta) params.set('hasta', filtroHasta)
      params.set('limit', String(pageSize))
      params.set('skip', String(page * pageSize))
      const { data: d } = await api.get(`/contabilidad/asientos?${params}`)
      setData(d)
    } catch { toast.error('Error al cargar asientos') }
    finally { setLoading(false) }
  }, [filtroEstado, filtroOrigen, filtroDiario, filtroDesde, filtroHasta, page])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    api.get('/contabilidad/cuentas').then(r => setCuentas(r.data.filter(c => c.acepta_movimientos))).catch(() => toast.error('Error al cargar datos'))
    api.get('/contabilidad/diarios').then(r => setDiarios(r.data)).catch(() => toast.error('Error al cargar datos'))
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
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <select className="select" style={{ width: 150 }} value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPage(0) }}>
          <option value="">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="contabilizado">Contabilizado</option>
          <option value="anulado">Anulado</option>
        </select>
        <select className="select" style={{ width: 130 }} value={filtroOrigen} onChange={e => { setFiltroOrigen(e.target.value); setPage(0) }}>
          <option value="">Todo origen</option>
          <option value="MAN">Manual</option>
          <option value="CXP">CxP</option>
          <option value="PAG">Pago</option>
          <option value="VTA">Venta</option>
          <option value="COB">Cobro</option>
          <option value="CIE">Cierre</option>
        </select>
        <select className="select" style={{ width: 140 }} value={filtroDiario} onChange={e => { setFiltroDiario(e.target.value); setPage(0) }}>
          <option value="">Todos los diarios</option>
          {diarios.map(d => <option key={d.id} value={d.id}>{d.codigo} — {d.nombre}</option>)}
        </select>
        <input className="input" type="date" style={{ width: 140 }} value={filtroDesde} onChange={e => { setFiltroDesde(e.target.value); setPage(0) }} title="Desde" />
        <input className="input" type="date" style={{ width: 140 }} value={filtroHasta} onChange={e => { setFiltroHasta(e.target.value); setPage(0) }} title="Hasta" />
        {(filtroEstado || filtroOrigen || filtroDiario || filtroDesde || filtroHasta) && (
          <button className="btn-secondary" style={{ fontSize: 11 }} onClick={() => { setFiltroEstado(''); setFiltroOrigen(''); setFiltroDiario(''); setFiltroDesde(''); setFiltroHasta(''); setPage(0) }}><X size={12} /> Limpiar</button>
        )}
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
              <th>Diario</th>
              <th>Origen</th>
              <th style={{ textAlign: 'right' }}>Debe</th>
              <th style={{ textAlign: 'right' }}>Haber</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Cargando...</td></tr>
            ) : data.items.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Sin asientos</td></tr>
            ) : data.items.map(a => (
              <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => setModalVer(a)}
                onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#166534' }}>{a.numero}</td>
                <td style={{ fontSize: 12 }}>{a.fecha}</td>
                <td style={{ fontSize: 12, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.descripcion || '—'}</td>
                <td>{a.diario_codigo ? <Badge color="blue">{a.diario_codigo}</Badge> : '—'}</td>
                <td><Badge color={a.tipo === 'automatico' ? 'blue' : 'gray'}>{a.origen || a.tipo}</Badge></td>
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

      {modalNew && <ModalNuevoAsiento cuentas={cuentas} diarios={diarios} onClose={() => setModalNew(false)} onDone={() => { setModalNew(false); setPage(0); load() }} />}
      {modalVer && <ModalVerAsiento asiento={modalVer} onClose={() => setModalVer(null)} />}
    </div>
  )
}

function ModalNuevoAsiento({ cuentas, diarios: diariosParent = [], onClose, onDone }) {
  const [form, setForm] = useState({ fecha: new Date().toISOString().slice(0, 10), tipo: 'manual', origen: 'MAN', descripcion: '', diario_id: '' })
  const [lineas, setLineas] = useState([
    { cuenta_id: '', debe: '', haber: '', descripcion_linea: '', campo_id: '', unidad_negocio_id: '', departamento_id: '', almacen_id: '' },
    { cuenta_id: '', debe: '', haber: '', descripcion_linea: '', campo_id: '', unidad_negocio_id: '', departamento_id: '', almacen_id: '' },
  ])
  const [saving, setSaving] = useState(false)
  const [dims, setDims] = useState<{ campos: any[]; unidades: any[]; deptos: any[]; almacenes: any[] }>({ campos: [], unidades: [], deptos: [], almacenes: [] })
  const diariosActivos = diariosParent.filter(x => x.activo)

  useEffect(() => {
    Promise.all([
      api.get('/campos'), api.get('/contabilidad/unidades-negocio'),
      api.get('/contabilidad/departamentos'), api.get('/contabilidad/almacenes'),
    ]).then(([c, u, d, a]) => setDims({ campos: c.data, unidades: u.data, deptos: d.data, almacenes: a.data })).catch(() => toast.error('Error al cargar datos'))
  }, [])

  function addLinea() { setLineas([...lineas, { cuenta_id: '', debe: '', haber: '', descripcion_linea: '', campo_id: '', unidad_negocio_id: '', departamento_id: '', almacen_id: '' }]) }
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
        diario_id: form.diario_id ? Number(form.diario_id) : null,
        lineas: lineas.filter(l => l.cuenta_id).map(l => ({
          cuenta_id: Number(l.cuenta_id),
          debe: Number(l.debe) || 0,
          haber: Number(l.haber) || 0,
          descripcion_linea: l.descripcion_linea || null,
          campo_id: l.campo_id || null,
          unidad_negocio_id: l.unidad_negocio_id ? Number(l.unidad_negocio_id) : null,
          departamento_id: l.departamento_id ? Number(l.departamento_id) : null,
          almacen_id: l.almacen_id ? Number(l.almacen_id) : null,
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
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
          <div>
            <Label>Diario</Label>
            <select className="select" value={form.diario_id} onChange={e => setForm({ ...form, diario_id: e.target.value })}>
              <option value="">— Automático —</option>
              {diariosActivos.map(d => <option key={d.id} value={d.id}>{d.codigo} — {d.nombre}</option>)}
            </select>
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
                  <th style={{ fontSize: 11, minWidth: 180 }}>Cuenta</th>
                  <th style={{ fontSize: 11, textAlign: 'right', width: 100 }}>Debe</th>
                  <th style={{ fontSize: 11, textAlign: 'right', width: 100 }}>Haber</th>
                  <th style={{ fontSize: 11, width: 110 }}>Centro Costo</th>
                  <th style={{ fontSize: 11, width: 110 }}>U. Negocio</th>
                  <th style={{ fontSize: 11, width: 110 }}>Depto</th>
                  <th style={{ fontSize: 11, width: 110 }}>Almacén</th>
                  <th style={{ fontSize: 11, width: 130 }}>Descripción</th>
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
                    <td><select className="select" style={{ fontSize: 11 }} value={l.campo_id} onChange={e => setLinea(i, 'campo_id', e.target.value)}><option value="">—</option>{dims.campos.map(c => <option key={c.id_campo} value={c.id_campo}>{c.nombre}</option>)}</select></td>
                    <td><select className="select" style={{ fontSize: 11 }} value={l.unidad_negocio_id} onChange={e => setLinea(i, 'unidad_negocio_id', e.target.value)}><option value="">—</option>{dims.unidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}</select></td>
                    <td><select className="select" style={{ fontSize: 11 }} value={l.departamento_id} onChange={e => setLinea(i, 'departamento_id', e.target.value)}><option value="">—</option>{dims.deptos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}</select></td>
                    <td><select className="select" style={{ fontSize: 11 }} value={l.almacen_id} onChange={e => setLinea(i, 'almacen_id', e.target.value)}><option value="">—</option>{dims.almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}</select></td>
                    <td><input className="input" style={{ fontSize: 12 }} value={l.descripcion_linea} onChange={e => setLinea(i, 'descripcion_linea', e.target.value)} /></td>
                    <td><button type="button" className="btn-danger" style={{ padding: '2px 6px' }} onClick={() => removeLinea(i)} disabled={lineas.length <= 2}><Trash2 size={11} /></button></td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 700, borderTop: '2px solid #e5e7eb' }}>
                  <td style={{ textAlign: 'right', paddingRight: 8 }}>Totales:</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(totalDebe)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(totalHaber)}</td>
                  <td colSpan={6}>
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
  const [lmDesde, setLmDesde] = useState('')
  const [lmHasta, setLmHasta] = useState('')
  const [campoId, setCampoId] = useState('')
  const [unId, setUnId] = useState('')
  const [deptoId, setDeptoId] = useState('')
  const [almId, setAlmId] = useState('')
  const [cuentas, setCuentas] = useState([])
  const [campos, setCampos] = useState<any[]>([])
  const [unidades, setUnidades] = useState<any[]>([])
  const [deptos, setDeptos] = useState<any[]>([])
  const [almacenes, setAlmacenes] = useState<any[]>([])
  const [showDimFilters, setShowDimFilters] = useState(false)

  useEffect(() => {
    api.get('/contabilidad/cuentas').then(r => setCuentas(r.data.filter(c => c.acepta_movimientos))).catch(() => toast.error('Error al cargar datos'))
    api.get('/campos').then(r => setCampos(r.data)).catch(() => toast.error('Error al cargar datos'))
    api.get('/contabilidad/dimensiones/unidades-negocio').then(r => setUnidades(r.data)).catch(() => toast.error('Error al cargar datos'))
    api.get('/contabilidad/dimensiones/departamentos').then(r => setDeptos(r.data)).catch(() => toast.error('Error al cargar datos'))
    api.get('/contabilidad/dimensiones/almacenes').then(r => setAlmacenes(r.data)).catch(() => toast.error('Error al cargar datos'))
  }, [])

  function dimParams() {
    let p = ''
    if (campoId) p += `&campo_id=${campoId}`
    if (unId) p += `&unidad_negocio_id=${unId}`
    if (deptoId) p += `&departamento_id=${deptoId}`
    if (almId) p += `&almacen_id=${almId}`
    return p
  }

  async function generar() {
    setLoading(true)
    setData(null)
    try {
      let url = ''
      if (reporte === 'balance-comprobacion') url = `/contabilidad/balance-comprobacion?anio=${anio}&mes=${mes}${dimParams()}`
      else if (reporte === 'balance-general') url = `/contabilidad/balance-general?anio=${anio}&mes=${mes}${dimParams()}`
      else if (reporte === 'estado-resultados') url = `/contabilidad/estado-resultados?anio=${anio}&mes=${mes}${dimParams()}`
      else if (reporte === 'libro-mayor') {
        url = `/contabilidad/libro-mayor?cuenta_id=${cuentaLM}&limit=500`
        if (lmDesde) url += `&desde=${lmDesde}`
        if (lmHasta) url += `&hasta=${lmHasta}`
        url += dimParams()
      }
      const { data: d } = await api.get(url)
      setData(d)
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error al generar reporte') }
    finally { setLoading(false) }
  }

  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const hasDimFilter = !!(campoId || unId || deptoId || almId)

  function exportarCSV() {
    if (!data) return
    let csv = ''
    const sep = ','
    const q = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`
    if (reporte === 'balance-comprobacion') {
      csv = 'Código,Cuenta,Sumas Debe,Sumas Haber,Saldo Deudor,Saldo Acreedor\n'
      data.forEach((r: any) => { csv += `${q(r.codigo)},${q(r.nombre)},${r.sumas_debe},${r.sumas_haber},${r.saldo_deudor},${r.saldo_acreedor}\n` })
    } else if (reporte === 'balance-general') {
      csv = 'Sección,Código,Cuenta,Saldo\n'
      const flat = (nodes: any[], seccion: string) => {
        nodes?.forEach((n: any) => {
          n.cuentas?.forEach((c: any) => { csv += `${q(seccion)},${q(c.codigo)},${q(c.nombre)},${c.saldo}\n` })
          if (n.hijos) flat(n.hijos, seccion)
        })
      }
      flat(data.activos, 'Activos'); flat(data.pasivos, 'Pasivos'); flat(data.patrimonio, 'Patrimonio')
    } else if (reporte === 'estado-resultados') {
      csv = 'Sección,Código,Cuenta,Monto\n'
      const flat = (nodes: any[], seccion: string) => {
        nodes?.forEach((n: any) => {
          n.cuentas?.forEach((c: any) => { csv += `${q(seccion)},${q(c.codigo)},${q(c.nombre)},${c.monto}\n` })
          if (n.hijos) flat(n.hijos, seccion)
        })
      }
      flat(data.ingresos, 'Ingresos'); flat(data.costos, 'Costos'); flat(data.gastos, 'Gastos')
    } else if (reporte === 'libro-mayor') {
      csv = 'Fecha,Asiento,Descripción,Debe,Haber,Saldo\n'
      data.items?.forEach((m: any) => { csv += `${q(m.fecha)},${q(m.asiento_numero)},${q(m.descripcion)},${m.debe},${m.haber},${m.saldo}\n` })
    }
    const bom = '﻿'
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${reporte}_${anio}-${String(mes).padStart(2, '0')}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
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
          <>
            <select className="select" style={{ width: 280 }} value={cuentaLM} onChange={e => setCuentaLM(e.target.value)}>
              <option value="">Seleccionar cuenta...</option>
              {cuentas.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
            </select>
            <input className="input" type="date" style={{ width: 140 }} value={lmDesde} onChange={e => setLmDesde(e.target.value)} title="Desde" />
            <input className="input" type="date" style={{ width: 140 }} value={lmHasta} onChange={e => setLmHasta(e.target.value)} title="Hasta" />
          </>
        )}
        <button className="btn-secondary" style={{ fontSize: 11, padding: '5px 10px', background: hasDimFilter ? '#dbeafe' : undefined }}
          onClick={() => setShowDimFilters(!showDimFilters)}>
          <Filter size={12} /> Dimensiones {hasDimFilter ? `(${[campoId, unId, deptoId, almId].filter(Boolean).length})` : ''}
        </button>
        <button className="btn-primary" onClick={generar} disabled={loading || (reporte === 'libro-mayor' && !cuentaLM)}>
          {loading ? 'Generando...' : 'Generar'}
        </button>
        {data && <button className="btn-secondary" onClick={exportarCSV} style={{ fontSize: 12 }}><Download size={13} /> Exportar CSV</button>}
        {data && <button className="btn-secondary" onClick={() => window.print()} style={{ fontSize: 12 }}><Download size={13} /> Imprimir / PDF</button>}
      </div>

      {showDimFilters && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap', padding: '8px 12px', background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb' }}>
          <select className="select" style={{ width: 170, fontSize: 12 }} value={campoId} onChange={e => setCampoId(e.target.value)}>
            <option value="">Centro de Costo</option>
            {campos.map((c: any) => <option key={c.id_campo} value={c.id_campo}>{c.nombre || c.id_campo}</option>)}
          </select>
          <select className="select" style={{ width: 170, fontSize: 12 }} value={unId} onChange={e => setUnId(e.target.value)}>
            <option value="">Unidad de Negocio</option>
            {unidades.map((u: any) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>
          <select className="select" style={{ width: 170, fontSize: 12 }} value={deptoId} onChange={e => setDeptoId(e.target.value)}>
            <option value="">Departamento</option>
            {deptos.map((d: any) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>
          <select className="select" style={{ width: 170, fontSize: 12 }} value={almId} onChange={e => setAlmId(e.target.value)}>
            <option value="">Almacén</option>
            {almacenes.map((a: any) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
          {hasDimFilter && (
            <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }}
              onClick={() => { setCampoId(''); setUnId(''); setDeptoId(''); setAlmId('') }}>
              <X size={12} /> Limpiar
            </button>
          )}
        </div>
      )}

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

function TreeNode({ node, indent = 0, valKey = 'saldo' }: any) {
  const pad = 12 + indent * 16
  return (
    <div>
      {(node.es_grupo || (node.hijos && node.hijos.length > 0)) && (
        <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', padding: `6px 0 2px ${pad}px`, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {node.partida}
        </div>
      )}
      {!node.es_grupo && node.cuentas.map((it: any, i: number) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: `3px 0 3px ${pad + 8}px`, borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
          <span><span style={{ fontFamily: 'monospace', color: '#6b7280', marginRight: 8 }}>{it.codigo}</span>{it.nombre}</span>
          <Monto v={it[valKey]} />
        </div>
      ))}
      {node.hijos && node.hijos.map((h: any, hi: number) => (
        <TreeNode key={hi} node={h} indent={indent + 1} valKey={valKey} />
      ))}
      {(node.hijos?.length > 0 || (node.cuentas.length > 0 && node.es_grupo)) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: `3px ${pad}px`, fontSize: 12, fontWeight: 600, color: '#6b7280' }}>
          <span>Subtotal {node.partida}</span>
          <Monto v={node.subtotal} />
        </div>
      )}
    </div>
  )
}

function ReporteBalanceGeneral({ data }) {
  if (!data) return null

  const Section = ({ title, nodes, total, color }: any) => (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color, marginBottom: 8, borderBottom: `2px solid ${color}`, paddingBottom: 4 }}>{title}</h3>
      {nodes.map((n: any, i: number) => <TreeNode key={i} node={n} />)}
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
        <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Periodo: {data.periodo}</p>
        {data.cuadra ? <Badge color="green">Cuadra</Badge> : <Badge color="red">No cuadra</Badge>}
        {data.no_asignadas_count > 0 && <Badge color="yellow">{data.no_asignadas_count} cuenta{data.no_asignadas_count > 1 ? 's' : ''} sin asignar</Badge>}
      </div>
      <Section title="Activos" nodes={data.activos} total={data.total_activos} color="#166534" />
      <Section title="Pasivos" nodes={data.pasivos} total={data.total_pasivos} color="#991b1b" />
      <Section title="Patrimonio" nodes={data.patrimonio} total={data.total_patrimonio} color="#1e40af" />
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: 700, fontSize: 14, borderTop: '3px double #374151', marginTop: 8 }}>
        <span>Pasivos + Patrimonio</span>
        <span style={{ fontFamily: 'monospace' }}>{fmt(data.total_pasivos + data.total_patrimonio)}</span>
      </div>
    </div>
  )
}

function ReporteEstadoResultados({ data }) {
  if (!data) return null

  const SectionNodes = ({ nodes }: any) => (
    <>{nodes.map((n: any, i: number) => <TreeNode key={i} node={n} valKey="monto" />)}</>
  )

  const TotalLine = ({ label, value, bold = false, border = false }: any) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', fontWeight: bold ? 700 : 500, fontSize: 13, borderTop: border ? '2px solid #e5e7eb' : undefined, background: bold ? '#f9fafb' : undefined }}>
      <span>{label}</span>
      <span style={{ fontFamily: 'monospace', color: value < 0 ? '#991b1b' : '#166534' }}>{fmt(value)}</span>
    </div>
  )

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ textAlign: 'center', padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Estado de Resultados</h3>
        <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Periodo: {data.periodo}{data.campo_id ? ` — Campo: ${data.campo_id}` : ''}</p>
        {data.no_asignadas_count > 0 && <Badge color="yellow">{data.no_asignadas_count} sin asignar</Badge>}
      </div>
      <div style={{ padding: '8px 12px', fontWeight: 700, fontSize: 12, color: '#166534', textTransform: 'uppercase', background: '#f0fdf4' }}>Ingresos</div>
      <SectionNodes nodes={data.ingresos} />
      <TotalLine label="Total Ingresos" value={data.total_ingresos} border />
      <div style={{ padding: '8px 12px', fontWeight: 700, fontSize: 12, color: '#854d0e', textTransform: 'uppercase', background: '#fefce8', marginTop: 8 }}>Costos</div>
      <SectionNodes nodes={data.costos} />
      <TotalLine label="Total Costos" value={data.total_costos} border />
      <TotalLine label="Utilidad Bruta" value={data.utilidad_bruta} bold border />
      <div style={{ padding: '8px 12px', fontWeight: 700, fontSize: 12, color: '#991b1b', textTransform: 'uppercase', background: '#fef2f2', marginTop: 8 }}>Gastos</div>
      <SectionNodes nodes={data.gastos} />
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
  const totD = data.items.reduce((s: number, r: any) => s + r.debe, 0)
  const totH = data.items.reduce((s: number, r: any) => s + r.haber, 0)
  const saldoFinal = data.items[data.items.length - 1]?.saldo ?? 0
  return (
    <div className="card" style={{ padding: 0, overflow: 'auto' }}>
      <div style={{ display: 'flex', gap: 16, padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: 12 }}>
        <span style={{ color: '#6b7280' }}>Cuenta: <strong style={{ color: '#0f172a' }}>{data.items[0]?.cuenta_codigo} — {data.items[0]?.cuenta_nombre}</strong></span>
        <span style={{ marginLeft: 'auto', color: '#6b7280' }}>Saldo: <strong style={{ color: saldoFinal < 0 ? '#991b1b' : '#166534', fontFamily: 'monospace' }}>{fmt(saldoFinal)}</strong></span>
      </div>
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
          <tr style={{ fontWeight: 700, borderTop: '2px solid #374151', background: '#f9fafb' }}>
            <td colSpan={3}>Totales</td>
            <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(totD)}</td>
            <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(totH)}</td>
            <td style={{ textAlign: 'right', fontFamily: 'monospace', color: saldoFinal < 0 ? '#991b1b' : '#166534' }}>{fmt(saldoFinal)}</td>
          </tr>
        </tbody>
      </table>
      <p style={{ fontSize: 11, color: '#9ca3af', padding: '8px 12px' }}>{data.total} movimiento{data.total !== 1 ? 's' : ''}{data.total > data.items.length ? ` (mostrando ${data.items.length})` : ''}</p>
    </div>
  )
}

/* ═══════════════════ TAB: Configuración ═══════════════════ */

/* ═══════════════════ TAB: Antigüedad CxP/CxC ═══════════════════ */

function TabAntiguedad() {
  const [tipo, setTipo] = useState<'cxp' | 'cxc'>('cxp')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [bucketFilter, setBucketFilter] = useState('')
  const [vista, setVista] = useState<'detalle' | 'agrupado'>('detalle')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [detailRow, setDetailRow] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { agrupar: vista === 'agrupado' }
      if (search) params.search = search
      if (bucketFilter) params.bucket_filter = bucketFilter
      const { data: d } = await api.get(`/contabilidad/antiguedad-${tipo}`, { params })
      setData(d)
    } catch { toast.error('Error al cargar antigüedad') }
    finally { setLoading(false) }
  }, [tipo, search, bucketFilter, vista])

  useEffect(() => { load() }, [load])

  const BUCKETS = ['corriente', '31-60', '61-90', '91-120', '120+']
  const BUCKET_LABELS: Record<string, string> = { corriente: '0-30', '31-60': '31-60', '61-90': '61-90', '91-120': '91-120', '120+': '120+' }
  const BUCKET_COLORS: Record<string, string> = { corriente: '#166534', '31-60': '#ca8a04', '61-90': '#ea580c', '91-120': '#dc2626', '120+': '#7f1d1d' }
  const BUCKET_BG: Record<string, string> = { corriente: '#dcfce7', '31-60': '#fef9c3', '61-90': '#ffedd5', '91-120': '#fee2e2', '120+': '#fecaca' }

  function toggleGroup(name: string) { setExpanded(prev => ({ ...prev, [name]: !prev[name] })) }

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className={tipo === 'cxp' ? 'btn-primary' : 'btn-secondary'} onClick={() => { setTipo('cxp'); setSearch(''); setBucketFilter(''); setExpanded({}) }}>Cuentas por Pagar</button>
        <button className={tipo === 'cxc' ? 'btn-primary' : 'btn-secondary'} onClick={() => { setTipo('cxc'); setSearch(''); setBucketFilter(''); setExpanded({}) }}>Cuentas por Cobrar</button>
        <div style={{ position: 'relative', marginLeft: 8 }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: 9, color: '#9ca3af' }} />
          <input className="input" placeholder={tipo === 'cxp' ? 'Buscar proveedor...' : 'Buscar cliente...'} value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 28, width: 200 }} />
        </div>
        <select className="select" style={{ width: 140 }} value={bucketFilter} onChange={e => setBucketFilter(e.target.value)}>
          <option value="">Todos los rangos</option>
          {BUCKETS.map(b => <option key={b} value={b}>{BUCKET_LABELS[b]} días</option>)}
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <button className={vista === 'detalle' ? 'btn-primary' : 'btn-secondary'} onClick={() => setVista('detalle')} style={{ fontSize: 11, padding: '4px 10px' }}>Detalle</button>
          <button className={vista === 'agrupado' ? 'btn-primary' : 'btn-secondary'} onClick={() => setVista('agrupado')} style={{ fontSize: 11, padding: '4px 10px' }}>Agrupado</button>
          <button className="btn-secondary" onClick={load} style={{ padding: '4px 8px' }}><RefreshCw size={14} /></button>
        </div>
      </div>

      {loading && <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div>}

      {!loading && data && (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div className="card" style={{ padding: '10px 16px', margin: 0, minWidth: 130 }}>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>SALDO TOTAL</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>RD$ {fmt(data.total)}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>{data.num_documentos} documento{data.num_documentos !== 1 ? 's' : ''}</div>
            </div>
            <div className="card" style={{ padding: '10px 16px', margin: 0, minWidth: 130, borderLeft: '3px solid #dc2626' }}>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>VENCIDO (&gt;30d)</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: '#dc2626' }}>RD$ {fmt(data.total_vencido)}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>{data.total > 0 ? Math.round((data.total_vencido / data.total) * 100) : 0}% del total</div>
            </div>
            <div className="card" style={{ padding: '10px 16px', margin: 0, minWidth: 110 }}>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>PROM. DÍAS</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{data.promedio_dias}</div>
            </div>
          </div>

          {/* Aging Distribution Bar */}
          {data.total > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', height: 28, borderRadius: 6, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                {BUCKETS.map(b => {
                  const pct = data.total > 0 ? (data.resumen[b] / data.total) * 100 : 0
                  if (pct === 0) return null
                  return (
                    <div key={b} onClick={() => setBucketFilter(bucketFilter === b ? '' : b)} style={{
                      width: `${pct}%`, background: BUCKET_BG[b], display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, color: BUCKET_COLORS[b], cursor: 'pointer', minWidth: pct > 5 ? 'auto' : 0,
                      borderRight: '1px solid rgba(255,255,255,0.5)', transition: 'opacity 0.15s',
                      opacity: bucketFilter && bucketFilter !== b ? 0.4 : 1,
                    }} title={`${BUCKET_LABELS[b]} días: RD$ ${fmt(data.resumen[b])} (${Math.round(pct)}%) — ${data.resumen_count[b]} doc.`}>
                      {pct > 8 ? `${BUCKET_LABELS[b]}d` : ''}
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                {BUCKETS.map(b => (
                  <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer', opacity: bucketFilter && bucketFilter !== b ? 0.4 : 1 }} onClick={() => setBucketFilter(bucketFilter === b ? '' : b)}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: BUCKET_BG[b], border: `1px solid ${BUCKET_COLORS[b]}`, display: 'inline-block' }}></span>
                    <span style={{ color: BUCKET_COLORS[b], fontWeight: 600 }}>{BUCKET_LABELS[b]}d:</span>
                    <span style={{ color: '#374151' }}>RD$ {fmt(data.resumen[b])}</span>
                    <span style={{ color: '#9ca3af' }}>({data.resumen_count[b]})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detail View */}
          {vista === 'detalle' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ fontSize: 12 }}>
                <thead><tr>
                  <th>Número</th><th>{tipo === 'cxp' ? 'Proveedor' : 'Cliente'}</th><th>Fecha</th><th>Vencimiento</th>
                  <th style={{ textAlign: 'right' }}>Total</th><th style={{ textAlign: 'right' }}>Saldo</th>
                  <th style={{ textAlign: 'right' }}>Días</th><th>Rango</th><th>Estado</th><th></th>
                </tr></thead>
                <tbody>
                  {data.detalle.length === 0 ? (
                    <tr><td colSpan={10} style={{ textAlign: 'center', color: '#9ca3af', padding: 30 }}>Sin saldos pendientes</td></tr>
                  ) : data.detalle.map((r: any) => (
                    <tr key={r.id} style={{ borderLeft: `3px solid ${BUCKET_COLORS[r.bucket]}` }}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.numero}</td>
                      <td>{tipo === 'cxp' ? r.proveedor : r.cliente}</td>
                      <td style={{ fontSize: 11 }}>{r.fecha_factura || r.fecha}</td>
                      <td style={{ fontSize: 11 }}>{r.fecha_vencimiento || '—'}</td>
                      <td style={{ textAlign: 'right' }}>RD$ {fmt(r.total)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>RD$ {fmt(r.saldo)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: BUCKET_COLORS[r.bucket] }}>{r.dias}</td>
                      <td><span style={{ background: BUCKET_BG[r.bucket], color: BUCKET_COLORS[r.bucket], fontWeight: 700, fontSize: 11, padding: '2px 6px', borderRadius: 4 }}>{BUCKET_LABELS[r.bucket]}d</span></td>
                      <td><Badge color={r.estado === 'parcial' ? 'yellow' : 'gray'}>{r.estado}</Badge></td>
                      <td><button className="btn-icon" title="Ver pagos/cobros" onClick={() => setDetailRow(r)}><Eye size={14} /></button></td>
                    </tr>
                  ))}
                  {data.detalle.length > 0 && (
                    <tr style={{ fontWeight: 700, background: '#f9fafb', borderTop: '2px solid #e5e7eb' }}>
                      <td colSpan={4}>TOTALES ({data.detalle.length} documentos)</td>
                      <td style={{ textAlign: 'right' }}>RD$ {fmt(data.detalle.reduce((s: number, r: any) => s + r.total, 0))}</td>
                      <td style={{ textAlign: 'right' }}>RD$ {fmt(data.total)}</td>
                      <td colSpan={4}></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Grouped View */}
          {vista === 'agrupado' && data.agrupado && (
            <div>
              {data.agrupado.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: '#9ca3af' }}>Sin saldos pendientes</div>
              ) : data.agrupado.map((g: any) => (
                <div key={g.nombre} className="card" style={{ margin: '0 0 8px', padding: 0, overflow: 'hidden' }}>
                  <div onClick={() => toggleGroup(g.nombre)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer', background: expanded[g.nombre] ? '#f9fafb' : 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {expanded[g.nombre] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{g.nombre}</span>
                      <span style={{ fontSize: 11, color: '#6b7280', background: '#f3f4f6', borderRadius: 10, padding: '1px 8px' }}>{g.documentos} doc.</span>
                      <span style={{ background: BUCKET_BG[g.bucket_peor], color: BUCKET_COLORS[g.bucket_peor], fontWeight: 700, fontSize: 11, padding: '2px 6px', borderRadius: 4 }}>máx {g.dias_max}d</span>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>RD$ {fmt(g.saldo_total)}</span>
                  </div>
                  {expanded[g.nombre] && (
                    <div style={{ borderTop: '1px solid #e5e7eb', overflowX: 'auto' }}>
                      <table style={{ fontSize: 12 }}>
                        <thead><tr><th>Número</th><th>Fecha</th><th>Vencimiento</th><th style={{ textAlign: 'right' }}>Total</th><th style={{ textAlign: 'right' }}>Saldo</th><th style={{ textAlign: 'right' }}>Días</th><th>Rango</th><th></th></tr></thead>
                        <tbody>
                          {g.items.map((r: any) => (
                            <tr key={r.id} style={{ borderLeft: `3px solid ${BUCKET_COLORS[r.bucket]}` }}>
                              <td style={{ fontFamily: 'monospace' }}>{r.numero}</td>
                              <td style={{ fontSize: 11 }}>{r.fecha_factura || r.fecha}</td>
                              <td style={{ fontSize: 11 }}>{r.fecha_vencimiento || '—'}</td>
                              <td style={{ textAlign: 'right' }}>RD$ {fmt(r.total)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700 }}>RD$ {fmt(r.saldo)}</td>
                              <td style={{ textAlign: 'right', color: BUCKET_COLORS[r.bucket], fontWeight: 600 }}>{r.dias}</td>
                              <td><span style={{ background: BUCKET_BG[r.bucket], color: BUCKET_COLORS[r.bucket], fontWeight: 700, fontSize: 11, padding: '2px 6px', borderRadius: 4 }}>{BUCKET_LABELS[r.bucket]}d</span></td>
                              <td><button className="btn-icon" onClick={() => setDetailRow(r)}><Eye size={14} /></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Detail Modal - Payment/Collection history */}
          {detailRow && (
            <Modal title={`Documento ${detailRow.numero}`} subtitle={tipo === 'cxp' ? detailRow.proveedor : detailRow.cliente} onClose={() => setDetailRow(null)} width={550}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16, fontSize: 13 }}>
                <div>Fecha: <strong>{detailRow.fecha_factura || detailRow.fecha}</strong></div>
                <div>Vencimiento: <strong>{detailRow.fecha_vencimiento || '—'}</strong></div>
                <div>Total: <strong>RD$ {fmt(detailRow.total)}</strong></div>
                <div>Saldo: <strong style={{ color: '#dc2626' }}>RD$ {fmt(detailRow.saldo)}</strong></div>
                <div>Días: <strong style={{ color: BUCKET_COLORS[detailRow.bucket] }}>{detailRow.dias}</strong></div>
                <div>Estado: <Badge color={detailRow.estado === 'parcial' ? 'yellow' : detailRow.estado === 'pendiente' ? 'red' : 'gray'}>{detailRow.estado}</Badge></div>
              </div>
              {detailRow.total > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Progreso de {tipo === 'cxp' ? 'pago' : 'cobro'}</div>
                  <div style={{ height: 12, background: '#f3f4f6', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, ((detailRow.total - detailRow.saldo) / detailRow.total) * 100)}%`, background: '#166534', borderRadius: 6, transition: 'width 0.3s' }}></div>
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                    RD$ {fmt(detailRow.total - detailRow.saldo)} de RD$ {fmt(detailRow.total)} ({Math.round(((detailRow.total - detailRow.saldo) / detailRow.total) * 100)}%)
                  </div>
                </div>
              )}
              <h4 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 8px' }}>{tipo === 'cxp' ? 'Pagos realizados' : 'Cobros realizados'}</h4>
              <table style={{ fontSize: 12 }}>
                <thead><tr><th>Número</th><th>Fecha</th><th style={{ textAlign: 'right' }}>Monto</th><th>Método</th><th>Referencia</th></tr></thead>
                <tbody>
                  {(tipo === 'cxp' ? detailRow.pagos : detailRow.cobros)?.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: '#9ca3af', padding: 16 }}>Sin {tipo === 'cxp' ? 'pagos' : 'cobros'} registrados</td></tr>
                  ) : (tipo === 'cxp' ? detailRow.pagos : detailRow.cobros)?.map((p: any, i: number) => (
                    <tr key={i}>
                      <td style={{ fontFamily: 'monospace' }}>{p.numero}</td>
                      <td>{p.fecha}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>RD$ {fmt(p.monto)}</td>
                      <td><Badge color="blue">{p.metodo}</Badge></td>
                      <td style={{ fontSize: 11, color: '#6b7280' }}>{p.referencia || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Modal>
          )}
        </>
      )}
    </div>
  )
}


/* ═══════════════════ TAB: Flujo de Efectivo ═══════════════════ */

function TabFlujoEfectivo() {
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function generar() {
    setLoading(true)
    try {
      const { data: d } = await api.get(`/contabilidad/flujo-efectivo?anio=${anio}&mes=${mes}`)
      setData(d)
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
    finally { setLoading(false) }
  }

  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  const Section = ({ title, color, items, total }: any) => (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color, marginBottom: 8, borderBottom: `2px solid ${color}`, paddingBottom: 4 }}>{title}</h3>
      {items.length === 0 ? <p style={{ color: '#9ca3af', fontSize: 12 }}>Sin movimientos</p> : items.map((it: any, i: number) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
          <span><span style={{ fontFamily: 'monospace', color: '#6b7280', marginRight: 8 }}>{it.codigo}</span>{it.nombre}</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 500, color: it.monto < 0 ? '#dc2626' : '#166534' }}>{fmt(it.monto)}</span>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontWeight: 700, fontSize: 13, borderTop: '2px solid #e5e7eb', marginTop: 4 }}>
        <span>Total</span>
        <span style={{ fontFamily: 'monospace', color: total < 0 ? '#dc2626' : '#166534' }}>{fmt(total)}</span>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
        <input className="input" type="number" style={{ width: 80 }} value={anio} onChange={e => setAnio(Number(e.target.value))} />
        <select className="select" style={{ width: 130 }} value={mes} onChange={e => setMes(Number(e.target.value))}>
          {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <button className="btn-primary" onClick={generar} disabled={loading}>{loading ? 'Generando...' : 'Generar'}</button>
      </div>
      {data && (
        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Estado de Flujo de Efectivo</h3>
            <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Período: {data.periodo}</p>
          </div>
          <Section title="Actividades de Operación" color="#166534" items={data.operaciones.items} total={data.operaciones.total} />
          <Section title="Actividades de Inversión" color="#1e40af" items={data.inversion.items} total={data.inversion.total} />
          <Section title="Actividades de Financiamiento" color="#7c3aed" items={data.financiamiento.items} total={data.financiamiento.total} />
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontWeight: 700, fontSize: 15, borderTop: '3px double #374151', marginTop: 8 }}>
            <span>Variación Neta del Efectivo</span>
            <span style={{ fontFamily: 'monospace', color: data.variacion_neta < 0 ? '#dc2626' : '#166534' }}>{fmt(data.variacion_neta)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 14, color: '#374151' }}>
            <span>Saldo Efectivo Actual (Bancos)</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{fmt(data.saldo_efectivo_actual)}</span>
          </div>
          <div style={{ marginTop: 12, textAlign: 'right' }}>
            <button className="btn-secondary" onClick={() => window.print()} style={{ fontSize: 11 }}><Download size={12} /> Imprimir / PDF</button>
          </div>
        </div>
      )}
    </div>
  )
}


/* ═══════════════════ TAB: Asientos Recurrentes ═══════════════════ */

function TabRecurrentes() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [cuentas, setCuentas] = useState<any[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, c] = await Promise.all([api.get('/contabilidad/asientos-recurrentes'), api.get('/contabilidad/cuentas')])
      setItems(r.data)
      setCuentas(c.data.filter((x: any) => x.acepta_movimientos))
    } catch { toast.error('Error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const blank = { nombre: '', descripcion_asiento: '', frecuencia: 'mensual', dia_ejecucion: 1, lineas: [{ cuenta_id: '', descripcion: '', debe: 0, haber: 0 }, { cuenta_id: '', descripcion: '', debe: 0, haber: 0 }] }

  function addLinea() { setEditing({ ...editing, lineas: [...editing.lineas, { cuenta_id: '', descripcion: '', debe: 0, haber: 0 }] }) }
  function removeLinea(i: number) { setEditing({ ...editing, lineas: editing.lineas.filter((_: any, j: number) => j !== i) }) }
  function updateLinea(i: number, field: string, val: any) {
    const lineas = [...editing.lineas]
    lineas[i] = { ...lineas[i], [field]: val }
    setEditing({ ...editing, lineas })
  }

  async function save(e: any) {
    e.preventDefault()
    const payload = { ...editing, lineas: editing.lineas.map((l: any) => ({ cuenta_id: Number(l.cuenta_id), descripcion: l.descripcion, debe: Number(l.debe) || 0, haber: Number(l.haber) || 0 })) }
    try {
      if (editing.id) await api.put(`/contabilidad/asientos-recurrentes/${editing.id}`, payload)
      else await api.post('/contabilidad/asientos-recurrentes', payload)
      toast.success(editing.id ? 'Actualizado' : 'Creado')
      setShowModal(false); load()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
  }

  async function ejecutar(id: number, nombre: string) {
    if (!confirm(`¿Ejecutar "${nombre}"? Se creará un asiento borrador.`)) return
    try {
      const { data } = await api.post(`/contabilidad/asientos-recurrentes/${id}/ejecutar`)
      toast.success(`Asiento ${data.asiento_numero} creado`)
      load()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
  }

  async function del(id: number) {
    if (!confirm('¿Eliminar asiento recurrente?')) return
    try { await api.delete(`/contabilidad/asientos-recurrentes/${id}`); toast.success('Eliminado'); load() }
    catch { toast.error('Error') }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Plantillas de asientos que se pueden ejecutar periódicamente</p>
        <button className="btn-primary" onClick={() => { setEditing({ ...blank }); setShowModal(true) }}><Plus size={14} /> Nuevo</button>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {items.length === 0 ? <div style={{ padding: 30, textAlign: 'center', color: '#9ca3af' }}>Sin asientos recurrentes</div> : items.map((ar: any) => (
          <div key={ar.id} className="card" style={{ margin: 0, padding: '12px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{ar.nombre}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{ar.descripcion_asiento || '—'} · <Badge color="blue">{ar.frecuencia}</Badge> · Día {ar.dia_ejecucion} · RD$ {fmt(ar.total)}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Ejecutado {ar.veces_ejecutado}x {ar.ultima_ejecucion ? `· Última: ${ar.ultima_ejecucion}` : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => ejecutar(ar.id, ar.nombre)}>Ejecutar</button>
                <button className="btn-icon" onClick={() => { setEditing(ar); setShowModal(true) }}><Edit2 size={14} /></button>
                <button className="btn-icon" onClick={() => del(ar.id)}><Trash2 size={14} /></button>
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: 11 }}>
              {ar.lineas.map((l: any, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '2px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontFamily: 'monospace', color: '#6b7280' }}>{l.cuenta_codigo}</span>
                  <span style={{ flex: 1 }}>{l.cuenta_nombre}</span>
                  <span style={{ fontFamily: 'monospace', color: '#166534' }}>{l.debe > 0 ? fmt(l.debe) : ''}</span>
                  <span style={{ fontFamily: 'monospace', color: '#dc2626' }}>{l.haber > 0 ? fmt(l.haber) : ''}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {showModal && editing && (
        <Modal title={editing.id ? 'Editar Recurrente' : 'Nuevo Asiento Recurrente'} onClose={() => setShowModal(false)} width={700}>
          <form onSubmit={save}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><Label>Nombre</Label><input className="input" required value={editing.nombre} onChange={e => setEditing({ ...editing, nombre: e.target.value })} /></div>
              <div><Label>Frecuencia</Label><select className="select" value={editing.frecuencia} onChange={e => setEditing({ ...editing, frecuencia: e.target.value })}><option value="mensual">Mensual</option><option value="quincenal">Quincenal</option><option value="semanal">Semanal</option></select></div>
              <div><Label>Día</Label><input className="input" type="number" min="1" max="31" value={editing.dia_ejecucion} onChange={e => setEditing({ ...editing, dia_ejecucion: Number(e.target.value) })} /></div>
            </div>
            <div style={{ marginBottom: 12 }}><Label>Descripción Asiento</Label><input className="input" value={editing.descripcion_asiento || ''} onChange={e => setEditing({ ...editing, descripcion_asiento: e.target.value })} /></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Label>Líneas</Label>
              <button type="button" className="btn-secondary" style={{ fontSize: 11 }} onClick={addLinea}><Plus size={12} /> Agregar</button>
            </div>
            {editing.lineas.map((l: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                <select className="select" style={{ flex: 2 }} required value={l.cuenta_id} onChange={e => updateLinea(i, 'cuenta_id', e.target.value)}><option value="">Cuenta...</option>{cuentas.map((c: any) => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}</select>
                <input className="input" style={{ flex: 1 }} type="number" step="0.01" placeholder="Debe" value={l.debe || ''} onChange={e => updateLinea(i, 'debe', e.target.value)} />
                <input className="input" style={{ flex: 1 }} type="number" step="0.01" placeholder="Haber" value={l.haber || ''} onChange={e => updateLinea(i, 'haber', e.target.value)} />
                <button type="button" className="btn-icon" onClick={() => removeLinea(i)}><Trash2 size={13} /></button>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button type="submit" className="btn-primary">{editing.id ? 'Guardar' : 'Crear'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}


/* ═══════════════════ TAB: DGII 606/607 ═══════════════════ */

function TabDGII() {
  const [formato, setFormato] = useState<'606' | '607'>('606')
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  async function generar() {
    setLoading(true)
    try {
      const { data: d } = await api.get(`/contabilidad/dgii-${formato}?anio=${anio}&mes=${mes}`)
      setData(d)
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
    finally { setLoading(false) }
  }

  function exportarTXT() {
    if (!data) return
    let txt = ''
    if (formato === '606') {
      txt = `606|${data.rnc_empresa}|${data.periodo}|${data.cantidad_registros}\n`
      data.registros.forEach((r: any) => { txt += `${r.rnc_cedula}|${r.tipo_id}|${r.tipo_bienes_servicios}|${r.ncf}|${r.ncf_modificado}|${r.fecha_comprobante}|${r.fecha_pago}|${r.monto_facturado}|${r.itbis_facturado}|${r.itbis_retenido}|${r.isr_retenido}\n` })
    } else {
      txt = `607|${data.rnc_empresa}|${data.periodo}|${data.cantidad_registros}\n`
      data.registros.forEach((r: any) => { txt += `${r.rnc_cedula}|${r.tipo_id}|${r.ncf}|${r.ncf_modificado}|${r.tipo_ingreso}|${r.fecha_comprobante}|${r.fecha_retencion}|${r.monto_facturado}|${r.itbis_facturado}\n` })
    }
    const blob = new Blob([txt], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${formato}_${data.periodo}.txt`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className={formato === '606' ? 'btn-primary' : 'btn-secondary'} onClick={() => { setFormato('606'); setData(null) }}>606 — Compras</button>
        <button className={formato === '607' ? 'btn-primary' : 'btn-secondary'} onClick={() => { setFormato('607'); setData(null) }}>607 — Ventas</button>
        <input className="input" type="number" style={{ width: 80 }} value={anio} onChange={e => setAnio(Number(e.target.value))} />
        <select className="select" style={{ width: 130 }} value={mes} onChange={e => setMes(Number(e.target.value))}>
          {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <button className="btn-primary" onClick={generar} disabled={loading}>{loading ? 'Generando...' : 'Generar'}</button>
        {data && <button className="btn-secondary" onClick={exportarTXT}><Download size={14} /> Exportar TXT</button>}
      </div>

      {data && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div className="card" style={{ padding: '8px 14px', margin: 0 }}><span style={{ fontSize: 11, color: '#6b7280' }}>RNC Empresa</span><div style={{ fontWeight: 700, fontFamily: 'monospace' }}>{data.rnc_empresa || '—'}</div></div>
            <div className="card" style={{ padding: '8px 14px', margin: 0 }}><span style={{ fontSize: 11, color: '#6b7280' }}>Período</span><div style={{ fontWeight: 700 }}>{data.periodo}</div></div>
            <div className="card" style={{ padding: '8px 14px', margin: 0 }}><span style={{ fontSize: 11, color: '#6b7280' }}>Registros</span><div style={{ fontWeight: 700 }}>{data.cantidad_registros}</div></div>
            <div className="card" style={{ padding: '8px 14px', margin: 0 }}><span style={{ fontSize: 11, color: '#6b7280' }}>Monto Total</span><div style={{ fontWeight: 700 }}>RD$ {fmt(data.total_monto)}</div></div>
            <div className="card" style={{ padding: '8px 14px', margin: 0 }}><span style={{ fontSize: 11, color: '#6b7280' }}>ITBIS Total</span><div style={{ fontWeight: 700 }}>RD$ {fmt(data.total_itbis)}</div></div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ fontSize: 11 }}>
              <thead><tr>
                <th>RNC/Cédula</th><th>NCF</th><th>{formato === '606' ? 'Proveedor' : 'Cliente'}</th>
                <th>Fecha</th><th style={{ textAlign: 'right' }}>Monto</th><th style={{ textAlign: 'right' }}>ITBIS</th>
                {formato === '606' && <th style={{ textAlign: 'right' }}>Ret. ISR</th>}
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr></thead>
              <tbody>
                {data.registros.length === 0 ? (
                  <tr><td colSpan={formato === '606' ? 7 : 6} style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>Sin registros</td></tr>
                ) : data.registros.map((r: any, i: number) => (
                  <tr key={i}>
                    <td style={{ fontFamily: 'monospace' }}>{r.rnc_cedula || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 10 }}>{r.ncf || '—'}</td>
                    <td>{formato === '606' ? r.proveedor : r.cliente}</td>
                    <td>{r.fecha_comprobante}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(r.monto_facturado)}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(r.itbis_facturado)}</td>
                    {formato === '606' && <td style={{ textAlign: 'right' }}>{fmt(r.isr_retenido)}</td>}
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(r.total)}</td>
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


/* ═══════════════════ TAB: Conciliación Bancaria ═══════════════════ */

function TabConciliacion() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [bancos, setBancos] = useState<any[]>([])
  const [periodos, setPeriodos] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [detail, setDetail] = useState<any>(null)

  const TIPOS_PARTIDA = ['cheque_transito', 'deposito_transito', 'nd_banco', 'nc_banco', 'error']

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [c, b, p] = await Promise.all([
        api.get('/contabilidad/conciliaciones'),
        api.get('/efectivo-banco/cuentas'),
        api.get('/contabilidad/periodos'),
      ])
      setItems(c.data)
      setBancos(b.data)
      setPeriodos(p.data)
    } catch { toast.error('Error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function openNew() {
    setEditing({ cuenta_bancaria_id: '', periodo_id: '', saldo_extracto: 0, saldo_libro: 0, partidas: [{ tipo: 'cheque_transito', descripcion: '', monto: 0, referencia: '' }] })
    setShowModal(true)
  }

  function addPartida() { setEditing({ ...editing, partidas: [...editing.partidas, { tipo: 'cheque_transito', descripcion: '', monto: 0, referencia: '' }] }) }
  function removePartida(i: number) { setEditing({ ...editing, partidas: editing.partidas.filter((_: any, j: number) => j !== i) }) }
  function updatePartida(i: number, field: string, val: any) {
    const partidas = [...editing.partidas]
    partidas[i] = { ...partidas[i], [field]: val }
    setEditing({ ...editing, partidas })
  }

  async function save(e: any) {
    e.preventDefault()
    const payload = { ...editing, cuenta_bancaria_id: Number(editing.cuenta_bancaria_id), periodo_id: Number(editing.periodo_id), saldo_extracto: Number(editing.saldo_extracto), saldo_libro: Number(editing.saldo_libro), partidas: editing.partidas.map((p: any) => ({ ...p, monto: Number(p.monto) })) }
    try {
      if (editing.id) await api.put(`/contabilidad/conciliaciones/${editing.id}`, payload)
      else await api.post('/contabilidad/conciliaciones', payload)
      toast.success(editing.id ? 'Actualizada' : 'Creada')
      setShowModal(false); load()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
  }

  async function viewDetail(id: number) {
    try { const { data } = await api.get(`/contabilidad/conciliaciones/${id}`); setDetail(data) }
    catch { toast.error('Error') }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Conciliación de saldos bancarios con libros contables</p>
        <button className="btn-primary" onClick={openNew}><Plus size={14} /> Nueva Conciliación</button>
      </div>
      <table style={{ fontSize: 12 }}>
        <thead><tr><th>Banco</th><th>Período</th><th style={{ textAlign: 'right' }}>Saldo Extracto</th><th style={{ textAlign: 'right' }}>Saldo Libro</th><th style={{ textAlign: 'right' }}>Diferencia</th><th>Estado</th><th>Partidas</th><th></th></tr></thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan={8} style={{ textAlign: 'center', color: '#9ca3af', padding: 30 }}>Sin conciliaciones</td></tr>
          ) : items.map((c: any) => (
            <tr key={c.id}>
              <td>{c.banco}</td>
              <td>{c.periodo}</td>
              <td style={{ textAlign: 'right' }}>RD$ {fmt(c.saldo_extracto)}</td>
              <td style={{ textAlign: 'right' }}>RD$ {fmt(c.saldo_libro)}</td>
              <td style={{ textAlign: 'right', fontWeight: 700, color: Math.abs(c.diferencia) > 0.01 ? '#dc2626' : '#166534' }}>RD$ {fmt(c.diferencia)}</td>
              <td><Badge color={c.estado === 'conciliada' ? 'green' : 'yellow'}>{c.estado}</Badge></td>
              <td style={{ textAlign: 'center' }}>{c.partidas}</td>
              <td><button className="btn-icon" onClick={() => viewDetail(c.id)}><Eye size={14} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && editing && (
        <Modal title={editing.id ? 'Editar Conciliación' : 'Nueva Conciliación'} onClose={() => setShowModal(false)} width={700}>
          <form onSubmit={save}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><Label>Cuenta Bancaria</Label><select className="select" required value={editing.cuenta_bancaria_id} onChange={e => setEditing({ ...editing, cuenta_bancaria_id: e.target.value })}><option value="">Seleccionar...</option>{bancos.map((b: any) => <option key={b.id} value={b.id}>{b.banco} — {b.numero_cuenta}</option>)}</select></div>
              <div><Label>Período</Label><select className="select" required value={editing.periodo_id} onChange={e => setEditing({ ...editing, periodo_id: e.target.value })}><option value="">Seleccionar...</option>{periodos.map((p: any) => <option key={p.id} value={p.id}>{p.mes}/{p.anio}</option>)}</select></div>
              <div><Label>Saldo según Extracto (RD$)</Label><input className="input" type="number" step="0.01" required value={editing.saldo_extracto} onChange={e => setEditing({ ...editing, saldo_extracto: e.target.value })} /></div>
              <div><Label>Saldo según Libros (RD$)</Label><input className="input" type="number" step="0.01" required value={editing.saldo_libro} onChange={e => setEditing({ ...editing, saldo_libro: e.target.value })} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Label>Partidas en Conciliación</Label>
              <button type="button" className="btn-secondary" style={{ fontSize: 11 }} onClick={addPartida}><Plus size={12} /> Agregar</button>
            </div>
            {editing.partidas.map((p: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                <select className="select" style={{ width: 150 }} value={p.tipo} onChange={e => updatePartida(i, 'tipo', e.target.value)}>{TIPOS_PARTIDA.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}</select>
                <input className="input" style={{ flex: 1 }} placeholder="Descripción" value={p.descripcion} onChange={e => updatePartida(i, 'descripcion', e.target.value)} />
                <input className="input" style={{ width: 120 }} type="number" step="0.01" placeholder="Monto" value={p.monto} onChange={e => updatePartida(i, 'monto', e.target.value)} />
                <input className="input" style={{ width: 100 }} placeholder="Ref." value={p.referencia || ''} onChange={e => updatePartida(i, 'referencia', e.target.value)} />
                <button type="button" className="btn-icon" onClick={() => removePartida(i)}><Trash2 size={13} /></button>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button type="submit" className="btn-primary">{editing.id ? 'Guardar' : 'Crear'}</button>
            </div>
          </form>
        </Modal>
      )}

      {detail && (
        <Modal title={`Conciliación: ${detail.banco}`} subtitle={`Período ${detail.periodo}`} onClose={() => setDetail(null)} width={650}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16, fontSize: 13 }}>
            <div>Saldo Extracto: <strong>RD$ {fmt(detail.saldo_extracto)}</strong></div>
            <div>Saldo Libros: <strong>RD$ {fmt(detail.saldo_libro)}</strong></div>
            <div>Diferencia: <strong style={{ color: Math.abs(detail.diferencia) > 0.01 ? '#dc2626' : '#166534' }}>RD$ {fmt(detail.diferencia)}</strong></div>
            <div>Saldo Conciliado: <strong>RD$ {fmt(detail.saldo_conciliado)}</strong></div>
          </div>
          <h4 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 8px' }}>Partidas ({detail.partidas.length})</h4>
          <table style={{ fontSize: 12 }}>
            <thead><tr><th>Tipo</th><th>Descripción</th><th style={{ textAlign: 'right' }}>Monto</th><th>Referencia</th></tr></thead>
            <tbody>
              {detail.partidas.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#9ca3af', padding: 16 }}>Sin partidas</td></tr>
              ) : detail.partidas.map((p: any) => (
                <tr key={p.id}>
                  <td><Badge color="blue">{p.tipo.replace(/_/g, ' ')}</Badge></td>
                  <td>{p.descripcion || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>RD$ {fmt(p.monto)}</td>
                  <td style={{ fontSize: 11, color: '#6b7280' }}>{p.referencia || '—'}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 700, background: '#f9fafb' }}>
                <td colSpan={2}>Total Partidas</td>
                <td style={{ textAlign: 'right' }}>RD$ {fmt(detail.total_partidas)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </Modal>
      )}
    </div>
  )
}



/* ═══════════════════ TAB: FSV — Editor de Estados Financieros ═══════════════════ */

function TabFSV() {
  const [estado, setEstado] = useState<'balance_general' | 'estado_resultados'>('balance_general')
  const [arbol, setArbol] = useState<any[]>([])
  const [noAsignadas, setNoAsignadas] = useState<any[]>([])
  const [allPartidas, setAllPartidas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [showModal, setShowModal] = useState(false)
  const [editForm, setEditForm] = useState<any>(null)
  const [filterNA, setFilterNA] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [treeRes, flatRes] = await Promise.all([
        api.get(`/contabilidad/partidas/arbol?estado=${estado}`),
        api.get(`/contabilidad/partidas?estado=${estado}`)
      ])
      setArbol(treeRes.data.arbol)
      setNoAsignadas(treeRes.data.no_asignadas)
      setAllPartidas(flatRes.data)
      const ids = new Set<number>()
      const collectIds = (nodes: any[]) => nodes.forEach(n => { ids.add(n.id); if (n.hijos) collectIds(n.hijos) })
      collectIds(treeRes.data.arbol)
      setExpanded(ids)
    } catch { toast.error('Error al cargar estructura') }
    finally { setLoading(false) }
  }, [estado])

  useEffect(() => { load(); setSelected(null) }, [load])

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const openNew = (padreId: number | null = null) => {
    const clasDefault = estado === 'balance_general' ? 'activo_corriente' : 'ingresos'
    setEditForm({ nombre: '', estado, clasificacion: clasDefault, padre_id: padreId, orden: 0, invertir_signo: false, es_grupo: false })
    setShowModal(true)
  }

  const openEdit = (node: any) => {
    const flat = allPartidas.find(p => p.id === node.id)
    if (flat) { setEditForm({ ...flat }); setShowModal(true) }
  }

  const deleteNode = async (node: any) => {
    if (!confirm(`¿Eliminar "${node.nombre}"?`)) return
    try { await api.delete(`/contabilidad/partidas/${node.id}`); toast.success('Eliminada'); if (selected?.id === node.id) setSelected(null); load() }
    catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
  }

  const assignCuenta = async (cuentaId: number, partidaId: number) => {
    try { await api.patch(`/contabilidad/cuentas/${cuentaId}/partida`, { partida_id: partidaId }); toast.success('Cuenta asignada'); load() }
    catch { toast.error('Error al asignar') }
  }

  const unassignCuenta = async (cuentaId: number) => {
    try { await api.patch(`/contabilidad/cuentas/${cuentaId}/partida`, { partida_id: null }); toast.success('Cuenta desasignada'); load() }
    catch { toast.error('Error al desasignar') }
  }

  const seedEstructura = async () => {
    const yaExiste = allPartidas.length > 0
    if (yaExiste && !confirm('Ya existe una estructura. ¿Reemplazarla por la estándar? Se perderán los nodos actuales y se reasignarán las cuentas.')) return
    try {
      const r = await api.post(`/contabilidad/partidas/seed-estructura?estado=${estado}&reemplazar=${yaExiste}`)
      toast.success(`Estructura creada: ${r.data.nodos_creados} nodos, ${r.data.cuentas_asignadas} cuentas asignadas`)
      load()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error al generar estructura') }
  }

  const clasificaciones = estado === 'balance_general'
    ? ['activo_corriente', 'activo_no_corriente', 'pasivo_corriente', 'pasivo_no_corriente', 'patrimonio']
    : ['ingresos', 'costos', 'gastos']

  const renderNode = (node: any, depth: number = 0): any => {
    const isExpanded = expanded.has(node.id)
    const isSelected = selected?.id === node.id
    const hasChildren = node.hijos && node.hijos.length > 0
    const cuentaCount = (node.cuentas?.length || 0)
    const childCount = (node.hijos?.length || 0)

    return (
      <div key={node.id}>
        <div
          onClick={() => setSelected(node)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: `5px 8px 5px ${12 + depth * 20}px`,
            cursor: 'pointer', fontSize: 13,
            background: isSelected ? '#dbeafe' : 'transparent',
            borderLeft: isSelected ? '3px solid #2563eb' : '3px solid transparent',
            borderBottom: '1px solid #f3f4f6',
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#f9fafb' }}
          onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <span onClick={e => { e.stopPropagation(); toggleExpand(node.id) }} style={{ cursor: 'pointer', width: 16, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            {(hasChildren || node.es_grupo) ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span style={{ width: 14 }} />}
          </span>
          <span style={{ fontWeight: node.es_grupo ? 700 : 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.nombre}
          </span>
          <span style={{ fontSize: 10, color: '#9ca3af', flexShrink: 0 }}>
            {cuentaCount > 0 && <Badge color="blue">{cuentaCount}</Badge>}
            {childCount > 0 && <span style={{ marginLeft: 4 }}><Badge color="gray">{childCount} sub</Badge></span>}
          </span>
        </div>
        {isExpanded && hasChildren && node.hijos.map((h: any) => renderNode(h, depth + 1))}
      </div>
    )
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div>

  const filteredNA = noAsignadas.filter(c =>
    !filterNA || c.codigo.includes(filterNA) || c.nombre.toLowerCase().includes(filterNA.toLowerCase())
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Versión de Estado Financiero (FSV)</h3>
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 2 }}>
            {(['balance_general', 'estado_resultados'] as const).map(e => (
              <button key={e} onClick={() => setEstado(e)} style={{
                padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: estado === e ? '#fff' : 'transparent', color: estado === e ? '#111827' : '#6b7280',
                boxShadow: estado === e ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s',
              }}>
                {e === 'balance_general' ? 'Balance General' : 'Estado de Resultados'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" style={{ fontSize: 11 }} onClick={() => load()}><RefreshCw size={12} /> Recargar</button>
          <button className="btn-secondary" style={{ fontSize: 11 }} onClick={seedEstructura}><FileText size={12} /> Estructura estándar</button>
          <button className="btn-primary" style={{ fontSize: 11 }} onClick={() => openNew(null)}><Plus size={12} /> Nodo Raíz</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, minHeight: 500 }}>
        {/* LEFT: Tree */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 12px', borderBottom: '2px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
              Estructura del {estado === 'balance_general' ? 'Balance General' : 'Estado de Resultados'}
            </span>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{allPartidas.length} nodos</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            {arbol.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                <p style={{ marginBottom: 16 }}>Sin estructura definida.</p>
                <button className="btn-primary" style={{ fontSize: 12 }} onClick={seedEstructura}>
                  <FileText size={13} /> Generar estructura estándar
                </button>
                <p style={{ marginTop: 12, fontSize: 11 }}>
                  Crea la estructura completa del {estado === 'balance_general' ? 'Balance General' : 'Estado de Resultados'} y asigna las cuentas del catálogo automáticamente.
                </p>
              </div>
            ) : arbol.map(n => renderNode(n))}
          </div>
          {noAsignadas.length > 0 && (
            <div style={{ padding: '8px 12px', borderTop: '2px solid #fef9c3', background: '#fffbeb', fontSize: 12, color: '#92400e' }}>
              ⚠ {noAsignadas.length} cuenta{noAsignadas.length > 1 ? 's' : ''} sin asignar a partida
            </div>
          )}
        </div>

        {/* RIGHT: Detail panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Node detail */}
          {selected ? (
            <div className="card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{selected.nombre}</h4>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <Badge color="blue">{selected.clasificacion?.replace(/_/g, ' ')}</Badge>
                    {selected.es_grupo && <Badge color="gray">Grupo</Badge>}
                    {selected.invertir_signo && <Badge color="yellow">± Signo</Badge>}
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>Orden: {selected.orden}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn-secondary" style={{ fontSize: 11 }} onClick={() => openNew(selected.id)}><Plus size={11} /> Hijo</button>
                  <button className="btn-secondary" style={{ fontSize: 11 }} onClick={() => openEdit(selected)}><Edit2 size={11} /> Editar</button>
                  <button className="btn-secondary" style={{ fontSize: 11, color: '#991b1b' }} onClick={() => deleteNode(selected)}><Trash2 size={11} /></button>
                </div>
              </div>

              {/* Cuentas asignadas */}
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase' }}>
                Cuentas asignadas ({selected.cuentas?.length || 0})
              </div>
              <div style={{ flex: 1, overflow: 'auto', minHeight: 0, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                {(!selected.cuentas || selected.cuentas.length === 0) ? (
                  <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>
                    {selected.es_grupo ? 'Nodo grupo — las cuentas se asignan a nodos hijos' : 'Sin cuentas asignadas. Arrastra desde "Sin asignar" o usa el botón.'}
                  </div>
                ) : selected.cuentas.map((c: any) => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 10px', borderBottom: '1px solid #f3f4f6', fontSize: 12 }}>
                    <span>
                      <span style={{ fontFamily: 'monospace', color: '#6b7280', marginRight: 6 }}>{c.codigo}</span>
                      {c.nombre}
                      <Badge color="gray" style={{ marginLeft: 6 }}>{c.tipo}</Badge>
                    </span>
                    <button className="btn-icon" title="Desasignar" onClick={() => unassignCuenta(c.id)} style={{ color: '#991b1b' }}><X size={13} /></button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
              Selecciona un nodo del árbol para ver sus propiedades y cuentas asignadas
            </div>
          )}

          {/* Unassigned accounts */}
          <div className="card" style={{ maxHeight: 280, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#92400e' }}>
                Cuentas sin asignar ({noAsignadas.length})
              </h4>
              {noAsignadas.length > 5 && (
                <input className="input" placeholder="Filtrar..." value={filterNA} onChange={e => setFilterNA(e.target.value)}
                  style={{ width: 160, fontSize: 11, padding: '4px 8px' }} />
              )}
            </div>
            <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
              {filteredNA.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>
                  {noAsignadas.length === 0 ? 'Todas las cuentas están asignadas' : 'Sin resultados'}
                </div>
              ) : filteredNA.map((c: any) => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', borderBottom: '1px solid #f3f4f6', fontSize: 12 }}>
                  <span>
                    <span style={{ fontFamily: 'monospace', color: '#6b7280', marginRight: 6 }}>{c.codigo}</span>
                    {c.nombre}
                    <Badge color="gray" style={{ marginLeft: 6 }}>{c.tipo}</Badge>
                  </span>
                  {selected && !selected.es_grupo && (
                    <button className="btn-secondary" style={{ fontSize: 10, padding: '2px 8px' }}
                      onClick={() => assignCuenta(c.id, selected.id)}>
                      <Plus size={10} /> Asignar
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal crear/editar nodo */}
      {showModal && editForm && (
        <Modal title={editForm.id ? 'Editar Nodo' : 'Nuevo Nodo'} onClose={() => setShowModal(false)} width={500}>
          <form onSubmit={async (e: any) => {
            e.preventDefault()
            const payload = {
              nombre: editForm.nombre, estado: editForm.estado, clasificacion: editForm.clasificacion,
              orden: Number(editForm.orden), padre_id: editForm.padre_id || null,
              invertir_signo: !!editForm.invertir_signo, es_grupo: !!editForm.es_grupo
            }
            try {
              if (editForm.id) await api.put(`/contabilidad/partidas/${editForm.id}`, payload)
              else await api.post('/contabilidad/partidas', payload)
              toast.success(editForm.id ? 'Nodo actualizado' : 'Nodo creado')
              setShowModal(false); load()
            } catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
          }}>
            <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
              <div><Label>Nombre</Label><input className="input" required value={editForm.nombre} onChange={e => setEditForm({ ...editForm, nombre: e.target.value })} placeholder="Ej: Activos Corrientes, Efectivo y Equivalentes..." /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><Label>Clasificación</Label><select className="select" value={editForm.clasificacion} onChange={e => setEditForm({ ...editForm, clasificacion: e.target.value })}>
                  {clasificaciones.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                </select></div>
                <div><Label>Nodo padre</Label><select className="select" value={editForm.padre_id || ''} onChange={e => setEditForm({ ...editForm, padre_id: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">(Raíz)</option>
                  {allPartidas.filter(p => p.id !== editForm.id).map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><Label>Orden (posición)</Label><input className="input" type="number" value={editForm.orden} onChange={e => setEditForm({ ...editForm, orden: e.target.value })} /></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 22 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!editForm.es_grupo} onChange={e => setEditForm({ ...editForm, es_grupo: e.target.checked })} />
                    Es grupo (agrupa nodos hijos)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!editForm.invertir_signo} onChange={e => setEditForm({ ...editForm, invertir_signo: e.target.checked })} />
                    Invertir signo
                  </label>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button type="submit" className="btn-primary">{editForm.id ? 'Guardar' : 'Crear'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}


/* ═══════════════════ TAB: Diarios Contables ═══════════════════ */

function TabDiarios() {
  const [diarios, setDiarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<any>(null)
  const [cuentas, setCuentas] = useState<any[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/contabilidad/diarios')
      setDiarios(data)
    } catch { toast.error('Error al cargar diarios') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    api.get('/contabilidad/cuentas').then(r => setCuentas(r.data.filter(c => c.acepta_movimientos))).catch(() => toast.error('Error al cargar datos'))
  }, [])

  async function guardar(e) {
    e.preventDefault()
    try {
      if (editando.id) {
        await api.put(`/contabilidad/diarios/${editando.id}`, editando)
      } else {
        await api.post('/contabilidad/diarios', editando)
      }
      toast.success('Diario guardado')
      setEditando(null)
      load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  async function eliminar(id: number) {
    if (!confirm('¿Eliminar este diario?')) return
    try { await api.delete(`/contabilidad/diarios/${id}`); toast.success('Eliminado'); load() }
    catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>Diarios (libros) contables — cada asiento se registra en un diario según su origen.</p>
        <button className="btn-primary" onClick={() => setEditando({ codigo: '', nombre: '', tipo: '', cuenta_default_id: '', activo: true })}><Plus size={14} /> Nuevo Diario</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Cuenta Default</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Cargando...</td></tr>
            ) : diarios.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Sin diarios</td></tr>
            ) : diarios.map(d => (
              <tr key={d.id}>
                <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{d.codigo}</td>
                <td>{d.nombre}</td>
                <td style={{ fontSize: 12, color: '#6b7280' }}>{d.tipo || '—'}</td>
                <td style={{ fontSize: 12 }}>
                  {d.cuenta_default_id ? cuentas.find(c => c.id === d.cuenta_default_id)?.codigo || d.cuenta_default_id : '—'}
                </td>
                <td><Badge color={d.activo ? 'green' : 'red'}>{d.activo ? 'Activo' : 'Inactivo'}</Badge></td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-secondary" style={{ padding: '4px 6px' }} onClick={() => setEditando({ ...d })}><Edit2 size={12} /></button>
                    <button className="btn-danger" style={{ padding: '4px 6px' }} onClick={() => eliminar(d.id)}><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editando && (
        <Modal title={editando.id ? 'Editar Diario' : 'Nuevo Diario'} onClose={() => setEditando(null)} width={500}>
          <form onSubmit={guardar}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <Label>Código *</Label>
                <input className="input" value={editando.codigo} onChange={e => setEditando({ ...editando, codigo: e.target.value.toUpperCase() })} required maxLength={10} />
              </div>
              <div>
                <Label>Tipo</Label>
                <select className="select" value={editando.tipo} onChange={e => setEditando({ ...editando, tipo: e.target.value })}>
                  <option value="">— Sin tipo —</option>
                  <option value="compras">Compras</option>
                  <option value="ventas">Ventas</option>
                  <option value="banco">Banco</option>
                  <option value="nomina">Nómina</option>
                  <option value="ajuste">Ajuste</option>
                  <option value="operaciones">Operaciones</option>
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <Label>Nombre *</Label>
                <input className="input" value={editando.nombre} onChange={e => setEditando({ ...editando, nombre: e.target.value })} required />
              </div>
              <div>
                <Label>Cuenta Default</Label>
                <select className="select" value={editando.cuenta_default_id || ''} onChange={e => setEditando({ ...editando, cuenta_default_id: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">— Ninguna —</option>
                  {cuentas.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'end', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={editando.activo} onChange={e => setEditando({ ...editando, activo: e.target.checked })} />
                  Activo
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn-secondary" onClick={() => setEditando(null)}>Cancelar</button>
              <button type="submit" className="btn-primary">Guardar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}


function TabConfig() {
  const [reglas, setReglas] = useState([])
  const [loading, setLoading] = useState(true)
  const [cuentas, setCuentas] = useState<any[]>([])
  const [showReglaModal, setShowReglaModal] = useState(false)
  const [editingRegla, setEditingRegla] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, c] = await Promise.all([
        api.get('/contabilidad/reglas'),
        api.get('/contabilidad/cuentas'),
      ])
      setReglas(r.data)
      setCuentas(c.data.filter((x: any) => x.acepta_movimientos))
    } catch { toast.error('Error al cargar configuración') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div>

  return (
    <div>
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

/* ═══════════════════ TAB: Dimensiones Financieras ═══════════════════ */

type DimType = 'unidades-negocio' | 'departamentos' | 'almacenes' | 'campos'

const DIM_SECTIONS: { key: DimType; label: string; fields: string[]; apiBase?: string; idField?: string }[] = [
  { key: 'unidades-negocio', label: 'Unidades de Negocio', fields: ['codigo', 'nombre', 'descripcion'] },
  { key: 'departamentos', label: 'Departamentos', fields: ['codigo', 'nombre', 'descripcion'] },
  { key: 'almacenes', label: 'Almacenes', fields: ['codigo', 'nombre', 'ubicacion'] },
  { key: 'campos', label: 'Centros de Costo', fields: ['id_campo', 'nombre', 'ubicacion', 'hectareas'], apiBase: '/campos', idField: 'id_campo' },
]

function TabDimensiones() {
  const [data, setData] = useState<Record<DimType, any[]>>({ 'unidades-negocio': [], departamentos: [], almacenes: [], campos: [] })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editType, setEditType] = useState<DimType>('unidades-negocio')
  const [editing, setEditing] = useState<any>(null)

  function apiUrl(type: DimType) {
    const sec = DIM_SECTIONS.find(s => s.key === type)
    return sec?.apiBase || `/contabilidad/${type}`
  }

  function idField(type: DimType) {
    const sec = DIM_SECTIONS.find(s => s.key === type)
    return sec?.idField || 'id'
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [un, dep, alm, cam] = await Promise.all([
        api.get('/contabilidad/unidades-negocio'),
        api.get('/contabilidad/departamentos'),
        api.get('/contabilidad/almacenes'),
        api.get('/campos'),
      ])
      setData({ 'unidades-negocio': un.data, departamentos: dep.data, almacenes: alm.data, campos: cam.data })
    } catch { toast.error('Error cargando dimensiones') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openNew = (type: DimType) => {
    setEditType(type)
    const section = DIM_SECTIONS.find(s => s.key === type)!
    const blank: any = { activo: true }
    section.fields.forEach(f => blank[f] = '')
    setEditing(blank)
    setShowModal(true)
  }

  const openEdit = (type: DimType, item: any) => {
    setEditType(type)
    setEditing({ ...item })
    setShowModal(true)
  }

  const handleSave = async (e: any) => {
    e.preventDefault()
    const base = apiUrl(editType)
    const idf = idField(editType)
    try {
      if (editing[idf]) await api.put(`${base}/${editing[idf]}`, editing)
      else await api.post(base, editing)
      toast.success(editing[idf] ? 'Actualizado' : 'Creado')
      setShowModal(false); load()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
  }

  const handleDelete = async (type: DimType, itemId: string | number) => {
    if (!confirm('¿Eliminar este registro?')) return
    try { await api.delete(`${apiUrl(type)}/${itemId}`); toast.success('Eliminado'); load() }
    catch (err: any) { toast.error(err.response?.data?.detail || 'Error al eliminar') }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div>

  const section = DIM_SECTIONS.find(s => s.key === editType)!

  return (
    <div>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
        Gestione las dimensiones analíticas para clasificar asientos, presupuestos, compras e inventario.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16 }}>
        {DIM_SECTIONS.map(sec => (
          <div key={sec.key} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{sec.label}</h3>
              <button className="btn-primary" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => openNew(sec.key)}><Plus size={12} /> Nuevo</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Código</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Nombre</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Estado</th>
                  <th style={{ padding: '6px 4px', borderBottom: '1px solid #e5e7eb' }}></th>
                </tr>
              </thead>
              <tbody>
                {data[sec.key].length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20, color: '#9ca3af' }}>Sin registros</td></tr>
                ) : data[sec.key].map((item: any) => {
                  const idf = idField(sec.key)
                  const codeField = sec.fields[0]
                  return (
                    <tr key={item[idf]} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontSize: 11 }}>{item[codeField]}</td>
                      <td style={{ padding: '6px 8px' }}>{item.nombre}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: item.activo !== false ? '#dcfce7' : '#fee2e2', color: item.activo !== false ? '#166534' : '#991b1b' }}>
                          {item.activo !== false ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={{ padding: '6px 4px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', padding: 3 }} onClick={() => openEdit(sec.key, item)}><Edit2 size={13} /></button>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 3 }} onClick={() => handleDelete(sec.key, item[idf])}><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {showModal && editing && (
        <Modal title={`${editing.id ? 'Editar' : 'Nuevo'} — ${section.label}`} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave}>
            {section.fields.map(f => (
              <div key={f} style={{ marginBottom: 12 }}>
                <Label>{f.replace(/_/g, ' ')}</Label>
                <input className="input" value={editing[f] || ''} onChange={e => setEditing({ ...editing, [f]: e.target.value })} required={f === 'codigo' || f === 'nombre'} />
              </div>
            ))}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={editing.activo} onChange={e => setEditing({ ...editing, activo: e.target.checked })} />
                Activo
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button type="submit" className="btn-primary">{editing.id ? 'Guardar' : 'Crear'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

/* ═══════════════════ TRAZABILIDAD ═══════════════════ */

const ORIGEN_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'OT', label: 'Orden de Trabajo' },
  { value: 'OC', label: 'Orden de Compra' },
  { value: 'GR', label: 'Entrada Mercancía' },
  { value: 'GI', label: 'Salida Mercancía' },
  { value: 'AJ', label: 'Ajuste Inventario' },
  { value: 'NOM', label: 'Nómina' },
  { value: 'CXP', label: 'Cuenta por Pagar' },
  { value: 'PAG', label: 'Pago' },
  { value: 'VTA', label: 'Venta/CxC' },
  { value: 'COB', label: 'Cobro' },
  { value: 'DEP', label: 'Depreciación' },
]

function TabTrazabilidad() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filtroOrigen, setFiltroOrigen] = useState('')
  const [filtroRef, setFiltroRef] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (filtroOrigen) params.origen = filtroOrigen
      if (filtroRef) params.referencia = filtroRef
      const res = await api.get('/contabilidad/trazabilidad', { params })
      setItems(res.data.items || [])
    } catch { toast.error('Error cargando trazabilidad') }
    finally { setLoading(false) }
  }, [filtroOrigen, filtroRef])

  useEffect(() => { cargar() }, [cargar])

  const origenColor = (o: string) => {
    const map: Record<string, string> = {
      OT: 'blue', OC: 'yellow', GR: 'green', GI: 'red', AJ: 'yellow',
      NOM: 'blue', CXP: 'red', PAG: 'red', VTA: 'green', COB: 'green', DEP: 'gray',
    }
    return map[o] || 'gray'
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
        Rastreo completo de documentos ↔ asientos contables. Vea qué generó cada asiento y navegue al documento fuente.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="input" style={{ width: 180, fontSize: 12 }} value={filtroOrigen} onChange={e => setFiltroOrigen(e.target.value)}>
          {ORIGEN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 300 }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: 9, color: '#9ca3af' }} />
          <input className="input" placeholder="Buscar referencia..." style={{ paddingLeft: 28, fontSize: 12 }}
            value={filtroRef} onChange={e => setFiltroRef(e.target.value)} />
        </div>
        <button className="btn-secondary" onClick={cargar} style={{ fontSize: 11, padding: '6px 12px' }}>
          <RefreshCw size={12} /> Actualizar
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div>
      ) : items.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No se encontraron asientos automáticos</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(item => (
            <div key={item.asiento_id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div
                onClick={() => setExpanded(expanded === item.asiento_id ? null : item.asiento_id)}
                style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, background: expanded === item.asiento_id ? '#f9fafb' : 'white' }}
              >
                {expanded === item.asiento_id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Badge color={origenColor(item.origen)}>{item.origen}</Badge>
                <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#2563eb' }}>{item.asiento_numero}</span>
                <span style={{ fontSize: 12, color: '#374151', flex: 1 }}>{item.descripcion}</span>
                <span style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>{item.fecha}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>RD$ {fmt(item.total_debe)}</span>
              </div>

              {expanded === item.asiento_id && (
                <div style={{ borderTop: '1px solid #e5e7eb', padding: '12px 16px', background: '#fafbfc' }}>
                  <div style={{ display: 'flex', gap: 20, marginBottom: 12, flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Origen</span>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{item.origen_label}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Referencia</span>
                      <div style={{ fontSize: 13, fontFamily: 'monospace' }}>{item.referencia_id || '—'}</div>
                    </div>
                    {item.documento && (
                      <div>
                        <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Documento</span>
                        <div style={{ fontSize: 13 }}>
                          {item.documento.tipo === 'OT' && `OT #${item.documento.id} — ${item.documento.actividad} (${item.documento.estado})`}
                          {item.documento.tipo === 'OC' && `${item.documento.id} — ${item.documento.proveedor} (${item.documento.estado})`}
                          {['GR','GI','AJ'].includes(item.documento.tipo) && `${item.documento.num_documento} — ${item.documento.producto_nombre} (${item.documento.cantidad} uds)`}
                          {item.documento.tipo === 'NOM' && `Nómina ${item.documento.fecha_inicio} → ${item.documento.fecha_fin} (${item.documento.estado})`}
                          {item.documento.tipo === 'CXP' && `${item.documento.numero} — ${item.documento.proveedor} (${item.documento.estado})`}
                          {item.documento.tipo === 'PAG' && `${item.documento.numero} — RD$ ${fmt(item.documento.monto)}`}
                          {item.documento.tipo === 'COB' && `${item.documento.numero} — RD$ ${fmt(item.documento.monto)}`}
                        </div>
                      </div>
                    )}
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#f3f4f6' }}>
                        <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Cuenta</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Descripción</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Dimensiones</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Debe</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Haber</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.lineas.map((l: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '6px 8px' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{l.cuenta_codigo}</span>
                            <span style={{ marginLeft: 6, color: '#6b7280', fontSize: 11 }}>{l.cuenta_nombre}</span>
                          </td>
                          <td style={{ padding: '6px 8px', color: '#374151', fontSize: 11 }}>{l.descripcion_linea || '—'}</td>
                          <td style={{ padding: '6px 8px', fontSize: 10, color: '#6b7280' }}>
                            {[l.unidad_negocio, l.departamento, l.almacen].filter(Boolean).join(' · ') || '—'}
                          </td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{l.debe > 0 ? fmt(l.debe) : ''}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{l.haber > 0 ? fmt(l.haber) : ''}</td>
                        </tr>
                      ))}
                      <tr style={{ background: '#f9fafb', fontWeight: 700, borderTop: '2px solid #e5e7eb' }}>
                        <td colSpan={3} style={{ padding: '6px 8px', textAlign: 'right' }}>Totales</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(item.total_debe)}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(item.total_haber)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════ MAIN PAGE ═══════════════════ */

export default function Contabilidad() {
  const [tab, setTab] = useState('dashboard')

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#111827' }}>
          <BookOpen size={22} style={{ verticalAlign: 'text-bottom', marginRight: 8 }} />
          Contabilidad
        </h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>Plan de cuentas, asientos contables, períodos y reportes financieros</p>
      </div>

      <div style={{ overflowX: 'auto', borderBottom: '2px solid #e5e7eb', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 2, minWidth: 'max-content' }}>
          {TABS.map(t => (
            <button key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '10px 14px',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: tab === t.key ? '2px solid #166534' : '2px solid transparent',
                marginBottom: -2, fontWeight: tab === t.key ? 700 : 400,
                color: tab === t.key ? '#166534' : '#6b7280', fontSize: 13,
                transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}>
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'dashboard' && <TabDashboard />}
      {tab === 'cuentas' && <TabCuentas />}
      {tab === 'asientos' && <TabAsientos />}
      {tab === 'periodos' && <TabPeriodos />}
      {tab === 'reportes' && <TabReportes />}
      {tab === 'antiguedad' && <TabAntiguedad />}
      {tab === 'flujo' && <TabFlujoEfectivo />}
      {tab === 'recurrentes' && <TabRecurrentes />}
      {tab === 'dgii' && <TabDGII />}
      {tab === 'conciliacion' && <TabConciliacion />}
      {tab === 'fsv' && <TabFSV />}
      {tab === 'diarios' && <TabDiarios />}
      {tab === 'dimensiones' && <TabDimensiones />}
      {tab === 'trazabilidad' && <TabTrazabilidad />}
      {tab === 'config' && <TabConfig />}
    </div>
  )
}
