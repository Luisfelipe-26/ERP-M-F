export default function BriefingPanel({ icon: Icon, title, children, bgGradient }) {
  return (
    <div style={{
      flex: 1, borderRadius: 12, padding: '16px 20px', background: bgGradient,
      minWidth: 200, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Icon size={18} color="#374151" />
        <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{title}</span>
      </div>
      <div style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.6 }}>{children}</div>
    </div>
  )
}