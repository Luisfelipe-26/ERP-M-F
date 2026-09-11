import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import api from '../api'
import toast from 'react-hot-toast'
import {
  PiggyBank, Plus, Trash2, X, RefreshCw, Save, Download,
  Table2, Gauge, CheckCircle2, AlertTriangle, AlertOctagon,
  Copy, Search, ChevronDown, ChevronRight,
  ChevronsDown, ChevronsRight, TrendingUp, Undo2, Settings, FileText,
  XCircle, BarChart3, Percent, Shield, Clock, Hash, Layers, Pencil, Filter,
  Upload, Lock, GitBranch, Activity
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
  const [tab, setTab] = useState<'presupuestos' | 'registros' | 'saldos' | 'control' | 'ejecucion' | 'config'>('presupuestos')
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
  const [estadoFiltro, setEstadoFiltro] = useState('')
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
  const [escenario, setEscenario] = useState('principal')
  const [escenarios, setEscenarios] = useState<any[]>([])
  const [showImportExcel, setShowImportExcel] = useState(false)
  const [importingExcel, setImportingExcel] = useState(false)
  const [periodosCerrados, setPeriodosCerrados] = useState<number[]>([])
  const [showEscenarioMgmt, setShowEscenarioMgmt] = useState(false)
  const [newEscenario, setNewEscenario] = useState({ nombre: '', origen: 'principal', factor: '1.0' })
  const [documentos, setDocumentos] = useState<any[]>([])
  const [showCrearDoc, setShowCrearDoc] = useState(false)
  const [docForm, setDocForm] = useState<any>({ nombre: '', descripcion: '', anio: new Date().getFullYear(), clase_cuentas: 'todas' })
  const [aniosFiscales, setAniosFiscales] = useState<number[]>([])
  const [nextNumero, setNextNumero] = useState('')
  const [activeDoc, setActiveDoc] = useState<any>(null)
  const [docLineas, setDocLineas] = useState<any[]>([])
  const [showAddLinea, setShowAddLinea] = useState(false)
  const [lineaForm, setLineaForm] = useState<any>({ cuenta_id: '', fecha: '', monto: '', campo_id: '', unidad_negocio_id: '', departamento_id: '', descripcion: '' })
  const [saving, setSaving] = useState(false)
  const [showEditDoc, setShowEditDoc] = useState(false)
  const [editDocForm, setEditDocForm] = useState<any>({ nombre: '', descripcion: '', anio: 0, clase_cuentas: 'todas' })
  const [editingLinea, setEditingLinea] = useState<any>(null)
  const [editLineaForm, setEditLineaForm] = useState<any>({ cuenta_id: '', fecha: '', monto: '', campo_id: '', unidad_negocio_id: '', departamento_id: '', descripcion: '' })

  // Ejecución (Fase 4)
  const [ejData, setEjData] = useState<any[]>([])
  const [ejMovs, setEjMovs] = useState<any[]>([])
  const [ejTipoFiltro, setEjTipoFiltro] = useState('')
  const [ejCuentaFiltro, setEjCuentaFiltro] = useState('')

  /* ── loaders ── */
  const loadBase = useCallback(async () => {
    const [c, f, un, dep, cfg] = await Promise.allSettled([
      api.get('/contabilidad/cuentas'), api.get('/campos'),
      api.get('/contabilidad/unidades-negocio'), api.get('/contabilidad/departamentos'),
      api.get('/contabilidad/config-presupuesto'),
    ])
    if (c.status === 'fulfilled') setCuentas(c.value.data.filter((x: any) => x.acepta_movimientos))
    else toast.error('Error al cargar plan de cuentas')
    if (f.status === 'fulfilled') setCampos(f.value.data)
    if (un.status === 'fulfilled' && dep.status === 'fulfilled') setDims({ unidades: un.value.data, deptos: dep.value.data })
    if (cfg.status === 'fulfilled') { setConfig(cfg.value.data); setConfigDirty(false) }
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
      let url = `/contabilidad/presupuesto-vs-real?anio=${anio}&escenario=${escenario}`
      if (campoFiltro) url += `&campo_id=${campoFiltro}`
      if (unFiltro) url += `&unidad_negocio_id=${unFiltro}`
      if (depFiltro) url += `&departamento_id=${depFiltro}`
      setVsReal((await api.get(url)).data)
    } catch { toast.error('Error cargando control') }
    finally { setLoading(false) }
  }, [anio, campoFiltro, unFiltro, depFiltro, escenario])

  const loadEscenarios = useCallback(async () => {
    try { setEscenarios((await api.get(`/contabilidad/presupuestos/escenarios?anio=${anio}`)).data) }
    catch { /* silently ignore */ }
  }, [anio])

  const loadPeriodos = useCallback(async () => {
    try {
      const { data } = await api.get(`/contabilidad/periodos?anio=${anio}`)
      setPeriodosCerrados((data || []).filter((p: any) => p.estado === 'cerrado').map((p: any) => p.mes))
    } catch { setPeriodosCerrados([]) }
  }, [anio])

  const loadDocumentos = useCallback(async () => {
    setLoading(true)
    try {
      const [docs, aniosRes] = await Promise.allSettled([
        api.get(`/contabilidad/presupuestos-documento?anio=${anio}`),
        api.get('/contabilidad/presupuestos-documento/anios-fiscales'),
      ])
      if (docs.status === 'fulfilled') setDocumentos(docs.value.data)
      if (aniosRes.status === 'fulfilled') setAniosFiscales(aniosRes.value.data)
    } catch { toast.error('Error al cargar presupuestos') }
    finally { setLoading(false) }
  }, [anio])

  const loadDocDetalle = useCallback(async (docId: number) => {
    try {
      const { data } = await api.get(`/contabilidad/presupuestos-documento/${docId}`)
      setActiveDoc(data)
      setDocLineas(data.lineas || [])
    } catch { toast.error('Error al cargar detalle') }
  }, [])

  const loadEjecucion = useCallback(async () => {
    setLoading(true)
    try {
      let ejUrl = `/contabilidad/ejecucion-presupuestaria?anio=${anio}`
      if (campoFiltro) ejUrl += `&campo_id=${campoFiltro}`
      if (unFiltro) ejUrl += `&unidad_negocio_id=${unFiltro}`
      if (depFiltro) ejUrl += `&departamento_id=${depFiltro}`
      let movUrl = `/contabilidad/movimientos-presupuestarios?anio=${anio}&limit=200`
      if (ejTipoFiltro) movUrl += `&tipo=${ejTipoFiltro}`
      if (ejCuentaFiltro) movUrl += `&cuenta_id=${ejCuentaFiltro}`
      const [ej, mv] = await Promise.all([api.get(ejUrl), api.get(movUrl)])
      setEjData(ej.data)
      setEjMovs(mv.data.items || mv.data)
    } catch { toast.error('Error cargando ejecución') }
    finally { setLoading(false) }
  }, [anio, campoFiltro, unFiltro, depFiltro, ejTipoFiltro, ejCuentaFiltro])

  useEffect(() => { loadBase() }, [loadBase])
  useEffect(() => { loadEscenarios() }, [loadEscenarios])
  useEffect(() => { if (tab === 'saldos') loadPeriodos() }, [tab, loadPeriodos])
  useEffect(() => {
    if (tab === 'presupuestos') loadDocumentos()
    else if (tab === 'registros') loadRegistros()
    else if (tab === 'saldos') loadSaldos()
    else if (tab === 'control') loadControl()
    else if (tab === 'ejecucion') loadEjecucion()
    else setLoading(false)
  }, [tab, loadDocumentos, loadRegistros, loadSaldos, loadControl, loadEjecucion])

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
  const [docsAprobados, setDocsAprobados] = useState<any[]>([])
  async function initNuevoRegistro(tipo: string) {
    setSaldosLinea({}); saldosFetched.current = {}
    setNuevoReg({ tipo, anio, descripcion: '', documento_id: '', lineas: [emptyLinea()] })
    setShowNuevoRegistro(true)
    try { const { data } = await api.get(`/contabilidad/presupuestos-documento?anio=${anio}`); setDocsAprobados(data.filter((d: any) => d.estado === 'aprobado')) } catch {}
  }
  function emptyLinea() { return { cuenta_id: '', campo_id: '', unidad_negocio_id: '', departamento_id: '', total: '', dist: config.distribucion_default || 'mensual', descripcion: '' } }
  function addLinea() { setNuevoReg((p: any) => ({ ...p, lineas: [...p.lineas, emptyLinea()] })) }
  function removeLinea(idx: number) { setNuevoReg((p: any) => ({ ...p, lineas: p.lineas.filter((_: any, i: number) => i !== idx) })) }
  const [saldosLinea, setSaldosLinea] = useState<Record<string, { presupuestado: number; ejecutado: number; disponible: number }>>({})
  const saldosFetched = useRef<Record<string, boolean>>({})
  function saldoKey(ln: any) { return `${ln.cuenta_id}|${ln.campo_id||''}|${ln.unidad_negocio_id||''}|${ln.departamento_id||''}` }
  function fetchSaldo(ln: any, yr: number) {
    if (!ln.cuenta_id) return
    const k = saldoKey(ln)
    if (saldosFetched.current[k]) return
    saldosFetched.current[k] = true
    let url = `/contabilidad/presupuestos/saldo-linea?anio=${yr}&cuenta_id=${ln.cuenta_id}`
    if (ln.campo_id) url += `&campo_id=${ln.campo_id}`
    if (ln.unidad_negocio_id) url += `&unidad_negocio_id=${ln.unidad_negocio_id}`
    if (ln.departamento_id) url += `&departamento_id=${ln.departamento_id}`
    api.get(url).then(({ data }) => setSaldosLinea(prev => ({ ...prev, [k]: data }))).catch(() => { delete saldosFetched.current[k] })
  }
  function updateLinea(idx: number, field: string, val: any) {
    setNuevoReg((p: any) => { const l = [...p.lineas]; l[idx] = { ...l[idx], [field]: val }; return { ...p, lineas: l } })
    if (['cuenta_id', 'campo_id', 'unidad_negocio_id', 'departamento_id'].includes(field)) {
      setNuevoReg(p => {
        const ln = p.lineas[idx]
        if (ln?.cuenta_id) fetchSaldo(ln, p.anio)
        return p
      })
    }
  }

  async function crearRegistro(e: any) {
    e.preventDefault()
    for (const ln of nuevoReg.lineas) { if (!ln.cuenta_id) { toast.error('Todas las líneas requieren cuenta'); return } }
    const tipo = nuevoReg.tipo
    if (tipo === 'original' || tipo === 'adicion') {
      for (const ln of nuevoReg.lineas) { if ((parseFloat(ln.total) || 0) < 0) { toast.error(`${tipo === 'original' ? 'Original' : 'Adición'}: los montos deben ser positivos`); return } }
    }
    if (tipo === 'transferencia') {
      const neto = nuevoReg.lineas.reduce((s: number, ln: any) => s + (parseFloat(ln.total) || 0), 0)
      if (Math.abs(neto) > 0.01) { toast.error(`Transferencia: el neto debe ser 0 (actual: ${neto.toFixed(2)})`); return }
    }
    const payload = {
      tipo: nuevoReg.tipo, anio: nuevoReg.anio, descripcion: nuevoReg.descripcion,
      documento_id: nuevoReg.documento_id ? Number(nuevoReg.documento_id) : null,
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

  async function aprobarLote() {
    const pendientes = items.filter((p: any) => p.estado === 'borrador').length
    if (!pendientes) { toast('No hay borradores pendientes'); return }
    if (!confirm(`¿Aprobar los ${pendientes} presupuestos en borrador del año ${anio}?`)) return
    try {
      const r = await api.put(`/contabilidad/presupuestos/aprobar-lote?anio=${anio}`)
      toast.success(`${r.data.aprobados} presupuesto(s) aprobado(s)`)
      loadSaldos()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error al aprobar lote') }
  }

  const [drillDown, setDrillDown] = useState<{ cuenta_codigo: string; cuenta_nombre: string; lineas: any[] } | null>(null)
  async function openDrillDown(row: any) {
    try {
      const { data } = await api.get(`/contabilidad/presupuesto-drill-down`, { params: { anio, cuenta_id: row.cuenta_id } })
      setDrillDown({ cuenta_codigo: row.cuenta_codigo, cuenta_nombre: row.cuenta_nombre, lineas: data })
    } catch { toast.error('Error al cargar detalle de asientos') }
  }
  function detectDist(ln: any): string {
    const vals = MK.map(mk => Number(ln[mk] || 0))
    const nonZero = vals.map((v, i) => v > 0 ? i : -1).filter(i => i >= 0)
    if (!nonZero.length) return config.distribucion_default || 'mensual'
    for (const [key, dk] of Object.entries(DIST_KEYS)) {
      if (dk.months.length === nonZero.length && dk.months.every((m, i) => m === nonZero[i])) return key
    }
    return 'mensual'
  }
  async function initEditRegistro(reg: any) {
    setEditingRegistro({
      id: reg.id, tipo: reg.tipo, anio: reg.anio, descripcion: reg.descripcion || '',
      documento_id: reg.documento_id ? String(reg.documento_id) : '',
      lineas: (reg.lineas || []).map((ln: any) => ({
        cuenta_id: String(ln.cuenta_id), campo_id: ln.campo_id || '',
        unidad_negocio_id: ln.unidad_negocio_id ? String(ln.unidad_negocio_id) : '',
        departamento_id: ln.departamento_id ? String(ln.departamento_id) : '',
        total: String(MK.reduce((s: number, mk: string) => s + Number(ln[mk] || 0), 0)),
        dist: detectDist(ln), descripcion: ln.descripcion || '',
      })),
    })
    try { const { data } = await api.get(`/contabilidad/presupuestos-documento?anio=${reg.anio}`); setDocsAprobados(data.filter((d: any) => d.estado === 'aprobado')) } catch {}
  }
  function updateEditLinea(idx: number, field: string, val: any) {
    setEditingRegistro((p: any) => { const l = [...p.lineas]; l[idx] = { ...l[idx], [field]: val }; return { ...p, lineas: l } })
    if (['cuenta_id', 'campo_id', 'unidad_negocio_id', 'departamento_id'].includes(field)) {
      setEditingRegistro(p => {
        const ln = p.lineas[idx]
        if (ln?.cuenta_id) fetchSaldo(ln, p.anio)
        return p
      })
    }
  }
  function addEditLinea() { setEditingRegistro((p: any) => ({ ...p, lineas: [...p.lineas, emptyLinea()] })) }
  function removeEditLinea(idx: number) { setEditingRegistro((p: any) => ({ ...p, lineas: p.lineas.filter((_: any, i: number) => i !== idx) })) }
  async function guardarEdicionRegistro(e: any) {
    e.preventDefault()
    for (const ln of editingRegistro.lineas) { if (!ln.cuenta_id) { toast.error('Todas las líneas requieren cuenta'); return } }
    const tipoE = editingRegistro.tipo
    if (tipoE === 'original' || tipoE === 'adicion') {
      for (const ln of editingRegistro.lineas) { if ((parseFloat(ln.total) || 0) < 0) { toast.error(`${tipoE === 'original' ? 'Original' : 'Adición'}: los montos deben ser positivos`); return } }
    }
    if (tipoE === 'transferencia') {
      const neto = editingRegistro.lineas.reduce((s: number, ln: any) => s + (parseFloat(ln.total) || 0), 0)
      if (Math.abs(neto) > 0.01) { toast.error(`Transferencia: el neto debe ser 0 (actual: ${neto.toFixed(2)})`); return }
    }
    const payload = {
      tipo: editingRegistro.tipo, anio: editingRegistro.anio, descripcion: editingRegistro.descripcion,
      documento_id: editingRegistro.documento_id ? Number(editingRegistro.documento_id) : null,
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
  async function importarExcel(file: File) {
    setImportingExcel(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post(`/contabilidad/presupuestos/importar-excel?anio=${anio}`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success(`${data.creados} línea(s) importada(s)${data.errores?.length ? `, ${data.errores.length} error(es)` : ''}`)
      if (data.errores?.length) data.errores.slice(0, 5).forEach((e: string) => toast.error(e, { duration: 5000 }))
      setShowImportExcel(false); loadSaldos()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error al importar') }
    finally { setImportingExcel(false) }
  }

  async function duplicarEscenario(e: any) {
    e.preventDefault()
    try {
      const { data } = await api.post('/contabilidad/presupuestos/duplicar-escenario', { anio, escenario_origen: newEscenario.origen, escenario_destino: newEscenario.nombre, factor: parseFloat(newEscenario.factor) || 1.0 })
      toast.success(`${data.creados} línea(s) copiadas al escenario "${newEscenario.nombre}"`)
      setNewEscenario({ nombre: '', origen: 'principal', factor: '1.0' }); loadEscenarios()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
  }

  async function eliminarEscenario(nombre: string) {
    if (!confirm(`¿Eliminar el escenario "${nombre}" y todas sus líneas?`)) return
    try { await api.delete(`/contabilidad/presupuestos/escenario/${nombre}?anio=${anio}`); toast.success('Escenario eliminado'); loadEscenarios(); if (escenario === nombre) setEscenario('principal') }
    catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
  }

  async function crearDocumento(e: any) {
    e.preventDefault()
    try {
      const { data } = await api.post('/contabilidad/presupuestos-documento', { ...docForm, anio })
      toast.success(`Presupuesto "${docForm.nombre}" creado`)
      setShowCrearDoc(false)
      setDocForm({ nombre: '', descripcion: '', anio, clase_cuentas: 'todas' })
      loadDocumentos()
      loadDocDetalle(data.id)
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
  }

  async function agregarLineaDoc(e: any) {
    e.preventDefault()
    if (!activeDoc) return
    try {
      await api.post(`/contabilidad/presupuestos-documento/${activeDoc.id}/lineas`, {
        cuenta_id: Number(lineaForm.cuenta_id), fecha: lineaForm.fecha,
        monto: parseFloat(lineaForm.monto) || 0,
        campo_id: lineaForm.campo_id || null,
        unidad_negocio_id: lineaForm.unidad_negocio_id ? Number(lineaForm.unidad_negocio_id) : null,
        departamento_id: lineaForm.departamento_id ? Number(lineaForm.departamento_id) : null,
        descripcion: lineaForm.descripcion || null,
      })
      toast.success('Línea agregada')
      setShowAddLinea(false)
      setLineaForm({ cuenta_id: '', fecha: '', monto: '', campo_id: '', unidad_negocio_id: '', departamento_id: '', descripcion: '' })
      loadDocDetalle(activeDoc.id)
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
  }

  async function eliminarLineaDoc(lineaId: number) {
    if (!activeDoc || !confirm('¿Eliminar esta línea?')) return
    try { await api.delete(`/contabilidad/presupuestos-documento/${activeDoc.id}/lineas/${lineaId}`); toast.success('Eliminada'); loadDocDetalle(activeDoc.id) }
    catch { toast.error('Error') }
  }

  async function aprobarDocumento(docId: number) {
    if (!confirm('¿Aprobar este presupuesto? Todas sus líneas pasarán a estado aprobado.')) return
    try { const { data } = await api.put(`/contabilidad/presupuestos-documento/${docId}/aprobar`); toast.success(`Aprobado — ${data.lineas_aprobadas} línea(s)`); loadDocumentos(); if (activeDoc?.id === docId) loadDocDetalle(docId) }
    catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
  }

  async function eliminarDocumento(docId: number) {
    if (!confirm('¿Eliminar este presupuesto y todas sus líneas?')) return
    try { await api.delete(`/contabilidad/presupuestos-documento/${docId}`); toast.success('Eliminado'); loadDocumentos(); if (activeDoc?.id === docId) setActiveDoc(null) }
    catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
  }

  function openEditDoc() {
    if (!activeDoc) return
    setEditDocForm({ nombre: activeDoc.nombre, descripcion: activeDoc.descripcion || '', anio: activeDoc.anio, clase_cuentas: activeDoc.clase_cuentas })
    setShowEditDoc(true)
  }

  async function guardarEditDoc(e: any) {
    e.preventDefault()
    try {
      await api.put(`/contabilidad/presupuestos-documento/${activeDoc.id}`, editDocForm)
      toast.success('Presupuesto actualizado')
      setShowEditDoc(false)
      loadDocDetalle(activeDoc.id)
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
  }

  function openEditLinea(ln: any) {
    setEditingLinea(ln)
    setEditLineaForm({
      cuenta_id: String(ln.cuenta_id), fecha: ln.fecha || '', monto: String(ln.total || 0),
      campo_id: ln.campo_id || '', unidad_negocio_id: ln.unidad_negocio_id ? String(ln.unidad_negocio_id) : '',
      departamento_id: ln.departamento_id ? String(ln.departamento_id) : '', descripcion: ln.descripcion || '',
    })
  }

  async function guardarEditLinea(e: any) {
    e.preventDefault()
    try {
      await api.put(`/contabilidad/presupuestos-documento/${activeDoc.id}/lineas/${editingLinea.id}`, {
        cuenta_id: Number(editLineaForm.cuenta_id), fecha: editLineaForm.fecha,
        monto: Number(editLineaForm.monto),
        campo_id: editLineaForm.campo_id || null,
        unidad_negocio_id: editLineaForm.unidad_negocio_id ? Number(editLineaForm.unidad_negocio_id) : null,
        departamento_id: editLineaForm.departamento_id ? Number(editLineaForm.departamento_id) : null,
        descripcion: editLineaForm.descripcion || null,
      })
      toast.success('Línea actualizada')
      setEditingLinea(null)
      loadDocDetalle(activeDoc.id)
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
  }

  const docCuentasFiltradas = useMemo(() => {
    if (!activeDoc || activeDoc.clase_cuentas === 'todas') return cuentas
    const clases = activeDoc.clase_cuentas.split(',').map((c: string) => c.trim())
    return cuentas.filter((c: any) => clases.includes((c.codigo || '')[0]))
  }, [cuentas, activeDoc])

  const totalComprometido = vsReal.reduce((s: number, r: any) => s + (r.total_comprometido || 0), 0)

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
    if (estadoFiltro && r.estado !== estadoFiltro) return false
    if (tipoFiltro && r.version !== tipoFiltro) return false
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
  }), [registros, busqueda, estadoFiltro, tipoFiltro, campoFiltro, unFiltro, depFiltro])

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
          { key: 'presupuestos', label: 'Presupuestos', Icon: PiggyBank, desc: 'Documentos de presupuesto' },
          { key: 'registros', label: 'Registros', Icon: FileText, desc: 'Asientos presupuestarios' },
          { key: 'saldos',    label: 'Saldos',    Icon: Table2,   desc: 'Balances por cuenta' },
          { key: 'control',   label: 'Control',   Icon: Gauge,    desc: 'Presupuesto vs Real' },
          { key: 'ejecucion', label: 'Ejecución', Icon: Activity, desc: 'Ledger presupuestario' },
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
      {tab !== 'config' && tab !== 'presupuestos' && (
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
            {tab === 'registros' && <>
              <select className="select" style={{ width: 120, height: 32 }} value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value)}>
                <option value="">Todo tipo</option>
                {Object.entries(TIPO_LABELS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select className="select" style={{ width: 120, height: 32 }} value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)}>
                <option value="">Todo estado</option>
                {Object.entries(ESTADO_BADGE).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </>}
            {tab === 'control' && escenarios.length > 1 && (
              <select className="select" style={{ width: 130, height: 32, fontWeight: 600, color: '#7c3aed', borderColor: '#c4b5fd' }} value={escenario} onChange={e => setEscenario(e.target.value)}>
                {escenarios.map((es: any) => <option key={es.escenario} value={es.escenario}>{es.escenario} ({es.count})</option>)}
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
                            {k === 'original' && 'Presupuesto base — montos positivos'}
                            {k === 'adicion' && 'Fondos adicionales — montos positivos'}
                            {k === 'transferencia' && 'Reasignar entre cuentas — neto debe ser 0'}
                            {k === 'revision' && 'Ajustar montos — positivos o negativos'}
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
              <button className="btn-secondary" style={{ height: 32, color: '#166534' }} onClick={aprobarLote} title="Aprobar todos los borradores del año"><CheckCircle2 size={14} /> Aprobar lote</button>
              <button className="btn-secondary" style={{ height: 32 }} onClick={() => setShowImportExcel(true)} title="Importar desde Excel"><Upload size={14} /> Excel</button>
              <button className="btn-secondary" style={{ height: 32 }} onClick={() => { setCopyData({anio_origen:anio-1,factor:1.0}); setShowCopy(true) }}><Copy size={14} /></button>
              <button className="btn-secondary" style={{ height: 32, color: '#7c3aed' }} onClick={() => setShowEscenarioMgmt(true)} title="Gestionar escenarios"><GitBranch size={14} /></button>
            </>}
            <button className="btn-secondary" style={{ height: 32 }} onClick={() => tab==='registros'?loadRegistros():tab==='saldos'?loadSaldos():tab==='ejecucion'?loadEjecucion():loadControl()}><RefreshCw size={14} /></button>
            {tab !== 'registros' && <button className="btn-secondary" style={{ height: 32 }} onClick={exportCSV}><Download size={14} /></button>}
          </PaneGroup>
        </div>
      )}

      {/* KPIs */}
      {tab !== 'config' && tab !== 'presupuestos' && tab !== 'ejecucion' && (
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
            {totalComprometido > 0 && <KpiCard label="Comprometido" value={`RD$ ${fmt0(totalComprometido)}`} color="#7c3aed" Icon={Lock} />}
            <KpiCard label="Disponible" value={`RD$ ${fmt0(disponible - totalComprometido)}`} color={(disponible - totalComprometido)<0?'#dc2626':'#475569'} Icon={Shield} />
            <KpiCard label="% Consumido" value={`${pctGlobal}%`} color={estadoPct(pctGlobal).color} Icon={Percent} />
            {forecast!==null && <KpiCard label="Proyección año" value={`RD$ ${fmt0(forecast)}`} color={forecast>totalPres?'#dc2626':'#0369a1'} Icon={TrendingUp} />}
          </>}
        </div>
      )}

      {loading && tab !== 'config' ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>Cargando…</div>
      ) : tab === 'presupuestos' ? (
        /* ═══ PRESUPUESTOS (documentos maestros) ═══ */
        activeDoc ? (
          /* ── Vista detalle del documento ── */
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <button className="btn-secondary" style={{ height: 32 }} onClick={() => { setActiveDoc(null); loadDocumentos() }}><ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} /> Volver</button>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>{activeDoc.nombre}{activeDoc.numero && <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 500, color: '#94a3b8' }}>{activeDoc.numero}</span>}</h2>
                <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', gap: 12, marginTop: 2 }}>
                  <span>Año fiscal {activeDoc.anio}</span>
                  <span>Estructura: {activeDoc.clase_cuentas === 'todas' ? 'Todas las cuentas' : `Clase ${activeDoc.clase_cuentas}`}</span>
                  {activeDoc.usuario_nombre && <span>Por: {activeDoc.usuario_nombre}</span>}
                </div>
              </div>
              <Badge color={ESTADO_BADGE[activeDoc.estado]?.color || '#475569'} bg={ESTADO_BADGE[activeDoc.estado]?.bg || '#f1f5f9'} border={ESTADO_BADGE[activeDoc.estado]?.border}>{ESTADO_BADGE[activeDoc.estado]?.label || activeDoc.estado}</Badge>
              {activeDoc.estado === 'borrador' && <>
                <button className="btn-secondary" style={{ height: 32 }} onClick={openEditDoc}><Pencil size={14} /> Editar</button>
                <button className="btn-secondary" style={{ height: 32 }} onClick={() => setShowAddLinea(true)}><Plus size={14} /> Agregar línea</button>
                <button className="btn-primary" style={{ height: 32, background: '#166534' }} onClick={() => aprobarDocumento(activeDoc.id)}><CheckCircle2 size={14} /> Aprobar</button>
              </>}
            </div>
            {activeDoc.descripcion && <div style={{ ...S.card, padding: '12px 16px', marginBottom: 14, fontSize: 12, color: '#475569' }}>{activeDoc.descripcion}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
              <KpiCard label="Líneas" value={String(docLineas.length)} color="#475569" Icon={Hash} />
              <KpiCard label="Total" value={`RD$ ${fmt0(docLineas.reduce((s: number, l: any) => s + (l.total || 0), 0))}`} color="#0369a1" Icon={PiggyBank} />
            </div>
            <div style={{ ...S.card, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead><tr style={{ background: '#f8fafc' }}>
                    <th style={thL}>Fecha</th><th style={thL}>Cuenta</th><th style={thL}>Dimensiones</th>
                    <th style={thR}>Monto</th><th style={thL}>Descripción</th><th style={thL}>Estado</th>
                    <th style={{ ...thR, width: 50 }}></th>
                  </tr></thead>
                  <tbody>
                    {docLineas.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: 50, color: '#94a3b8' }}>
                        <Plus size={32} style={{ marginBottom: 8, opacity: .3 }} /><br/>Sin líneas — agrega la primera
                      </td></tr>
                    ) : docLineas.map((ln: any) => {
                      const est = ESTADO_BADGE[ln.estado] || ESTADO_BADGE.borrador
                      return (
                        <tr key={ln.id}>
                          <td style={{ ...tdL, whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 11, color: '#475569' }}>{ln.fecha || '—'}</td>
                          <td style={{ ...tdL, whiteSpace: 'nowrap' }}>
                            <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 11, marginRight: 4 }}>{ln.cuenta_codigo}</span>
                            <span style={{ color: '#334155' }}>{ln.cuenta_nombre}</span>
                          </td>
                          <td style={tdL}><DimTags p={ln} /></td>
                          <td style={{ ...tdR, fontWeight: 700, color: '#0f172a' }}>{fmt(ln.total)}</td>
                          <td style={{ ...tdL, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64748b' }}>{ln.descripcion || '—'}</td>
                          <td style={tdL}><Badge color={est.color} bg={est.bg} border={est.border}>{est.label}</Badge></td>
                          <td style={{ ...S.td, textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {activeDoc.estado === 'borrador' && <>
                              <button className="btn-icon" onClick={() => openEditLinea(ln)} title="Editar"><Pencil size={13} /></button>
                              <button className="btn-icon" style={{ color: '#dc2626' }} onClick={() => eliminarLineaDoc(ln.id)} title="Eliminar"><Trash2 size={13} /></button>
                            </>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {docLineas.length > 0 && <tfoot><tr style={{ fontWeight: 700, background: '#f1f5f9' }}>
                    <td colSpan={3} style={{ ...tdL, borderTop: '2px solid #cbd5e1' }}>TOTAL ({docLineas.length} líneas)</td>
                    <td style={{ ...tdR, borderTop: '2px solid #cbd5e1' }}>{fmt(docLineas.reduce((s: number, l: any) => s + (l.total || 0), 0))}</td>
                    <td colSpan={3} style={{ borderTop: '2px solid #cbd5e1' }}></td>
                  </tr></tfoot>}
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* ── Lista de documentos ── */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: '#64748b' }}>{documentos.length} presupuesto(s) para {anio}</div>
              <button className="btn-primary" style={{ height: 36, background: '#166534' }} onClick={async () => { setDocForm({ ...docForm, anio }); setShowCrearDoc(true); try { const r = await api.get('/contabilidad/presupuestos-documento/next-numero'); setNextNumero(r.data.numero) } catch {} }}><Plus size={14} /> Crear presupuesto</button>
            </div>
            {documentos.length === 0 ? (
              <div style={{ ...S.card, padding: 60, textAlign: 'center' }}>
                <PiggyBank size={44} color="#cbd5e1" style={{ marginBottom: 12 }} />
                <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 8 }}>No hay presupuestos para {anio}</div>
                <div style={{ fontSize: 12, color: '#cbd5e1' }}>Crea uno para comenzar a planificar</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
                {documentos.map((d: any) => {
                  const est = ESTADO_BADGE[d.estado] || ESTADO_BADGE.borrador
                  return (
                    <div key={d.id} onClick={() => loadDocDetalle(d.id)}
                      style={{ ...S.card, padding: '20px 22px', cursor: 'pointer', transition: 'all .15s', borderLeft: `4px solid ${est.color}` }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.08)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.04)'; e.currentTarget.style.transform = '' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div><span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{d.nombre}</span>{d.numero && <span style={{ marginLeft: 8, fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{d.numero}</span>}</div>
                        <Badge color={est.color} bg={est.bg} border={est.border}>{est.label}</Badge>
                      </div>
                      {d.descripcion && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10, lineHeight: 1.4 }}>{d.descripcion}</div>}
                      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>
                        <span>Año fiscal {d.anio}</span>
                        <span>{d.clase_cuentas === 'todas' ? 'Todas las cuentas' : `Clase ${d.clase_cuentas}`}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                          <span style={{ color: '#475569' }}><strong>{d.lineas}</strong> líneas</span>
                          <span style={{ color: '#0369a1', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>RD$ {fmt0(d.total)}</span>
                        </div>
                        {d.estado === 'borrador' && (
                          <button className="btn-icon" style={{ color: '#dc2626' }} onClick={e => { e.stopPropagation(); eliminarDocumento(d.id) }}><Trash2 size={13} /></button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      ) : tab === 'registros' ? (
        /* ═══ REGISTROS ═══ */
        <div style={{ ...S.card, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ background: '#f8fafc' }}>
                <th style={thL}>Número</th><th style={thL}>Fecha</th><th style={thL}>Tipo</th>
                <th style={thL}>Descripción</th><th style={thL}>Modelo</th><th style={thR}>Líneas</th><th style={thR}>Monto</th>
                <th style={thL}>Estado</th><th style={thL}>Usuario</th><th style={{...thR,width:50}}></th>
              </tr></thead>
              <tbody>
                {filteredRegistros.length === 0 ? (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: 50, color: '#94a3b8' }}>
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
                      <td style={{ ...tdL, fontSize: 11, color: '#64748b', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.documento_nombre||'—'}</td>
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
                {cols.map(c => <th key={c.label} style={thR}>{periodo==='mes' && periodosCerrados.includes(c.idx[0]+1) ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Lock size={9} color="#94a3b8" />{c.label}</span> : c.label}</th>)}
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
                          <td style={tdL}>
                            <DimTags p={p} />
                            {p.estado && p.estado !== 'aprobado' && (() => { const eb = ESTADO_BADGE[p.estado] || ESTADO_BADGE.borrador; return (
                              <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 600, color: eb.color, background: eb.bg, border: `1px solid ${eb.border}`, padding: '1px 6px', borderRadius: 99, marginLeft: 4 }}>{eb.label}</span>
                            )})()}
                          </td>
                          {cols.map(c => {
                            if (periodo==='mes') { const mk=MK[c.idx[0]]; const mesNum=c.idx[0]+1; const cerrado=periodosCerrados.includes(mesNum); const aprobado=p.estado==='aprobado'; const bloqueado=cerrado||aprobado; return (
                              <td key={c.label} style={{ padding: '2px 3px', textAlign: 'right', borderBottom: '1px solid #f1f5f9', position: 'relative' }}>
                                {bloqueado ? (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3, padding: '5px 6px', fontSize: 12, color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }} title={cerrado ? 'Período cerrado' : 'Línea aprobada'}>
                                    {cerrado && <Lock size={10} color="#94a3b8" />}{fmt(cellVal(p,mk))}
                                  </div>
                                ) : (
                                  <input value={cellVal(p,mk)||''} onChange={e => setCell(p.id,mk,e.target.value)} type="number" step="0.01"
                                    style={{ width: 76, textAlign: 'right', fontVariantNumeric: 'tabular-nums', border: '1px solid transparent', borderRadius: 5, padding: '5px 6px', fontSize: 12, background: 'transparent', transition: 'all .15s' }}
                                    onFocus={e => { e.target.style.border='1px solid #93c5fd'; e.target.style.background='#fff'; e.target.style.boxShadow='0 0 0 3px rgba(59,130,246,.1)' }}
                                    onBlur={e => { e.target.style.border='1px solid transparent'; e.target.style.background='transparent'; e.target.style.boxShadow='none' }} />
                                )}
                              </td>
                            )} return <td key={c.label} style={tdR}>{fmt(c.idx.reduce((s:number,i:number)=>s+cellVal(p,MK[i]),0))}</td>
                          })}
                          <td style={{ ...tdR, fontWeight: 700, color: '#0f172a' }}>{fmt(rowTotal(p))}</td>
                          <td style={{ ...S.td, textAlign: 'center' }}>{p.estado !== 'aprobado' ? <button className="btn-icon" onClick={() => del(p.id)}><Trash2 size={13} /></button> : <Lock size={12} color="#94a3b8" title="Aprobado" />}</td>
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
          {vsReal.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
              {/* Barras: Presupuesto vs Real por mes */}
              <div style={{ ...S.card, padding: '20px 24px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Presupuesto vs Real por mes</div>
                {(() => {
                  const mData = MESES.map((m, mi) => ({
                    label: m,
                    pres: vsReal.reduce((s: number, r: any) => s + (r.meses?.[mi]?.presupuesto || 0), 0),
                    real: vsReal.reduce((s: number, r: any) => s + (r.meses?.[mi]?.real || 0), 0),
                    comp: vsReal.reduce((s: number, r: any) => s + (r.meses?.[mi]?.comprometido || 0), 0),
                  }))
                  const hasComp = mData.some(d => d.comp > 0)
                  const maxVal = Math.max(...mData.map(d => Math.max(d.pres, d.real + d.comp)), 1)
                  const W = 100, barH = 140
                  const nbars = hasComp ? 3 : 2
                  return (
                    <svg viewBox={`0 0 ${W} ${barH + 18}`} style={{ width: '100%', height: 180, display: 'block' }}>
                      {mData.map((d, i) => {
                        const gw = W / 12, bw = gw * (0.7 / nbars), x = i * gw + gw * 0.12
                        const hp = (d.pres / maxVal) * barH, hr = (d.real / maxVal) * barH
                        const hc = hasComp ? (d.comp / maxVal) * barH : 0
                        const pct = d.pres ? ((d.real + d.comp) / d.pres) * 100 : 0
                        const barColor = pct >= (config.umbral_bloqueo || 100) ? '#dc2626' : pct >= (config.umbral_alerta || 85) ? '#d97706' : '#22c55e'
                        return (
                          <g key={i}>
                            <rect x={x} y={barH - hp} width={bw} height={hp} rx={1.5} fill="#e2e8f0" />
                            <rect x={x + bw + 0.3} y={barH - hr} width={bw} height={hr} rx={1.5} fill={barColor} />
                            {hasComp && <rect x={x + (bw + 0.3) * 2} y={barH - hc} width={bw} height={hc} rx={1.5} fill="#8b5cf6" />}
                            <text x={x + bw * (nbars / 2)} y={barH + 10} textAnchor="middle" fontSize={3.5} fill="#94a3b8" fontWeight={500}>{d.label}</text>
                          </g>
                        )
                      })}
                    </svg>
                  )
                })()}
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: 11, color: '#64748b' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#e2e8f0', display: 'inline-block' }} /> Presupuesto</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#22c55e', display: 'inline-block' }} /> Real</span>
                  {totalComprometido > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#8b5cf6', display: 'inline-block' }} /> Comprometido</span>}
                </div>
              </div>
              {/* Dona: distribución por clase */}
              <div style={{ ...S.card, padding: '20px 24px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Distribución por clase</div>
                {(() => {
                  const clases: Record<string, { label: string; pres: number; real: number; color: string }> = {}
                  const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
                  vsReal.forEach((r: any) => {
                    const c = (r.cuenta_codigo || '')[0] || '?'
                    if (!clases[c]) clases[c] = { label: CLASE_LABELS[c] || `Clase ${c}`, pres: 0, real: 0, color: COLORS[Object.keys(clases).length % COLORS.length] }
                    clases[c].pres += r.total_presupuesto
                    clases[c].real += r.total_real
                  })
                  const entries = Object.values(clases).filter(c => c.pres > 0).sort((a, b) => b.pres - a.pres)
                  const total = entries.reduce((s, c) => s + c.pres, 0) || 1
                  const cx = 50, cy = 45, r1 = 32, r2 = 20
                  let angle = -90
                  const arcs = entries.map(c => {
                    const pct = c.pres / total
                    const a1 = (angle * Math.PI) / 180
                    angle += pct * 360
                    const a2 = (angle * Math.PI) / 180
                    const large = pct > 0.5 ? 1 : 0
                    const x1o = cx + r1 * Math.cos(a1), y1o = cy + r1 * Math.sin(a1)
                    const x2o = cx + r1 * Math.cos(a2), y2o = cy + r1 * Math.sin(a2)
                    const x1i = cx + r2 * Math.cos(a2), y1i = cy + r2 * Math.sin(a2)
                    const x2i = cx + r2 * Math.cos(a1), y2i = cy + r2 * Math.sin(a1)
                    return { ...c, pct, d: `M${x1o},${y1o} A${r1},${r1} 0 ${large} 1 ${x2o},${y2o} L${x1i},${y1i} A${r2},${r2} 0 ${large} 0 ${x2i},${y2i} Z` }
                  })
                  return (<>
                    <svg viewBox="0 0 100 90" style={{ width: '100%', maxWidth: 200, height: 160, display: 'block', margin: '0 auto' }}>
                      {arcs.map((a, i) => <path key={i} d={a.d} fill={a.color} stroke="#fff" strokeWidth={0.5} />)}
                      <text x={cx} y={cy - 2} textAnchor="middle" fontSize={7} fontWeight={700} fill="#0f172a">{pctGlobal}%</text>
                      <text x={cx} y={cy + 6} textAnchor="middle" fontSize={3.5} fill="#94a3b8">consumido</text>
                    </svg>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                      {arcs.map((c, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color, flexShrink: 0 }} />
                          <span style={{ flex: 1, color: '#475569' }}>{c.label}</span>
                          <span style={{ fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{(c.pct * 100).toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </>)
                })()}
              </div>
            </div>
          )}
          {vsReal.length > 0 && (
            <div style={{ ...S.card, padding: '20px 24px', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Tendencia acumulada</div>
              {(() => {
                const W = 100, H = 50
                let cumPres = 0, cumReal = 0
                const points = MESES.map((_, mi) => {
                  cumPres += vsReal.reduce((s: number, r: any) => s + (r.meses?.[mi]?.presupuesto || 0), 0)
                  cumReal += vsReal.reduce((s: number, r: any) => s + (r.meses?.[mi]?.real || 0), 0)
                  return { pres: cumPres, real: cumReal }
                })
                const maxV = Math.max(...points.map(p => Math.max(p.pres, p.real)), 1)
                const px = (i: number) => (i / 11) * (W - 6) + 3
                const py = (v: number) => H - 4 - ((v / maxV) * (H - 8))
                const presLine = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(i)},${py(p.pres)}`).join(' ')
                const realLine = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(i)},${py(p.real)}`).join(' ')
                const realArea = `${realLine} L${px(11)},${H - 4} L${px(0)},${H - 4} Z`
                return (
                  <svg viewBox={`0 0 ${W} ${H + 10}`} style={{ width: '100%', height: 120, display: 'block' }}>
                    <path d={realArea} fill="#22c55e" opacity={0.12} />
                    <path d={presLine} fill="none" stroke="#94a3b8" strokeWidth={0.7} strokeDasharray="2 1.5" />
                    <path d={realLine} fill="none" stroke="#22c55e" strokeWidth={1} />
                    {points.map((p, i) => (
                      <g key={i}>
                        <circle cx={px(i)} cy={py(p.real)} r={1.2} fill="#22c55e" />
                        <text x={px(i)} y={H + 6} textAnchor="middle" fontSize={3} fill="#94a3b8">{MESES[i]}</text>
                      </g>
                    ))}
                  </svg>
                )
              })()}
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: 11, color: '#64748b' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 14, height: 2, background: '#94a3b8', display: 'inline-block', borderTop: '1px dashed #94a3b8' }} /> Presupuesto acum.</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 14, height: 2, background: '#22c55e', display: 'inline-block' }} /> Real acum.</span>
              </div>
            </div>
          )}
          <div style={{ ...S.card, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ background: '#f8fafc' }}>
                  <th style={thL}>Cuenta</th>
                  {periodo==='mes' ? MESES.map(m => <th key={m} style={{...thR,fontSize:10}}>{m}</th>) : periodo==='trim' ? TRIMS.map(t => <th key={t.label} style={thR}>{t.label}</th>) : <th style={thR}>Año</th>}
                  <th style={thR}>Presup.</th><th style={thR}>Real</th><th style={thR}>Compr.</th><th style={thR}>Disponible</th>
                  <th style={{...thL,width:180}}>Consumo</th><th style={{...thL,width:80}}>Estado</th>
                </tr></thead>
                <tbody>
                  {vsReal.length===0 ? (
                    <tr><td colSpan={periodo==='mes'?19:periodo==='trim'?11:8} style={{ textAlign: 'center', padding: 50, color: '#94a3b8' }}>
                      <Gauge size={36} style={{ marginBottom: 8, opacity: .3 }} /><br/>Sin datos de control para {anio}
                    </td></tr>
                  ) : vsReal.map((r,i) => {
                    const comp = r.total_comprometido || 0, disp=r.total_presupuesto-r.total_real-comp, pct=r.total_presupuesto?((r.total_real+comp)/r.total_presupuesto*100):0, st=estadoPct(pct), meses=r.meses||[]
                    return (
                      <tr key={i} onClick={() => openDrillDown(r)} style={{ cursor: 'pointer', transition: 'background .1s' }} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
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
                        <td style={{...tdR,color: comp>0?'#7c3aed':'#cbd5e1'}}>{fmt(comp)}</td>
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
                    <td style={{...tdR,borderTop:'2px solid #cbd5e1',color:totalComprometido>0?'#7c3aed':'#cbd5e1'}}>{fmt(totalComprometido)}</td>
                    <td style={{...tdR,borderTop:'2px solid #cbd5e1',color:(disponible-totalComprometido)<0?'#dc2626':'#475569'}}>{fmt(disponible-totalComprometido)}</td>
                    <td colSpan={2} style={{...tdL,borderTop:'2px solid #cbd5e1',color:estadoPct(pctGlobal).color,fontWeight:700}}>{pctGlobal}% consumido</td>
                  </tr>
                </tfoot>}
              </table>
            </div>
          </div>
        </div>
      ) : tab === 'ejecucion' ? (
        /* ═══ EJECUCIÓN PRESUPUESTARIA (Fase 4) ═══ */
        <div>
          {/* KPIs de ejecución */}
          {ejData.length > 0 && (() => {
            const totAp = ejData.reduce((s: number, r: any) => s + (r.apropiado || 0), 0)
            const totCo = ejData.reduce((s: number, r: any) => s + (r.comprometido || 0), 0)
            const totDe = ejData.reduce((s: number, r: any) => s + (r.devengado || 0), 0)
            const totPa = ejData.reduce((s: number, r: any) => s + (r.pagado || 0), 0)
            const totDi = ejData.reduce((s: number, r: any) => s + (r.disponible || 0), 0)
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'APROPIADO', val: totAp, color: '#1e40af', bg: '#dbeafe' },
                  { label: 'COMPROMETIDO', val: totCo, color: '#7c3aed', bg: '#ede9fe' },
                  { label: 'DEVENGADO', val: totDe, color: '#b45309', bg: '#fef3c7' },
                  { label: 'PAGADO', val: totPa, color: '#166534', bg: '#dcfce7' },
                  { label: 'DISPONIBLE', val: totDi, color: totDi >= 0 ? '#166534' : '#dc2626', bg: totDi >= 0 ? '#f0fdf4' : '#fef2f2' },
                ].map(k => (
                  <div key={k.label} style={{ ...S.card, padding: '10px 14px', borderLeft: `4px solid ${k.color}` }}>
                    <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700 }}>{k.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: k.color }}>{fmt(k.val)}</div>
                  </div>
                ))}
              </div>
            )
          })()}

          {/* Filtros de movimientos */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <select className="select" style={{ width: 160 }} value={ejTipoFiltro} onChange={e => { setEjTipoFiltro(e.target.value); setTimeout(loadEjecucion, 50) }}>
              <option value="">Todos los tipos</option>
              {['APROPIACION', 'COMPROMISO', 'DEVENGADO', 'PAGADO', 'TRANSFERENCIA', 'MODIFICACION', 'LIBERACION'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select className="select" style={{ width: 220 }} value={ejCuentaFiltro} onChange={e => { setEjCuentaFiltro(e.target.value); setTimeout(loadEjecucion, 50) }}>
              <option value="">Todas las cuentas</option>
              {cuentas.map((c: any) => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
            </select>
          </div>

          {/* Tabla resumen de ejecución */}
          {ejData.length > 0 && (
            <div style={{ ...S.card, padding: 0, overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                Ejecución por Cuenta — {anio}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 80 }}>Código</th>
                      <th style={{ minWidth: 150 }}>Cuenta</th>
                      <th style={{ textAlign: 'right' }}>Apropiado</th>
                      <th style={{ textAlign: 'right' }}>Comprometido</th>
                      <th style={{ textAlign: 'right' }}>Devengado</th>
                      <th style={{ textAlign: 'right' }}>Pagado</th>
                      <th style={{ textAlign: 'right' }}>Disponible</th>
                      <th style={{ width: 80, textAlign: 'right' }}>% Ejec.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ejData.map((r: any) => {
                      const pctEj = r.apropiado > 0 ? Math.round(((r.comprometido + r.devengado) / r.apropiado) * 100) : 0
                      const pctColor = pctEj >= (config.umbral_bloqueo || 100) ? '#dc2626' : pctEj >= (config.umbral_alerta || 85) ? '#d97706' : '#22c55e'
                      return (
                        <tr key={r.cuenta_id}>
                          <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{r.cuenta_codigo}</td>
                          <td style={{ fontSize: 12 }}>{r.cuenta_nombre}</td>
                          <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.apropiado)}</td>
                          <td style={{ textAlign: 'right', color: '#7c3aed', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.comprometido)}</td>
                          <td style={{ textAlign: 'right', color: '#b45309', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.devengado)}</td>
                          <td style={{ textAlign: 'right', color: '#166534', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.pagado)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: r.disponible < 0 ? '#dc2626' : '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.disponible)}</td>
                          <td style={{ textAlign: 'right' }}>
                            <span style={{ background: pctColor + '18', color: pctColor, padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{pctEj}%</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Movimientos (ledger) */}
          <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
              Movimientos Presupuestarios — {anio} {ejTipoFiltro && `(${ejTipoFiltro})`}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 90 }}>Fecha</th>
                    <th style={{ width: 110 }}>Tipo</th>
                    <th>Cuenta</th>
                    <th style={{ textAlign: 'right' }}>Monto</th>
                    <th>Origen</th>
                    <th>Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {ejMovs.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Sin movimientos presupuestarios</td></tr>
                  ) : ejMovs.map((m: any) => {
                    const tipoColors: Record<string, { bg: string; color: string }> = {
                      APROPIACION: { bg: '#dbeafe', color: '#1e40af' },
                      COMPROMISO: { bg: '#ede9fe', color: '#7c3aed' },
                      DEVENGADO: { bg: '#fef3c7', color: '#b45309' },
                      PAGADO: { bg: '#dcfce7', color: '#166534' },
                      LIBERACION: { bg: '#fee2e2', color: '#dc2626' },
                      TRANSFERENCIA: { bg: '#e0e7ff', color: '#4338ca' },
                      MODIFICACION: { bg: '#f3f4f6', color: '#374151' },
                    }
                    const tc = tipoColors[m.tipo] || { bg: '#f3f4f6', color: '#374151' }
                    return (
                      <tr key={m.id}>
                        <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{m.fecha ? new Date(m.fecha).toLocaleDateString('es-DO') : '—'}</td>
                        <td><span style={{ background: tc.bg, color: tc.color, padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700 }}>{m.tipo}</span></td>
                        <td style={{ fontSize: 12 }}><span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{m.cuenta_codigo}</span> {m.cuenta_nombre}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: Number(m.monto) < 0 ? '#dc2626' : '#0f172a' }}>{fmt(m.monto)}</td>
                        <td style={{ fontSize: 11, color: '#6b7280' }}>{m.origen_tipo ? `${m.origen_tipo} ${m.origen_id || ''}` : '—'}</td>
                        <td style={{ fontSize: 11, color: '#6b7280', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.notas || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <Label>Descripción</Label>
                <input className="input" value={nuevoReg.descripcion} onChange={e => setNuevoReg({...nuevoReg, descripcion: e.target.value})} placeholder="Descripción del registro presupuestario" />
              </div>
              <div>
                <Label>Modelo presupuestario</Label>
                <select className="select" value={nuevoReg.documento_id} onChange={e => setNuevoReg({...nuevoReg, documento_id: e.target.value})}>
                  <option value="">— Sin modelo —</option>
                  {docsAprobados.map((d: any) => <option key={d.id} value={d.id}>{d.numero} — {d.nombre} ({d.anio})</option>)}
                </select>
              </div>
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
                    <th style={{...thR,width:110}}>Monto anual</th><th style={{...thR,width:90}}>Disponible</th><th style={{...thL,width:100}}>Distribución</th><th style={{...thL,width:100}}>Nota</th><th style={{width:30}}></th>
                  </tr></thead>
                  <tbody>
                    {nuevoReg.lineas.map((ln:any,idx:number) => {
                      const sk = saldoKey(ln), sl = saldosLinea[sk]
                      const tipoReg = nuevoReg.tipo
                      const minVal = (tipoReg === 'original' || tipoReg === 'adicion') ? '0' : undefined
                      return (
                      <tr key={idx}>
                        <td style={{padding:'6px'}}>
                          <select className="select" style={{width:'100%',fontSize:11}} required value={ln.cuenta_id} onChange={e=>updateLinea(idx,'cuenta_id',e.target.value)}>
                            <option value="">Seleccionar…</option>{filteredCuentas.map(c=><option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
                          </select>
                        </td>
                        {config.dim_campo !== false && <td style={{padding:'6px 4px'}}><select className="select" style={{width:'100%',fontSize:11}} value={ln.campo_id} onChange={e=>updateLinea(idx,'campo_id',e.target.value)}><option value="">—</option>{campos.map(c=><option key={c.id_campo} value={c.id_campo}>{c.nombre||c.id_campo}</option>)}</select></td>}
                        {config.dim_unidad_negocio !== false && <td style={{padding:'6px 4px'}}><select className="select" style={{width:'100%',fontSize:11}} value={ln.unidad_negocio_id} onChange={e=>updateLinea(idx,'unidad_negocio_id',e.target.value)}><option value="">—</option>{dims.unidades.map(u=><option key={u.id} value={u.id}>{u.nombre}</option>)}</select></td>}
                        {config.dim_departamento !== false && <td style={{padding:'6px 4px'}}><select className="select" style={{width:'100%',fontSize:11}} value={ln.departamento_id} onChange={e=>updateLinea(idx,'departamento_id',e.target.value)}><option value="">—</option>{dims.deptos.map(d=><option key={d.id} value={d.id}>{d.nombre}</option>)}</select></td>}
                        <td style={{padding:'6px 4px'}}><input className="input" type="number" step="0.01" min={minVal} style={{width:'100%',fontSize:11,textAlign:'right'}} value={ln.total} onChange={e=>updateLinea(idx,'total',e.target.value)} placeholder="0.00" /></td>
                        <td style={{padding:'6px 4px',textAlign:'right',fontSize:10,whiteSpace:'nowrap'}}>
                          {ln.cuenta_id && sl ? (
                            <div>
                              <div style={{color:'#64748b'}}>P: {fmt(sl.presupuestado)}</div>
                              <div style={{color:'#ea580c'}}>E: {fmt(sl.ejecutado)}</div>
                              <div style={{fontWeight:700,color:sl.disponible>=0?'#166534':'#dc2626'}}>D: {fmt(sl.disponible)}</div>
                            </div>
                          ) : ln.cuenta_id ? <span style={{color:'#cbd5e1'}}>…</span> : <span style={{color:'#e2e8f0'}}>—</span>}
                        </td>
                        <td style={{padding:'6px 4px'}}><select className="select" style={{width:'100%',fontSize:11}} value={ln.dist} onChange={e=>updateLinea(idx,'dist',e.target.value)}>{Object.entries(DIST_KEYS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></td>
                        <td style={{padding:'6px 4px'}}><input className="input" style={{width:'100%',fontSize:11}} value={ln.descripcion} onChange={e=>updateLinea(idx,'descripcion',e.target.value)} placeholder="—" /></td>
                        <td style={{padding:'6px 2px',textAlign:'center'}}>{nuevoReg.lineas.length>1 && <button type="button" className="btn-icon" onClick={()=>removeLinea(idx)}><X size={13} /></button>}</td>
                      </tr>
                    )})}
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
              {(() => {
                const totalNeto = nuevoReg.lineas.reduce((s:number,ln:any)=>s+(parseFloat(ln.total)||0),0)
                if (nuevoReg.tipo === 'transferencia') {
                  const cuadra = Math.abs(totalNeto) < 0.01
                  return <span style={{ fontSize: 13, color: cuadra ? '#166534' : '#dc2626', fontWeight: 700 }}>Neto: RD$ {fmt(totalNeto)} {cuadra ? '(cuadrado)' : '(debe ser 0)'}</span>
                }
                return <span style={{ fontSize: 13, color: '#64748b' }}>Total: <strong style={{ color: '#0f172a' }}>RD$ {fmt(totalNeto)}</strong></span>
              })()}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div>
                  <Label>Descripción</Label>
                  <input className="input" value={editingRegistro.descripcion} onChange={e => setEditingRegistro({...editingRegistro, descripcion: e.target.value})} placeholder="Descripción del registro presupuestario" />
                </div>
                <div>
                  <Label>Modelo presupuestario</Label>
                  <select className="select" value={editingRegistro.documento_id || ''} onChange={e => setEditingRegistro({...editingRegistro, documento_id: e.target.value})}>
                    <option value="">— Sin modelo —</option>
                    {docsAprobados.map((d: any) => <option key={d.id} value={d.id}>{d.numero} — {d.nombre} ({d.anio})</option>)}
                  </select>
                </div>
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
                      <th style={{...thR,width:110}}>Monto anual</th><th style={{...thR,width:90}}>Disponible</th><th style={{...thL,width:100}}>Distribución</th><th style={{...thL,width:100}}>Nota</th><th style={{width:30}}></th>
                    </tr></thead>
                    <tbody>
                      {editingRegistro.lineas.map((ln:any,idx:number) => {
                        const sk = saldoKey(ln), sl = saldosLinea[sk]
                        const tipoReg = editingRegistro.tipo
                        const minVal = (tipoReg === 'original' || tipoReg === 'adicion') ? '0' : undefined
                        return (
                        <tr key={idx}>
                          <td style={{padding:'6px'}}>
                            <select className="select" style={{width:'100%',fontSize:11}} required value={ln.cuenta_id} onChange={e=>updateEditLinea(idx,'cuenta_id',e.target.value)}>
                              <option value="">Seleccionar…</option>{filteredCuentas.map(c=><option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
                            </select>
                          </td>
                          {config.dim_campo !== false && <td style={{padding:'6px 4px'}}><select className="select" style={{width:'100%',fontSize:11}} value={ln.campo_id} onChange={e=>updateEditLinea(idx,'campo_id',e.target.value)}><option value="">—</option>{campos.map(c=><option key={c.id_campo} value={c.id_campo}>{c.nombre||c.id_campo}</option>)}</select></td>}
                          {config.dim_unidad_negocio !== false && <td style={{padding:'6px 4px'}}><select className="select" style={{width:'100%',fontSize:11}} value={ln.unidad_negocio_id} onChange={e=>updateEditLinea(idx,'unidad_negocio_id',e.target.value)}><option value="">—</option>{dims.unidades.map(u=><option key={u.id} value={u.id}>{u.nombre}</option>)}</select></td>}
                          {config.dim_departamento !== false && <td style={{padding:'6px 4px'}}><select className="select" style={{width:'100%',fontSize:11}} value={ln.departamento_id} onChange={e=>updateEditLinea(idx,'departamento_id',e.target.value)}><option value="">—</option>{dims.deptos.map(d=><option key={d.id} value={d.id}>{d.nombre}</option>)}</select></td>}
                          <td style={{padding:'6px 4px'}}><input className="input" type="number" step="0.01" min={minVal} style={{width:'100%',fontSize:11,textAlign:'right'}} value={ln.total} onChange={e=>updateEditLinea(idx,'total',e.target.value)} placeholder="0.00" /></td>
                          <td style={{padding:'6px 4px',textAlign:'right',fontSize:10,whiteSpace:'nowrap'}}>
                            {ln.cuenta_id && sl ? (
                              <div>
                                <div style={{color:'#64748b'}}>P: {fmt(sl.presupuestado)}</div>
                                <div style={{color:'#ea580c'}}>E: {fmt(sl.ejecutado)}</div>
                                <div style={{fontWeight:700,color:sl.disponible>=0?'#166534':'#dc2626'}}>D: {fmt(sl.disponible)}</div>
                              </div>
                            ) : ln.cuenta_id ? <span style={{color:'#cbd5e1'}}>…</span> : <span style={{color:'#e2e8f0'}}>—</span>}
                          </td>
                          <td style={{padding:'6px 4px'}}><select className="select" style={{width:'100%',fontSize:11}} value={ln.dist} onChange={e=>updateEditLinea(idx,'dist',e.target.value)}>{Object.entries(DIST_KEYS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></td>
                          <td style={{padding:'6px 4px'}}><input className="input" style={{width:'100%',fontSize:11}} value={ln.descripcion} onChange={e=>updateEditLinea(idx,'descripcion',e.target.value)} placeholder="—" /></td>
                          <td style={{padding:'6px 2px',textAlign:'center'}}>{editingRegistro.lineas.length>1 && <button type="button" className="btn-icon" onClick={()=>removeEditLinea(idx)}><X size={13} /></button>}</td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {(() => {
                  const totalNeto = editingRegistro.lineas.reduce((s:number,ln:any)=>s+(parseFloat(ln.total)||0),0)
                  if (editingRegistro.tipo === 'transferencia') {
                    const cuadra = Math.abs(totalNeto) < 0.01
                    return <span style={{ fontSize: 13, color: cuadra ? '#166534' : '#dc2626', fontWeight: 700 }}>Neto: RD$ {fmt(totalNeto)} {cuadra ? '(cuadrado)' : '(debe ser 0)'}</span>
                  }
                  return <span style={{ fontSize: 13, color: '#64748b' }}>Total: <strong style={{ color: '#0f172a' }}>RD$ {fmt(totalNeto)}</strong></span>
                })()}
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
              ...(showDetalleRegistro.documento_nombre ? [{ label: 'Modelo', value: showDetalleRegistro.documento_nombre }] : []),
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

      {showCrearDoc && (
        <Modal title="Crear presupuesto" subtitle={nextNumero || 'Nuevo'} onClose={() => setShowCrearDoc(false)} width={540}>
          {nextNumero && <div style={{ marginBottom: 16, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={14} color="#166534" />
            <span style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>{nextNumero}</span>
            <span style={{ fontSize: 11, color: '#64748b' }}>se asignará automáticamente</span>
          </div>}
          <form onSubmit={crearDocumento}>
            <div style={{ marginBottom: 16 }}>
              <Label>Nombre del presupuesto *</Label>
              <input className="input" required value={docForm.nombre} onChange={e => setDocForm({ ...docForm, nombre: e.target.value })} placeholder="ej: Presupuesto Operativo 2026" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <Label>Descripción</Label>
                <input className="input" value={docForm.descripcion} onChange={e => setDocForm({ ...docForm, descripcion: e.target.value })} placeholder="Descripción opcional" />
              </div>
              <div>
                <Label>Año fiscal *</Label>
                <select className="select" required value={docForm.anio} onChange={e => setDocForm({ ...docForm, anio: Number(e.target.value) })}>
                  {aniosFiscales.length > 0
                    ? aniosFiscales.map(y => <option key={y} value={y}>{y}</option>)
                    : [anio - 1, anio, anio + 1].map(y => <option key={y} value={y}>{y}</option>)
                  }
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <Label>Estructura contable (clases de cuentas)</Label>
              <select className="select" value={docForm.clase_cuentas} onChange={e => setDocForm({ ...docForm, clase_cuentas: e.target.value })}>
                <option value="todas">Todas las cuentas</option>
                {Object.entries(CLASE_LABELS).map(([k, v]) => <option key={k} value={k}>{k} — {v}</option>)}
                <option value="5,6">5,6 — Costos y Gastos</option>
                <option value="4">4 — Solo Ingresos</option>
                <option value="1,2">1,2 — Activos y Pasivos</option>
              </select>
              <p style={{ margin: '6px 0 0', fontSize: 11, color: '#94a3b8' }}>Filtra las cuentas disponibles al agregar líneas</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn-secondary" onClick={() => setShowCrearDoc(false)}>Cancelar</button>
              <button type="submit" className="btn-primary" style={{ background: '#166534' }}><Plus size={14} /> Crear presupuesto</button>
            </div>
          </form>
        </Modal>
      )}

      {showAddLinea && activeDoc && (
        <Modal title="Agregar línea al presupuesto" subtitle={activeDoc.nombre} onClose={() => setShowAddLinea(false)} width={600}>
          <form onSubmit={agregarLineaDoc}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <Label>Fecha *</Label>
                <input className="input" type="date" required value={lineaForm.fecha} onChange={e => setLineaForm({ ...lineaForm, fecha: e.target.value })}
                  min={`${activeDoc.anio}-01-01`}
                  max={`${activeDoc.anio}-12-31`} />
              </div>
              <div>
                <Label>Monto *</Label>
                <input className="input" type="number" step="0.01" required value={lineaForm.monto} onChange={e => setLineaForm({ ...lineaForm, monto: e.target.value })} placeholder="0.00" style={{ textAlign: 'right' }} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Label>Cuenta contable *</Label>
              <select className="select" required value={lineaForm.cuenta_id} onChange={e => setLineaForm({ ...lineaForm, cuenta_id: e.target.value })}>
                <option value="">Seleccionar cuenta…</option>
                {docCuentasFiltradas.map((c: any) => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
              {config.dim_campo !== false && <div><Label>Campo</Label><select className="select" value={lineaForm.campo_id} onChange={e => setLineaForm({ ...lineaForm, campo_id: e.target.value })}><option value="">—</option>{campos.map(c => <option key={c.id_campo} value={c.id_campo}>{c.nombre || c.id_campo}</option>)}</select></div>}
              {config.dim_unidad_negocio !== false && <div><Label>UN</Label><select className="select" value={lineaForm.unidad_negocio_id} onChange={e => setLineaForm({ ...lineaForm, unidad_negocio_id: e.target.value })}><option value="">—</option>{dims.unidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}</select></div>}
              {config.dim_departamento !== false && <div><Label>Depto</Label><select className="select" value={lineaForm.departamento_id} onChange={e => setLineaForm({ ...lineaForm, departamento_id: e.target.value })}><option value="">—</option>{dims.deptos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}</select></div>}
            </div>
            <div style={{ marginBottom: 20 }}>
              <Label>Descripción</Label>
              <input className="input" value={lineaForm.descripcion} onChange={e => setLineaForm({ ...lineaForm, descripcion: e.target.value })} placeholder="Nota sobre esta línea" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn-secondary" onClick={() => setShowAddLinea(false)}>Cancelar</button>
              <button type="submit" className="btn-primary" style={{ background: '#166534' }}><Plus size={14} /> Agregar línea</button>
            </div>
          </form>
        </Modal>
      )}

      {showEditDoc && activeDoc && (
        <Modal title="Editar presupuesto" subtitle={activeDoc.numero || activeDoc.nombre} onClose={() => setShowEditDoc(false)} width={540}>
          <form onSubmit={guardarEditDoc}>
            <div style={{ marginBottom: 16 }}>
              <Label>Nombre del presupuesto *</Label>
              <input className="input" required value={editDocForm.nombre} onChange={e => setEditDocForm({ ...editDocForm, nombre: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <Label>Descripción</Label>
                <input className="input" value={editDocForm.descripcion} onChange={e => setEditDocForm({ ...editDocForm, descripcion: e.target.value })} />
              </div>
              <div>
                <Label>Año fiscal *</Label>
                <select className="select" required value={editDocForm.anio} onChange={e => setEditDocForm({ ...editDocForm, anio: Number(e.target.value) })}>
                  {aniosFiscales.length > 0
                    ? aniosFiscales.map(y => <option key={y} value={y}>{y}</option>)
                    : [anio - 1, anio, anio + 1].map(y => <option key={y} value={y}>{y}</option>)
                  }
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <Label>Estructura contable (clases de cuentas)</Label>
              <select className="select" value={editDocForm.clase_cuentas} onChange={e => setEditDocForm({ ...editDocForm, clase_cuentas: e.target.value })}>
                <option value="todas">Todas las cuentas</option>
                {Object.entries(CLASE_LABELS).map(([k, v]) => <option key={k} value={k}>{k} — {v}</option>)}
                <option value="5,6">5,6 — Costos y Gastos</option>
                <option value="4">4 — Solo Ingresos</option>
                <option value="1,2">1,2 — Activos y Pasivos</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn-secondary" onClick={() => setShowEditDoc(false)}>Cancelar</button>
              <button type="submit" className="btn-primary" style={{ background: '#166534' }}><Save size={14} /> Guardar cambios</button>
            </div>
          </form>
        </Modal>
      )}

      {editingLinea && activeDoc && (
        <Modal title="Editar línea" subtitle={`${editingLinea.cuenta_codigo} — ${editingLinea.cuenta_nombre}`} onClose={() => setEditingLinea(null)} width={600}>
          <form onSubmit={guardarEditLinea}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <Label>Fecha *</Label>
                <input className="input" type="date" required value={editLineaForm.fecha} onChange={e => setEditLineaForm({ ...editLineaForm, fecha: e.target.value })}
                  min={`${activeDoc.anio}-01-01`} max={`${activeDoc.anio}-12-31`} />
              </div>
              <div>
                <Label>Monto *</Label>
                <input className="input" type="number" step="0.01" required value={editLineaForm.monto} onChange={e => setEditLineaForm({ ...editLineaForm, monto: e.target.value })} style={{ textAlign: 'right' }} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Label>Cuenta contable *</Label>
              <select className="select" required value={editLineaForm.cuenta_id} onChange={e => setEditLineaForm({ ...editLineaForm, cuenta_id: e.target.value })}>
                <option value="">Seleccionar cuenta…</option>
                {docCuentasFiltradas.map((c: any) => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
              {config.dim_campo !== false && <div><Label>Campo</Label><select className="select" value={editLineaForm.campo_id} onChange={e => setEditLineaForm({ ...editLineaForm, campo_id: e.target.value })}><option value="">—</option>{campos.map(c => <option key={c.id_campo} value={c.id_campo}>{c.nombre || c.id_campo}</option>)}</select></div>}
              {config.dim_unidad_negocio !== false && <div><Label>UN</Label><select className="select" value={editLineaForm.unidad_negocio_id} onChange={e => setEditLineaForm({ ...editLineaForm, unidad_negocio_id: e.target.value })}><option value="">—</option>{dims.unidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}</select></div>}
              {config.dim_departamento !== false && <div><Label>Depto</Label><select className="select" value={editLineaForm.departamento_id} onChange={e => setEditLineaForm({ ...editLineaForm, departamento_id: e.target.value })}><option value="">—</option>{dims.deptos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}</select></div>}
            </div>
            <div style={{ marginBottom: 20 }}>
              <Label>Descripción</Label>
              <input className="input" value={editLineaForm.descripcion} onChange={e => setEditLineaForm({ ...editLineaForm, descripcion: e.target.value })} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn-secondary" onClick={() => setEditingLinea(null)}>Cancelar</button>
              <button type="submit" className="btn-primary" style={{ background: '#166534' }}><Save size={14} /> Guardar cambios</button>
            </div>
          </form>
        </Modal>
      )}

      {showImportExcel && (
        <Modal title="Importar presupuesto desde Excel" subtitle={`Año ${anio} — Las líneas se crean como borrador`} onClose={() => setShowImportExcel(false)} width={520}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '14px 16px', fontSize: 12, color: '#0369a1', lineHeight: 1.6 }}>
              <strong>Formato esperado del Excel:</strong><br/>
              Columna A: <code>cuenta_codigo</code> (ej: 6101-001)<br/>
              Columnas B-M: montos de Ene a Dic (opcionales)<br/>
              Si solo hay columna B, se toma como total anual y se distribuye mensualmente.<br/>
              Columnas opcionales: <code>campo_id</code>, <code>unidad_negocio_id</code>, <code>departamento_id</code>
            </div>
          </div>
          <div style={{ border: '2px dashed #cbd5e1', borderRadius: 10, padding: 40, textAlign: 'center', marginBottom: 20, background: '#f8fafc' }}>
            <Upload size={32} color="#94a3b8" style={{ marginBottom: 8 }} />
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#64748b' }}>Arrastra tu archivo .xlsx aquí o</p>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 20px', background: '#166534', color: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              <Upload size={14} /> Seleccionar archivo
              <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) importarExcel(f) }} disabled={importingExcel} />
            </label>
          </div>
          {importingExcel && <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Procesando archivo…</div>}
        </Modal>
      )}

      {showEscenarioMgmt && (
        <Modal title="Gestionar escenarios de presupuesto" subtitle={`Año ${anio} — Solo "principal" se usa para control presupuestario`} onClose={() => setShowEscenarioMgmt(false)} width={600}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>Escenarios existentes</div>
            {escenarios.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Sin escenarios para {anio}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {escenarios.map((es: any) => (
                  <div key={es.escenario} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: es.escenario === 'principal' ? '#f0fdf4' : '#f8fafc', borderRadius: 8, border: `1px solid ${es.escenario === 'principal' ? '#86efac' : '#e2e8f0'}` }}>
                    <GitBranch size={14} color={es.escenario === 'principal' ? '#166534' : '#7c3aed'} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{es.escenario}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{es.count} línea(s){es.escenario === 'principal' && ' — usado para control'}</div>
                    </div>
                    {es.escenario !== 'principal' && (
                      <button className="btn-icon" style={{ color: '#dc2626' }} onClick={() => eliminarEscenario(es.escenario)}><Trash2 size={13} /></button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>Crear nuevo escenario</div>
            <form onSubmit={duplicarEscenario}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 10, marginBottom: 12 }}>
                <div>
                  <Label>Nombre *</Label>
                  <input className="input" required value={newEscenario.nombre} onChange={e => setNewEscenario({ ...newEscenario, nombre: e.target.value })} placeholder="ej: optimista" />
                </div>
                <div>
                  <Label>Copiar desde</Label>
                  <select className="select" value={newEscenario.origen} onChange={e => setNewEscenario({ ...newEscenario, origen: e.target.value })}>
                    {escenarios.map((es: any) => <option key={es.escenario} value={es.escenario}>{es.escenario}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Factor</Label>
                  <input className="input" type="number" step="0.01" value={newEscenario.factor} onChange={e => setNewEscenario({ ...newEscenario, factor: e.target.value })} />
                </div>
              </div>
              <p style={{ margin: '0 0 12px', fontSize: 11, color: '#94a3b8' }}>Factor: 1.0 = copia exacta, 1.10 = +10%, 0.85 = -15%</p>
              <button type="submit" className="btn-primary" style={{ background: '#7c3aed' }}><GitBranch size={14} /> Crear escenario</button>
            </form>
          </div>
        </Modal>
      )}

      {drillDown && (
        <Modal title={`Detalle de asientos — ${drillDown.cuenta_codigo}`} subtitle={drillDown.cuenta_nombre} onClose={() => setDrillDown(null)} width={800}>
          {drillDown.lineas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Sin asientos contabilizados para esta cuenta en {anio}</div>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: 460, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                  <th style={thL}>Fecha</th>
                  <th style={thL}>Asiento</th>
                  <th style={thL}>Descripción</th>
                  <th style={thR}>Debe</th>
                  <th style={thR}>Haber</th>
                  <th style={thL}>Origen</th>
                </tr></thead>
                <tbody>
                  {drillDown.lineas.map((l: any, i: number) => (
                    <tr key={i}>
                      <td style={{ ...tdL, whiteSpace: 'nowrap' }}>{l.fecha ? new Date(l.fecha).toLocaleDateString('es-DO') : '—'}</td>
                      <td style={{ ...tdL, fontFamily: 'monospace', fontSize: 11, color: '#166534', fontWeight: 600 }}>{l.asiento_numero || '—'}</td>
                      <td style={{ ...tdL, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.descripcion || '—'}</td>
                      <td style={{ ...tdR, color: l.debe > 0 ? '#0f172a' : '#cbd5e1' }}>{fmt(l.debe)}</td>
                      <td style={{ ...tdR, color: l.haber > 0 ? '#0f172a' : '#cbd5e1' }}>{fmt(l.haber)}</td>
                      <td style={tdL}>{l.origen ? <span style={{ fontSize: 9, background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: 4 }}>{l.origen}</span> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr style={{ fontWeight: 700, background: '#f1f5f9' }}>
                  <td colSpan={3} style={{ ...tdL, borderTop: '2px solid #cbd5e1' }}>TOTAL ({drillDown.lineas.length} líneas)</td>
                  <td style={{ ...tdR, borderTop: '2px solid #cbd5e1' }}>{fmt(drillDown.lineas.reduce((s: number, l: any) => s + (l.debe || 0), 0))}</td>
                  <td style={{ ...tdR, borderTop: '2px solid #cbd5e1' }}>{fmt(drillDown.lineas.reduce((s: number, l: any) => s + (l.haber || 0), 0))}</td>
                  <td style={{ borderTop: '2px solid #cbd5e1' }}></td>
                </tr></tfoot>
              </table>
            </div>
          )}
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
