import { useEffect, useState, useCallback } from 'react'
import api from '../api'
import toast from 'react-hot-toast'
import { Edit2, X, RefreshCw, Hash } from 'lucide-react'

const Label = ({ children }) => (
  <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>{children}</label>
)

const TABS = [
  { key: 'empresa', label: 'Datos de la Empresa' },
  { key: 'secuencias', label: 'Secuencias' },
]

export default function Configuracion() {
  const [tab, setTab] = useState('empresa')

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Configuración</h1>
      <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>Configuración general del sistema</p>

      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e5e7eb' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '8px 18px', fontSize: 13, fontWeight: tab === t.key ? 700 : 500,
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: tab === t.key ? '2px solid #166534' : '2px solid transparent',
              color: tab === t.key ? '#166534' : '#6b7280', marginBottom: -2,
            }}>{t.label}</button>
        ))}
      </div>

      {tab === 'empresa' && <TabEmpresa />}
      {tab === 'secuencias' && <TabSecuencias />}
    </div>
  )
}

function TabEmpresa() {
  const [empresa, setEmpresa] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editEmpresa, setEditEmpresa] = useState(false)
  const [formEmpresa, setFormEmpresa] = useState<any>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/contabilidad/empresa')
      setEmpresa(data)
      if (data) setFormEmpresa(data)
    } catch { toast.error('Error al cargar datos de empresa') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function saveEmpresa(e) {
    e.preventDefault()
    try {
      const { id, ...payload } = formEmpresa
      await api.put('/contabilidad/empresa', payload)
      toast.success('Configuración guardada')
      setEditEmpresa(false)
      load()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div>

  return (
    <div className="card" style={{ maxWidth: 600 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
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
  )
}

function TabSecuencias() {
  const [seqs, setSeqs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/secuencias')
      setSeqs(data)
    } catch { toast.error('Error al cargar secuencias') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>Estado actual de todas las secuencias del sistema.</p>
        <button className="btn-secondary" onClick={load}><RefreshCw size={14} /></button>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Prefijo</th>
              <th style={{ textAlign: 'right' }}>Último Número</th>
              <th>Último Generado</th>
            </tr>
          </thead>
          <tbody>
            {seqs.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Sin secuencias registradas</td></tr>
            ) : seqs.map(s => (
              <tr key={s.tipo}>
                <td style={{ fontWeight: 700 }}>{s.tipo}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{s.prefijo || '—'}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{s.ultimo_numero}</td>
                <td style={{ fontSize: 12, color: '#6b7280' }}>{s.ultimo_generado || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
