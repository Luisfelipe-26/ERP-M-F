import { useEffect, useState, useCallback, useMemo } from 'react'
import api from '../api'
import toast from 'react-hot-toast'
import {
  PiggyBank, Plus, Trash2, X, RefreshCw, Save, Download,
  Table2, Gauge, CheckCircle2, AlertTriangle, AlertOctagon,
  Copy, Search, ChevronDown, ChevronRight,
  ChevronsDown, ChevronsRight, TrendingUp, Undo2, Settings, FileText,
  XCircle, BarChart3, Percent, Shield, Clock, Hash, Layers, Pencil, Filter
} from 'lucide-react'

/* ═══════════════════════════════ constants ═══════════════════════════════ */
const fmt = (n: any) => Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmt0 = (n: any) => Number(n || 0).toLocaleString('es-DO', { maximumFractionDigits: 0 })
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const MK = ['monto_ene','monto_feb','monto_mar','monto_abr','monto_may','monto_jun','monto_jul','monto_ago','monto_sep','monto_oct','monto_nov','monto_dic']
const TRIMS = [{label:'T1',m:[0,1,2]},{label:'T2',m:[3,4,5]},{label:'T3',m:[6,7,8]},{label:'T4',m:[9,10,11]}]

const DIST_KEYS: Record<string, { label: string; desc: string; months: number[] }> = {
  mensual:    { label: 'Mensual',    desc: '12 períodos iguales',               months: [0,1,2,3,4,5,6,7,8,9,10,11] },
  bimensual:  { label: 'Bimensual',  desc: '6 períodos cada 2 meses',           months: [0,2,4,6,8,10] },
  trimestral: { label: 'Trimestral', desc: '4 períodos cada 3 meses',           months: [0,3,6,9] },
  semestral:  { label: 'Semestral',  desc: '2 períodos cada 6 meses',           months: [0,6] },
  anual:      { label: 'Anual',      desc: 'Un solo período al inicio del año', months: [0] },
}

function distribuir(total: number, clave: string): number[] {
  const dk = DIST_KEYS[clave] || DIST_KEYS.mensual
  const n = dk.months.length
  const perPeriod = Math.round((total / n) * 100) / 100
  const vals = Array(12).fill(0)
  dk.months.forEach((m, i) => {
    vals[m] = i === n - 1 ? Math.round((total - perPeriod * (n - 1)) * 100) / 100 : perPeriod
  })
  return vals
}

const TIPO_LABELS: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  original:      { label: 'Original',      color: '#1e40af', bg: '#dbeafe', icon: '📋' },
  adicion:       { label: 'Adición',       color: '#166534', bg: '#dcfce7', icon: '➕' },
  transferencia: { label: 'Transferencia', color: '#7c3aed', bg: '#f3e8ff', icon: '🔄' },
  revision:      { label: 'Revisión',      color: '#c2410c', bg: '#fff7ed', icon: '✏️' },
}
const ESTADO_BADGE: Record<string, { bg: string; color: string; label: string; border: string }> = {
  borrador:  { bg: '#fef3c7', color: '#92400e', label: 'Borrador',  border: '#fcd34d' },
  aprobado:  { bg: '#d1fae5', color: '#065f46', label: 'Aprobado',  border: '#6ee7b7' },
  rechazado: { bg: '#fee2e2', color: '#991b1b', label: 'Rechazado', border: '#fca5a5' },
}
const CLASE_LABELS: Record<string, string> = {
  '1':'Activos','2':'Pasivos','3':'Patrimonio','4':'Ingresos','5':'Costos','6':'Gastos',
}

/* ═══════════════════════════════ ui atoms ═══════════════════════════════ */
const S = {
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,.04)' } as any,
  ribbon: { display: 'flex', alignItems: 'stretch', gap: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 2px', marginBottom: 16, flexWrap: 'wrap', boxShadow: '0 1px 3px rgba(0,0,0,.04)' } as any,
  th: { padding: '10px 12px', fontWeight: 600, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px', whiteSpace: 'nowrap', borderBottom: '2px solid #e2e8f0' } as any,
  td: { padding: '10px 12px', borderBottom: '1px solid #f1f5f9' } as any,
}
const thL = { ...S.th, textAlign: 'left' as const }
const thR = { ...S.th, textAlign: 'right' as const }
const tdL = { ...S.td, textAlign: 'left' as const }
const tdR = { ...S.td, textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums' }

const Modal = ({ title, subtitle = '', onClose, children, width = 640 }: any) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && onClose()}>
    <div style={{ ...S.card, maxWidth: width, width: '95%', maxHeight: '90vh', overflow: 'auto', padding: '24px 28px', boxShadow: '0 20px 60px rgba(0,0,0,.18)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>{title}</h2>
          {subtitle && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>{subtitle}</p>}
        </div>
        <button onClick={onClose} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', color: '#94a3b8', padding: '4px 6px', lineHeight: 0 }}><X size={16} /></button>
      </div>
      {children}
    </div>
  </div>
)
const Label = ({ children }: any) => <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.3px' }}>{children}</label>
const PaneGroup = ({ title, children }: any) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 14px', borderRight: '1px solid #f1f5f9' }}>
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>{children}</div>
    <div style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 600 }}>{title}</div>
  </div>
)
function Badge({ color, bg, border, children }: any) {
  return <span style={{ fontSize: 10, fontWeight: 600, color, background: bg, padding: '3px 9px', borderRadius: 5, border: `1px solid ${border || bg}`, whiteSpace: 'nowrap', lineHeight: '16px', display: 'inline-block' }}>{children}</span>
}

/* ═══════════════════════════════ page ═══════════════════════════════ */
export default function Presupuesto() {
  const [tab, setTab] = useState<'registros' | 'saldos' | 'control' | 'config'>('registros')
  const [periodo, setPeriodo] = useState<'mes' | 'trim' | 'anio'>('mes')
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)

  const [registros, setRegistros] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [vsReal, setVsReal] = useState<any[]>([])
  const [cuentas, setCuentas] = useState<any[]>([])
  const [campos, setCampos] = useState<any[]>([])
  const [dims, setDims] = useState<{ unidades: any[]; deptos: any[] }>({ unidades: [], deptos: [] })
  const [config, setConfig] = useState<any>({ umbral_alerta: 85, umbral_bloqueo: 100, control_habilitado: true, distribucion_default: 'mensual', requiere_aprobacion: true, dim_campo: true, dim_unidad_negocio: true, dim_departamento: true })
  const [configDirty, setConfigDirty] = useState(false)

  const [busqueda, setBusqueda] = useState('')
  const [campoFiltro, setCampoFiltro] = useState('')
  const [unFiltro, setUnFiltro] = useState('')
  const [depFiltro, setDepFiltro] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('')
  const [showTipoDropdown, setShowTipoDropdown] = useState(false)

  const [showNuevoRegistro, setShowNuevoRegistro] = useState(false)
  const [showDetalleRegistro, setShowDetalleRegistro] = useState<any>(null)
  const [editingRegistro, setEditingRegistro] = useState<any>(null)
  const [showCopy, setShowCopy] = useState(false)
  const [nuevoReg, setNuevoReg] = useState<any>(null)
  const [claseFilter, setClaseFilter] = useState('')
  const [copyData, setCopyData] = useState<any>({ anio_origen: anio - 1, factor: 1.0 })
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [allExpanded, setAllExpanded] = useState(true)
  const [edits, setEdits] = useState<Record<number, Record<string, any>>>({})

  const filteredCuentas = useMemo(() => {
    if (!claseFilter) return cuentas
    return cuentas.filter((c: any) => (c.codigo || '')[0] === claseFilter)
  }, [cuentas, claseFilter])
  const [saving, setSaving] = useState(false)

  /* ── loaders ── */
  const loadBase = useCallback(async () => {
    try {
      const [c, f, un, dep, cfg] = await Promise.all([
        api.get('/contabilidad/cuentas'), api.get('/campos'),
        api.get('/contabilidad/unidades-negocio'), api.get('/contabilidad/departamentos'),
        api.get('/contabilidad/config-presupuesto'),
      ])
      setCuentas(c.data.filter((x: any) => x.acepta_movimientos))
      setCampos(f.data)
      setDims({ unidades: un.data, deptos: dep.data })
      setConfig(cfg.data); setConfigDirty(false)
    } catch { /* silent */ }
  }, [])

  const loadRegistros = useCallback(async () => {
    setLoading(true)
    try {
      let url = `/contabilidad/registros-presupuestarios?anio=${anio}`
      if (tipoFiltro) url += `&tipo=${tipoFiltro}`
      setRegistros((await api.get(url)).data)
    } catch { toast.error('Error al cargar registros') }
    finally { setLoading(false) }
  }, [anio, tipoFiltro])

  const loadSaldos = useCallback(async () => {
    setLoading(true)
    try { setItems((await api.get(`/contabilidad/presupuestos?anio=${anio}`)).data); setEdits({}) }
    catch { toast.error('Error al cargar saldos') }
    finally { setLoading(false) }
  }, [anio])

  const loadControl = useCallback(async () => {
    setLoading(true)
    try {
      let url = `/contabilidad/presupuesto-vs-real?anio=${anio}`
      if (campoFiltro) url += `&campo_id=${campoFiltro}`
      if (unFiltro) url += `&unidad_negocio_id=${unFiltro}`
      if (depFiltro) url += `&departamento_id=${depFiltro}`
      setVsReal((await api.get(url)).data)
    } catch { toast.error('Error cargando control') }
    finally { setLoading(false) }
  }, [anio, campoFiltro, unFiltro, depFiltro])

  useEffect(() => { loadBase() }, [loadBase])
  useEffect(() => {
    if (tab === 'registros') loadRegistros()
    else if (tab === 'saldos') loadSaldos()
    else if (tab === 'control') loadControl()
    else setLoading(false)
  }, [tab, loadRegistros, loadSaldos, loadControl])

  /* ── saldos editing ── */
  const cellVal = (row: any, mk: string) => { const e = edits[row.id]; return e && mk in e ? e[mk] : Number(row[mk] || 0) }
  const rowTotal = (row: any) => MK.reduce((s, mk) => s + cellVal(row, mk), 0)
  const dirty = Object.keys(edits).length > 0
  const dirtyCount = Object.keys(edits).length
  const setCell = (id: number, mk: string, v: string) => setEdits(prev => ({ ...prev, [id]: { ...prev[id], [mk]: parseFloat(v) || 0 } }))

  async function guardarCambios() {
    const ids = Object.keys(edits).map(Number)
    if (!ids.length) return
    setSaving(true)
    try {
      const r = await api.put('/contabilidad/presupuestos/batch', ids.map(id => { const e = edits[id]||{}; const item: any = { id }; MK.forEach(mk => { if (mk in e) item[mk] = e[mk] }); return item }))
      toast.success(`${r.data.actualizados} línea(s) guardada(s)`)
    } catch { toast.error('Error al guardar') }
    setSaving(false); loadSaldos()
  }

  /* ── registros ── */
  function initNuevoRegistro(tipo: string) {
    setNuevoReg({ tipo, anio, descripcion: '', lineas: [emptyLinea()] })
    setShowNuevoRegistro(true)
  }
  function emptyLinea() { return { cuenta_id: '', campo_id: '', unidad_negocio_id: '', departamento_id: '', total: '', dist: config.distribucion_default || 'mensual', descripcion: '' } }
  function addLinea() { setNuevoReg((p: any) => ({ ...p, lineas: [...p.lineas, emptyLinea()] })) }
  function removeLinea(idx: number) { setNuevoReg((p: any) => ({ ...p, lineas: p.lineas.filter((_: any, i: number) => i !== idx) })) }
  function updateLinea(idx: number, field: string, val: any) { setNuevoReg((p: any) => { const l = [...p.lineas]; l[idx] = { ...l[idx], [field]: val }; return { ...p, lineas: l } }) }

  async function crearRegistro(e: any) {
    e.preventDefault()
    for (const ln of nuevoReg.lineas) { if (!ln.cuenta_id) { toast.error('Todas las líneas requieren cuenta'); return } }
    const payload = {
      tipo: nuevoReg.tipo, anio: nuevoReg.anio, descripcion: nuevoReg.descripcion,
      lineas: nuevoReg.lineas.map((ln: any) => {
        const vals = distribuir(parseFloat(ln.total) || 0, ln.dist || 'mensual')
        const line: any = { cuenta_id: Number(ln.cuenta_id), campo_id: ln.campo_id || null, unidad_negocio_id: ln.unidad_negocio_id ? Number(ln.unidad_negocio_id) : null, departamento_id: ln.departamento_id ? Number(ln.departamento_id) : null, descripcion: ln.descripcion || '' }
        MK.forEach((mk, i) => { line[mk] = vals[i] }); return line
      }),
    }
    try { const r = await api.post('/contabilidad/registros-presupuestarios', payload); toast.success(`Registro ${r.data.numero} creado`); setShowNuevoRegistro(false); setNuevoReg(null); loadRegistros() }
    catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
  }

  async function aprobarRegistro(id: number) {
    if (!confirm('¿Aprobar este registro? Los saldos se actualizarán.')) return
    try { await api.put(`/contabilidad/registros-presupuestarios/${id}/aprobar`); toast.success('Aprobado'); loadRegistros(); setShowDetalleRegistro(null) }
    catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
  }
  async function rechazarRegistro(id: number) {
    if (!confirm('¿Rechazar?')) return
    try { await api.put(`/contabilidad/registros-presupuestarios/${id}/rechazar`); toast.success('Rechazado'); loadRegistros(); setShowDetalleRegistro(null) }
    catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
  }
  async function eliminarRegistro(id: number) {
    if (!confirm('¿Eliminar?')) return
    try { await api.delete(`/contabilidad/registros-presupuestarios/${id}`); toast.success('Eliminado'); loadRegistros(); setShowDetalleRegistro(null) }
    catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
  }
  function initEditRegistro(reg: any) {
    setEditingRegistro({
      id: reg.id, tipo: reg.tipo, anio: reg.anio, descripcion: reg.descripcion || '',
      lineas: (reg.lineas || []).map((ln: any) => ({
        cuenta_id: String(ln.cuenta_id), campo_id: ln.campo_id || '',
        unidad_negocio_id: ln.unidad_negocio_id ? String(ln.unidad_negocio_id) : '',
        departamento_id: ln.departamento_id ? String(ln.departamento_id) : '',
        total: String(MK.reduce((s: number, mk: string) => s + Number(ln[mk] || 0), 0)),
        dist: config.distribucion_default || 'mensual', descripcion: ln.descripcion || '',
      })),
    })
  }
  function updateEditLinea(idx: number, field: string, val: any) {
    setEditingRegistro((p: any) => { const l = [...p.lineas]; l[idx] = { ...l[idx], [field]: val }; return { ...p, lineas: l } })
  }
  function addEditLinea() { setEditingRegistro((p: any) => ({ ...p, lineas: [...p.lineas, emptyLinea()] })) }
  function removeEditLinea(idx: number) { setEditingRegistro((p: any) => ({ ...p, lineas: p.lineas.filter((_: any, i: number) => i !== idx) })) }
  async function guardarEdicionRegistro(e: any) {
    e.preventDefault()
    for (const ln of editingRegistro.lineas) { if (!ln.cuenta_id) { toast.error('Todas las líneas requieren cuenta'); return } }
    const payload = {
      tipo: editingRegistro.tipo, anio: editingRegistro.anio, descripcion: editingRegistro.descripcion,
      lineas: editingRegistro.lineas.map((ln: any) => {
        const vals = distribuir(parseFloat(ln.total) || 0, ln.dist || 'mensual')
        const line: any = { cuenta_id: Number(ln.cuenta_id), campo_id: ln.campo_id || null, unidad_negocio_id: ln.unidad_negocio_id ? Number(ln.unidad_negocio_id) : null, departamento_id: ln.departamento_id ? Number(ln.departamento_id) : null, descripcion: ln.descripcion || '' }
        MK.forEach((mk, i) => { line[mk] = vals[i] }); return line
      }),
    }
    try {
      await api.put(`/contabilidad/registros-presupuestarios/${editingRegistro.id}`, payload)
      toast.success('Registro actualizado')
      setEditingRegistro(null); setShowDetalleRegistro(null); loadRegistros()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error al guardar') }
  }

  async function guardarConfig() {
    try { await api.put('/contabilidad/config-presupuesto', config); toast.success('Configuración guardada'); setConfigDirty(false) }
    catch { toast.error('Error') }
  }
  function updateConfig(k: string, v: any) { setConfig((p: any) => ({ ...p, [k]: v })); setConfigDirty(true) }
  async function del(id: number) {
    if (!confirm('¿Eliminar línea?')) return
    try { await api.delete(`/contabilidad/presupuestos/${id}`); toast.success('Eliminada'); loadSaldos() } catch { toast.error('Error') }
  }
  async function ejecutarCopia(e: any) {
    e.preventDefault()
    try { const r = await api.post('/contabilidad/presupuestos/copiar-anio', { anio_origen: Number(copyData.anio_origen), anio_destino: anio, factor: parseFloat(copyData.factor)||1.0 }); toast.success(`${r.data.creados} copiadas, ${r.data.omitidos} omitidas`); setShowCopy(false); loadSaldos() }
    catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
  }
  function exportCSV() {
    const src = tab === 'saldos' ? filteredSaldos : vsReal; if (!src.length) { toast.error('Nada'); return }
    let csv = tab === 'saldos'
      ? ['Codigo,Cuenta,Campo,UN,Depto,'+MESES.join(',')+',Total'].concat(filteredSaldos.map(p => [p.cuenta_codigo,`"${p.cuenta_nombre}"`,`"${p.campo_nombre||''}"`,`"${p.unidad_negocio_nombre||''}"`,`"${p.departamento_nombre||''}"`, ...MK.map(mk => cellVal(p,mk)), rowTotal(p)].join(','))).join('\n')
      : ['Codigo,Cuenta,Presupuesto,Real,Disponible,%'].concat(vsReal.map(r => { const d=r.total_presupuesto-r.total_real; const p=r.total_presupuesto?(r.total_real/r.total_presupuesto*100):0; return [r.cuenta_codigo,`"${r.cuenta_nombre}"`,r.total_presupuesto,r.total_real,d.toFixed(2),p.toFixed(1)].join(',') })).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})); a.download = `presupuesto_${tab}_${anio}.csv`; a.click()
  }

  function toggleAllGroups() { const n=!allExpanded; setAllExpanded(n); const m: Record<string,boolean>={}; groupedSaldos.forEach(([k])=>{m[k]=n}); setExpandedGroups(m) }
  const toggleGroup = (k: string) => setExpandedGroups(p => ({ ...p, [k]: !p[k] }))
  const isGroupExpanded = (k: string) => expandedGroups[k] !== false

  const cols = periodo==='mes' ? MESES.map((m,i)=>({label:m,idx:[i]})) : periodo==='trim' ? TRIMS.map(t=>({label:t.label,idx:t.m})) : [{label:'Año',idx:[0,1,2,3,4,5,6,7,8,9,10,11]}]

  const filteredSaldos = useMemo(() => items.filter(p => {
    if (busqueda) { const q=busqueda.toLowerCase(); if (!(p.cuenta_codigo||'').toLowerCase().includes(q) && !(p.cuenta_nombre||'').toLowerCase().includes(q) && !(p.campo_nombre||'').toLowerCase().includes(q)) return false }
    if (campoFiltro && p.campo_id !== campoFiltro) return false
    if (unFiltro && String(p.unidad_negocio_id) !== unFiltro) return false
    if (depFiltro && String(p.departamento_id) !== depFiltro) return false
    return true
  }), [items, busqueda, campoFiltro, unFiltro, depFiltro])

  const groupedSaldos = useMemo(() => {
    const g: Record<string, { label: string; items: any[] }> = {}
    for (const p of filteredSaldos) { const c=(p.cuenta_codigo||'')[0]||'?'; if (!g[c]) g[c]={label:CLASE_LABELS[c]||`Clase ${c}`,items:[]}; g[c].items.push(p) }
    return Object.entries(g).sort(([a],[b])=>a.localeCompare(b))
  }, [filteredSaldos])

  const totalPres = tab==='saldos' ? filteredSaldos.reduce((s,p)=>s+rowTotal(p),0) : tab==='control' ? vsReal.reduce((s,r)=>s+r.total_presupuesto,0) : 0
  const totalReal = vsReal.reduce((s,r)=>s+r.total_real,0)
  const disponible = totalPres - totalReal
  const pctGlobal = totalPres ? Math.round((totalReal/totalPres)*100) : 0
  const mesActual = new Date().getMonth()+1
  const forecast = tab==='control' && totalReal>0 && mesActual>1 ? Math.round((totalReal/mesActual)*12) : null
  const filteredRegistros = useMemo(() => registros.filter(r => {
    if (busqueda) { const q = busqueda.toLowerCase(); if (!(r.numero||'').toLowerCase().includes(q) && !(r.descripcion||'').toLowerCase().includes(q)) return false }
    if (campoFiltro || unFiltro || depFiltro) {
      const lineas = r.lineas || []
      const match = lineas.some((ln: any) => {
        if (campoFiltro && ln.campo_id !== campoFiltro) return false
        if (unFiltro && String(ln.unidad_negocio_id) !== unFiltro) return false
        if (depFiltro && String(ln.departamento_id) !== depFiltro) return false
        return true
      })
      if (!match) return false
    }
    return true
  }), [registros, busqueda, campoFiltro, unFiltro, depFiltro])

  const regStats = { total:filteredRegistros.length, borradores:filteredRegistros.filter(r=>r.estado==='borrador').length, aprobados:filteredRegistros.filter(r=>r.estado==='aprobado').length, monto:filteredRegistros.reduce((s:number,r:any)=>s+(r.total||0),0) }

  const estadoPct = (pct: number) => pct > (config.umbral_bloqueo||100)
    ? { label:'Excedido', color:'#dc2626', bg:'#fef2f2', Icon:AlertOctagon }
    : pct >= (config.umbral_alerta||85)
      ? { label:'Alerta', color:'#d97706', bg:'#fffbeb', Icon:AlertTriangle }
      : { label:'Dentro', color:'#16a34a', bg:'#f0fdf4', Icon:CheckCircle2 }

  /* ═══════════════════════════════ render ═══════════════════════════════ */
  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* header */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ margin: '0 0 2px', fontSize: 24, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #166534, #22c55e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PiggyBank size={20} color="#fff" />
            </div>
            Presupuesto
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: 13, paddingLeft: 46 }}>Gestión presupuestaria integral — D365</p>
        </div>
        <select className="select" style={{ width: 100, height: 36, fontWeight: 600, fontSize: 14, textAlign: 'center' }} value={anio} onChange={e => setAnio(Number(e.target.value))}>
          {[2024,2025,2026,2027,2028].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 16 }}>
        {([
          { key: 'registros', label: 'Registros', Icon: FileText, desc: 'Asientos presupuestarios' },
          { key: 'saldos',    label: 'Saldos',    Icon: Table2,   desc: 'Balances por cuenta' },
          { key: 'control',   label: 'Control',   Icon: Gauge,    desc: 'Presupuesto vs Real' },
          { key: 'config',    label: 'Configuración', Icon: Settings, desc: 'Parámetros del módulo' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex: 1, padding: '12px 16px', border: 'none', cursor: 'pointer', borderRadius: '10px 10px 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, transition: 'all .15s',
              background: tab === t.key ? '#fff' : '#f8fafc',
              borderBottom: tab === t.key ? '3px solid #166534' : '3px solid #e2e8f0',
              boxShadow: tab === t.key ? '0 -2px 8px rgba(0,0,0,.04)' : 'none',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <t.Icon size={15} color={tab === t.key ? '#166534' : '#94a3b8'} />
              <span style={{ fontSize: 13, fontWeight: tab === t.key ? 700 : 500, color: tab === t.key ? '#0f172a' : '#64748b' }}>{t.label}</span>
            </div>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>{t.desc}</span>
          </button>
        ))}
      </div>

      {/* toolbar contextual */}
      {tab !== 'config' && (
        <div style={S.ribbon}>
          {tab !== 'registros' && (
            <PaneGroup title="Pivote">
              <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                {(['mes','trim','anio'] as const).map(pv => (
                  <button key={pv} onClick={() => setPeriodo(pv)} style={{ padding: '6px 14px', fontSize: 12, border: 'none', cursor: 'pointer', fontWeight: periodo===pv?600:400, background: periodo===pv?'#166534':'#fff', color: periodo===pv?'#fff':'#475569', transition: 'all .15s' }}>
                    {pv==='mes'?'Mes':pv==='trim'?'Trim':'Año'}
                  </button>
                ))}
              </div>
            </PaneGroup>
          )}
          <PaneGroup title="Filtros">
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 8, top: 9, color: '#94a3b8' }} />
              <input className="input" placeholder="Buscar…" value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ width: 140, height: 32, paddingLeft: 28, fontSize: 12 }} />
            </div>
            {tab === 'registros' && (
              <select className="select" style={{ width: 120, height: 32 }} value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value)}>
                <option value="">Todo tipo</option>
                {Object.entries(TIPO_LABELS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            )}
            {config.dim_campo !== false && <select className="select" style={{ width: 110, height: 32 }} value={campoFiltro} onChange={e => setCampoFiltro(e.target.value)}><option value="">Todo campo</option>{campos.map(c => <option key={c.id_campo} value={c.id_campo}>{c.nombre||c.id_campo}</option>)}</select>}
            {config.dim_unidad_negocio !== false && <select className="select" style={{ width: 110, height: 32 }} value={unFiltro} onChange={e => setUnFiltro(e.target.value)}><option value="">Toda UN</option>{dims.unidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}</select>}
            {config.dim_departamento !== false && <select className="select" style={{ width: 110, height: 32 }} value={depFiltro} onChange={e => setDepFiltro(e.target.value)}><option value="">Todo depto</option>{dims.deptos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}</select>}
          </PaneGroup>
          <PaneGroup title="Acciones">
            {tab === 'registros' && (
              <div style={{ position: 'relative' }}>
                <button className="btn-primary" style={{ height: 32, background: '#166534', fontSize: 12 }} onClick={() => setShowTipoDropdown(!showTipoDropdown)}>
                  <Plus size={13} /> Nuevo registro <ChevronDown size={12} />
                </button>
                {showTipoDropdown && <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowTipoDropdown(false)} />
                  <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 100, minWidth: 200, overflow: 'hidden' }}>
                    {Object.entries(TIPO_LABELS).map(([k, v]) => (
                      <button key={k} onClick={() => { initNuevoRegistro(k); setShowTipoDropdown(false) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: '#334155', textAlign: 'left', transition: 'background .1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                        <span style={{ fontSize: 16 }}>{v.icon}</span>
                        <div>
                          <div style={{ fontWeight: 600, color: v.color }}>{v.label}</div>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>
                            {k === 'original' && 'Presupuesto base del ejercicio'}
                            {k === 'adicion' && 'Incremento de fondos'}
                            {k === 'transferencia' && 'Reasignar entre cuentas'}
                            {k === 'revision' && 'Ajustar montos vigentes'}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>}
              </div>
            )}
            {tab === 'saldos' && <>
              <button className="btn-primary" style={{ height: 32, opacity: dirty?1:.4, pointerEvents: dirty?'auto':'none', background: '#0369a1' }} onClick={guardarCambios} disabled={saving}><Save size={14} /> {saving?'…':`Guardar${dirtyCount>0?` (${dirtyCount})`:''}`}</button>
              {dirty && <button className="btn-secondary" style={{ height: 32 }} onClick={() => { setEdits({}); toast.success('Descartados') }}><Undo2 size={14} /></button>}
              <button className="btn-secondary" style={{ height: 32 }} onClick={() => { setCopyData({anio_origen:anio-1,factor:1.0}); setShowCopy(true) }}><Copy size={14} /></button>
            </>}
            <button className="btn-secondary" style={{ height: 32 }} onClick={() => tab==='registros'?loadRegistros():tab==='saldos'?loadSaldos():loadControl()}><RefreshCw size={14} /></button>
            {tab !== 'registros' && <button className="btn-secondary" style={{ height: 32 }} onClick={exportCSV}><Download size={14} /></button>}
          </PaneGroup>
        </div>
      )}

      {/* KPIs */}
      {tab !== 'config' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
          {tab === 'registros' && <>
            <KpiCard label="Registros" value={String(regStats.total)} color="#475569" Icon={Hash} />
            <KpiCard label="Pendientes" value={String(regStats.borradores)} color="#d97706" Icon={Clock} />
            <KpiCard label="Aprobados" value={String(regStats.aprobados)} color="#16a34a" Icon={CheckCircle2} />
            <KpiCard label="Monto total" value={`RD$ ${fmt0(regStats.monto)}`} color="#0369a1" Icon={BarChart3} />
          </>}
          {tab === 'saldos' && <>
            <KpiCard label={`Presupuesto ${anio}`} value={`RD$ ${fmt0(totalPres)}`} color="#0369a1" Icon={PiggyBank} />
            <KpiCard label="Líneas activas" value={String(filteredSaldos.length)} color="#475569" Icon={Table2} />
          </>}
          {tab === 'control' && <>
            <KpiCard label={`Presupuesto ${anio}`} value={`RD$ ${fmt0(totalPres)}`} color="#0369a1" Icon={PiggyBank} />
            <KpiCard label="Real ejecutado" value={`RD$ ${fmt0(totalReal)}`} color="#16a34a" Icon={BarChart3} />
            <KpiCard label="Disponible" value={`RD$ ${fmt0(disponible)}`} color={disponible<0?'#dc2626':'#475569'} Icon={Shield} />
            <KpiCard label="% Consumido" value={`${pctGlobal}%`} color={estadoPct(pctGlobal).color} Icon={Percent} />
            {forecast!==null && <KpiCard label="Proyección año" value={`RD$ ${fmt0(forecast)}`} color={forecast>totalPres?'#dc2626':'#0369a1'} Icon={TrendingUp} />}
          </>}
        </div>
      )}

      {loading && tab !== 'config' ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>Cargando…</div>
      ) : tab === 'registros' ? (
        /* ═══ REGISTROS ═══ */
        <div style={{ ...S.card, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ background: '#f8fafc' }}>
                <th style={thL}>Número</th><th style={thL}>Fecha</th><th style={thL}>Tipo</th>
                <th style={thL}>Descripción</th><th style={thR}>Líneas</th><th style={thR}>Monto</th>
                <th style={thL}>Estado</th><th style={thL}>Usuario</th><th style={{...thR,width:50}}></th>
              </tr></thead>
              <tbody>
                {filteredRegistros.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 50, color: '#94a3b8' }}>
                    <FileText size={36} style={{ marginBottom: 8, opacity: .3 }} /><br/>Sin registros para {anio}
                  </td></tr>
                ) : filteredRegistros.map((r: any) => {
                  const tp = TIPO_LABELS[r.tipo]||TIPO_LABELS.original, est = ESTADO_BADGE[r.estado]||ESTADO_BADGE.borrador
                  return (
                    <tr key={r.id} style={{ cursor: 'pointer', transition: 'background .1s' }} onClick={() => setShowDetalleRegistro(r)}
                      onMouseEnter={e => (e.currentTarget.style.background='#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background='')}>
                      <td style={{ ...tdL, fontWeight: 700, fontFamily: 'monospace', color: '#0f172a' }}>{r.numero}</td>
                      <td style={{ ...tdL, color: '#64748b' }}>{r.fecha}</td>
                      <td style={tdL}><Badge color={tp.color} bg={tp.bg}>{tp.icon} {tp.label}</Badge></td>
                      <td style={{ ...tdL, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#475569' }}>{r.descripcion||'—'}</td>
                      <td style={{ ...tdR, color: '#64748b' }}>{r.lineas?.length||0}</td>
                      <td style={{ ...tdR, fontWeight: 700, color: '#0f172a' }}>{fmt(r.total)}</td>
                      <td style={tdL}><Badge color={est.color} bg={est.bg} border={est.border}>{est.label}</Badge></td>
                      <td style={{ ...tdL, fontSize: 11, color: '#94a3b8' }}>{r.usuario_nombre}</td>
                      <td style={{ ...S.td, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        {r.estado==='borrador' && <button className="btn-icon" onClick={() => eliminarRegistro(r.id)}><Trash2 size={13} /></button>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === 'saldos' ? (
        /* ═══ SALDOS ═══ */
        <div style={{ ...S.card, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ background: '#f8fafc' }}>
                <th style={thL}>
                  <button onClick={toggleAllGroups} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginRight: 6, color: '#94a3b8', verticalAlign: 'text-bottom' }}>
                    {allExpanded ? <ChevronsDown size={13} /> : <ChevronsRight size={13} />}
                  </button>Cuenta
                </th>
                <th style={{...thL,width:100}}>Dimensiones</th>
                {cols.map(c => <th key={c.label} style={thR}>{c.label}</th>)}
                <th style={thR}>Total</th><th style={{...thR,width:50}}></th>
              </tr></thead>
              <tbody>
                {filteredSaldos.length === 0 ? (
                  <tr><td colSpan={cols.length+4} style={{ textAlign: 'center', padding: 50, color: '#94a3b8' }}>
                    <Table2 size={36} style={{ marginBottom: 8, opacity: .3 }} /><br/>Sin saldos para {anio}
                  </td></tr>
                ) : groupedSaldos.map(([cls, group]) => {
                  const expanded = isGroupExpanded(cls), gt = group.items.reduce((s:number,p:any)=>s+rowTotal(p),0)
                  return [
                    <tr key={`g-${cls}`} onClick={() => toggleGroup(cls)} style={{ background: '#f8fafc', cursor: 'pointer' }}>
                      <td colSpan={2} style={{ padding: '8px 12px', fontWeight: 700, fontSize: 12, color: '#334155', borderBottom: '1px solid #e2e8f0' }}>
                        {expanded ? <ChevronDown size={14} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} /> : <ChevronRight size={14} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />}
                        {group.label} <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: 6 }}>({group.items.length})</span>
                      </td>
                      {cols.map(c => <td key={c.label} style={{ ...tdR, fontWeight: 600, color: '#64748b', fontSize: 11, borderBottom: '1px solid #e2e8f0' }}>{fmt(group.items.reduce((s:number,p:any)=>s+c.idx.reduce((a:number,i:number)=>a+cellVal(p,MK[i]),0),0))}</td>)}
                      <td style={{ ...tdR, fontWeight: 700, fontSize: 11, borderBottom: '1px solid #e2e8f0' }}>{fmt(gt)}</td>
                      <td style={{ borderBottom: '1px solid #e2e8f0' }}></td>
                    </tr>,
                    ...(expanded ? group.items.map((p:any) => {
                      const d = !!edits[p.id]
                      return (
                        <tr key={p.id} style={{ background: d ? '#eff6ff' : '#fff', transition: 'background .1s' }}>
                          <td style={{ ...tdL, whiteSpace: 'nowrap' }}>
                            <span style={{ color: '#94a3b8', marginRight: 6, fontFamily: 'monospace', fontSize: 11 }}>{p.cuenta_codigo}</span>
                            <span style={{ color: '#334155' }}>{p.cuenta_nombre}</span>
                            {d && <span style={{ marginLeft: 6, fontSize: 9, color: '#3b82f6', fontWeight: 700 }}>●</span>}
                          </td>
                          <td style={tdL}><DimTags p={p} /></td>
                          {cols.map(c => {
                            if (periodo==='mes') { const mk=MK[c.idx[0]]; return (
                              <td key={c.label} style={{ padding: '2px 3px', textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>
                                <input value={cellVal(p,mk)||''} onChange={e => setCell(p.id,mk,e.target.value)} type="number" step="0.01"
                                  style={{ width: 76, textAlign: 'right', fontVariantNumeric: 'tabular-nums', border: '1px solid transparent', borderRadius: 5, padding: '5px 6px', fontSize: 12, background: 'transparent', transition: 'all .15s' }}
                                  onFocus={e => { e.target.style.border='1px solid #93c5fd'; e.target.style.background='#fff'; e.target.style.boxShadow='0 0 0 3px rgba(59,130,246,.1)' }}
                                  onBlur={e => { e.target.style.border='1px solid transparent'; e.target.style.background='transparent'; e.target.style.boxShadow='none' }} />
                              </td>
                            )} return <td key={c.label} style={tdR}>{fmt(c.idx.reduce((s:number,i:number)=>s+cellVal(p,MK[i]),0))}</td>
                          })}
                          <td style={{ ...tdR, fontWeight: 700, color: '#0f172a' }}>{fmt(rowTotal(p))}</td>
                          <td style={{ ...S.td, textAlign: 'center' }}><button className="btn-icon" onClick={() => del(p.id)}><Trash2 size={13} /></button></td>
                        </tr>
                      )
                    }) : [])
                  ]
                }).flat()}
              </tbody>
              {filteredSaldos.length > 0 && <tfoot>
                <tr style={{ fontWeight: 700, background: '#f1f5f9' }}>
                  <td colSpan={2} style={{ ...tdL, color: '#0f172a', borderTop: '2px solid #cbd5e1' }}>TOTAL</td>
                  {cols.map(c => <td key={c.label} style={{ ...tdR, borderTop: '2px solid #cbd5e1' }}>{fmt(filteredSaldos.reduce((s:number,p:any)=>s+c.idx.reduce((a:number,i:number)=>a+cellVal(p,MK[i]),0),0))}</td>)}
                  <td style={{ ...tdR, borderTop: '2px solid #cbd5e1', color: '#0f172a' }}>{fmt(totalPres)}</td>
                  <td style={{ borderTop: '2px solid #cbd5e1' }}></td>
                </tr>
              </tfoot>}
            </table>
          </div>
        </div>
      ) : tab === 'control' ? (
        /* ═══ CONTROL ═══ */
        <div>
          {vsReal.length > 0 && totalReal === 0 && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', marginBottom: 14, fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} /> Aún no hay cifras reales contabilizadas para {anio}.
            </div>
          )}
          <div style={{ ...S.card, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ background: '#f8fafc' }}>
                  <th style={thL}>Cuenta</th>
                  {periodo==='mes' ? MESES.map(m => <th key={m} style={{...thR,fontSize:10}}>{m}</th>) : periodo==='trim' ? TRIMS.map(t => <th key={t.label} style={thR}>{t.label}</th>) : <th style={thR}>Año</th>}
                  <th style={thR}>Presup.</th><th style={thR}>Real</th><th style={thR}>Disponible</th>
                  <th style={{...thL,width:180}}>Consumo</th><th style={{...thL,width:80}}>Estado</th>
                </tr></thead>
                <tbody>
                  {vsReal.length===0 ? (
                    <tr><td colSpan={periodo==='mes'?18:periodo==='trim'?10:7} style={{ textAlign: 'center', padding: 50, color: '#94a3b8' }}>
                      <Gauge size={36} style={{ marginBottom: 8, opacity: .3 }} /><br/>Sin datos de control para {anio}
                    </td></tr>
                  ) : vsReal.map((r,i) => {
                    const disp=r.total_presupuesto-r.total_real, pct=r.total_presupuesto?(r.total_real/r.total_presupuesto*100):0, st=estadoPct(pct), meses=r.meses||[]
                    return (
                      <tr key={i}>
                        <td style={{ ...tdL, whiteSpace: 'nowrap' }}><span style={{ color: '#94a3b8', marginRight: 6, fontFamily: 'monospace', fontSize: 11 }}>{r.cuenta_codigo}</span><span style={{ color: '#334155' }}>{r.cuenta_nombre}</span></td>
                        {periodo==='mes' ? meses.map((m:any,mi:number) => {
                          const mp=m.presupuesto?(m.real/m.presupuesto*100):0, mc=mp>(config.umbral_bloqueo||100)?'#dc2626':mp>=(config.umbral_alerta||85)?'#d97706':'#475569'
                          return <td key={mi} style={{...tdR,fontSize:10}}><div style={{fontVariantNumeric:'tabular-nums',color:mc}}>{fmt0(m.real)}</div><div style={{fontSize:9,color:'#cbd5e1'}}>{fmt0(m.presupuesto)}</div>
                            {m.presupuesto>0 && <div style={{height:3,background:'#f1f5f9',borderRadius:2,marginTop:2}}><div style={{height:'100%',width:`${Math.min(mp,100)}%`,background:mc,borderRadius:2}}/></div>}
                          </td>
                        }) : periodo==='trim' ? TRIMS.map(t => {
                          const tp2=t.m.reduce((s:number,mi:number)=>s+(meses[mi]?.presupuesto||0),0), tr2=t.m.reduce((s:number,mi:number)=>s+(meses[mi]?.real||0),0)
                          return <td key={t.label} style={tdR}><div style={{fontVariantNumeric:'tabular-nums'}}>{fmt0(tr2)}</div><div style={{fontSize:9,color:'#cbd5e1'}}>{fmt0(tp2)}</div></td>
                        }) : <td style={tdR}><div>{fmt(r.total_real)}</div><div style={{fontSize:9,color:'#cbd5e1'}}>{fmt(r.total_presupuesto)}</div></td>}
                        <td style={tdR}>{fmt(r.total_presupuesto)}</td>
                        <td style={tdR}>{fmt(r.total_real)}</td>
                        <td style={{...tdR,color:disp<0?'#dc2626':'#475569',fontWeight:disp<0?700:400}}>{fmt(disp)}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${Math.min(pct,100)}%`, background: `linear-gradient(90deg, ${st.color}88, ${st.color})`, borderRadius: 99, transition: 'width .4s ease' }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: st.color, width: 42, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{Math.round(pct)}%</span>
                          </div>
                        </td>
                        <td style={{ ...S.td }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: st.color, background: st.bg, padding: '4px 10px', borderRadius: 99 }}>
                            <st.Icon size={11} />{st.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {vsReal.length > 0 && <tfoot>
                  <tr style={{ fontWeight: 700, background: '#f1f5f9' }}>
                    <td style={{ ...tdL, borderTop: '2px solid #cbd5e1' }}>TOTAL</td>
                    {periodo==='mes' ? MESES.map((_,mi) => { const sr=vsReal.reduce((s:number,r:any)=>s+(r.meses?.[mi]?.real||0),0), sp=vsReal.reduce((s:number,r:any)=>s+(r.meses?.[mi]?.presupuesto||0),0)
                      return <td key={mi} style={{...tdR,fontSize:10,borderTop:'2px solid #cbd5e1'}}><div>{fmt0(sr)}</div><div style={{fontSize:9,color:'#cbd5e1'}}>{fmt0(sp)}</div></td>
                    }) : periodo==='trim' ? TRIMS.map(t => { const tr2=t.m.reduce((s:number,mi:number)=>s+vsReal.reduce((s2:number,r:any)=>s2+(r.meses?.[mi]?.real||0),0),0), tp=t.m.reduce((s:number,mi:number)=>s+vsReal.reduce((s2:number,r:any)=>s2+(r.meses?.[mi]?.presupuesto||0),0),0)
                      return <td key={t.label} style={{...tdR,borderTop:'2px solid #cbd5e1'}}><div>{fmt0(tr2)}</div><div style={{fontSize:9,color:'#cbd5e1'}}>{fmt0(tp)}</div></td>
                    }) : <td style={{...tdR,borderTop:'2px solid #cbd5e1'}}><div>{fmt(totalReal)}</div><div style={{fontSize:9,color:'#cbd5e1'}}>{fmt(totalPres)}</div></td>}
                    <td style={{...tdR,borderTop:'2px solid #cbd5e1'}}>{fmt(totalPres)}</td>
                    <td style={{...tdR,borderTop:'2px solid #cbd5e1'}}>{fmt(totalReal)}</td>
                    <td style={{...tdR,borderTop:'2px solid #cbd5e1',color:disponible<0?'#dc2626':'#475569'}}>{fmt(disponible)}</td>
                    <td colSpan={2} style={{...tdL,borderTop:'2px solid #cbd5e1',color:estadoPct(pctGlobal).color,fontWeight:700}}>{pctGlobal}% consumido</td>
                  </tr>
                </tfoot>}
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ═══ CONFIGURACIÓN ═══ */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Control presupuestario */}
          <div style={{ ...S.card, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Gauge size={16} color="#1e40af" /></div>
              <div><div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Control presupuestario</div><div style={{ fontSize: 11, color: '#94a3b8' }}>Umbrales y alertas</div></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <Label>Umbral de alerta (%)</Label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input className="input" type="number" min={0} max={100} value={config.umbral_alerta} onChange={e => updateConfig('umbral_alerta', Number(e.target.value))} style={{ flex: 1 }} />
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AlertTriangle size={14} color="#d97706" /></div>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 11, color: '#94a3b8' }}>Al alcanzar este % el sistema muestra advertencia amarilla</p>
              </div>
              <div>
                <Label>Umbral de bloqueo (%)</Label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input className="input" type="number" min={0} max={200} value={config.umbral_bloqueo} onChange={e => updateConfig('umbral_bloqueo', Number(e.target.value))} style={{ flex: 1 }} />
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AlertOctagon size={14} color="#dc2626" /></div>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 11, color: '#94a3b8' }}>Al superar este % el estado cambia a «Excedido»</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <input type="checkbox" checked={config.control_habilitado} onChange={e => updateConfig('control_habilitado', e.target.checked)} style={{ width: 18, height: 18, accentColor: '#166534' }} />
                <div><div style={{ fontWeight: 600, color: '#0f172a' }}>Control presupuestario habilitado</div><div style={{ fontSize: 11, color: '#94a3b8' }}>Activa la verificación de fondos disponibles</div></div>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <input type="checkbox" checked={config.requiere_aprobacion} onChange={e => updateConfig('requiere_aprobacion', e.target.checked)} style={{ width: 18, height: 18, accentColor: '#166534' }} />
                <div><div style={{ fontWeight: 600, color: '#0f172a' }}>Requiere aprobación</div><div style={{ fontSize: 11, color: '#94a3b8' }}>Los registros deben ser aprobados antes de contabilizarse</div></div>
              </label>
            </div>
          </div>

          {/* Distribución */}
          <div style={{ ...S.card, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BarChart3 size={16} color="#166534" /></div>
              <div><div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Distribución periódica</div><div style={{ fontSize: 11, color: '#94a3b8' }}>Cómo se reparten los montos en los meses</div></div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Label>Distribución por defecto</Label>
              <select className="select" value={config.distribucion_default} onChange={e => updateConfig('distribucion_default', e.target.value)}>
                {Object.entries(DIST_KEYS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(DIST_KEYS).map(([k, v]) => {
                const active = config.distribucion_default === k
                const preview = distribuir(120000, k)
                const max = Math.max(...preview)
                return (
                  <div key={k} onClick={() => updateConfig('distribucion_default', k)}
                    style={{ padding: '10px 14px', borderRadius: 8, border: `2px solid ${active ? '#166534' : '#e2e8f0'}`, background: active ? '#f0fdf4' : '#fff', cursor: 'pointer', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ flex: '0 0 auto' }}>
                      <div style={{ fontWeight: 600, fontSize: 12, color: active ? '#166534' : '#334155' }}>{v.label}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>{v.desc}</div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', gap: 2, alignItems: 'flex-end', height: 24 }}>
                      {preview.map((val, mi) => (
                        <div key={mi} style={{ flex: 1, background: val > 0 ? (active ? '#166534' : '#cbd5e1') : '#f1f5f9', borderRadius: 2, height: max ? Math.max((val / max) * 24, val > 0 ? 3 : 1) : 1, transition: 'all .2s' }} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Dimensiones financieras */}
          <div style={{ ...S.card, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Layers size={16} color="#0369a1" /></div>
              <div><div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Dimensiones financieras</div><div style={{ fontSize: 11, color: '#94a3b8' }}>Selecciona cuáles dimensiones se usan en presupuesto</div></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {([
                { key: 'dim_campo', label: 'Centro de Costo (Campo)', desc: 'Permite asignar presupuesto por campo/parcela', count: campos.length },
                { key: 'dim_unidad_negocio', label: 'Unidad de Negocio', desc: 'Segmenta el presupuesto por unidad de negocio', count: dims.unidades.length },
                { key: 'dim_departamento', label: 'Departamento', desc: 'Clasifica el presupuesto por departamento', count: dims.deptos.length },
              ] as const).map(dim => {
                const active = config[dim.key] !== false
                return (
                  <label key={dim.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: active ? '#f0f9ff' : '#f8fafc', borderRadius: 8, border: `2px solid ${active ? '#0369a1' : '#e2e8f0'}`, cursor: 'pointer', transition: 'all .15s' }}>
                    <input type="checkbox" checked={active} onChange={e => updateConfig(dim.key, e.target.checked)} style={{ width: 18, height: 18, accentColor: '#0369a1' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: active ? '#0369a1' : '#334155' }}>{dim.label}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{dim.desc}</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b', background: '#e2e8f0', padding: '3px 8px', borderRadius: 4 }}>{dim.count} registros</span>
                  </label>
                )
              })}
            </div>
            <p style={{ margin: '14px 0 0', fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>Las dimensiones deshabilitadas no aparecerán en los filtros ni en el formulario de nuevos registros presupuestarios.</p>
          </div>

          {/* Tipos de transacción */}
          <div style={{ ...S.card, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={16} color="#7c3aed" /></div>
              <div><div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Tipos de transacción</div><div style={{ fontSize: 11, color: '#94a3b8' }}>Clasificación de registros presupuestarios</div></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(TIPO_LABELS).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 20 }}>{v.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: v.color }}>{v.label}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {k === 'original' && 'Presupuesto base aprobado para el ejercicio fiscal'}
                      {k === 'adicion' && 'Incremento al presupuesto existente (fondos adicionales)'}
                      {k === 'transferencia' && 'Reasignación de fondos entre cuentas o dimensiones'}
                      {k === 'revision' && 'Reemplazo de montos para ajustar el presupuesto vigente'}
                    </div>
                  </div>
                  <Badge color={v.color} bg={v.bg}>{v.label}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Vista previa de umbrales */}
          <div style={{ ...S.card, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Percent size={16} color="#d97706" /></div>
              <div><div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Vista previa de umbrales</div><div style={{ fontSize: 11, color: '#94a3b8' }}>Cómo se verán los estados según el consumo</div></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { pct: Math.max(0, (config.umbral_alerta || 85) - 20), label: `${Math.max(0,(config.umbral_alerta||85)-20)}% — Dentro del presupuesto` },
                { pct: config.umbral_alerta || 85, label: `${config.umbral_alerta||85}% — Umbral de alerta` },
                { pct: config.umbral_bloqueo || 100, label: `${config.umbral_bloqueo||100}% — Umbral de bloqueo` },
                { pct: (config.umbral_bloqueo || 100) + 15, label: `${(config.umbral_bloqueo||100)+15}% — Excedido` },
              ].map((item, i) => {
                const st = estadoPct(item.pct)
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div style={{ flex: 1, height: 10, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(item.pct, 100)}%`, background: `linear-gradient(90deg, ${st.color}88, ${st.color})`, borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: st.color, width: 42, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{item.pct}%</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{item.label}</div>
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: st.color, background: st.bg, padding: '4px 10px', borderRadius: 99, whiteSpace: 'nowrap' }}>
                      <st.Icon size={11} />{st.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Botón guardar configuración */}
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" style={{ height: 40, fontSize: 14, padding: '0 28px', opacity: configDirty ? 1 : .4, pointerEvents: configDirty ? 'auto' : 'none', background: '#166534' }} onClick={guardarConfig}>
              <Save size={16} /> Guardar configuración
            </button>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {showNuevoRegistro && nuevoReg && (
        <Modal title={`Nuevo registro: ${TIPO_LABELS[nuevoReg.tipo]?.label}`} subtitle={`Ejercicio ${nuevoReg.anio}`} onClose={() => setShowNuevoRegistro(false)} width={900}>
          <form onSubmit={crearRegistro}>
            <div style={{ marginBottom: 16 }}>
              <Label>Descripción</Label>
              <input className="input" value={nuevoReg.descripcion} onChange={e => setNuevoReg({...nuevoReg, descripcion: e.target.value})} placeholder="Descripción del registro presupuestario" />
            </div>
            <div style={{ ...S.card, overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ background: '#f8fafc', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>Líneas ({nuevoReg.lineas.length})</span>
                  <select className="select" style={{ height: 28, fontSize: 11, width: 130 }} value={claseFilter} onChange={e => setClaseFilter(e.target.value)}>
                    <option value="">Todas las cuentas</option>
                    {Object.entries(CLASE_LABELS).map(([k,v]) => <option key={k} value={k}>{k} — {v}</option>)}
                  </select>
                </div>
                <button type="button" className="btn-secondary" style={{ height: 30, fontSize: 11 }} onClick={addLinea}><Plus size={12} /> Agregar</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead><tr style={{ background: '#f8fafc' }}>
                    <th style={{...thL,width:200}}>Cuenta *</th>{config.dim_campo !== false && <th style={{...thL,width:110}}>Campo</th>}{config.dim_unidad_negocio !== false && <th style={{...thL,width:100}}>UN</th>}{config.dim_departamento !== false && <th style={{...thL,width:100}}>Depto</th>}
                    <th style={{...thR,width:110}}>Monto anual</th><th style={{...thL,width:110}}>Distribución</th><th style={{...thL,width:110}}>Nota</th><th style={{width:30}}></th>
                  </tr></thead>
                  <tbody>
                    {nuevoReg.lineas.map((ln:any,idx:number) => (
                      <tr key={idx}>
                        <td style={{padding:'6px'}}>
                          <select className="select" style={{width:'100%',fontSize:11}} required value={ln.cuenta_id} onChange={e=>updateLinea(idx,'cuenta_id',e.target.value)}>
                            <option value="">Seleccionar…</option>{filteredCuentas.map(c=><option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
                          </select>
                        </td>
                        {config.dim_campo !== false && <td style={{padding:'6px 4px'}}><select className="select" style={{width:'100%',fontSize:11}} value={ln.campo_id} onChange={e=>updateLinea(idx,'campo_id',e.target.value)}><option value="">—</option>{campos.map(c=><option key={c.id_campo} value={c.id_campo}>{c.nombre||c.id_campo}</option>)}</select></td>}
                        {config.dim_unidad_negocio !== false && <td style={{padding:'6px 4px'}}><select className="select" style={{width:'100%',fontSize:11}} value={ln.unidad_negocio_id} onChange={e=>updateLinea(idx,'unidad_negocio_id',e.target.value)}><option value="">—</option>{dims.unidades.map(u=><option key={u.id} value={u.id}>{u.nombre}</option>)}</select></td>}
                        {config.dim_departamento !== false && <td style={{padding:'6px 4px'}}><select className="select" style={{width:'100%',fontSize:11}} value={ln.departamento_id} onChange={e=>updateLinea(idx,'departamento_id',e.target.value)}><option value="">—</option>{dims.deptos.map(d=><option key={d.id} value={d.id}>{d.nombre}</option>)}</select></td>}
                        <td style={{padding:'6px 4px'}}><input className="input" type="number" step="0.01" style={{width:'100%',fontSize:11,textAlign:'right'}} value={ln.total} onChange={e=>updateLinea(idx,'total',e.target.value)} placeholder="0.00" /></td>
                        <td style={{padding:'6px 4px'}}><select className="select" style={{width:'100%',fontSize:11}} value={ln.dist} onChange={e=>updateLinea(idx,'dist',e.target.value)}>{Object.entries(DIST_KEYS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></td>
                        <td style={{padding:'6px 4px'}}><input className="input" style={{width:'100%',fontSize:11}} value={ln.descripcion} onChange={e=>updateLinea(idx,'descripcion',e.target.value)} placeholder="—" /></td>
                        <td style={{padding:'6px 2px',textAlign:'center'}}>{nuevoReg.lineas.length>1 && <button type="button" className="btn-icon" onClick={()=>removeLinea(idx)}><X size={13} /></button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {nuevoReg.lineas.some((ln:any) => parseFloat(ln.total) > 0) && (
                <div style={{ padding: 14, borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <DistPreviewMulti lineas={nuevoReg.lineas} />
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>Total: <strong style={{ color: '#0f172a' }}>RD$ {fmt(nuevoReg.lineas.reduce((s:number,ln:any)=>s+(parseFloat(ln.total)||0),0))}</strong></span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowNuevoRegistro(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ background: TIPO_LABELS[nuevoReg.tipo]?.color }}>Crear registro</button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {showDetalleRegistro && (
        <Modal title={`Registro ${showDetalleRegistro.numero}`} subtitle={`${TIPO_LABELS[showDetalleRegistro.tipo]?.label} — ${showDetalleRegistro.fecha}`} onClose={() => { setShowDetalleRegistro(null); setEditingRegistro(null) }} width={900}>
          {editingRegistro ? (
            <form onSubmit={guardarEdicionRegistro}>
              <div style={{ marginBottom: 16 }}>
                <Label>Descripción</Label>
                <input className="input" value={editingRegistro.descripcion} onChange={e => setEditingRegistro({...editingRegistro, descripcion: e.target.value})} placeholder="Descripción del registro presupuestario" />
              </div>
              <div style={{ ...S.card, overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ background: '#f8fafc', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>Líneas ({editingRegistro.lineas.length})</span>
                    <select className="select" style={{ height: 28, fontSize: 11, width: 130 }} value={claseFilter} onChange={e => setClaseFilter(e.target.value)}>
                      <option value="">Todas las cuentas</option>
                      {Object.entries(CLASE_LABELS).map(([k,v]) => <option key={k} value={k}>{k} — {v}</option>)}
                    </select>
                  </div>
                  <button type="button" className="btn-secondary" style={{ height: 30, fontSize: 11 }} onClick={addEditLinea}><Plus size={12} /> Agregar</button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead><tr style={{ background: '#f8fafc' }}>
                      <th style={{...thL,width:200}}>Cuenta *</th>{config.dim_campo !== false && <th style={{...thL,width:110}}>Campo</th>}{config.dim_unidad_negocio !== false && <th style={{...thL,width:100}}>UN</th>}{config.dim_departamento !== false && <th style={{...thL,width:100}}>Depto</th>}
                      <th style={{...thR,width:110}}>Monto anual</th><th style={{...thL,width:110}}>Distribución</th><th style={{...thL,width:110}}>Nota</th><th style={{width:30}}></th>
                    </tr></thead>
                    <tbody>
                      {editingRegistro.lineas.map((ln:any,idx:number) => (
                        <tr key={idx}>
                          <td style={{padding:'6px'}}>
                            <select className="select" style={{width:'100%',fontSize:11}} required value={ln.cuenta_id} onChange={e=>updateEditLinea(idx,'cuenta_id',e.target.value)}>
                              <option value="">Seleccionar…</option>{filteredCuentas.map(c=><option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
                            </select>
                          </td>
                          {config.dim_campo !== false && <td style={{padding:'6px 4px'}}><select className="select" style={{width:'100%',fontSize:11}} value={ln.campo_id} onChange={e=>updateEditLinea(idx,'campo_id',e.target.value)}><option value="">—</option>{campos.map(c=><option key={c.id_campo} value={c.id_campo}>{c.nombre||c.id_campo}</option>)}</select></td>}
                          {config.dim_unidad_negocio !== false && <td style={{padding:'6px 4px'}}><select className="select" style={{width:'100%',fontSize:11}} value={ln.unidad_negocio_id} onChange={e=>updateEditLinea(idx,'unidad_negocio_id',e.target.value)}><option value="">—</option>{dims.unidades.map(u=><option key={u.id} value={u.id}>{u.nombre}</option>)}</select></td>}
                          {config.dim_departamento !== false && <td style={{padding:'6px 4px'}}><select className="select" style={{width:'100%',fontSize:11}} value={ln.departamento_id} onChange={e=>updateEditLinea(idx,'departamento_id',e.target.value)}><option value="">—</option>{dims.deptos.map(d=><option key={d.id} value={d.id}>{d.nombre}</option>)}</select></td>}
                          <td style={{padding:'6px 4px'}}><input className="input" type="number" step="0.01" style={{width:'100%',fontSize:11,textAlign:'right'}} value={ln.total} onChange={e=>updateEditLinea(idx,'total',e.target.value)} placeholder="0.00" /></td>
                          <td style={{padding:'6px 4px'}}><select className="select" style={{width:'100%',fontSize:11}} value={ln.dist} onChange={e=>updateEditLinea(idx,'dist',e.target.value)}>{Object.entries(DIST_KEYS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></td>
                          <td style={{padding:'6px 4px'}}><input className="input" style={{width:'100%',fontSize:11}} value={ln.descripcion} onChange={e=>updateEditLinea(idx,'descripcion',e.target.value)} placeholder="—" /></td>
                          <td style={{padding:'6px 2px',textAlign:'center'}}>{editingRegistro.lineas.length>1 && <button type="button" className="btn-icon" onClick={()=>removeEditLinea(idx)}><X size={13} /></button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>Total: <strong style={{ color: '#0f172a' }}>RD$ {fmt(editingRegistro.lineas.reduce((s:number,ln:any)=>s+(parseFloat(ln.total)||0),0))}</strong></span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn-secondary" onClick={() => setEditingRegistro(null)}>Cancelar</button>
                  <button type="submit" className="btn-primary" style={{ background: '#0369a1' }}><Save size={14} /> Guardar cambios</button>
                </div>
              </div>
            </form>
          ) : (<>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            {[
              { label: 'Tipo', value: <Badge color={TIPO_LABELS[showDetalleRegistro.tipo]?.color} bg={TIPO_LABELS[showDetalleRegistro.tipo]?.bg}>{TIPO_LABELS[showDetalleRegistro.tipo]?.icon} {TIPO_LABELS[showDetalleRegistro.tipo]?.label}</Badge> },
              { label: 'Estado', value: <Badge color={ESTADO_BADGE[showDetalleRegistro.estado]?.color} bg={ESTADO_BADGE[showDetalleRegistro.estado]?.bg} border={ESTADO_BADGE[showDetalleRegistro.estado]?.border}>{ESTADO_BADGE[showDetalleRegistro.estado]?.label}</Badge> },
              { label: 'Año', value: showDetalleRegistro.anio },
              { label: 'Usuario', value: showDetalleRegistro.usuario_nombre },
            ].map((f, i) => (
              <div key={i} style={{ padding: '8px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>{f.label}</div>
                <div style={{ fontSize: 13 }}>{f.value}</div>
              </div>
            ))}
            {showDetalleRegistro.descripcion && <div style={{ flex: '1 1 100%', padding: '8px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Descripción</div>
              <div style={{ fontSize: 13, color: '#334155' }}>{showDetalleRegistro.descripcion}</div>
            </div>}
          </div>
          <div style={{ ...S.card, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ background: '#f8fafc' }}>
                  <th style={thL}>Cuenta</th><th style={thL}>Dimensiones</th>
                  {MESES.map(m => <th key={m} style={{...thR,fontSize:10}}>{m}</th>)}
                  <th style={thR}>Total</th>
                </tr></thead>
                <tbody>
                  {(showDetalleRegistro.lineas||[]).map((ln:any) => (
                    <tr key={ln.id}>
                      <td style={{...tdL,whiteSpace:'nowrap'}}><span style={{color:'#94a3b8',fontFamily:'monospace',fontSize:11,marginRight:4}}>{ln.cuenta_codigo}</span><span style={{color:'#334155'}}>{ln.cuenta_nombre}</span></td>
                      <td style={tdL}>{[ln.campo_nombre,ln.unidad_negocio_nombre,ln.departamento_nombre].filter(Boolean).length>0 ? [ln.campo_nombre,ln.unidad_negocio_nombre,ln.departamento_nombre].filter(Boolean).map((t:string,i:number) => <span key={i} style={{fontSize:9,background:'#f1f5f9',color:'#475569',padding:'2px 5px',borderRadius:3,marginRight:3}}>{t}</span>) : <span style={{color:'#e2e8f0'}}>—</span>}</td>
                      {MK.map(mk => <td key={mk} style={{...tdR,fontSize:11}}>{fmt(ln[mk])}</td>)}
                      <td style={{...tdR,fontWeight:700,color:'#0f172a'}}>{fmt(ln.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr style={{ fontWeight: 700, background: '#f1f5f9' }}>
                  <td colSpan={2} style={{...tdL,borderTop:'2px solid #cbd5e1'}}>TOTAL</td>
                  {MK.map(mk => <td key={mk} style={{...tdR,fontSize:11,borderTop:'2px solid #cbd5e1'}}>{fmt((showDetalleRegistro.lineas||[]).reduce((s:number,ln:any)=>s+Number(ln[mk]||0),0))}</td>)}
                  <td style={{...tdR,borderTop:'2px solid #cbd5e1',color:'#0f172a'}}>{fmt(showDetalleRegistro.total)}</td>
                </tr></tfoot>
              </table>
            </div>
          </div>
          {showDetalleRegistro.estado==='borrador' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn-secondary" style={{ color: '#dc2626' }} onClick={() => eliminarRegistro(showDetalleRegistro.id)}><Trash2 size={14} /> Eliminar</button>
              <button className="btn-secondary" onClick={() => initEditRegistro(showDetalleRegistro)}><Pencil size={14} /> Editar</button>
              <button className="btn-secondary" style={{ color: '#991b1b' }} onClick={() => rechazarRegistro(showDetalleRegistro.id)}><XCircle size={14} /> Rechazar</button>
              <button className="btn-primary" style={{ background: '#166534', height: 38 }} onClick={() => aprobarRegistro(showDetalleRegistro.id)}><CheckCircle2 size={14} /> Aprobar y contabilizar</button>
            </div>
          )}
          </>)}
        </Modal>
      )}

      {showCopy && (
        <Modal title="Copiar presupuesto de otro año" subtitle={`Destino: ${anio}`} onClose={() => setShowCopy(false)} width={440}>
          <form onSubmit={ejecutarCopia}>
            <div style={{ marginBottom: 16 }}><Label>Año origen *</Label><select className="select" required value={copyData.anio_origen} onChange={e => setCopyData({...copyData,anio_origen:Number(e.target.value)})}>{[2024,2025,2026,2027,2028].filter(y=>y!==anio).map(y=><option key={y} value={y}>{y}</option>)}</select></div>
            <div style={{ marginBottom: 16 }}><Label>Factor de ajuste</Label><input className="input" type="number" step="0.01" value={copyData.factor} onChange={e=>setCopyData({...copyData,factor:e.target.value})} /><p style={{margin:'6px 0 0',fontSize:11,color:'#94a3b8'}}>1.0 = exacta, 1.05 = +5%, 0.90 = -10%</p></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn-secondary" onClick={() => setShowCopy(false)}>Cancelar</button>
              <button type="submit" className="btn-primary"><Copy size={14} /> Copiar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

/* ═══════════════════════════════ sub-components ═══════════════════════════════ */
function KpiCard({ label, value, color, Icon }: any) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,.04)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={17} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{value}</div>
      </div>
    </div>
  )
}
function DimTags({ p }: any) {
  const tags = [p.campo_nombre, p.unidad_negocio_nombre, p.departamento_nombre].filter(Boolean)
  if (!tags.length) return <span style={{ color: '#e2e8f0' }}>—</span>
  return <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>{tags.map((t:string,i:number) => <span key={i} style={{ fontSize: 9, background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: 4, border: '1px solid #e2e8f0' }}>{t}</span>)}</div>
}
function DistPreviewMulti({ lineas }: { lineas: any[] }) {
  const totals = Array(12).fill(0)
  for (const ln of lineas) { distribuir(parseFloat(ln.total)||0, ln.dist||'mensual').forEach((v,i)=>{totals[i]+=v}) }
  const max = Math.max(...totals); if (!max) return null
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.3px' }}>Vista previa de distribución</div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 52 }}>
        {totals.map((v,i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div style={{ width: '100%', background: v > 0 ? 'linear-gradient(180deg, #22c55e, #166534)' : '#f1f5f9', borderRadius: 3, height: max ? Math.max((v/max)*40, v>0?3:1) : 1, transition: 'height .2s' }} />
            <span style={{ fontSize: 8, color: '#94a3b8', fontWeight: 500 }}>{MESES[i]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
