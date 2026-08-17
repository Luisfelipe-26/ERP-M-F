import { useEffect, useState, useCallback } from 'react'
import api from '../api'
import toast from 'react-hot-toast'
import { PiggyBank, Plus, Edit2, Trash2, BarChart3, X } from 'lucide-react'

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
  const [showVsReal, setShowVsReal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, c, f] = await Promise.all([
        api.get(`/contabilidad/presupuestos?anio=${anio}`),
        api.get('/contabilidad/cuentas'),
        api.get('/campos'),
      ])
      setItems(p.data)
      setCuentas(c.data.filter((x: any) => x.acepta_movimientos))
      setCampos(f.data)
    } catch { toast.error('Error al cargar presupuestos') }
    finally { setLoading(false) }
  }, [anio])

  useEffect(() => { load() }, [load])

  const blank = { anio, cuenta_id: '', campo_id: '', descripcion: '', monto_ene: 0, monto_feb: 0, monto_mar: 0, monto_abr: 0, monto_may: 0, monto_jun: 0, monto_jul: 0, monto_ago: 0, monto_sep: 0, monto_oct: 0, monto_nov: 0, monto_dic: 0 }

  async function save(e: any) {
    e.preventDefault()
    const payload = { ...editing, cuenta_id: Number(editing.cuenta_id), campo_id: editing.campo_id || null }
    MK.forEach(k => payload[k] = Number(payload[k]) || 0)
    try {
      if (editing.id) await api.put(`/contabilidad/presupuestos/${editing.id}`, payload)
      else await api.post('/contabilidad/presupuestos', payload)
      toast.success(editing.id ? 'Actualizado' : 'Creado')
      setShowModal(false); load()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
  }

  async function del(id: number) {
    if (!confirm('¿Eliminar presupuesto?')) return
    try { await api.delete(`/contabilidad/presupuestos/${id}`); toast.success('Eliminado'); load() }
    catch { toast.error('Error') }
  }

  async function loadVsReal() {
    try {
      const { data } = await api.get(`/contabilidad/presupuesto-vs-real?anio=${anio}`)
      setVsReal(data)
      setShowVsReal(true)
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
  }

  const totalAnual = items.reduce((s, p) => s + (p.total_anual || 0), 0)

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#111827' }}>
          <PiggyBank size={22} style={{ verticalAlign: 'text-bottom', marginRight: 8 }} />
          Presupuesto
        </h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>Presupuestos anuales por cuenta contable y comparación con cifras reales</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="card" style={{ padding: '10px 16px', margin: 0 }}><span style={{ fontSize: 11, color: '#6b7280' }}>Total Presupuestado {anio}</span><div style={{ fontWeight: 700, fontSize: 17 }}>RD$ {fmt(totalAnual)}</div></div>
        <div className="card" style={{ padding: '10px 16px', margin: 0 }}><span style={{ fontSize: 11, color: '#6b7280' }}>Líneas</span><div style={{ fontWeight: 700, fontSize: 17 }}>{items.length}</div></div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Label>Año</Label>
          <input className="input" type="number" style={{ width: 90 }} value={anio} onChange={e => setAnio(Number(e.target.value))} />
          <button className="btn-secondary" onClick={loadVsReal}><BarChart3 size={14} /> Presupuesto vs Real</button>
        </div>
        <button className="btn-primary" onClick={() => { setEditing({ ...blank, anio }); setShowModal(true) }}><Plus size={14} /> Nuevo</button>
      </div>

      {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ fontSize: 11 }}>
            <thead><tr><th>Cuenta</th><th>Campo</th>{MESES.map(m => <th key={m} style={{ textAlign: 'right' }}>{m}</th>)}<th style={{ textAlign: 'right' }}>Total</th><th></th></tr></thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={15} style={{ textAlign: 'center', color: '#9ca3af', padding: 30 }}>Sin presupuestos para {anio}</td></tr>
              ) : items.map((p: any) => (
                <tr key={p.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{p.cuenta_codigo} — {p.cuenta_nombre}</td>
                  <td>{p.campo_nombre || p.campo_id || '—'}</td>
                  {MK.map(k => <td key={k} style={{ textAlign: 'right' }}>{fmt(p[k])}</td>)}
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(p.total_anual)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-icon" onClick={() => { setEditing(p); setShowModal(true) }}><Edit2 size={13} /></button>
                    <button className="btn-icon" onClick={() => del(p.id)}><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
              {items.length > 0 && (
                <tr style={{ fontWeight: 700, background: '#f9fafb' }}>
                  <td colSpan={2}>TOTAL</td>
                  {MK.map(k => <td key={k} style={{ textAlign: 'right' }}>{fmt(items.reduce((s, p) => s + (Number(p[k]) || 0), 0))}</td>)}
                  <td style={{ textAlign: 'right' }}>{fmt(totalAnual)}</td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && editing && (
        <Modal title={editing.id ? 'Editar Presupuesto' : 'Nuevo Presupuesto'} onClose={() => setShowModal(false)} width={700}>
          <form onSubmit={save}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><Label>Cuenta Contable</Label><select className="select" required value={editing.cuenta_id} onChange={e => setEditing({ ...editing, cuenta_id: e.target.value })}><option value="">Seleccionar...</option>{cuentas.map((c: any) => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}</select></div>
              <div><Label>Campo</Label><select className="select" value={editing.campo_id || ''} onChange={e => setEditing({ ...editing, campo_id: e.target.value })}><option value="">— General —</option>{campos.map((c: any) => <option key={c.id_campo} value={c.id_campo}>{c.id_campo}</option>)}</select></div>
              <div style={{ gridColumn: 'span 2' }}><Label>Descripción</Label><input className="input" value={editing.descripcion || ''} onChange={e => setEditing({ ...editing, descripcion: e.target.value })} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
              {MK.map((k, i) => (
                <div key={k}><Label>{MESES[i]}</Label><input className="input" type="number" step="0.01" value={editing[k]} onChange={e => setEditing({ ...editing, [k]: e.target.value })} /></div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button type="submit" className="btn-primary">{editing.id ? 'Guardar' : 'Crear'}</button>
            </div>
          </form>
        </Modal>
      )}

      {showVsReal && (
        <Modal title={`Presupuesto vs Real — ${anio}`} onClose={() => setShowVsReal(false)} width={900}>
          {vsReal.length === 0 ? <p style={{ color: '#9ca3af', textAlign: 'center' }}>Sin datos</p> : (
            <div style={{ overflowX: 'auto' }}>
              {vsReal.map((row: any) => (
                <div key={`${row.cuenta_id}-${row.campo_id}`} style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: 13, margin: '0 0 6px' }}>{row.cuenta_codigo} — {row.cuenta_nombre}{row.campo_id ? ` (${row.campo_id})` : ''}</h4>
                  <table style={{ fontSize: 11 }}>
                    <thead><tr><th></th>{MESES.map(m => <th key={m} style={{ textAlign: 'right' }}>{m}</th>)}<th style={{ textAlign: 'right' }}>Total</th></tr></thead>
                    <tbody>
                      <tr><td style={{ fontWeight: 600 }}>Presupuesto</td>{row.meses.map((m: any) => <td key={m.mes} style={{ textAlign: 'right' }}>{fmt(m.presupuesto)}</td>)}<td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(row.total_presupuesto)}</td></tr>
                      <tr><td style={{ fontWeight: 600 }}>Real</td>{row.meses.map((m: any) => <td key={m.mes} style={{ textAlign: 'right' }}>{fmt(m.real)}</td>)}<td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(row.total_real)}</td></tr>
                      <tr><td style={{ fontWeight: 600 }}>Desviación</td>{row.meses.map((m: any) => <td key={m.mes} style={{ textAlign: 'right', color: m.desviacion > 0 ? '#dc2626' : m.desviacion < 0 ? '#166534' : undefined }}>{m.desviacion > 0 ? '+' : ''}{fmt(m.desviacion)}</td>)}<td style={{ textAlign: 'right', fontWeight: 700, color: row.total_desviacion > 0 ? '#dc2626' : '#166534' }}>{row.total_desviacion > 0 ? '+' : ''}{fmt(row.total_desviacion)}</td></tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
