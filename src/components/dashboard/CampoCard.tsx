import { Bug, Droplets } from 'lucide-react'
import { fmt, STATUS_COLORS } from './helpers'

export default function CampoCard({ campo }) {
  const dotColor = STATUS_COLORS[campo.status] || '#94a3b8'
  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '12px 14px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: dotColor, borderRadius: '10px 10px 0 0',
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 2 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1F2937' }}>{campo.id_campo}</div>
          <div style={{ fontSize: 11, color: '#9CA3AF' }}>
            {campo.area_ha ? `${campo.area_ha} ha` : '—'}{campo.bloque ? ` · B${campo.bloque}` : ''}
          </div>
        </div>
        <div style={{
          width: 10, height: 10, borderRadius: '50%', background: dotColor,
          boxShadow: `0 0 6px ${dotColor}80`, flexShrink: 0, marginTop: 3,
        }} />
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
        {campo.ot_open > 0 && (
          <span style={{ fontSize: 10, background: '#EDE9FE', color: '#7C3AED', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
            {campo.ot_open} OT
          </span>
        )}
        {campo.issues.includes('pest') && (
          <span style={{ fontSize: 10, background: '#FEF3C7', color: '#92400E', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
            <Bug size={9} style={{ display: 'inline', verticalAlign: 'middle' }} /> Plaga
          </span>
        )}
        {campo.issues.includes('water') && (
          <span style={{ fontSize: 10, background: '#DBEAFE', color: '#1E40AF', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
            <Droplets size={9} style={{ display: 'inline', verticalAlign: 'middle' }} /> Déficit
          </span>
        )}
        {campo.cost_month > 0 && (
          <span style={{ fontSize: 10, color: '#6B7280' }}>{fmt(campo.cost_month)}</span>
        )}
      </div>
    </div>
  )
}