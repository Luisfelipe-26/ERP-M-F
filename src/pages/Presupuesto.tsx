import { useEffect, useState, useCallback } from 'react'
import api from '../api'
import toast from 'react-hot-toast'
import { PiggyBank, Plus, Edit2, Trash2, BarChart3, X, RefreshCw, FileText } from 'lucide-react'

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

const fmt = (n) => Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MK = ['monto_ene', 'monto_feb', 'monto_mar', 'monto_abr', 'monto_may', 'monto_jun', 'monto_jul', 'monto_ago', 'monto_sep', 'monto_oct', 'monto_nov', 'monto_dic']

export default function Presupuesto() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [cuentas, setCuentas] = useState<any[]>([])
  const [campos, setCampos] = useState<any[]>([])
  const [vsReal, setVsReal] = useState<any[]>([])
  const [vista, setVista] = useState<'lista' | 'comparativo'>('lista')
  const [campoFiltro, setCampoFiltro] = useState('')
  const [distribuir, setDistribuir] = useState('')
  const [dims, setDims] = useState<{ unidades: any[]; deptos: any[]; almacenes: any[] }>({ unidades: [], deptos: [], almacenes: [] })

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
      setCuentas(c.data.filter((x: any) => x.acepta_movimientos))
      setCampos(f.data)
      setDims({ unidades: un.data, deptos: dep.data, almacenes: alm.data })
    } catch { toast.error('Error al cargar presupuestos') }
    finally { setLoading(false) }
  }, [anio])

  const loadComparativo = useCallback(async () => {
    setLoading(true)
    try {
      let url = `/contabilidad/presupuesto-vs-real?anio=${anio}`
      if (campoFiltro) url += `&campo_id=${campoFiltro}`
      const r = await api.get(url)
      setVsReal(r.data)
    } catch { toast.error('Error cargando comparativo') }
    setLoading(false)
  }, [anio, campoFiltro])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (vista === 'comparativo') loadComparativo() }, [vista, loadComparativo])

  const blank = { anio, cuenta_id: '', campo_id: '', descripcion: '', monto_ene: 0, monto_feb: 0, monto_mar: 0, monto_abr: 0, monto_may: 0, monto_jun: 0, monto_jul: 0, monto_ago: 0, monto_sep: 0, monto_oct: 0, monto_nov: 0, monto_dic: 0 }

  async function save(e: any) {
    e.preventDefault()
    if (!editing.cuenta_id) { toast.error('Seleccione una cuenta'); return }
    const payload = {
      ...editing,
      cuenta_id: Number(editing.cuenta_id),
      campo_id: editing.campo_id || null,
      unidad_negocio_id: editing.unidad_negocio_id ? Number(editing.unidad_negocio_id) : null,
      departamento_id: editing.departamento_id ? Number(editing.departamento_id) : null,
      almacen_id: editing.almacen_id ? Number(editing.almacen_id) : null,
    }
    MK.forEach(k => payload[k] = Number(payload[k]) || 0)
    try {
      if (editing.id) await api.put(`/contabilidad/presupuestos/${editing.id}`, payload)
      else await api.post('/contabilidad/presupuestos', payload)
      toast.success(editing.id ? 'Actualizado' : 'Creado')
      setShowModal(false); load(); if (vista === 'comparativo') loadComparativo()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
  }

  async function del(id: number) {
    if (!confirm('¿Eliminar presupuesto?')) return
    try { await api.delete(`/contabilidad/presupuestos/${id}`); toast.success('Eliminado'); load() }
    catch { toast.error('Error') }
  }

  const handleDistribuir = () => {
    if (!editing || !distribuir) return
    const val = parseFloat(distribuir)
    if (!val) return
    const mensual = Math.round((val / 12) * 100) / 100
    const resto = Math.round((val - mensual * 11) * 100) / 100
    const next = { ...editing }
    MK.forEach((k, i) => { next[k] = i === 11 ? resto : mensual })
    setEditing(next)
    setDistribuir('')
  }

  const totalAnual = items.reduce((s, p) => s + (p.total_anual || 0), 0)
  const totalPres = vsReal.reduce((s, r) => s + r.total_presupuesto, 0)
  const totalReal = vsReal.reduce((s, r) => s + r.total_real, 0)
  const totalDesv = totalReal - totalPres
  const pctEjec = totalPres ? Math.round((totalReal / totalPres) * 100) : 0

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#111827' }}>
          <PiggyBank size={22} style={{ verticalAlign: 'text-bottom', marginRight: 8 }} />
          Presupuesto
        </h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>Presupuestos anuales por cuenta contable y comparación con cifras reales</p>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="select" style={{ width: 90 }} value={anio} onChange={e => setAnio(Number(e.target.value))}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {vista === 'comparativo' && (
            <select className="select" style={{ width: 180 }} value={campoFiltro} onChange={e => setCampoFiltro(e.target.value)}>
              <option value="">Todos los campos</option>
              {campos.map(c => <option key={c.id_campo} value={c.id_campo}>{c.nombre}</option>)}
            </select>
          )}
          <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid #d1d5db' }}>
            <button onClick={() => setVista('lista')} style={{ padding: '7px 14px', fontSize: 12, border: 'none', cursor: 'pointer', background: vista === 'lista' ? '#166534' : '#fff', color: vista === 'lista' ? '#fff' : '#374151' }}>
              <FileText size={13} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />Lista
            </button>
            <button onClick={() => setVista('comparativo')} style={{ padding: '7px 14px', fontSize: 12, border: 'none', cursor: 'pointer', background: vista === 'comparativo' ? '#166534' : '#fff', color: vista === 'comparativo' ? '#fff' : '#374151' }}>
              <BarChart3 size={13} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />vs Real
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn-secondary" onClick={() => vista === 'comparativo' ? loadComparativo() : load()}><RefreshCw size={14} /></button>
          <button className="btn-primary" onClick={() => { setEditing({ ...blank, anio }); setDistribuir(''); setShowModal(true) }}><Plus size={14} /> Nuevo</button>
        </div>
      </div>

      {/* KPI Cards (comparativo view) */}
      {vista === 'comparativo' && vsReal.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Presupuestado', value: fmt(totalPres), color: '#2563eb' },
            { label: 'Ejecutado', value: fmt(totalReal), color: '#16a34a' },
            { label: 'Desviación', value: (totalDesv >= 0 ? '+' : '') + fmt(totalDesv), color: totalDesv > 0 ? '#dc2626' : '#16a34a' },
            { label: '% Ejecución', value: pctEjec + '%', color: pctEjec > 100 ? '#dc2626' : pctEjec > 80 ? '#f59e0b' : '#2563eb' },
          ].map((k, i) => (
            <div key={i} className="card" style={{ padding: '14px 16px', margin: 0 }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards (lista view) */}
      {vista === 'lista' && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div className="card" style={{ padding: '10px 16px', margin: 0 }}><span style={{ fontSize: 11, color: '#6b7280' }}>Total Presupuestado {anio}</span><div style={{ fontWeight: 700, fontSize: 17 }}>RD$ {fmt(totalAnual)}</div></div>
          <div className="card" style={{ padding: '10px 16px', margin: 0 }}><span style={{ fontSize: 11, color: '#6b7280' }}>Líneas</span><div style={{ fontWeight: 700, fontSize: 17 }}>{items.length}</div></div>
        </div>
      )}

      {/* Content */}
      {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div> : vista === 'lista' ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Cuenta</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Campo</th>
                {MESES.map(m => <th key={m} style={{ padding: '8px 6px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 600, fontSize: 11 }}>{m}</th>)}
                <th style={{ padding: '8px 10px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Total</th>
                <th style={{ padding: '8px 6px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={16} style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>Sin presupuestos para {anio}</td></tr>
              ) : items.map((p: any) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}><span style={{ color: '#6b7280', marginRight: 4, fontFamily: 'monospace', fontSize: 11 }}>{p.cuenta_codigo}</span>{p.cuenta_nombre}</td>
                  <td style={{ padding: '8px 10px', color: '#6b7280' }}>{p.campo_nombre || '—'}</td>
                  {MK.map(k => <td key={k} style={{ padding: '8px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(p[k])}</td>)}
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(p.total_anual)}</td>
                  <td style={{ padding: '8px 6px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <button className="btn-icon" onClick={() => { setEditing(p); setDistribuir(''); setShowModal(true) }}><Edit2 size={13} /></button>
                    <button className="btn-icon" onClick={() => del(p.id)}><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
              {items.length > 0 && (
                <tr style={{ fontWeight: 700, background: '#f9fafb' }}>
                  <td colSpan={2} style={{ padding: '8px 10px' }}>TOTAL</td>
                  {MK.map(k => <td key={k} style={{ padding: '8px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(items.reduce((s, p) => s + (Number(p[k]) || 0), 0))}</td>)}
                  <td style={{ padding: '8px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(totalAnual)}</td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Cuenta</th>
                  {MESES.map(m => (
                    <th key={m} style={{ padding: '8px 4px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', fontWeight: 600, fontSize: 11 }}>{m}</th>
                  ))}
                  <th style={{ padding: '8px 10px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {vsReal.length === 0 ? (
                  <tr><td colSpan={14} style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>Sin datos comparativos para {anio}</td></tr>
                ) : vsReal.map((r, ri) => (
                  <tr key={ri} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 500 }}><span style={{ color: '#6b7280', marginRight: 4 }}>{r.cuenta_codigo}</span>{r.cuenta_nombre}</div>
                    </td>
                    {r.meses.map((m: any, mi: number) => {
                      const maxVal = Math.max(m.presupuesto, m.real, 1)
                      const pctP = (m.presupuesto / maxVal) * 100
                      const pctR = (m.real / maxVal) * 100
                      return (
                        <td key={mi} style={{ padding: '6px 4px', verticalAlign: 'bottom' }}>
                          <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 36, justifyContent: 'center' }}>
                            <div style={{ width: 10, background: '#93c5fd', borderRadius: '2px 2px 0 0', height: `${pctP}%`, minHeight: m.presupuesto ? 3 : 0 }} title={`Pres: ${fmt(m.presupuesto)}`} />
                            <div style={{ width: 10, background: m.real > m.presupuesto ? '#fca5a5' : '#86efac', borderRadius: '2px 2px 0 0', height: `${pctR}%`, minHeight: m.real ? 3 : 0 }} title={`Real: ${fmt(m.real)}`} />
                          </div>
                          <div style={{ textAlign: 'center', fontSize: 9, color: m.desviacion > 0 ? '#dc2626' : '#16a34a', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                            {m.desviacion !== 0 ? (m.desviacion > 0 ? '+' : '') + fmt(m.desviacion) : ''}
                          </div>
                        </td>
                      )
                    })}
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      <div style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
                        <span style={{ color: '#2563eb' }}>P: {fmt(r.total_presupuesto)}</span><br />
                        <span style={{ color: r.total_real > r.total_presupuesto ? '#dc2626' : '#16a34a' }}>R: {fmt(r.total_real)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 10, fontSize: 11, color: '#6b7280' }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#93c5fd', borderRadius: 2, marginRight: 4 }} />Presupuesto</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#86efac', borderRadius: 2, marginRight: 4 }} />Real (bajo pres.)</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#fca5a5', borderRadius: 2, marginRight: 4 }} />Real (sobre pres.)</span>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && editing && (
        <Modal title={editing.id ? 'Editar Presupuesto' : 'Nuevo Presupuesto'} onClose={() => setShowModal(false)} width={700}>
          <form onSubmit={save}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div><Label>Año</Label><select className="select" value={editing.anio || anio} onChange={e => setEditing({ ...editing, anio: +e.target.value })}>{[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}</select></div>
              <div><Label>Cuenta Contable</Label><select className="select" required value={editing.cuenta_id} onChange={e => setEditing({ ...editing, cuenta_id: e.target.value })}><option value="">Seleccionar...</option>{cuentas.map((c: any) => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}</select></div>
              <div><Label>Campo</Label><select className="select" value={editing.campo_id || ''} onChange={e => setEditing({ ...editing, campo_id: e.target.value })}><option value="">— General —</option>{campos.map((c: any) => <option key={c.id_campo} value={c.id_campo}>{c.nombre || c.id_campo}</option>)}</select></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div><Label>Unidad de Negocio</Label><select className="select" value={editing.unidad_negocio_id || ''} onChange={e => setEditing({ ...editing, unidad_negocio_id: e.target.value || null })}><option value="">— Ninguna —</option>{dims.unidades.map(u => <option key={u.id} value={u.id}>{u.codigo} — {u.nombre}</option>)}</select></div>
              <div><Label>Departamento</Label><select className="select" value={editing.departamento_id || ''} onChange={e => setEditing({ ...editing, departamento_id: e.target.value || null })}><option value="">— Ninguno —</option>{dims.deptos.map(d => <option key={d.id} value={d.id}>{d.codigo} — {d.nombre}</option>)}</select></div>
              <div><Label>Almacén</Label><select className="select" value={editing.almacen_id || ''} onChange={e => setEditing({ ...editing, almacen_id: e.target.value || null })}><option value="">— Ninguno —</option>{dims.almacenes.map(a => <option key={a.id} value={a.id}>{a.codigo} — {a.nombre}</option>)}</select></div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Label>Descripción</Label>
              <input className="input" value={editing.descripcion || ''} onChange={e => setEditing({ ...editing, descripcion: e.target.value })} placeholder="Nota opcional" />
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <Label>Distribuir monto anual:</Label>
              <input className="input" type="number" step="0.01" style={{ width: 140 }} value={distribuir} onChange={e => setDistribuir(e.target.value)} placeholder="Monto total" />
              <button type="button" className="btn-secondary" onClick={handleDistribuir}>÷12</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 16 }}>
              {MK.map((k, i) => (
                <div key={k}>
                  <label style={{ fontSize: 10, fontWeight: 500, display: 'block', marginBottom: 2, color: '#6b7280' }}>{MESES[i]}</label>
                  <input className="input" type="number" step="0.01" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }} value={editing[k]} onChange={e => setEditing({ ...editing, [k]: e.target.value })} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Total: <span style={{ color: '#166534' }}>{fmt(MK.reduce((s, k) => s + (parseFloat(editing[k]) || 0), 0))}</span></span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">{editing.id ? 'Guardar' : 'Crear'}</button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
