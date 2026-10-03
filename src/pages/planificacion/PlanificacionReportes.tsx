import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { planificacionesApi, apiError, ReporteCumplimientoPlanificacion } from '../../api'

export default function PlanificacionReportes() {
  const navigate = useNavigate()
  const [anio, setAnio] = useState<number>(new Date().getFullYear())
  const [loading, setLoading] = useState<boolean>(true)
  const [data, setData] = useState<ReporteCumplimientoPlanificacion | null>(null)

  async function loadReporte() {
    setLoading(true)
    try {
      const res = await planificacionesApi.reporteCumplimiento({ anio })
      setData(res.data)
    } catch (err: any) {
      toast.error(apiError(err, 'Error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadReporte() }, [anio])
  const r = data?.resumen || { total: 0, completas: 0, parciales: 0, pendientes: 0, vencidas: 0, porcentaje_cumplimiento: 0 }

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn-secondary" style={{ padding: '4px 8px' }} onClick={() => navigate('/planificacion')}>
            <ArrowLeft size={14} /> Volver
          </button>
          <h2 style={{ margin: 0, fontSize: 18 }}>Reporte de Cumplimiento</h2>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="number" value={anio} onChange={e => setAnio(Number(e.target.value))} style={{ width: 70, height: 28, padding: '0 4px' }} />
          <button className="btn-secondary" style={{ height: 28, padding: '0 6px' }} onClick={loadReporte}><RefreshCw size={12} /></button>
        </div>
      </div>

      {loading ? (<div>Cargando...</div>) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 14 }}>
            <div style={{ background: 'white', padding: 10, borderRadius: 4, border: '1px solid #e2e8f0' }}><div>TOTAL</div><b>{r.total}</b></div>
            <div style={{ background: 'white', padding: 10, borderRadius: 4, border: '1px solid #e2e8f0', color: '#16a34a' }}><div>CUMPLIDAS</div><b>{r.completas}</b></div>
            <div style={{ background: 'white', padding: 10, borderRadius: 4, border: '1px solid #e2e8f0', color: '#2563eb' }}><div>PENDIENTE</div><b>{r.parciales + r.pendientes}</b></div>
            <div style={{ background: 'white', padding: 10, borderRadius: 4, border: '1px solid #e2e8f0', color: '#dc2626' }}><div>VENCIDAS</div><b>{r.vencidas}</b></div>
            <div style={{ background: 'white', padding: 10, borderRadius: 4, border: '1px solid #e2e8f0', color: '#d97706' }}><div>% CUMPLIMIENTO</div><b>{r.porcentaje_cumplimiento}%</b></div>
          </div>
          <div style={{ background: 'white', borderRadius: 4, border: '1px solid #e2e8f0', padding: 10 }}>
            <h4 style={{ margin: '0 0 8px' }}>Evolución Semanal ({anio})</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: 4, textAlign: 'left' }}>Semana</th>
                  <th style={{ padding: 4, textAlign: 'center' }}>Total</th>
                  <th style={{ padding: 4, textAlign: 'center' }}>Completas</th>
                  <th style={{ padding: 4, textAlign: 'center' }}>Vencidas</th>
                  <th style={{ padding: 4, textAlign: 'left', width: 140 }}>% Cumplimiento</th>
                </tr>
              </thead>
              <tbody>
                {(data?.por_semana || []).map(row => (
                  <tr key={row.semana} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: 4 }}>Semana {row.semana}</td>
                    <td style={{ padding: 4, textAlign: 'center' }}>{row.total}</td>
                    <td style={{ padding: 4, textAlign: 'center', color: '#16a34a' }}>{row.completas}</td>
                    <td style={{ padding: 4, textAlign: 'center', color: '#dc2626' }}>{row.vencidas}</td>
                    <td style={{ padding: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${row.cumplimiento_pct}%`, height: '100%', background: '#16a34a' }} />
                        </div>
                        <span>{row.cumplimiento_pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
