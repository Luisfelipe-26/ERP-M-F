import { useEffect, useState, useCallback } from 'react'
import api from '../api'
import toast from 'react-hot-toast'
import {
  PiggyBank, Plus, Trash2, X, RefreshCw, Save, Download, Sliders,
  Table2, Gauge, CheckCircle2, AlertTriangle, AlertOctagon, ArrowRightLeft,
  Copy, Search, ChevronDown, ChevronRight, Check, FileCheck2
} from 'lucide-react'

/* ────────────────────────────── helpers ────────────────────────────── */
const fmt = (n: any) => Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmt0 = (n: any) => Number(n || 0).toLocaleString('es-DO', { maximumFractionDigits: 0 })
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MK = ['monto_ene', 'monto_feb', 'monto_mar', 'monto_abr', 'monto_may', 'monto_jun', 'monto_jul', 'monto_ago', 'monto_sep', 'monto_oct', 'monto_nov', 'monto_dic']
const TRIMS = [{ label: 'T1', m: [0, 1, 2] }, { label: 'T2', m: [3, 4, 5] }, { label: 'T3', m: [6, 7, 8] }, { label: 'T4', m: [9, 10, 11] }]

const CLAVES: Record<string, { label: string; w: number[] }> = {
  uniforme: { label: 'Uniforme', w: Array(12).fill(1) },
  estacional: { label: 'Estacional (cosecha)', w: [0.5, 0.5, 0.7, 0.9, 1.2, 1.4, 1.6, 1.6, 1.3, 1.0, 0.9, 0.8] },
  frontal: { label: 'Frontal (H1)', w: [1.6, 1.6, 1.5, 1.3, 1.1, 0.9, 0.7, 0.6, 0.5, 0.5, 0.6, 0.6] },
  final: { label: 'Final (H2)', w: [0.5, 0.5, 0.6, 0.7, 0.8, 0.9, 1.1, 1.3, 1.5, 1.6, 1.6, 1.4] },
}

function distribuir(total: number, clave: string): number[] {
  const w = CLAVES[clave]?.w || CLAVES.uniforme.w
  const sumW = w.reduce((a, b) => a + b, 0)
  const vals = w.map(x => Math.round((total * x / sumW) * 100) / 100)
  const ajuste = Math.round((total - vals.reduce((a, b) => a + b, 0)) * 100) / 100
  vals[11] = Math.round((vals[11] + ajuste) * 100) / 100
  return vals
}

const ESTADO_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  borrador: { bg: '#fef3c7', color: '#92400e', label: 'Borrador' },
  aprobado: { bg: '#d1fae5', color: '#065f46', label: 'Aprobado' },
  rechazado: { bg: '#fee2e2', color: '#991b1b', label: 'Rechazado' },
}

const CLASE_LABELS: Record<string, string> = {
  '1': 'Activos', '2': 'Pasivos', '3': 'Patrimonio',
  '4': 'Ingresos', '5': 'Costos', '6': 'Gastos',
}

const Modal = ({ title, subtitle = '', onClose, children, width = 640 }: any) => (
  <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="modal" style={{ maxWidth: width, width: '95%', maxHeight: '90vh', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h2>
          {subtitle && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>{subtitle}</p>}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}><X size={18} /></button>
      </div>
      {children}
    </div>
  </div>
)
const Label = ({ children }: any) => (
  <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>{children}</label>
)

const PaneGroup = ({ title, children }: any) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 14px', borderRight: '1px solid #e5e7eb' }}>
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>{children}</div>
    <div style={{ fontSize: 9, color: '#9ca3af', textAlign: 'center', textTransform: 'uppercase', letterSpacing: .4, fontWeight: 600 }}>{title}</div>
  </div>
)

/* ────────────────────────────── page ────────────────────────────── */
export default function Presupuesto() {
  const [tab, setTab] = useState<'registro' | 'control'>('registro')
  const [periodo, setPeriodo] = useState<'mes' | 'trim' | 'anio'>('mes')
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)

  const [items, setItems] = useState<any[]>([])
  const [vsReal, setVsReal] = useState<any[]>([])
  const [cuentas, setCuentas] = useState<any[]>([])
  const [campos, setCampos] = useState<any[]>([])
  const [dims, setDims] = useState<{ unidades: any[]; deptos: any[]; almacenes: any[] }>({ unidades: [], deptos: [], almacenes: [] })

  const [edits, setEdits] = useState<Record<number, Record<string, any>>>({})
  const [saving, setSaving] = useState(false)
  const [campoFiltro, setCampoFiltro] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const [showLine, setShowLine] = useState(false)
  const [showDist, setShowDist] = useState<any>(null)
  const [showTransfer, setShowTransfer] = useState(false)
  const [showCopy, setShowCopy] = useState(false)
  const [nueva, setNueva] = useState<any>(null)
  const [transfer, setTransfer] = useState<any>({})
  const [copyData, setCopyData] = useState<any>({ anio_origen: anio - 1, factor: 1.0 })
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, c, f, un, dep, alm] = await Promise.all([
        api.get(`/contabilidad/presupuestos?anio=${anio}`),
        api.get('/contabilidad/cuentas'),
        api.get('/campos'),
        api.get('/contabilidad/unidades-negocio'),
        api.get('/contabilidad/departamentos'),
        api.get('/contabilidad/almacenes'),
      ])
      setItems(p.data)
      setEdits({})
      setCuentas(c.data.filter((x: any) => x.acepta_movimientos))
      setCampos(f.data)
      setDims({ unidades: un.data, deptos: dep.data, almacenes: alm.data })
    } catch { toast.error('Error al cargar presupuestos') }
    finally { setLoading(false) }
  }, [anio])

  const loadControl = useCallback(async () => {
    setLoading(true)
    try {
      let url = `/contabilidad/presupuesto-vs-real?anio=${anio}`
      if (campoFiltro) url += `&campo_id=${campoFiltro}`
      const r = await api.get(url)
      setVsReal(r.data)
    } catch { toast.error('Error cargando control presupuestario') }
    finally { setLoading(false) }
  }, [anio, campoFiltro])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (tab === 'control') loadControl() }, [tab, loadControl])

  const cellVal = (row: any, mk: string) => {
    const e = edits[row.id]
    return e && mk in e ? e[mk] : Number(row[mk] || 0)
  }
  const rowTotal = (row: any) => MK.reduce((s, mk) => s + cellVal(row, mk), 0)
  const dirty = Object.keys(edits).length > 0

  const setCell = (id: number, mk: string, v: string) => {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [mk]: parseFloat(v) || 0 } }))
  }
  const setDesc = (id: number, v: string) => {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], _descripcion: v } }))
  }

  async function guardarCambios() {
    const ids = Object.keys(edits).map(Number)
    if (!ids.length) return
    setSaving(true)
    let ok = 0
    for (const id of ids) {
      const row = items.find((r: any) => r.id === id)
      if (!row) continue
      const e = edits[id] || {}
      const payload: any = {
        anio: row.anio, cuenta_id: row.cuenta_id, campo_id: row.campo_id || null,
        descripcion: '_descripcion' in e ? e._descripcion : (row.descripcion || ''),
        unidad_negocio_id: row.unidad_negocio_id || null,
        departamento_id: row.departamento_id || null,
        almacen_id: row.almacen_id || null,
        version: row.version || 'original',
        estado: row.estado || 'borrador',
      }
      MK.forEach(mk => { payload[mk] = cellVal(row, mk) })
      try { await api.put(`/contabilidad/presupuestos/${id}`, payload); ok++ } catch { /* sigue */ }
    }
    setSaving(false)
    toast.success(`${ok} línea(s) guardada(s)`)
    load()
  }

  async function crearLinea(e: any) {
    e.preventDefault()
    if (!nueva?.cuenta_id) { toast.error('Seleccione una cuenta'); return }
    const payload: any = {
      anio, cuenta_id: Number(nueva.cuenta_id), campo_id: nueva.campo_id || null,
      descripcion: nueva.descripcion || '',
      unidad_negocio_id: nueva.unidad_negocio_id ? Number(nueva.unidad_negocio_id) : null,
      departamento_id: nueva.departamento_id ? Number(nueva.departamento_id) : null,
      almacen_id: nueva.almacen_id ? Number(nueva.almacen_id) : null,
    }
    const vals = nueva.total ? distribuir(parseFloat(nueva.total), nueva.clave || 'uniforme') : Array(12).fill(0)
    MK.forEach((mk, i) => { payload[mk] = vals[i] })
    try {
      await api.post('/contabilidad/presupuestos', payload)
      toast.success('Línea creada'); setShowLine(false); setNueva(null); load()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
  }

  async function aplicarDist(e: any) {
    e.preventDefault()
    const row = showDist
    const vals = distribuir(parseFloat(row._total) || 0, row._clave || 'uniforme')
    setEdits(prev => ({ ...prev, [row.id]: { ...(prev[row.id] || {}), ...MK.reduce((o: any, mk, i) => { o[mk] = vals[i]; return o }, {}) } }))
    setShowDist(null)
    toast.success('Distribución aplicada — recuerde Guardar')
  }

  async function del(id: number) {
    if (!confirm('¿Eliminar esta línea de presupuesto?')) return
    try { await api.delete(`/contabilidad/presupuestos/${id}`); toast.success('Eliminada'); load() }
    catch { toast.error('Error') }
  }

  async function ejecutarTransferencia(e: any) {
    e.preventDefault()
    try {
      await api.post('/contabilidad/presupuestos/transferir', {
        origen_id: Number(transfer.origen_id),
        destino_id: Number(transfer.destino_id),
        mes: Number(transfer.mes),
        monto: parseFloat(transfer.monto),
        motivo: transfer.motivo || '',
      })
      toast.success('Transferencia realizada')
      setShowTransfer(false); setTransfer({}); load()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error en transferencia') }
  }

  async function ejecutarCopia(e: any) {
    e.preventDefault()
    try {
      const r = await api.post('/contabilidad/presupuestos/copiar-anio', {
        anio_origen: Number(copyData.anio_origen),
        anio_destino: anio,
        factor: parseFloat(copyData.factor) || 1.0,
      })
      toast.success(`${r.data.creados} líneas copiadas, ${r.data.omitidos} omitidas (ya existían)`)
      setShowCopy(false); load()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error al copiar') }
  }

  async function aprobarTodo() {
    if (!confirm(`¿Aprobar todas las líneas en borrador para ${anio}?`)) return
    try {
      const r = await api.put(`/contabilidad/presupuestos/aprobar-lote?anio=${anio}`)
      toast.success(`${r.data.aprobados} línea(s) aprobada(s)`)
      load()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
  }

  async function cambiarEstado(id: number, estado: string) {
    try {
      await api.put(`/contabilidad/presupuestos/${id}/estado?estado=${estado}`)
      toast.success(`Estado → ${estado}`)
      load()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
  }

  function exportCSV() {
    const src = tab === 'registro' ? filteredItems : vsReal
    if (!src.length) { toast.error('Nada que exportar'); return }
    let csv = ''
    if (tab === 'registro') {
      csv = ['Codigo,Cuenta,Descripcion,Campo,Estado,' + MESES.join(',') + ',Total']
        .concat(filteredItems.map(p => [p.cuenta_codigo, `"${p.cuenta_nombre}"`, `"${p.descripcion || ''}"`, `"${p.campo_nombre || ''}"`, p.estado || 'borrador',
          ...MK.map(mk => cellVal(p, mk)), rowTotal(p)].join(','))).join('\n')
    } else {
      csv = ['Codigo,Cuenta,Presupuesto,Real,Disponible,Desviacion,% Consumido']
        .concat(vsReal.map(r => {
          const disp = r.total_presupuesto - r.total_real
          const pct = r.total_presupuesto ? (r.total_real / r.total_presupuesto * 100) : 0
          return [r.cuenta_codigo, `"${r.cuenta_nombre}"`, r.total_presupuesto, r.total_real, disp.toFixed(2), r.total_desviacion, pct.toFixed(1)].join(',')
        })).join('\n')
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `presupuesto_${tab}_${anio}.csv`; a.click()
  }

  const cols = periodo === 'mes'
    ? MESES.map((m, i) => ({ label: m, idx: [i] }))
    : periodo === 'trim'
      ? TRIMS.map(t => ({ label: t.label, idx: t.m }))
      : [{ label: 'Año', idx: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }]

  const filteredItems = items.filter(p => {
    if (busqueda) {
      const q = busqueda.toLowerCase()
      const match = (p.cuenta_codigo || '').toLowerCase().includes(q)
        || (p.cuenta_nombre || '').toLowerCase().includes(q)
        || (p.descripcion || '').toLowerCase().includes(q)
        || (p.campo_nombre || '').toLowerCase().includes(q)
      if (!match) return false
    }
    if (campoFiltro && p.campo_id !== campoFiltro) return false
    return true
  })

  const groupedItems = (() => {
    const groups: Record<string, { label: string; items: any[] }> = {}
    for (const p of filteredItems) {
      const cls = (p.cuenta_codigo || '')[0] || '?'
      if (!groups[cls]) groups[cls] = { label: CLASE_LABELS[cls] || `Clase ${cls}`, items: [] }
      groups[cls].items.push(p)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  })()

  const toggleGroup = (key: string) => setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }))
  const isGroupExpanded = (key: string) => expandedGroups[key] !== false

  const totalPres = tab === 'registro'
    ? filteredItems.reduce((s, p) => s + rowTotal(p), 0)
    : vsReal.reduce((s, r) => s + r.total_presupuesto, 0)
  const totalReal = vsReal.reduce((s, r) => s + r.total_real, 0)
  const disponible = totalPres - totalReal
  const pctGlobal = totalPres ? Math.round((totalReal / totalPres) * 100) : 0

  const countBorrador = items.filter(p => (p.estado || 'borrador') === 'borrador').length
  const countAprobado = items.filter(p => p.estado === 'aprobado').length

  const estado = (pct: number) => pct > 100
    ? { label: 'Excedido', color: '#dc2626', bg: '#fef2f2', Icon: AlertOctagon }
    : pct >= 85
      ? { label: 'Alerta', color: '#d97706', bg: '#fffbeb', Icon: AlertTriangle }
      : { label: 'Dentro', color: '#16a34a', bg: '#f0fdf4', Icon: CheckCircle2 }

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ margin: '0 0 2px', fontSize: 23, fontWeight: 700, color: '#111827' }}>
          <PiggyBank size={21} style={{ verticalAlign: 'text-bottom', marginRight: 8 }} />
          Presupuesto
        </h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>Registro presupuestario y control contra cifras reales — estilo D365</p>
      </div>

      {/* Ribbon */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 4px', marginBottom: 14, flexWrap: 'wrap' }}>
        <PaneGroup title="Período">
          <select className="select" style={{ width: 88, height: 32 }} value={anio} onChange={e => setAnio(Number(e.target.value))}>
            {[2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </PaneGroup>
        <PaneGroup title="Vista">
          <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: 6, overflow: 'hidden' }}>
            <RibBtn active={tab === 'registro'} onClick={() => setTab('registro')} Icon={Table2} label="Registro" />
            <RibBtn active={tab === 'control'} onClick={() => setTab('control')} Icon={Gauge} label="Control" />
          </div>
        </PaneGroup>
        <PaneGroup title="Pivote">
          <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: 6, overflow: 'hidden' }}>
            {(['mes', 'trim', 'anio'] as const).map(pv => (
              <button key={pv} onClick={() => setPeriodo(pv)} style={{ padding: '6px 12px', fontSize: 12, border: 'none', cursor: 'pointer', textTransform: 'capitalize', background: periodo === pv ? '#166534' : '#fff', color: periodo === pv ? '#fff' : '#374151' }}>
                {pv === 'mes' ? 'Mes' : pv === 'trim' ? 'Trim' : 'Año'}
              </button>
            ))}
          </div>
        </PaneGroup>
        <PaneGroup title="Filtros">
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 8, top: 9, color: '#9ca3af' }} />
            <input className="input" placeholder="Buscar cuenta…" value={busqueda} onChange={e => setBusqueda(e.target.value)}
              style={{ width: 160, height: 32, paddingLeft: 28, fontSize: 12 }} />
          </div>
          <select className="select" style={{ width: 140, height: 32 }} value={campoFiltro} onChange={e => setCampoFiltro(e.target.value)}>
            <option value="">Todo campo</option>
            {campos.map(c => <option key={c.id_campo} value={c.id_campo}>{c.nombre || c.id_campo}</option>)}
          </select>
        </PaneGroup>
        <PaneGroup title="Acciones">
          {tab === 'registro' && <>
            <button className="btn-primary" style={{ height: 32 }} onClick={() => { setNueva({ clave: 'uniforme' }); setShowLine(true) }}><Plus size={14} /> Nueva</button>
            <button className="btn-primary" style={{ height: 32, opacity: dirty ? 1 : .5, pointerEvents: dirty ? 'auto' : 'none', background: '#0369a1' }} onClick={guardarCambios} disabled={saving}><Save size={14} /> {saving ? '…' : 'Guardar'}</button>
            <button className="btn-secondary" style={{ height: 32 }} title="Transferir entre líneas" onClick={() => setShowTransfer(true)}><ArrowRightLeft size={14} /></button>
            <button className="btn-secondary" style={{ height: 32 }} title="Copiar de año anterior" onClick={() => { setCopyData({ anio_origen: anio - 1, factor: 1.0 }); setShowCopy(true) }}><Copy size={14} /></button>
            {countBorrador > 0 && (
              <button className="btn-secondary" style={{ height: 32, color: '#166534' }} title="Aprobar todos los borradores" onClick={aprobarTodo}><FileCheck2 size={14} /> Aprobar ({countBorrador})</button>
            )}
          </>}
          <button className="btn-secondary" style={{ height: 32 }} onClick={() => tab === 'registro' ? load() : loadControl()}><RefreshCw size={14} /></button>
          <button className="btn-secondary" style={{ height: 32 }} onClick={exportCSV}><Download size={14} /></button>
        </PaneGroup>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
        <Kpi label={`Presupuesto ${anio}`} value={`RD$ ${fmt0(totalPres)}`} color="#0369a1" />
        {tab === 'control' && <>
          <Kpi label="Real ejecutado" value={`RD$ ${fmt0(totalReal)}`} color="#16a34a" />
          <Kpi label="Disponible" value={`RD$ ${fmt0(disponible)}`} color={disponible < 0 ? '#dc2626' : '#374151'} />
          <Kpi label="% Consumido" value={`${pctGlobal}%`} color={estado(pctGlobal).color} />
        </>}
        {tab === 'registro' && <>
          <Kpi label="Líneas" value={String(filteredItems.length)} color="#374151" />
          <Kpi label="Aprobadas" value={String(countAprobado)} color="#16a34a" />
          <Kpi label="Borradores" value={String(countBorrador)} color="#d97706" />
        </>}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando…</div>
      ) : tab === 'registro' ? (
        /* ─────────── REGISTRO ─────────── */
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 900 }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={thL}>Cuenta</th>
                  <th style={{ ...thL, width: 120 }}>Descripción</th>
                  <th style={{ ...thL, width: 100 }}>Dimensiones</th>
                  <th style={{ ...thL, width: 72 }}>Estado</th>
                  {cols.map(c => <th key={c.label} style={thR}>{c.label}</th>)}
                  <th style={thR}>Total</th>
                  <th style={{ ...thR, width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr><td colSpan={cols.length + 6} style={{ textAlign: 'center', padding: 34, color: '#9ca3af' }}>Sin líneas de presupuesto para {anio}. Use «Nueva» o «Copiar».</td></tr>
                ) : groupedItems.map(([clsKey, group]) => {
                  const expanded = isGroupExpanded(clsKey)
                  const groupTotal = group.items.reduce((s: number, p: any) => s + rowTotal(p), 0)
                  return [
                    <tr key={`grp-${clsKey}`} onClick={() => toggleGroup(clsKey)} style={{ background: '#f9fafb', cursor: 'pointer', borderTop: '1px solid #e5e7eb' }}>
                      <td colSpan={4} style={{ padding: '6px 12px', fontWeight: 700, fontSize: 12, color: '#374151' }}>
                        {expanded ? <ChevronDown size={13} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} /> : <ChevronRight size={13} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />}
                        {group.label} <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: 6 }}>({group.items.length})</span>
                      </td>
                      {cols.map(c => <td key={c.label} style={{ ...tdR, fontWeight: 600, color: '#6b7280', fontSize: 11 }}>{fmt(group.items.reduce((s: number, p: any) => s + c.idx.reduce((a: number, i: number) => a + cellVal(p, MK[i]), 0), 0))}</td>)}
                      <td style={{ ...tdR, fontWeight: 700, fontSize: 11 }}>{fmt(groupTotal)}</td>
                      <td></td>
                    </tr>,
                    ...(expanded ? group.items.map((p: any) => {
                      const isDirty = !!edits[p.id]
                      const est = ESTADO_BADGE[p.estado || 'borrador'] || ESTADO_BADGE.borrador
                      return (
                        <tr key={p.id} style={{ borderTop: '1px solid #f3f4f6', background: isDirty ? '#eff6ff' : '#fff' }}>
                          <td style={{ ...tdL, whiteSpace: 'nowrap' }}>
                            <span style={{ color: '#6b7280', marginRight: 6, fontFamily: 'monospace', fontSize: 11 }}>{p.cuenta_codigo}</span>{p.cuenta_nombre}
                            {isDirty && <span style={{ marginLeft: 6, fontSize: 9, color: '#0369a1', fontWeight: 700 }}>●</span>}
                          </td>
                          <td style={tdL}>
                            <input className="input" value={edits[p.id]?._descripcion ?? p.descripcion ?? ''} onChange={e => setDesc(p.id, e.target.value)}
                              style={{ width: '100%', fontSize: 11, border: '1px solid transparent', background: 'transparent', padding: '4px 6px', borderRadius: 4 }}
                              placeholder="—"
                              onFocus={e => { e.target.style.border = '1px solid #93c5fd'; e.target.style.background = '#fff' }}
                              onBlur={e => { e.target.style.border = '1px solid transparent'; e.target.style.background = 'transparent' }} />
                          </td>
                          <td style={tdL}><DimTags p={p} /></td>
                          <td style={tdL}>
                            <span style={{ fontSize: 10, fontWeight: 600, color: est.color, background: est.bg, padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>{est.label}</span>
                          </td>
                          {cols.map(c => {
                            const sum = c.idx.reduce((s: number, i: number) => s + cellVal(p, MK[i]), 0)
                            if (periodo === 'mes') {
                              const mk = MK[c.idx[0]]
                              return (
                                <td key={c.label} style={{ padding: '2px 3px', textAlign: 'right' }}>
                                  <input value={cellVal(p, mk) || ''} onChange={e => setCell(p.id, mk, e.target.value)}
                                    type="number" step="0.01"
                                    style={{ width: 74, textAlign: 'right', fontVariantNumeric: 'tabular-nums', border: '1px solid transparent', borderRadius: 4, padding: '5px 6px', fontSize: 12, background: 'transparent' }}
                                    onFocus={e => { e.target.style.border = '1px solid #93c5fd'; e.target.style.background = '#fff' }}
                                    onBlur={e => { e.target.style.border = '1px solid transparent'; e.target.style.background = 'transparent' }} />
                                </td>
                              )
                            }
                            return <td key={c.label} style={{ ...tdR, color: '#374151' }}>{fmt(sum)}</td>
                          })}
                          <td style={{ ...tdR, fontWeight: 700 }}>{fmt(rowTotal(p))}</td>
                          <td style={{ padding: '4px 4px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <button className="btn-icon" title="Distribuir monto" onClick={() => setShowDist({ ...p, _total: rowTotal(p) || '', _clave: 'uniforme' })}><Sliders size={13} /></button>
                            {(p.estado || 'borrador') === 'borrador' && (
                              <button className="btn-icon" title="Aprobar" onClick={() => cambiarEstado(p.id, 'aprobado')}><Check size={13} /></button>
                            )}
                            <button className="btn-icon" title="Eliminar" onClick={() => del(p.id)}><Trash2 size={13} /></button>
                          </td>
                        </tr>
                      )
                    }) : [])
                  ]
                }).flat()}
              </tbody>
              {filteredItems.length > 0 && (
                <tfoot>
                  <tr style={{ fontWeight: 700, background: '#f9fafb', borderTop: '2px solid #e5e7eb' }}>
                    <td colSpan={4} style={tdL}>TOTAL</td>
                    {cols.map(c => <td key={c.label} style={tdR}>{fmt(filteredItems.reduce((s: number, p: any) => s + c.idx.reduce((a: number, i: number) => a + cellVal(p, MK[i]), 0), 0))}</td>)}
                    <td style={tdR}>{fmt(totalPres)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      ) : (
        /* ─────────── CONTROL PRESUPUESTARIO ─────────── */
        <div>
          {vsReal.length > 0 && totalReal === 0 && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#92400e' }}>
              Aún no hay cifras reales contabilizadas para {anio} — el «Real» aparecerá cuando existan asientos en estas cuentas.
            </div>
          )}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 780 }}>
                <thead>
                  <tr style={{ background: '#f3f4f6' }}>
                    <th style={thL}>Cuenta</th>
                    {periodo === 'mes' ? MESES.map(m => (
                      <th key={m} style={{ ...thR, fontSize: 10 }}>{m}</th>
                    )) : periodo === 'trim' ? TRIMS.map(t => (
                      <th key={t.label} style={thR}>{t.label}</th>
                    )) : (
                      <th style={thR}>Año</th>
                    )}
                    <th style={thR}>Presupuesto</th>
                    <th style={thR}>Real</th>
                    <th style={thR}>Disponible</th>
                    <th style={{ ...thL, width: 170 }}>% Consumido</th>
                    <th style={{ ...thL, width: 86 }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {vsReal.length === 0 ? (
                    <tr><td colSpan={periodo === 'mes' ? 18 : periodo === 'trim' ? 10 : 7} style={{ textAlign: 'center', padding: 34, color: '#9ca3af' }}>Sin datos de control para {anio}</td></tr>
                  ) : vsReal.map((r, i) => {
                    const disp = r.total_presupuesto - r.total_real
                    const pct = r.total_presupuesto ? (r.total_real / r.total_presupuesto * 100) : 0
                    const st = estado(pct)
                    const meses = r.meses || []
                    return (
                      <tr key={i} style={{ borderTop: '1px solid #f3f4f6' }}>
                        <td style={{ ...tdL, whiteSpace: 'nowrap' }}><span style={{ color: '#6b7280', marginRight: 6, fontFamily: 'monospace', fontSize: 11 }}>{r.cuenta_codigo}</span>{r.cuenta_nombre}</td>
                        {periodo === 'mes' ? meses.map((m: any, mi: number) => {
                          const mPct = m.presupuesto ? (m.real / m.presupuesto * 100) : 0
                          const mColor = mPct > 100 ? '#dc2626' : mPct >= 85 ? '#d97706' : '#374151'
                          return (
                            <td key={mi} style={{ ...tdR, fontSize: 10, position: 'relative' }}>
                              <div style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt0(m.real)}</div>
                              <div style={{ fontSize: 9, color: '#9ca3af' }}>{fmt0(m.presupuesto)}</div>
                              {m.presupuesto > 0 && (
                                <div style={{ height: 2, background: '#f3f4f6', borderRadius: 1, marginTop: 2 }}>
                                  <div style={{ height: '100%', width: `${Math.min(mPct, 100)}%`, background: mColor, borderRadius: 1 }} />
                                </div>
                              )}
                            </td>
                          )
                        }) : periodo === 'trim' ? TRIMS.map(t => {
                          const tPres = t.m.reduce((s: number, mi: number) => s + (meses[mi]?.presupuesto || 0), 0)
                          const tReal = t.m.reduce((s: number, mi: number) => s + (meses[mi]?.real || 0), 0)
                          const tPct = tPres ? (tReal / tPres * 100) : 0
                          const tColor = tPct > 100 ? '#dc2626' : tPct >= 85 ? '#d97706' : '#374151'
                          return (
                            <td key={t.label} style={tdR}>
                              <div style={{ fontVariantNumeric: 'tabular-nums', color: tColor }}>{fmt0(tReal)}</div>
                              <div style={{ fontSize: 9, color: '#9ca3af' }}>{fmt0(tPres)}</div>
                            </td>
                          )
                        }) : (
                          <td style={tdR}>
                            <div style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(r.total_real)}</div>
                            <div style={{ fontSize: 9, color: '#9ca3af' }}>{fmt(r.total_presupuesto)}</div>
                          </td>
                        )}
                        <td style={tdR}>{fmt(r.total_presupuesto)}</td>
                        <td style={tdR}>{fmt(r.total_real)}</td>
                        <td style={{ ...tdR, color: disp < 0 ? '#dc2626' : '#374151' }}>{fmt(disp)}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 5, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: st.color, borderRadius: 5, transition: 'width .3s' }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: st.color, width: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{Math.round(pct)}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '8px 8px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: st.color, background: st.bg, padding: '3px 8px', borderRadius: 999 }}>
                            <st.Icon size={11} />{st.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {vsReal.length > 0 && (
                  <tfoot>
                    <tr style={{ fontWeight: 700, background: '#f9fafb', borderTop: '2px solid #e5e7eb' }}>
                      <td style={tdL}>TOTAL</td>
                      {periodo === 'mes' ? MESES.map((m, mi) => {
                        const sumR = vsReal.reduce((s: number, r: any) => s + (r.meses?.[mi]?.real || 0), 0)
                        const sumP = vsReal.reduce((s: number, r: any) => s + (r.meses?.[mi]?.presupuesto || 0), 0)
                        return <td key={m} style={{ ...tdR, fontSize: 10 }}><div>{fmt0(sumR)}</div><div style={{ fontSize: 9, color: '#9ca3af' }}>{fmt0(sumP)}</div></td>
                      }) : periodo === 'trim' ? TRIMS.map(t => {
                        const tR = t.m.reduce((s: number, mi: number) => s + vsReal.reduce((s2: number, r: any) => s2 + (r.meses?.[mi]?.real || 0), 0), 0)
                        const tP = t.m.reduce((s: number, mi: number) => s + vsReal.reduce((s2: number, r: any) => s2 + (r.meses?.[mi]?.presupuesto || 0), 0), 0)
                        return <td key={t.label} style={tdR}><div>{fmt0(tR)}</div><div style={{ fontSize: 9, color: '#9ca3af' }}>{fmt0(tP)}</div></td>
                      }) : <td style={tdR}><div>{fmt(totalReal)}</div><div style={{ fontSize: 9, color: '#9ca3af' }}>{fmt(totalPres)}</div></td>}
                      <td style={tdR}>{fmt(totalPres)}</td>
                      <td style={tdR}>{fmt(totalReal)}</td>
                      <td style={{ ...tdR, color: disponible < 0 ? '#dc2626' : '#374151' }}>{fmt(disponible)}</td>
                      <td colSpan={2} style={{ ...tdL, color: estado(pctGlobal).color, fontWeight: 700 }}>{pctGlobal}% consumido</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal nueva línea */}
      {showLine && nueva && (
        <Modal title="Nueva línea de presupuesto" subtitle={`Ejercicio ${anio}`} onClose={() => setShowLine(false)} width={620}>
          <form onSubmit={crearLinea}>
            <div style={{ marginBottom: 14 }}>
              <Label>Cuenta contable *</Label>
              <select className="select" required value={nueva.cuenta_id || ''} onChange={e => setNueva({ ...nueva, cuenta_id: e.target.value })}>
                <option value="">Seleccionar…</option>
                {cuentas.map((c: any) => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <Label>Descripción</Label>
              <input className="input" value={nueva.descripcion || ''} onChange={e => setNueva({ ...nueva, descripcion: e.target.value })} placeholder="Nota libre para esta línea" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div><Label>Campo (centro de costo)</Label><select className="select" value={nueva.campo_id || ''} onChange={e => setNueva({ ...nueva, campo_id: e.target.value })}><option value="">— General —</option>{campos.map((c: any) => <option key={c.id_campo} value={c.id_campo}>{c.nombre || c.id_campo}</option>)}</select></div>
              <div><Label>Unidad de negocio</Label><select className="select" value={nueva.unidad_negocio_id || ''} onChange={e => setNueva({ ...nueva, unidad_negocio_id: e.target.value })}><option value="">— Ninguna —</option>{dims.unidades.map(u => <option key={u.id} value={u.id}>{u.codigo} — {u.nombre}</option>)}</select></div>
              <div><Label>Departamento</Label><select className="select" value={nueva.departamento_id || ''} onChange={e => setNueva({ ...nueva, departamento_id: e.target.value })}><option value="">— Ninguno —</option>{dims.deptos.map(d => <option key={d.id} value={d.id}>{d.codigo} — {d.nombre}</option>)}</select></div>
              <div><Label>Almacén</Label><select className="select" value={nueva.almacen_id || ''} onChange={e => setNueva({ ...nueva, almacen_id: e.target.value })}><option value="">— Ninguno —</option>{dims.almacenes.map(a => <option key={a.id} value={a.id}>{a.codigo} — {a.nombre}</option>)}</select></div>
            </div>
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <Label>Monto anual + clave de distribución</Label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input className="input" type="number" step="0.01" style={{ width: 150 }} placeholder="Monto anual" value={nueva.total || ''} onChange={e => setNueva({ ...nueva, total: e.target.value })} />
                <select className="select" style={{ width: 200 }} value={nueva.clave} onChange={e => setNueva({ ...nueva, clave: e.target.value })}>
                  {Object.entries(CLAVES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <span style={{ fontSize: 11, color: '#6b7280' }}>se reparte en los 12 meses</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn-secondary" onClick={() => setShowLine(false)}>Cancelar</button>
              <button type="submit" className="btn-primary">Crear línea</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal distribuir */}
      {showDist && (
        <Modal title="Distribuir monto anual" subtitle={`${showDist.cuenta_codigo} — ${showDist.cuenta_nombre}`} onClose={() => setShowDist(null)} width={460}>
          <form onSubmit={aplicarDist}>
            <div style={{ marginBottom: 14 }}>
              <Label>Monto anual</Label>
              <input className="input" type="number" step="0.01" value={showDist._total} onChange={e => setShowDist({ ...showDist, _total: e.target.value })} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <Label>Clave de distribución</Label>
              <select className="select" value={showDist._clave} onChange={e => setShowDist({ ...showDist, _clave: e.target.value })}>
                {Object.entries(CLAVES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <DistPreview total={parseFloat(showDist._total) || 0} clave={showDist._clave || 'uniforme'} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn-secondary" onClick={() => setShowDist(null)}>Cancelar</button>
              <button type="submit" className="btn-primary">Aplicar</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal transferencia */}
      {showTransfer && (
        <Modal title="Transferencia presupuestaria" subtitle="Mover presupuesto de una línea a otra" onClose={() => setShowTransfer(false)} width={540}>
          <form onSubmit={ejecutarTransferencia}>
            <div style={{ marginBottom: 14 }}>
              <Label>Línea origen *</Label>
              <select className="select" required value={transfer.origen_id || ''} onChange={e => setTransfer({ ...transfer, origen_id: e.target.value })}>
                <option value="">Seleccionar…</option>
                {items.map(p => <option key={p.id} value={p.id}>{p.cuenta_codigo} — {p.cuenta_nombre} (Total: {fmt(p.total_anual || MK.reduce((s: number, mk: string) => s + Number(p[mk] || 0), 0))})</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <Label>Línea destino *</Label>
              <select className="select" required value={transfer.destino_id || ''} onChange={e => setTransfer({ ...transfer, destino_id: e.target.value })}>
                <option value="">Seleccionar…</option>
                {items.filter(p => String(p.id) !== String(transfer.origen_id)).map(p => <option key={p.id} value={p.id}>{p.cuenta_codigo} — {p.cuenta_nombre}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <Label>Mes *</Label>
                <select className="select" required value={transfer.mes || ''} onChange={e => setTransfer({ ...transfer, mes: e.target.value })}>
                  <option value="">Seleccionar…</option>
                  {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <Label>Monto a transferir *</Label>
                <input className="input" type="number" step="0.01" required value={transfer.monto || ''} onChange={e => setTransfer({ ...transfer, monto: e.target.value })} placeholder="0.00" />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Label>Motivo</Label>
              <input className="input" value={transfer.motivo || ''} onChange={e => setTransfer({ ...transfer, motivo: e.target.value })} placeholder="Razón de la transferencia" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn-secondary" onClick={() => setShowTransfer(false)}>Cancelar</button>
              <button type="submit" className="btn-primary"><ArrowRightLeft size={14} /> Transferir</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal copiar de año */}
      {showCopy && (
        <Modal title="Copiar presupuesto de otro año" subtitle={`Destino: ${anio}`} onClose={() => setShowCopy(false)} width={440}>
          <form onSubmit={ejecutarCopia}>
            <div style={{ marginBottom: 14 }}>
              <Label>Año origen *</Label>
              <select className="select" required value={copyData.anio_origen} onChange={e => setCopyData({ ...copyData, anio_origen: Number(e.target.value) })}>
                {[2024, 2025, 2026, 2027, 2028].filter(y => y !== anio).map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <Label>Factor de ajuste</Label>
              <input className="input" type="number" step="0.01" value={copyData.factor} onChange={e => setCopyData({ ...copyData, factor: e.target.value })} />
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#6b7280' }}>
                1.0 = copia exacta, 1.05 = +5%, 0.90 = -10%. Se aplica a todos los montos mensuales.
              </p>
            </div>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: 10, marginBottom: 16, fontSize: 12, color: '#1e40af' }}>
              Las líneas que ya existan en {anio} para la misma cuenta/campo no se duplican.
            </div>
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

/* ────────────────────────────── sub-componentes ────────────────────────────── */
function RibBtn({ active, onClick, Icon, label }: any) {
  return (
    <button onClick={onClick} style={{ padding: '6px 14px', fontSize: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, background: active ? '#166534' : '#fff', color: active ? '#fff' : '#374151' }}>
      <Icon size={13} />{label}
    </button>
  )
}
function Kpi({ label, value, color }: any) {
  return (
    <div className="card" style={{ padding: '12px 16px', margin: 0 }}>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}
function DimTags({ p }: any) {
  const tags = [p.campo_nombre, p.unidad_negocio_nombre, p.departamento_nombre, p.almacen_nombre].filter(Boolean)
  if (!tags.length) return <span style={{ color: '#d1d5db' }}>—</span>
  return <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
    {tags.map((t: string, i: number) => <span key={i} style={{ fontSize: 9, background: '#f3f4f6', color: '#4b5563', padding: '1px 5px', borderRadius: 3 }}>{t}</span>)}
  </div>
}

function DistPreview({ total, clave }: { total: number; clave: string }) {
  if (!total) return null
  const vals = distribuir(total, clave)
  const max = Math.max(...vals)
  return (
    <div style={{ marginBottom: 16, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase' }}>Vista previa de distribución</div>
      <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 50 }}>
        {vals.map((v, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ width: '100%', background: '#166534', borderRadius: 2, height: max ? (v / max * 36) : 0, minHeight: v > 0 ? 2 : 0, transition: 'height .2s' }} />
            <span style={{ fontSize: 8, color: '#9ca3af' }}>{MESES[i]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const thL: any = { padding: '9px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: '#374151', textTransform: 'uppercase', letterSpacing: .3, whiteSpace: 'nowrap' }
const thR: any = { ...thL, textAlign: 'right' }
const tdL: any = { padding: '8px 12px', textAlign: 'left' }
const tdR: any = { padding: '8px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }
