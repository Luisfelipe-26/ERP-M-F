export default function KpiCard({ label, value, subtitle, icon: Icon, accentColor, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        height: 120, borderRadius: 12, background: '#fff', padding: '16px 20px',
        borderLeft: `4px solid ${accentColor}`, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', cursor: onClick ? 'pointer' : 'default',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', transition: 'box-shadow 0.2s',
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)' }}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Icon size={16} color={accentColor} />
        <span style={{ fontSize: 13, fontWeight: 500, color: '#6B7280' }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#1A1A2E', lineHeight: 1 }}>{value ?? '—'}</div>
      {subtitle && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{subtitle}</div>}
    </div>
  )
}