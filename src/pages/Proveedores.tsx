import { useEffect, useState, useCallback } from 'react'
import api from '../api'
import toast from 'react-hot-toast'
import { Plus, Search, RefreshCw, Truck, X, Edit2, Trash2, Eye } from 'lucide-react'

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

const NCF_TIPOS = [
  { value: 'B11', label: 'B11 — Compras' },
  { value: 'B01', label: 'B01 — Crédito Fiscal' },
  { value: 'B14', label: 'B14 — Régimen Especial' },
  { value: 'B15', label: 'B15 — Gubernamental' },
]

const emptyForm = {
  nombre: '', rnc: '', email: '', telefono: '', contacto: '', direccion: '',
  condicion_pago_dias: 30, tipo_ncf_default: 'B11', cuenta_cxp_id: '',
}

function ModalProveedor({ proveedor, onClose, onDone }) {
  const isEdit = !!proveedor
  const [form, setForm] = useState(isEdit ? {
    nombre: proveedor.nombre || '',
    rnc: proveedor.rnc || '',
    email: proveedor.email || '',
    telefono: proveedor.telefono || '',
    contacto: proveedor.contacto || '',
    direccion: proveedor.direccion || '',
    condicion_pago_dias: proveedor.condicion_pago_dias || 30,
    tipo_ncf_default: proveedor.tipo_ncf_default || 'B11',
    cuenta_cxp_id: proveedor.cuenta_cxp_id || '',
  } : { ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [cuentasGL, setCuentasGL] = useState([])

  useEffect(() => {
    api.get('/contabilidad/cuentas').then(r => setCuentasGL(r.data.filter(c => c.acepta_movimientos && c.tipo === 'pasivo'))).catch(() => {})
  }, [])

  const set = (k, v) => setForm({ ...form, [k]: v })

  async function submit(e) {
    e.preventDefault()
    if (!form.nombre.trim()) return toast.error('El nombre es obligatorio')
    setSaving(true)
    try {
      const payload = { ...form, cuenta_cxp_id: form.cuenta_cxp_id ? Number(form.cuenta_cxp_id) : null }
      if (isEdit) {
        await api.put(`/proveedores/${proveedor.id}`, payload)
        toast.success('Proveedor actualizado')
      } else {
        await api.post('/proveedores', payload)
        toast.success('Proveedor creado')
      }
      onDone()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al guardar') }
    finally { setSaving(false) }
  }

  return (
    <Modal title={isEdit ? `Editar — ${proveedor.nombre}` : 'Nuevo Proveedor'} onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <Label>Nombre / Razón Social *</Label>
            <input className="input" value={form.nombre} onChange={e => set('nombre', e.target.value)} required />
          </div>
          <div>
            <Label>RNC</Label>
            <input className="input" value={form.rnc} onChange={e => set('rnc', e.target.value)} placeholder="000-000000-0" />
          </div>
          <div>
            <Label>Teléfono</Label>
            <input className="input" value={form.telefono} onChange={e => set('telefono', e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <Label>Persona de Contacto</Label>
            <input className="input" value={form.contacto} onChange={e => set('contacto', e.target.value)} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <Label>Dirección</Label>
            <input className="input" value={form.direccion} onChange={e => set('direccion', e.target.value)} />
          </div>
          <div>
            <Label>Condición de Pago (días)</Label>
            <input className="input" type="number" min="0" value={form.condicion_pago_dias} onChange={e => set('condicion_pago_dias', Number(e.target.value))} />
          </div>
          <div>
            <Label>Tipo NCF por Defecto</Label>
            <select className="select" value={form.tipo_ncf_default} onChange={e => set('tipo_ncf_default', e.target.value)}>
              {NCF_TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <Label>Cuenta CxP (Contable)</Label>
            <select className="select" value={form.cuenta_cxp_id} onChange={e => set('cuenta_cxp_id', e.target.value)}>
              <option value="">— Por defecto —</option>
              {cuentasGL.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Proveedor'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ModalDetalle({ proveedor, onClose }) {
  const fields = [
    { label: 'RNC', value: proveedor.rnc || '—' },
    { label: 'Teléfono', value: proveedor.telefono || '—' },
    { label: 'Email', value: proveedor.email || '—' },
    { label: 'Contacto', value: proveedor.contacto || '—' },
    { label: 'Dirección', value: proveedor.direccion || '—' },
    { label: 'Condición Pago', value: `${proveedor.condicion_pago_dias || 30} días` },
    { label: 'NCF Default', value: proveedor.tipo_ncf_default || 'B11' },
  ]
  return (
    <Modal title={proveedor.nombre} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {fields.map(f => (
          <div key={f.label} style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 2 }}>{f.label}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{f.value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn-secondary" onClick={onClose}>Cerrar</button>
      </div>
    </Modal>
  )
}

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [buscar, setBuscar] = useState('')
  const [modalNew, setModalNew] = useState(false)
  const [modalEdit, setModalEdit] = useState(null)
  const [modalDetalle, setModalDetalle] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const { data } = await api.get('/proveedores'); setProveedores(data) }
    catch { toast.error('Error al cargar proveedores') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function afterAction() { setModalNew(false); setModalEdit(null); load() }

  async function desactivar(p) {
    if (!confirm(`¿Desactivar proveedor ${p.nombre}?`)) return
    try { await api.delete(`/proveedores/${p.id}`); toast.success('Proveedor desactivado'); load() }
    catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  const filtered = proveedores.filter(p =>
    p.nombre.toLowerCase().includes(buscar.toLowerCase()) ||
    (p.rnc || '').includes(buscar)
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#111827' }}>
            <Truck size={22} style={{ verticalAlign: 'text-bottom', marginRight: 8 }} />
            Proveedores
          </h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>
            {proveedores.length} proveedor{proveedores.length !== 1 ? 'es' : ''} activo{proveedores.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={load}><RefreshCw size={14} /></button>
          <button className="btn-primary" onClick={() => setModalNew(true)}>
            <Plus size={14} /> Nuevo Proveedor
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input className="input" style={{ paddingLeft: 30 }} placeholder="Buscar por nombre o RNC..." value={buscar} onChange={e => setBuscar(e.target.value)} />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>RNC</th>
              <th>Teléfono</th>
              <th>Contacto</th>
              <th>NCF</th>
              <th>Pago</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Cargando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Sin proveedores</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} style={{ cursor: 'pointer' }}
                onClick={() => setModalDetalle(p)}
                onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <td style={{ fontWeight: 700 }}>{p.nombre}</td>
                <td style={{ fontSize: 12, color: '#6b7280' }}>{p.rnc || '—'}</td>
                <td style={{ fontSize: 12 }}>{p.telefono || '—'}</td>
                <td style={{ fontSize: 12 }}>{p.contacto || '—'}</td>
                <td><span style={{ background: '#eff6ff', color: '#1e40af', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{p.tipo_ncf_default || 'B11'}</span></td>
                <td style={{ fontSize: 12 }}>{p.condicion_pago_dias || 30}d</td>
                <td onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setModalDetalle(p)}><Eye size={12} /></button>
                    <button className="btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setModalEdit(p)}><Edit2 size={12} /></button>
                    <button className="btn-danger" style={{ padding: '4px 8px' }} onClick={() => desactivar(p)}><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalNew && <ModalProveedor proveedor={null} onClose={() => setModalNew(false)} onDone={afterAction} />}
      {modalEdit && <ModalProveedor proveedor={modalEdit} onClose={() => setModalEdit(null)} onDone={afterAction} />}
      {modalDetalle && <ModalDetalle proveedor={modalDetalle} onClose={() => setModalDetalle(null)} />}
    </div>
  )
}
