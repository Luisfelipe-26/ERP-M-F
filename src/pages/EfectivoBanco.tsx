import { useEffect, useState, useCallback } from 'react'
import api from '../api'
import toast from 'react-hot-toast'
import {
  Plus, Search, RefreshCw, Landmark, X, Edit2, Trash2, ArrowUpRight, ArrowDownLeft,
  CreditCard, DollarSign, Eye, Building2
} from 'lucide-react'

const fmt = (n: number) => `RD$ ${Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('es-DO') : '—'

const ESTADO_COLORS = {
  pendiente: { bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
  pagada:    { bg: '#dcfce7', color: '#166534', border: '#86efac' },
  parcial:   { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
  cobrada:   { bg: '#dcfce7', color: '#166534', border: '#86efac' },
  vencida:   { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
  anulada:   { bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db' },
}

const Badge = ({ estado }) => {
  const c = ESTADO_COLORS[estado] || { bg: '#f3f4f6', color: '#374151', border: '#d1d5db' }
  return <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>{estado}</span>
}

const Modal = ({ title, subtitle = '', onClose, children, width = 600 }) => (
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

// ─── Tabs ──────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'cuentas', label: 'Cuentas Bancarias', icon: Building2 },
  { id: 'cxp',     label: 'Cuentas por Pagar',  icon: ArrowUpRight },
  { id: 'cxc',     label: 'Cuentas por Cobrar',  icon: ArrowDownLeft },
]

// ─── Modal Nueva Cuenta Bancaria ───────────────────────────────────────────
function ModalCuentaBancaria({ cuenta, onClose, onDone }) {
  const isEdit = !!cuenta
  const [form, setForm] = useState(isEdit ? {
    banco: cuenta.banco || '', tipo_cuenta: cuenta.tipo_cuenta || 'corriente',
    numero_cuenta: cuenta.numero_cuenta || '', moneda: cuenta.moneda || 'DOP',
    nombre_corto: cuenta.nombre_corto || '', cuenta_contable_id: cuenta.cuenta_contable_id || '',
  } : { banco: '', tipo_cuenta: 'corriente', numero_cuenta: '', moneda: 'DOP', nombre_corto: '', cuenta_contable_id: '' })
  const [cuentasGL, setCuentasGL] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/contabilidad/cuentas').then(r => setCuentasGL(r.data.filter(c => c.acepta_movimientos && c.tipo === 'activo'))).catch(() => {})
  }, [])

  const set = (k, v) => setForm({ ...form, [k]: v })

  async function submit(e) {
    e.preventDefault()
    if (!form.banco.trim() || !form.numero_cuenta.trim()) return toast.error('Banco y número de cuenta son obligatorios')
    setSaving(true)
    try {
      const payload = { ...form, cuenta_contable_id: form.cuenta_contable_id ? Number(form.cuenta_contable_id) : null }
      if (isEdit) {
        await api.put(`/cuentas-bancarias/${cuenta.id}`, payload)
        toast.success('Cuenta actualizada')
      } else {
        await api.post('/cuentas-bancarias', payload)
        toast.success('Cuenta bancaria creada')
      }
      onDone()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  return (
    <Modal title={isEdit ? 'Editar Cuenta Bancaria' : 'Nueva Cuenta Bancaria'} onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          <div>
            <Label>Banco *</Label>
            <input className="input" value={form.banco} onChange={e => set('banco', e.target.value)} placeholder="Ej: Banreservas" required />
          </div>
          <div>
            <Label>Tipo de Cuenta</Label>
            <select className="select" value={form.tipo_cuenta} onChange={e => set('tipo_cuenta', e.target.value)}>
              <option value="corriente">Corriente</option>
              <option value="ahorro">Ahorro</option>
              <option value="certificado">Certificado</option>
            </select>
          </div>
          <div>
            <Label>Número de Cuenta *</Label>
            <input className="input" value={form.numero_cuenta} onChange={e => set('numero_cuenta', e.target.value)} required />
          </div>
          <div>
            <Label>Moneda</Label>
            <select className="select" value={form.moneda} onChange={e => set('moneda', e.target.value)}>
              <option value="DOP">DOP — Peso Dominicano</option>
              <option value="USD">USD — Dólar</option>
            </select>
          </div>
          <div>
            <Label>Nombre Corto</Label>
            <input className="input" value={form.nombre_corto} onChange={e => set('nombre_corto', e.target.value)} placeholder="Ej: BRE-Corriente" />
          </div>
          <div>
            <Label>Cuenta Contable (GL)</Label>
            <select className="select" value={form.cuenta_contable_id} onChange={e => set('cuenta_contable_id', e.target.value)}>
              <option value="">— Sin asignar —</option>
              {cuentasGL.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Cuenta'}</button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Modal Nueva CxP ───────────────────────────────────────────────────────
function ModalNuevaCxP({ onClose, onDone }) {
  const [proveedores, setProveedores] = useState([])
  const [form, setForm] = useState({
    proveedor_id: '', tipo_ncf: 'B11', ncf: '', num_factura_proveedor: '',
    fecha_factura: new Date().toISOString().slice(0, 10), fecha_vencimiento: '',
    subtotal: '', itbis: '', retencion_isr: '', notas: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { api.get('/proveedores').then(r => setProveedores(r.data)).catch(() => {}) }, [])

  const set = (k, v) => setForm({ ...form, [k]: v })
  const subtotal = Number(form.subtotal) || 0
  const itbis = Number(form.itbis) || 0
  const retencion = Number(form.retencion_isr) || 0
  const total = subtotal + itbis - retencion

  async function submit(e) {
    e.preventDefault()
    if (!form.proveedor_id) return toast.error('Seleccione un proveedor')
    if (subtotal <= 0) return toast.error('El subtotal debe ser mayor a 0')
    setSaving(true)
    try {
      await api.post('/contabilidad/cxp', {
        proveedor_id: Number(form.proveedor_id),
        tipo_ncf: form.tipo_ncf || null,
        ncf: form.ncf || null,
        num_factura_proveedor: form.num_factura_proveedor || null,
        fecha_factura: form.fecha_factura,
        fecha_vencimiento: form.fecha_vencimiento || null,
        subtotal, itbis, retencion_isr: retencion, total,
        notas: form.notas || null,
      })
      toast.success('Cuenta por Pagar registrada')
      onDone()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  return (
    <Modal title="Nueva Cuenta por Pagar" subtitle="Registrar factura de proveedor" onClose={onClose} width={700}>
      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <Label>Proveedor *</Label>
            <select className="select" value={form.proveedor_id} onChange={e => set('proveedor_id', e.target.value)} required>
              <option value="">Seleccionar proveedor...</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.rnc ? `(${p.rnc})` : ''}</option>)}
            </select>
          </div>
          <div>
            <Label>Fecha Factura *</Label>
            <input className="input" type="date" value={form.fecha_factura} onChange={e => set('fecha_factura', e.target.value)} required />
          </div>
          <div>
            <Label>Fecha Vencimiento</Label>
            <input className="input" type="date" value={form.fecha_vencimiento} onChange={e => set('fecha_vencimiento', e.target.value)} />
          </div>
          <div>
            <Label>Tipo NCF</Label>
            <select className="select" value={form.tipo_ncf} onChange={e => set('tipo_ncf', e.target.value)}>
              <option value="B11">B11 — Compras</option>
              <option value="B01">B01 — Crédito Fiscal</option>
              <option value="B14">B14 — Régimen Especial</option>
              <option value="B15">B15 — Gubernamental</option>
            </select>
          </div>
          <div>
            <Label>NCF</Label>
            <input className="input" value={form.ncf} onChange={e => set('ncf', e.target.value)} placeholder="B1100000001" />
          </div>
          <div>
            <Label>N° Factura Proveedor</Label>
            <input className="input" value={form.num_factura_proveedor} onChange={e => set('num_factura_proveedor', e.target.value)} />
          </div>
          <div>
            <Label>Subtotal *</Label>
            <input className="input" type="number" step="0.01" min="0" value={form.subtotal} onChange={e => set('subtotal', e.target.value)} required />
          </div>
          <div>
            <Label>ITBIS (18%)</Label>
            <input className="input" type="number" step="0.01" min="0" value={form.itbis} onChange={e => set('itbis', e.target.value)} />
            <button type="button" style={{ fontSize: 10, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', marginTop: 2 }}
              onClick={() => set('itbis', (subtotal * 0.18).toFixed(2))}>Calcular 18%</button>
          </div>
          <div>
            <Label>Retención ISR</Label>
            <input className="input" type="number" step="0.01" min="0" value={form.retencion_isr} onChange={e => set('retencion_isr', e.target.value)} />
          </div>
          <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '8px 20px', fontSize: 18, fontWeight: 800, color: '#166534' }}>
              Total: {fmt(total)}
            </div>
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <Label>Notas</Label>
            <input className="input" value={form.notas} onChange={e => set('notas', e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Registrar CxP'}</button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Modal Pago CxP ────────────────────────────────────────────────────────
function ModalPago({ cxp, onClose, onDone }) {
  const [cuentasBanc, setCuentasBanc] = useState([])
  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    monto: cxp.saldo_pendiente || 0,
    metodo_pago: 'transferencia',
    referencia_bancaria: '',
    cuenta_bancaria_id: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { api.get('/cuentas-bancarias').then(r => setCuentasBanc(r.data)).catch(() => {}) }, [])
  const set = (k, v) => setForm({ ...form, [k]: v })

  async function submit(e) {
    e.preventDefault()
    if (Number(form.monto) <= 0) return toast.error('El monto debe ser mayor a 0')
    setSaving(true)
    try {
      await api.post('/contabilidad/pagos', {
        cxp_id: cxp.id, fecha: form.fecha, monto: Number(form.monto),
        metodo_pago: form.metodo_pago,
        referencia_bancaria: form.referencia_bancaria || null,
        cuenta_bancaria_id: form.cuenta_bancaria_id ? Number(form.cuenta_bancaria_id) : null,
      })
      toast.success('Pago registrado')
      onDone()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  return (
    <Modal title={`Pago — ${cxp.numero}`} subtitle={`Saldo pendiente: ${fmt(cxp.saldo_pendiente)}`} onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          <div>
            <Label>Fecha *</Label>
            <input className="input" type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} required />
          </div>
          <div>
            <Label>Monto *</Label>
            <input className="input" type="number" step="0.01" min="0.01" max={cxp.saldo_pendiente} value={form.monto} onChange={e => set('monto', e.target.value)} required />
          </div>
          <div>
            <Label>Método de Pago</Label>
            <select className="select" value={form.metodo_pago} onChange={e => set('metodo_pago', e.target.value)}>
              <option value="transferencia">Transferencia</option>
              <option value="cheque">Cheque</option>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
            </select>
          </div>
          <div>
            <Label>Cuenta Bancaria</Label>
            <select className="select" value={form.cuenta_bancaria_id} onChange={e => set('cuenta_bancaria_id', e.target.value)}>
              <option value="">— Seleccionar —</option>
              {cuentasBanc.map(c => <option key={c.id} value={c.id}>{c.nombre_corto || c.banco} ({c.moneda})</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <Label>Referencia Bancaria</Label>
            <input className="input" value={form.referencia_bancaria} onChange={e => set('referencia_bancaria', e.target.value)} placeholder="N° transferencia, cheque, etc." />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Registrando...' : 'Registrar Pago'}</button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Modal Nueva CxC ───────────────────────────────────────────────────────
function ModalNuevaCxC({ onClose, onDone }) {
  const [clientesLista, setClientesLista] = useState([])
  const [form, setForm] = useState({
    cliente_id: '', tipo_ncf: 'B01',
    fecha: new Date().toISOString().slice(0, 10), fecha_vencimiento: '',
    moneda: 'DOP', tasa_cambio: '1',
    subtotal: '', itbis: '',
    campo_id: '', temporada: '', kg_vendidos: '', precio_por_kg: '',
  })
  const [campos, setCampos] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/clientes'),
      api.get('/campos'),
    ]).then(([c, ca]) => { setClientesLista(c.data); setCampos(ca.data) }).catch(() => {})
  }, [])

  const set = (k, v) => setForm({ ...form, [k]: v })
  const subtotal = Number(form.subtotal) || 0
  const itbis = Number(form.itbis) || 0
  const total = subtotal + itbis

  async function submit(e) {
    e.preventDefault()
    if (!form.cliente_id) return toast.error('Seleccione un cliente')
    if (subtotal <= 0) return toast.error('El subtotal debe ser mayor a 0')
    setSaving(true)
    try {
      await api.post('/contabilidad/cxc', {
        cliente_id: Number(form.cliente_id),
        tipo_ncf: form.tipo_ncf || null,
        fecha: form.fecha,
        fecha_vencimiento: form.fecha_vencimiento || null,
        moneda: form.moneda,
        tasa_cambio: Number(form.tasa_cambio) || 1,
        subtotal, itbis, total,
        campo_id: form.campo_id || null,
        temporada: form.temporada || null,
        kg_vendidos: form.kg_vendidos ? Number(form.kg_vendidos) : null,
        precio_por_kg: form.precio_por_kg ? Number(form.precio_por_kg) : null,
      })
      toast.success('Cuenta por Cobrar registrada')
      onDone()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  return (
    <Modal title="Nueva Cuenta por Cobrar" subtitle="Factura de venta de aguacate" onClose={onClose} width={750}>
      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <Label>Cliente *</Label>
            <select className="select" value={form.cliente_id} onChange={e => set('cliente_id', e.target.value)} required>
              <option value="">Seleccionar cliente...</option>
              {clientesLista.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.id_cliente})</option>)}
            </select>
          </div>
          <div>
            <Label>Fecha *</Label>
            <input className="input" type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} required />
          </div>
          <div>
            <Label>Vencimiento</Label>
            <input className="input" type="date" value={form.fecha_vencimiento} onChange={e => set('fecha_vencimiento', e.target.value)} />
          </div>
          <div>
            <Label>Tipo NCF</Label>
            <select className="select" value={form.tipo_ncf} onChange={e => set('tipo_ncf', e.target.value)}>
              <option value="B01">B01 — Crédito Fiscal</option>
              <option value="B02">B02 — Consumidor Final</option>
              <option value="B14">B14 — Régimen Especial</option>
              <option value="B15">B15 — Gubernamental</option>
            </select>
          </div>
          <div>
            <Label>Moneda</Label>
            <select className="select" value={form.moneda} onChange={e => set('moneda', e.target.value)}>
              <option value="DOP">DOP</option>
              <option value="USD">USD</option>
            </select>
          </div>
          {form.moneda === 'USD' && (
            <div>
              <Label>Tasa de Cambio</Label>
              <input className="input" type="number" step="0.01" value={form.tasa_cambio} onChange={e => set('tasa_cambio', e.target.value)} />
            </div>
          )}
          <div>
            <Label>Campo</Label>
            <select className="select" value={form.campo_id} onChange={e => set('campo_id', e.target.value)}>
              <option value="">— Todos —</option>
              {campos.map(c => <option key={c.id_campo} value={c.id_campo}>{c.nombre || c.id_campo}</option>)}
            </select>
          </div>
          <div>
            <Label>Temporada</Label>
            <input className="input" value={form.temporada} onChange={e => set('temporada', e.target.value)} placeholder="Ej: 2026-A" />
          </div>
          <div>
            <Label>Kg Vendidos</Label>
            <input className="input" type="number" step="0.01" min="0" value={form.kg_vendidos} onChange={e => set('kg_vendidos', e.target.value)} />
          </div>
          <div>
            <Label>Precio por Kg</Label>
            <input className="input" type="number" step="0.01" min="0" value={form.precio_por_kg} onChange={e => set('precio_por_kg', e.target.value)} />
          </div>
          <div>
            <Label>Subtotal *</Label>
            <input className="input" type="number" step="0.01" min="0" value={form.subtotal} onChange={e => set('subtotal', e.target.value)} required />
            {form.kg_vendidos && form.precio_por_kg && (
              <button type="button" style={{ fontSize: 10, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', marginTop: 2 }}
                onClick={() => set('subtotal', (Number(form.kg_vendidos) * Number(form.precio_por_kg)).toFixed(2))}>Calcular desde Kg</button>
            )}
          </div>
          <div>
            <Label>ITBIS</Label>
            <input className="input" type="number" step="0.01" min="0" value={form.itbis} onChange={e => set('itbis', e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'end' }}>
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '8px 20px', fontSize: 18, fontWeight: 800, color: '#166534' }}>
              Total: {fmt(total)}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Registrar CxC'}</button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Modal Cobro CxC ───────────────────────────────────────────────────────
function ModalCobro({ cxc, onClose, onDone }) {
  const [cuentasBanc, setCuentasBanc] = useState([])
  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    monto: cxc.saldo_pendiente || 0,
    metodo_pago: 'transferencia',
    referencia_bancaria: '',
    cuenta_bancaria_id: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { api.get('/cuentas-bancarias').then(r => setCuentasBanc(r.data)).catch(() => {}) }, [])
  const set = (k, v) => setForm({ ...form, [k]: v })

  async function submit(e) {
    e.preventDefault()
    if (Number(form.monto) <= 0) return toast.error('El monto debe ser mayor a 0')
    setSaving(true)
    try {
      await api.post('/contabilidad/cobros', {
        cxc_id: cxc.id, fecha: form.fecha, monto: Number(form.monto),
        metodo_pago: form.metodo_pago,
        referencia_bancaria: form.referencia_bancaria || null,
        cuenta_bancaria_id: form.cuenta_bancaria_id ? Number(form.cuenta_bancaria_id) : null,
      })
      toast.success('Cobro registrado')
      onDone()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
    finally { setSaving(false) }
  }

  return (
    <Modal title={`Cobro — ${cxc.numero}`} subtitle={`Saldo pendiente: ${fmt(cxc.saldo_pendiente)}`} onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          <div>
            <Label>Fecha *</Label>
            <input className="input" type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} required />
          </div>
          <div>
            <Label>Monto *</Label>
            <input className="input" type="number" step="0.01" min="0.01" max={cxc.saldo_pendiente} value={form.monto} onChange={e => set('monto', e.target.value)} required />
          </div>
          <div>
            <Label>Método</Label>
            <select className="select" value={form.metodo_pago} onChange={e => set('metodo_pago', e.target.value)}>
              <option value="transferencia">Transferencia</option>
              <option value="cheque">Cheque</option>
              <option value="efectivo">Efectivo</option>
            </select>
          </div>
          <div>
            <Label>Cuenta Bancaria</Label>
            <select className="select" value={form.cuenta_bancaria_id} onChange={e => set('cuenta_bancaria_id', e.target.value)}>
              <option value="">— Seleccionar —</option>
              {cuentasBanc.map(c => <option key={c.id} value={c.id}>{c.nombre_corto || c.banco} ({c.moneda})</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <Label>Referencia Bancaria</Label>
            <input className="input" value={form.referencia_bancaria} onChange={e => set('referencia_bancaria', e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Registrando...' : 'Registrar Cobro'}</button>
        </div>
      </form>
    </Modal>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════════

export default function EfectivoBanco() {
  const [tab, setTab] = useState('cuentas')
  const [cuentasBanc, setCuentasBanc] = useState([])
  const [cxpList, setCxpList] = useState([])
  const [cxcList, setCxcList] = useState([])
  const [loading, setLoading] = useState(true)
  const [buscar, setBuscar] = useState('')

  // modals
  const [modalCuenta, setModalCuenta] = useState<any>(false)
  const [modalCxP, setModalCxP] = useState(false)
  const [modalPago, setModalPago] = useState<any>(null)
  const [modalCxC, setModalCxC] = useState(false)
  const [modalCobro, setModalCobro] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [cb, cxp, cxc] = await Promise.all([
        api.get('/cuentas-bancarias'),
        api.get('/contabilidad/cxp'),
        api.get('/contabilidad/cxc'),
      ])
      setCuentasBanc(cb.data)
      setCxpList(cxp.data.items || cxp.data)
      setCxcList(cxc.data.items || cxc.data)
    } catch { toast.error('Error al cargar datos') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function afterAction() {
    setModalCuenta(false); setModalCxP(false); setModalPago(null)
    setModalCxC(false); setModalCobro(null)
    load()
  }

  async function desactivarCuenta(c) {
    if (!confirm(`¿Desactivar cuenta ${c.numero_cuenta}?`)) return
    try { await api.delete(`/cuentas-bancarias/${c.id}`); toast.success('Cuenta desactivada'); load() }
    catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  // Summary cards
  const totalCxP = cxpList.reduce((s, c) => s + (c.saldo_pendiente || 0), 0)
  const totalCxC = cxcList.reduce((s, c) => s + (c.saldo_pendiente || 0), 0)
  const cxpPendientes = cxpList.filter(c => c.estado === 'pendiente').length
  const cxcPendientes = cxcList.filter(c => c.estado === 'pendiente').length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#111827' }}>
            <Landmark size={22} style={{ verticalAlign: 'text-bottom', marginRight: 8 }} />
            Efectivo y Banco
          </h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>
            Cuentas bancarias, cuentas por pagar y cuentas por cobrar
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={load}><RefreshCw size={14} /></button>
          {tab === 'cuentas' && <button className="btn-primary" onClick={() => setModalCuenta(true)}><Plus size={14} /> Nueva Cuenta</button>}
          {tab === 'cxp' && <button className="btn-primary" onClick={() => setModalCxP(true)}><Plus size={14} /> Nueva CxP</button>}
          {tab === 'cxc' && <button className="btn-primary" onClick={() => setModalCxC(true)}><Plus size={14} /> Nueva CxC</button>}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ borderLeft: '4px solid #2563eb', padding: '10px 14px' }}>
          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Cuentas Bancarias</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1e40af' }}>{cuentasBanc.length}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #dc2626', padding: '10px 14px' }}>
          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Por Pagar Total</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#dc2626' }}>{fmt(totalCxP)}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #166534', padding: '10px 14px' }}>
          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Por Cobrar Total</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#166534' }}>{fmt(totalCxC)}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #7c3aed', padding: '10px 14px' }}>
          <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Flujo Neto</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: totalCxC - totalCxP >= 0 ? '#166534' : '#dc2626' }}>{fmt(totalCxC - totalCxP)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '2px solid #e5e7eb' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setBuscar('') }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', fontSize: 13, fontWeight: 700,
              background: 'none', border: 'none', borderBottom: tab === t.id ? '2px solid #166534' : '2px solid transparent',
              color: tab === t.id ? '#166534' : '#6b7280', cursor: 'pointer', marginBottom: -2,
            }}>
            <t.icon size={15} /> {t.label}
            {t.id === 'cxp' && cxpPendientes > 0 && <span style={{ background: '#fef9c3', color: '#854d0e', borderRadius: 10, padding: '0 6px', fontSize: 10, fontWeight: 800 }}>{cxpPendientes}</span>}
            {t.id === 'cxc' && cxcPendientes > 0 && <span style={{ background: '#dcfce7', color: '#166534', borderRadius: 10, padding: '0 6px', fontSize: 10, fontWeight: 800 }}>{cxcPendientes}</span>}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input className="input" style={{ paddingLeft: 30 }}
            placeholder={tab === 'cuentas' ? 'Buscar banco...' : tab === 'cxp' ? 'Buscar proveedor o N°...' : 'Buscar cliente o N°...'}
            value={buscar} onChange={e => setBuscar(e.target.value)} />
        </div>
      </div>

      {/* ─── Tab: Cuentas Bancarias ──────────────────────────── */}
      {tab === 'cuentas' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Banco</th>
                <th>Tipo</th>
                <th>N° Cuenta</th>
                <th>Moneda</th>
                <th>Nombre Corto</th>
                <th style={{ textAlign: 'right' }}>Saldo Libro</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Cargando...</td></tr>
              ) : cuentasBanc.filter(c => c.banco.toLowerCase().includes(buscar.toLowerCase()) || (c.nombre_corto || '').toLowerCase().includes(buscar.toLowerCase())).length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Sin cuentas bancarias</td></tr>
              ) : cuentasBanc.filter(c => c.banco.toLowerCase().includes(buscar.toLowerCase()) || (c.nombre_corto || '').toLowerCase().includes(buscar.toLowerCase())).map(c => (
                <tr key={c.id}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ fontWeight: 700 }}>{c.banco}</td>
                  <td style={{ textTransform: 'capitalize', fontSize: 12 }}>{c.tipo_cuenta}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.numero_cuenta}</td>
                  <td><span style={{ background: c.moneda === 'USD' ? '#dbeafe' : '#f0fdf4', color: c.moneda === 'USD' ? '#1e40af' : '#166534', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{c.moneda}</span></td>
                  <td style={{ fontSize: 12, color: '#6b7280' }}>{c.nombre_corto || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(c.saldo_segun_libro)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setModalCuenta(c)}><Edit2 size={12} /></button>
                      <button className="btn-danger" style={{ padding: '4px 8px' }} onClick={() => desactivarCuenta(c)}><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Tab: CxP ──────────────────────────────────────── */}
      {tab === 'cxp' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>N°</th>
                <th>Proveedor</th>
                <th>Fecha</th>
                <th>Vencimiento</th>
                <th>NCF</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'right' }}>Saldo</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Cargando...</td></tr>
              ) : cxpList.filter(c => (c.proveedor_nombre || '').toLowerCase().includes(buscar.toLowerCase()) || (c.numero || '').toLowerCase().includes(buscar.toLowerCase())).length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Sin cuentas por pagar</td></tr>
              ) : cxpList.filter(c => (c.proveedor_nombre || '').toLowerCase().includes(buscar.toLowerCase()) || (c.numero || '').toLowerCase().includes(buscar.toLowerCase())).map(c => (
                <tr key={c.id}
                  onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ fontWeight: 700, color: '#dc2626' }}>{c.numero}</td>
                  <td style={{ fontWeight: 600 }}>{c.proveedor_nombre || '—'}</td>
                  <td style={{ fontSize: 12 }}>{fmtDate(c.fecha_factura)}</td>
                  <td style={{ fontSize: 12 }}>{fmtDate(c.fecha_vencimiento)}</td>
                  <td style={{ fontSize: 11, color: '#6b7280' }}>{c.ncf || c.tipo_ncf || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(c.total)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: c.saldo_pendiente > 0 ? '#dc2626' : '#166534' }}>{fmt(c.saldo_pendiente)}</td>
                  <td><Badge estado={c.estado} /></td>
                  <td>
                    {c.estado === 'pendiente' || c.estado === 'parcial' ? (
                      <button className="btn-primary" style={{ padding: '4px 10px', fontSize: 11, background: '#166534' }} onClick={() => setModalPago(c)}>
                        <DollarSign size={12} /> Pagar
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Tab: CxC ──────────────────────────────────────── */}
      {tab === 'cxc' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>N°</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Vencimiento</th>
                <th>Moneda</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'right' }}>Saldo</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Cargando...</td></tr>
              ) : cxcList.filter(c => (c.cliente_nombre || '').toLowerCase().includes(buscar.toLowerCase()) || (c.numero || '').toLowerCase().includes(buscar.toLowerCase())).length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Sin cuentas por cobrar</td></tr>
              ) : cxcList.filter(c => (c.cliente_nombre || '').toLowerCase().includes(buscar.toLowerCase()) || (c.numero || '').toLowerCase().includes(buscar.toLowerCase())).map(c => (
                <tr key={c.id}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ fontWeight: 700, color: '#166534' }}>{c.numero}</td>
                  <td style={{ fontWeight: 600 }}>{c.cliente_nombre || '—'}</td>
                  <td style={{ fontSize: 12 }}>{fmtDate(c.fecha)}</td>
                  <td style={{ fontSize: 12 }}>{fmtDate(c.fecha_vencimiento)}</td>
                  <td><span style={{ background: c.moneda === 'USD' ? '#dbeafe' : '#f0fdf4', color: c.moneda === 'USD' ? '#1e40af' : '#166534', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{c.moneda}</span></td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(c.total)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: c.saldo_pendiente > 0 ? '#b45309' : '#166534' }}>{fmt(c.saldo_pendiente)}</td>
                  <td><Badge estado={c.estado} /></td>
                  <td>
                    {c.estado === 'pendiente' || c.estado === 'parcial' ? (
                      <button className="btn-primary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setModalCobro(c)}>
                        <DollarSign size={12} /> Cobrar
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {modalCuenta && <ModalCuentaBancaria cuenta={modalCuenta === true ? null : modalCuenta} onClose={() => setModalCuenta(false)} onDone={afterAction} />}
      {modalCxP && <ModalNuevaCxP onClose={() => setModalCxP(false)} onDone={afterAction} />}
      {modalPago && <ModalPago cxp={modalPago} onClose={() => setModalPago(null)} onDone={afterAction} />}
      {modalCxC && <ModalNuevaCxC onClose={() => setModalCxC(false)} onDone={afterAction} />}
      {modalCobro && <ModalCobro cxc={modalCobro} onClose={() => setModalCobro(null)} onDone={afterAction} />}
    </div>
  )
}
