import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState, useCallback, useRef } from 'react'
import {
  LayoutDashboard, MapPin, Users, Package, Wrench, ClipboardList, LogOut, Leaf,
  DollarSign, TrendingUp, Warehouse, CloudSun, Bug, Droplets, BarChart3,
  UserCheck, Landmark, Truck, BookOpen, Building2, PiggyBank, Bell, X
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../api'

const nav: any[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/ordenes', icon: ClipboardList, label: 'Órdenes de Trabajo' },
  { to: '/costos', icon: TrendingUp, label: 'Costos por Campo' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/nomina', icon: DollarSign, label: 'Nómina' },
  { divider: true, label: 'AGRONÓMICO' },
  { to: '/clima', icon: CloudSun, label: 'Clima' },
  { to: '/sanidad', icon: Bug, label: 'Sanidad (MIP)' },
  { to: '/riego', icon: Droplets, label: 'Riego' },
  { divider: true, label: 'FINANZAS' },
  { to: '/contabilidad', icon: BookOpen, label: 'Contabilidad' },
  { to: '/activos-fijos', icon: Building2, label: 'Activos Fijos' },
  { to: '/presupuesto', icon: PiggyBank, label: 'Presupuesto' },
  { to: '/clientes', icon: UserCheck, label: 'Clientes' },
  { to: '/proveedores', icon: Truck, label: 'Proveedores' },
  { to: '/efectivo-banco', icon: Landmark, label: 'Efectivo y Banco' },
  { divider: true, label: 'MAESTROS' },
  { to: '/campos', icon: MapPin, label: 'Campos' },
  { to: '/trabajadores', icon: Users, label: 'Trabajadores' },
  { to: '/productos', icon: Package, label: 'Productos' },
  { to: '/inventario', icon: Warehouse, label: 'Inventario' },
  { to: '/actividades', icon: Wrench, label: 'Actividades' },
]

export default function Layout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 240, background: 'linear-gradient(180deg, #14532d 0%, #166534 100%)',
        display: 'flex', flexDirection: 'column', padding: '24px 12px', flexShrink: 0,
        position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 10, overflowY: 'auto'
      }}>
        <div style={{ padding: '0 8px 28px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Leaf size={20} color="white" />
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>CORVUS</div>
              <div style={{ color: '#86efac', fontSize: 11 }}>Finca de Aguacates</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {nav.map((item, i) =>
            item.divider ? (
              <div key={i} style={{
                color: '#86efac', fontSize: 10, fontWeight: 700, letterSpacing: 1,
                padding: '14px 16px 4px', textTransform: 'uppercase', opacity: 0.7
              }}>{item.label}</div>
            ) : (
              <NavLink key={item.to} to={item.to} end={item.end}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
                <item.icon size={18} />
                {item.label}
              </NavLink>
            )
          )}
        </nav>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
          <div style={{ padding: '8px 16px', marginBottom: 8 }}>
            <div style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>{user.nombre}</div>
            <div style={{ color: '#86efac', fontSize: 11, textTransform: 'capitalize' }}>{user.rol}</div>
          </div>
          <button onClick={handleLogout} className="sidebar-link" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}>
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ marginLeft: 240, flex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <NotificationBar />
        <main style={{ flex: 1, padding: '32px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function NotificationBar() {
  const [notifs, setNotifs] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/contabilidad/notificaciones')
      setNotifs(data)
    } catch {}
  }, [])

  useEffect(() => { load(); const iv = setInterval(load, 120000); return () => clearInterval(iv) }, [load])

  useEffect(() => {
    function handleClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const count = notifs.length
  const typeColors: Record<string, string> = { cxp_vencida: '#dc2626', cxc_vencida: '#ea580c', inventario_bajo: '#d97706', periodo_abierto: '#2563eb' }
  const typeLabels: Record<string, string> = { cxp_vencida: 'CxP Vencida', cxc_vencida: 'CxC Vencida', inventario_bajo: 'Stock Bajo', periodo_abierto: 'Período' }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end', padding: '10px 32px 0' }}>
      <button onClick={() => setOpen(!open)} style={{
        position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 6,
      }}>
        <Bell size={20} color={count > 0 ? '#dc2626' : '#9ca3af'} />
        {count > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0, background: '#dc2626', color: '#fff',
            borderRadius: '50%', width: 16, height: 16, fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{count > 9 ? '9+' : count}</span>
        )}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 42, right: 32, width: 360, maxHeight: 420, overflowY: 'auto',
          background: '#fff', borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          border: '1px solid #e5e7eb', zIndex: 100,
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Notificaciones ({count})</span>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={16} /></button>
          </div>
          {count === 0 ? (
            <div style={{ padding: '30px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Sin alertas pendientes</div>
          ) : notifs.map((n: any, i: number) => (
            <div key={i} style={{ padding: '10px 16px', borderBottom: '1px solid #f9fafb', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: typeColors[n.tipo] || '#6b7280', marginTop: 5, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: typeColors[n.tipo] || '#374151' }}>{typeLabels[n.tipo] || n.tipo}</div>
                <div style={{ fontSize: 12, color: '#374151' }}>{n.mensaje}</div>
                {n.monto && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>RD$ {Number(n.monto).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
