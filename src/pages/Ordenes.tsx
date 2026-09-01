import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import toast from 'react-hot-toast'
import { Plus, Eye, Trash2, CheckCircle, Clock, XCircle, PlayCircle, Download, Search, Edit2, Copy, Upload } from 'lucide-react'

const estadoConfig = {
  Abierta: { badge: 'badge-yellow', icon: Clock },
  'En Proceso': { badge: 'badge-blue', icon: PlayCircle },
  Cerrada: { badge: 'badge-green', icon: CheckCircle },
  'En Pausa': { badge: 'badge-gray', icon: XCircle },
}

const fmt = n => `RD$ ${Number(n || 0).toLocaleString('es-DO')}`

export default function Ordenes() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroCampo, setFiltroCampo] = useState('')
  const [buscar, setBuscar] = useState('')
  const navigate = useNavigate()

  useEffect(() => { load() }, [filtroEstado, filtroCampo])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const params = { limit: 500 }
      if (filtroEstado) params.estado = filtroEstado
      if (filtroCampo) params.campo_id = filtroCampo
      const { data } = await api.get('/ordenes', { params })
      setItems(data)
    } catch (err) {
      setError('Error al cargar las órdenes. Verifique la conexión.')
      toast.error('Error al cargar órdenes')
    } finally {
      setLoading(false)
    }
  }

  async function cambiarEstado(ot_id, estado) {
    try {
      let hora_cierre = undefined
      if (estado === 'Cerrada') {
        const ahora = new Date().toTimeString().slice(0, 5)
        const input = prompt(`Hora de cierre de la OT #${ot_id} (HH:MM):`, ahora)
        if (input === null) return // canceló
        hora_cierre = input || ahora
      }
      const res = await api.put(`/ordenes/${ot_id}/estado`, null, { params: { estado, hora_cierre } })
      const asientoRef = res.data?.asiento ? ` · Asiento: ${res.data.asiento}` : ''
      toast.success(`Estado actualizado a: ${estado}${hora_cierre ? ` · Cierre: ${hora_cierre}` : ''}${asientoRef}`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al cambiar estado')
    }
  }

  async function del(ot_id) {
    if (!confirm('¿Eliminar esta orden de trabajo? Se restaurará el stock de productos consumidos.')) return
    try {
      await api.delete(`/ordenes/${ot_id}`)
      toast.success('Orden eliminada y stock restaurado')
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al eliminar')
    }
  }

  async function exportCSV() {
    const now = new Date()
    const mes = now.getMonth() + 1
    const ano = now.getFullYear()
    try {
      const res = await api.get(`/dashboard/export/ordenes-csv?mes=${mes}&ano=${ano}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a'); a.href = url; a.download = `ordenes_${mes}_${ano}.csv`
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url)
    } catch { toast.error('Error al exportar órdenes') }
  }

  function descargarPlantilla() {
    const url = `${api.defaults.baseURL}/ordenes/plantilla/descargar`
    const a = document.createElement('a'); a.href = url; a.download = 'plantilla_carga_ots.xlsx'
    document.body.appendChild(a); a.click(); a.remove()
  }

  const [uploading, setUploading] = useState(false)
  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post('/ordenes/carga-masiva', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success(`✅ ${data.created} OTs creadas de ${data.total_rows} filas (${data.format || 'Plantilla'})`)
      if (data.error_count > 0) {
        toast(` ${data.error_count} errores — revise la consola`, { icon: '⚠️', duration: 8000 })
        console.table(data.errors)
      }
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error en carga masiva')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const campos = [...new Set(items.map(o => o.campo_id).filter(Boolean))].sort()
  const filtered = buscar
    ? items.filter(o =>
        o.supervisor?.toLowerCase().includes(buscar.toLowerCase()) ||
        String(o.ot_id).includes(buscar) ||
        o.campo_id?.toLowerCase().includes(buscar.toLowerCase()) ||
        o.actividad_id?.toLowerCase().includes(buscar.toLowerCase()) ||
        o.actividad_nombre?.toLowerCase().includes(buscar.toLowerCase())
      )
    : items

  const totales = filtered.reduce((acc, o) => ({
    mo: acc.mo + (o.costo_mano_obra || 0),
    ins: acc.ins + (o.costo_insumos || 0),
    total: acc.total + (o.costo_total || 0),
  }), { mo: 0, ins: 0, total: 0 })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#111827' }}>Órdenes de Trabajo</h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>{filtered.length} órdenes · Total: {fmt(totales.total)}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={exportCSV}><Download size={15} /> CSV</button>
          <button className="btn-secondary" onClick={descargarPlantilla} title="Descargar plantilla Excel"><Download size={15} /> Plantilla</button>
          <label className="btn-secondary" style={{ cursor: uploading ? 'wait' : 'pointer', opacity: uploading ? 0.6 : 1 }}>
            <Upload size={15} /> {uploading ? 'Cargando...' : 'Carga Masiva'}
            <input type="file" accept=".xlsx,.xls" onChange={handleUpload} hidden disabled={uploading} />
          </label>
          <button className="btn-primary" onClick={() => navigate('/ordenes/nueva')}><Plus size={16} /> Nueva OT</button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            className="input"
            style={{ paddingLeft: 30 }}
            placeholder="Buscar por OT#, campo, actividad, supervisor..."
            value={buscar}
            onChange={e => setBuscar(e.target.value)}
          />
        </div>
        <select className="select" style={{ width: 160 }} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.keys(estadoConfig).map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <select className="select" style={{ width: 140 }} value={filtroCampo} onChange={e => setFiltroCampo(e.target.value)}>
          <option value="">Todos los campos</option>
          {campos.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#991b1b', fontSize: 14 }}>
          {error}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr><th>OT #</th><th>Fecha</th><th>Campo</th><th>Actividad</th><th>Supervisor</th><th>Estado</th><th>Costo MO</th><th>Costo Insumos</th><th>Total</th><th></th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Cargando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No hay órdenes</td></tr>
            ) : filtered.map(o => {
              const cfg = estadoConfig[o.estado] || estadoConfig['Abierta']
              return (
                <tr key={o.ot_id}>
                  <td><span style={{ fontWeight: 700, color: '#166534' }}>#{o.ot_id}</span></td>
                  <td>{o.fecha_ejecucion ? new Date(o.fecha_ejecucion).toLocaleDateString('es-DO') : '—'}</td>
                  <td><span style={{ fontWeight: 600 }}>{o.campo_id || '—'}</span></td>
                  <td style={{ fontSize: 12, color: '#4b5563' }}>{o.actividad_nombre || o.actividad_id || '—'}</td>
                  <td style={{ fontSize: 12, color: '#6b7280' }}>{o.supervisor || '—'}</td>
                  <td><span className={`badge ${cfg.badge}`}>{o.estado}</span></td>
                  <td>{fmt(o.costo_mano_obra)}</td>
                  <td>{fmt(o.costo_insumos)}</td>
                  <td style={{ fontWeight: 700 }}>{fmt(o.costo_total)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-secondary" onClick={() => navigate(`/ordenes/${o.ot_id}`)} title="Ver detalle"><Eye size={13} /></button>
                      <button className="btn-secondary" onClick={() => navigate(`/ordenes/nueva?duplicar=${o.ot_id}`)} title="Duplicar OT" style={{ color: '#7c3aed' }}><Copy size={13} /></button>
                      <button className="btn-secondary" onClick={() => navigate(`/ordenes/${o.ot_id}/editar`)} title="Editar OT" style={{ color: '#1e40af' }}><Edit2 size={13} /></button>
                      {o.estado !== 'Cerrada' && (
                        <button className="btn-secondary" onClick={() => cambiarEstado(o.ot_id, 'Cerrada')} title="Cerrar OT" style={{ color: '#166534' }}>
                          <CheckCircle size={13} />
                        </button>
                      )}
                      <button className="btn-danger" onClick={() => del(o.ot_id)} title="Eliminar"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr style={{ background: '#f9fafb', fontWeight: 700 }}>
                <td colSpan={6} style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>TOTALES ({filtered.length} órdenes)</td>
                <td style={{ padding: '10px 12px', color: '#166534' }}>{fmt(totales.mo)}</td>
                <td style={{ padding: '10px 12px', color: '#1e40af' }}>{fmt(totales.ins)}</td>
                <td style={{ padding: '10px 12px', color: '#111827', fontSize: 15 }}>{fmt(totales.total)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
