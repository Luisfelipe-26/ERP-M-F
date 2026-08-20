import { useEffect, useState, useCallback } from 'react'
import api from '../api'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, X, RefreshCw, Key, Shield, Users } from 'lucide-react'

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

const Modal = ({ title, onClose, children, width = 600 }) => (
  <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="modal" style={{ maxWidth: width, width: '95%', maxHeight: '90vh', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}><X size={18} /></button>
      </div>
      {children}
    </div>
  </div>
)

const TABS = [
  { key: 'usuarios', label: 'Usuarios', icon: Users },
  { key: 'perfiles', label: 'Perfiles de Acceso', icon: Shield },
]

const MODULOS = [
  'contabilidad', 'inventario', 'ordenes', 'compras', 'nomina',
  'sanidad', 'riego', 'campos', 'trabajadores', 'productos',
  'clientes', 'proveedores', 'activos_fijos', 'presupuesto',
  'configuracion', 'admin',
]

const NIVELES = ['', 'read', 'write', 'full']
const NIVEL_LABELS = { '': 'Sin acceso', read: 'Lectura', write: 'Escritura', full: 'Total' }
const NIVEL_COLORS = { '': 'gray', read: 'blue', write: 'yellow', full: 'green' }

export default function Administracion() {
  const [tab, setTab] = useState('usuarios')

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Administración</h1>
      <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>Gestión de usuarios y perfiles de acceso</p>

      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e5e7eb' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', fontSize: 13, fontWeight: tab === t.key ? 700 : 500,
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: tab === t.key ? '2px solid #166534' : '2px solid transparent',
              color: tab === t.key ? '#166534' : '#6b7280', marginBottom: -2,
            }}><t.icon size={14} /> {t.label}</button>
        ))}
      </div>

      {tab === 'usuarios' && <TabUsuarios />}
      {tab === 'perfiles' && <TabPerfiles />}
    </div>
  )
}

function TabUsuarios() {
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [perfiles, setPerfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<any>(null)
  const [resetModal, setResetModal] = useState<any>(null)
  const [newPass, setNewPass] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [u, p] = await Promise.all([
        api.get('/admin/usuarios'),
        api.get('/admin/perfiles'),
      ])
      setUsuarios(u.data)
      setPerfiles(p.data)
    } catch { toast.error('Error al cargar usuarios') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function guardar(e) {
    e.preventDefault()
    try {
      if (editando.id) {
        const { password, ...data } = editando
        await api.put(`/admin/usuarios/${editando.id}`, data)
      } else {
        await api.post('/admin/usuarios', editando)
      }
      toast.success('Usuario guardado')
      setEditando(null)
      load()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
  }

  async function doReset(e) {
    e.preventDefault()
    try {
      await api.post(`/admin/usuarios/${resetModal.id}/reset-password`, { password: newPass })
      toast.success('Contraseña actualizada')
      setResetModal(null)
      setNewPass('')
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button className="btn-secondary" onClick={load}><RefreshCw size={14} /></button>
        <button className="btn-primary" onClick={() => setEditando({ nombre: '', email: '', password: '', rol: 'operador', perfil_id: '', activo: true })}><Plus size={14} /> Nuevo Usuario</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Perfil</th>
              <th>Rol</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Cargando...</td></tr>
            ) : usuarios.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Sin usuarios</td></tr>
            ) : usuarios.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>{u.nombre}</td>
                <td style={{ fontSize: 12, color: '#6b7280' }}>{u.email}</td>
                <td>{u.perfil_nombre ? <Badge color="blue">{u.perfil_nombre}</Badge> : <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>}</td>
                <td><Badge color={u.rol === 'admin' ? 'green' : u.rol === 'supervisor' ? 'yellow' : 'gray'}>{u.rol}</Badge></td>
                <td><Badge color={u.activo ? 'green' : 'red'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge></td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-secondary" style={{ padding: '4px 6px' }} onClick={() => setEditando({ ...u })} title="Editar"><Edit2 size={12} /></button>
                    <button className="btn-secondary" style={{ padding: '4px 6px' }} onClick={() => setResetModal(u)} title="Reset contraseña"><Key size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editando && (
        <Modal title={editando.id ? 'Editar Usuario' : 'Nuevo Usuario'} onClose={() => setEditando(null)} width={500}>
          <form onSubmit={guardar}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <Label>Nombre *</Label>
                <input className="input" value={editando.nombre} onChange={e => setEditando({ ...editando, nombre: e.target.value })} required />
              </div>
              <div>
                <Label>Email *</Label>
                <input className="input" type="email" value={editando.email} onChange={e => setEditando({ ...editando, email: e.target.value })} required />
              </div>
              {!editando.id && (
                <div>
                  <Label>Contraseña *</Label>
                  <input className="input" type="password" value={editando.password || ''} onChange={e => setEditando({ ...editando, password: e.target.value })} required />
                </div>
              )}
              <div>
                <Label>Perfil de Acceso</Label>
                <select className="select" value={editando.perfil_id || ''} onChange={e => setEditando({ ...editando, perfil_id: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">— Sin perfil —</option>
                  {perfiles.filter(p => p.activo).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div>
                <Label>Rol (legacy)</Label>
                <select className="select" value={editando.rol} onChange={e => setEditando({ ...editando, rol: e.target.value })}>
                  <option value="admin">Admin</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="operador">Operador</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'end' }}>
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

      {resetModal && (
        <Modal title={`Cambiar contraseña — ${resetModal.nombre}`} onClose={() => { setResetModal(null); setNewPass('') }} width={400}>
          <form onSubmit={doReset}>
            <div style={{ marginBottom: 16 }}>
              <Label>Nueva Contraseña *</Label>
              <input className="input" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} required minLength={6} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn-secondary" onClick={() => { setResetModal(null); setNewPass('') }}>Cancelar</button>
              <button type="submit" className="btn-primary">Cambiar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function TabPerfiles() {
  const [perfiles, setPerfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/perfiles')
      setPerfiles(data)
    } catch { toast.error('Error al cargar perfiles') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function guardar(e) {
    e.preventDefault()
    try {
      if (editando.id) {
        await api.put(`/admin/perfiles/${editando.id}`, editando)
      } else {
        await api.post('/admin/perfiles', editando)
      }
      toast.success('Perfil guardado')
      setEditando(null)
      load()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
  }

  async function eliminar(id: number) {
    if (!confirm('¿Eliminar este perfil?')) return
    try { await api.delete(`/admin/perfiles/${id}`); toast.success('Eliminado'); load() }
    catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>Define qué módulos y nivel de acceso tiene cada perfil.</p>
        <button className="btn-primary" onClick={() => setEditando({ nombre: '', descripcion: '', permisos: {}, activo: true })}><Plus size={14} /> Nuevo Perfil</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Módulos</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Cargando...</td></tr>
            ) : perfiles.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Sin perfiles</td></tr>
            ) : perfiles.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 700 }}>{p.nombre}</td>
                <td style={{ fontSize: 12, color: '#6b7280', maxWidth: 200 }}>{p.descripcion || '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    {Object.entries(p.permisos || {}).filter(([, v]) => v).map(([mod, nivel]: [string, any]) => (
                      <Badge key={mod} color={NIVEL_COLORS[nivel] || 'gray'}>{mod}</Badge>
                    ))}
                  </div>
                </td>
                <td><Badge color={p.activo ? 'green' : 'red'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge></td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-secondary" style={{ padding: '4px 6px' }} onClick={() => setEditando({ ...p })}><Edit2 size={12} /></button>
                    <button className="btn-danger" style={{ padding: '4px 6px' }} onClick={() => eliminar(p.id)}><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editando && (
        <Modal title={editando.id ? 'Editar Perfil' : 'Nuevo Perfil'} onClose={() => setEditando(null)} width={650}>
          <form onSubmit={guardar}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <Label>Nombre *</Label>
                <input className="input" value={editando.nombre} onChange={e => setEditando({ ...editando, nombre: e.target.value })} required />
              </div>
              <div>
                <Label>Descripción</Label>
                <input className="input" value={editando.descripcion || ''} onChange={e => setEditando({ ...editando, descripcion: e.target.value })} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Label>Permisos por módulo</Label>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ fontSize: 12, margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '6px 12px' }}>Módulo</th>
                      <th style={{ padding: '6px 12px' }}>Nivel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MODULOS.map(mod => (
                      <tr key={mod}>
                        <td style={{ padding: '4px 12px', textTransform: 'capitalize' }}>{mod.replace(/_/g, ' ')}</td>
                        <td style={{ padding: '4px 12px' }}>
                          <select className="select" style={{ fontSize: 11, padding: '2px 6px' }}
                            value={(editando.permisos || {})[mod] || ''}
                            onChange={e => {
                              const p = { ...editando.permisos }
                              if (e.target.value) p[mod] = e.target.value
                              else delete p[mod]
                              setEditando({ ...editando, permisos: p })
                            }}>
                            {NIVELES.map(n => <option key={n} value={n}>{NIVEL_LABELS[n]}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={editando.activo} onChange={e => setEditando({ ...editando, activo: e.target.checked })} />
                Activo
              </label>
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
