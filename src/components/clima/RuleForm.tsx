import { useState } from 'react'

interface Rule {
  id?: number
  name: string
  variable: string
  condition: string
  threshold_value: number | null
  severity: string
  is_active: boolean
  cooldown_minutes: number
}

interface RuleFormProps {
  rule: Rule
  onSave: (rule: Rule) => void
  onCancel: () => void
}

const VARIABLES = ['temperature_c', 'humidity_pct', 'rainfall_mm', 'wind_speed_kmh', 'wind_gust_kmh', 'uv_index']
const CONDITIONS = [
  { value: 'gt', label: '>' },
  { value: 'gte', label: '≥' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '≤' },
]
const SEVERITIES = ['info', 'warning', 'critical']

const inputStyle = {
  padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6,
  fontSize: 13, width: '100%',
}

export default function RuleForm({ rule, onSave, onCancel }: RuleFormProps) {
  const [form, setForm] = useState<Rule>({ ...rule })

  const set = (k: keyof Rule, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div style={{
      background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
      padding: 16, marginBottom: 16,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, color: '#64748b' }}>Nombre</label>
          <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#64748b' }}>Variable</label>
          <select style={inputStyle} value={form.variable} onChange={e => set('variable', e.target.value)}>
            {VARIABLES.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#64748b' }}>Condición</label>
          <select style={inputStyle} value={form.condition} onChange={e => set('condition', e.target.value)}>
            {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#64748b' }}>Umbral</label>
          <input
            type="number"
            style={inputStyle}
            value={form.threshold_value ?? ''}
            onChange={e => {
              const val = e.target.value
              set('threshold_value', val === '' ? null : parseFloat(val))
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#64748b' }}>Severidad</label>
          <select style={inputStyle} value={form.severity} onChange={e => set('severity', e.target.value)}>
            {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#64748b' }}>Cooldown (min)</label>
          <input type="number" style={inputStyle} value={form.cooldown_minutes} onChange={e => set('cooldown_minutes', parseInt(e.target.value) || 60)} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button onClick={() => onSave(form)} style={{
          padding: '6px 16px', background: '#166534', color: '#fff', border: 'none',
          borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
        }}>Guardar</button>
        <button onClick={onCancel} style={{
          padding: '6px 16px', background: '#e5e7eb', color: '#374151', border: 'none',
          borderRadius: 6, cursor: 'pointer', fontSize: 13,
        }}>Cancelar</button>
      </div>
    </div>
  )
}