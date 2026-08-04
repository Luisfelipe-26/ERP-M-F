import { useEffect, useState } from 'react'
import api from '../api'
import toast from 'react-hot-toast'
import { Download, Users } from 'lucide-react'

const fmt = n => `RD$ ${Number(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function Nomina() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
  const [nomina, setNomina] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [mes, ano])

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/dashboard/nomina-mensual', { params: { mes, ano } })
      setNomina(data)
    } catch { toast.error('Error al cargar nómina') }
    finally { setLoading(false) }
  }

  async function exportCSV() {
    try {
      const res = await api.get(`/dashboard/export/nomina-csv?mes=${mes}&ano=${ano}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a'); a.href = url; a.download = `nomina_${String(mes).padStart(2,'0')}_${ano}.csv`
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url)
    } catch { toast.error('Error al exportar nómina') }
  }

  const total = nomina.reduce((s, r) => s + r.total_ganado, 0)
  const totalJornadas = nomina.reduce((s, r) => s + r.num_jornadas, 0)
  const activos = nomina.filter(r => r.num_jornadas > 0)

  const anos = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#111827' }}>Nómina de Jornales</h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>
            {MESES[mes-1]} {ano} · {activos.length} trabajadores activos · {totalJornadas} jornadas
          </p>
        </div>
        <button className="btn-secondary" onClick={exportCSV}><Download size={15} /> Exportar CSV</button>
      </div>

      {/* Filtros de periodo */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <select className="select" style={{ width: 160 }} value={mes} onChange={e => setMes(Number(e.target.value))}>
          {MESES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select className="select" style={{ width: 100 }} value={ano} onChange={e => setAno(Number(e.target.value))}>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Total Nómina', value: fmt(total), sub: `${MESES[mes-1]} ${ano}`, color: '#166534', bg: '#dcfce7', border: '#86efac' },
          { label: 'Trabajadores Activos', value: activos.length, sub: `de ${nomina.length} en nómina`, color: '#1e40af', bg: '#dbeafe', border: '#93c5fd' },
          { label: 'Total Jornadas', value: totalJornadas, sub: 'en el período', color: '#92400e', bg: '#fef3c7', border: '#fde68a' },
        ].map(({ label, value, sub, color, bg, border }) => (
          <div key={label} className="card" style={{ borderLeft: `4px solid ${border}` }}>
            <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Tabla detalle */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Trabajador</th>
              <th>Cargo</th>
              <th style={{ textAlign: 'center' }}>Jornadas</th>
              <th style={{ textAlign: 'right' }}>Total Ganado</th>
              <th style={{ textAlign: 'right' }}>% del total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Cargando...</td></tr>
            ) : nomina.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No hay registros para este período</td></tr>
            ) : nomina.map(r => {
              const pct = total > 0 ? (r.total_ganado / total * 100) : 0
              const activo = r.num_jornadas > 0
              return (
                <tr key={r.id_trab} style={{ opacity: activo ? 1 : 0.45 }}>
                  <td><span style={{ fontWeight: 700, color: '#166534', fontSize: 12 }}>{r.id_trab}</span></td>
                  <td style={{ fontWeight: 500 }}>{r.nombre}</td>
                  <td><span className="badge badge-blue" style={{ fontSize: 11 }}>{r.cargo || '—'}</span></td>
                  <td style={{ textAlign: 'center' }}>
                    {activo ? <span className="badge badge-green">{r.num_jornadas}</span> : <span style={{ color: '#9ca3af', fontSize: 12 }}>Sin jornadas</span>}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: activo ? '#166534' : '#9ca3af' }}>
                    {activo ? fmt(r.total_ganado) : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {activo ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                        <div style={{ width: 60, height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: '#166534', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 12, color: '#6b7280', minWidth: 36 }}>{pct.toFixed(1)}%</span>
                      </div>
                    ) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
          {total > 0 && (
            <tfoot>
              <tr style={{ background: '#f9fafb', fontWeight: 700 }}>
                <td colSpan={3} style={{ padding: '12px', fontSize: 12, color: '#6b7280' }}>TOTAL NÓMINA</td>
                <td style={{ padding: '12px', textAlign: 'center', color: '#166534' }}>{totalJornadas}</td>
                <td style={{ padding: '12px', textAlign: 'right', color: '#166534', fontSize: 16 }}>{fmt(total)}</td>
                <td style={{ padding: '12px', textAlign: 'right', color: '#6b7280' }}>100%</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
