import { useState } from 'react'
import { X, Calendar, AlertTriangle, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { planificacionesApi, apiError, PlanificacionLabor } from '../../api'

interface Props {
  plan: PlanificacionLabor
  onClose: () => void
  onSuccess: () => void
}

export default function PlanificacionReprogramarModal({ plan, onClose, onSuccess }: Props) {
  const [semanaNueva, setSemanaNueva] = useState<number>(plan.semana < 52 ? plan.semana + 1 : 1)
  const [anioNuevo, setAnioNuevo] = useState<number>(plan.semana < 52 ? plan.anio : plan.anio + 1)
  const [motivo, setMotivo] = useState<string>('')
  const [saving, setSaving] = useState<boolean>(false)

  const MOTIVOS = [
    'Condiciones climáticas adversas',
    'Falta de insumos / retraso de entrega',
    'Disponibilidad insuficiente de mano de obra',
    'Avería de maquinaria / equipo',
    'Retraso en labor previa requerida',
    'Ajuste agronómico o fenológico',
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!motivo.trim()) {
      toast.error('Debe indicar el motivo de la reprogramación')
      return
    }
    setSaving(true)
    try {
      await planificacionesApi.reprogramar(plan.id, {
        semana_nueva: Number(semanaNueva),
        anio_nuevo: Number(anioNuevo),
        motivo: motivo.trim()
      })
      toast.success(`Plan ${plan.numero} reprogramado a Sem ${semanaNueva}/${anioNuevo}`)
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(apiError(err, 'Error al reprogramar labor'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(4px)', zIndex: 1100, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 16
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={18} color="#d97706" />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Reprogramar Labor: {plan.numero}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 18 }}>
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 12px', marginBottom: 14, display: 'flex', gap: 8, fontSize: 12, color: '#92400e' }}>
            <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>Quedará registrado en bitácora de auditoría y pasará a estado <strong>Reprogramada</strong>.</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 14 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Actual</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Sem {plan.semana} / {plan.anio}</div>
            </div>
            <ArrowRight size={16} color="#94a3b8" />
            <div>
              <div style={{ fontSize: 10, color: '#15803d', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>Nueva Semana</div>
              <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                <input type="number" min={1} max={53} value={semanaNueva} onChange={e => setSemanaNueva(Number(e.target.value))} className="input" style={{ width: 60, textAlign: 'center', fontWeight: 700 }} required />
                <input type="number" min={2020} max={2040} value={anioNuevo} onChange={e => setAnioNuevo(Number(e.target.value))} className="input" style={{ width: 70, textAlign: 'center', fontWeight: 700 }} required />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Motivo de la Reprogramación *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
              {MOTIVOS.map((sug, i) => (
                <button key={i} type="button" onClick={() => setMotivo(sug)} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: motivo === sug ? '#e0f2fe' : '#f1f5f9', color: motivo === sug ? '#0369a1' : '#475569', border: '1px solid #cbd5e1', cursor: 'pointer' }}>
                  {sug}
                </button>
              ))}
            </div>
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Escriba el motivo detallado..." rows={3} className="input" style={{ width: '100%', fontSize: 12 }} required />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving || !motivo.trim()} style={{ background: '#d97706', borderColor: '#d97706' }}>
              {saving ? 'Guardando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}