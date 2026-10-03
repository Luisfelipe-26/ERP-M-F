import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import {
  LayoutDashboard, MapPin, Users, Package, Wrench, ClipboardList, LogOut, Leaf, Menu,
  DollarSign, TrendingUp, Warehouse, CloudSun, Bug, Droplets, BarChart3,
  UserCheck, Landmark, Truck, BookOpen, Building2, PiggyBank, Bell, X, Settings, Shield,
  Sprout, HandCoins, Calendar, ChevronDown, ChevronRight, PanelLeftClose, PanelLeft,
  ChevronLeft, FoldVertical, UnfoldVertical
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../api'

interface NavItem {
  to: string
  icon: any
  label: string
  end?: boolean
  modulo: string
}

interface NavGroup {
  id: string
  title: string
  icon: any
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    id: 'operaciones',
    title: 'Operaciones',
    icon: ClipboardList,
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true, modulo: 'dashboard' },
      { to: '/ordenes', icon: ClipboardList, label: 'Órdenes de Trabajo', modulo: 'ordenes' },
      { to: '/planificacion', icon: Calendar, label: 'Planificación Labores', modulo: 'ordenes' },
      { to: '/costos', icon: TrendingUp, label: 'Costos por Campo', modulo: 'costos' },
      { to: '/analytics', icon: BarChart3, label: 'Analytics', modulo: 'analytics' },
      { to: '/nomina', icon: DollarSign, label: 'Nómina', modulo: 'nomina' },
    ]
  },
  {
    id: 'agronomico',
    title: 'Agronómico',
    icon: Sprout,
    items: [
      { to: '/clima', icon: CloudSun, label: 'Clima', modulo: 'clima' },
      { to: '/sanidad', icon: Bug, label: 'Sanidad (MIP)', modulo: 'sanidad' },
      { to: '/riego', icon: Droplets, label: 'Riego', modulo: 'riego' },
      { to: '/cosecha', icon: Sprout, label: 'Cosecha', modulo: 'cosecha' },
      { to: '/ventas', icon: HandCoins, label: 'Ventas de fruta', modulo: 'ventas' },
    ]
  },
  {
    id: 'finanzas',
    title: 'Finanzas',
    icon: Landmark,
    items: [
      { to: '/contabilidad', icon: BookOpen, label: 'Contabilidad', modulo: 'contabilidad' },
      { to: '/activos-fijos', icon: Building2, label: 'Activos Fijos', modulo: 'activos_fijos' },
      { to: '/presupuesto', icon: PiggyBank, label: 'Presupuesto', modulo: 'presupuesto' },
      { to: '/clientes', icon: UserCheck, label: 'Clientes', modulo: 'clientes' },
      { to: '/proveedores', icon: Truck, label: 'Proveedores', modulo: 'proveedores' },
      { to: '/efectivo-banco', icon: Landmark, label: 'Efectivo y Banco', modulo: 'efectivo_banco' },
    ]
  },
  {
    id: 'maestros',
    title: 'Maestros',
    icon: Warehouse,
    items: [
      { to: '/campos', icon: MapPin, label: 'Campos', modulo: 'campos' },
      { to: '/trabajadores', icon: Users, label: 'Trabajadores', modulo: 'trabajadores' },
      { to: '/productos', icon: Package, label: 'Productos', modulo: 'productos' },
      { to: '/inventario', icon: Warehouse, label: 'Inventario', modulo: 'inventario' },
      { to: '/actividades', icon: Wrench, label: 'Actividades', modulo: 'actividades' },
    ]
  },
  {
    id: 'admin',
    title: 'Administración',
    icon: Shield,
    items: [
      { to: '/configuracion', icon: Settings, label: 'Configuración', modulo: 'configuracion' },
      { to: '/admin', icon: Shield, label: 'Usuarios y Perfiles', modulo: 'admin' },
    ]
  },
]

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, hasModule, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  // Desktop sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('corvus_sidebar_collapsed') === 'true' } catch { return false }
  })

  // Collapsible groups state
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('corvus_nav_groups')
      if (saved) return JSON.parse(saved)
    } catch {}
    return { operaciones: true, agronomico: true, finanzas: false, maestros: false, admin: false }
  })

  const toggleSidebar = useCallback(() => {
    if (window.innerWidth < 1024) {
      setMenuOpen(prev => !prev)
    } else {
      setIsCollapsed(prev => {
        const next = !prev
        try { localStorage.setItem('corvus_sidebar_collapsed', String(next)) } catch {}
        return next
      })
    }
  }, [])

  const toggleGroup = useCallback((groupId: string) => {
    setOpenGroups(prev => {
      const next = { ...prev, [groupId]: !prev[groupId] }
      try { localStorage.setItem('corvus_nav_groups', JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const toggleAllGroups = useCallback((expand: boolean) => {
    setOpenGroups(() => {
      const next: Record<string, boolean> = {}
      navGroups.forEach(g => { next[g.id] = expand })
      try { localStorage.setItem('corvus_nav_groups', JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  // Auto-expand active group
  useEffect(() => {
    setMenuOpen(false)
    for (const group of navGroups) {
      const match = group.items.some(it => {
        if (it.end) return location.pathname === it.to
        return location.pathname === it.to || location.pathname.startsWith(`${it.to}/`)
      })
      if (match) {
        setOpenGroups(prev => {
          if (prev[group.id]) return prev
          const next = { ...prev, [group.id]: true }
          try { localStorage.setItem('corvus_nav_groups', JSON.stringify(next)) } catch {}
          return next
        })
        break
      }
    }
  }, [location.pathname])

  useEffect(() => {
    if (menuOpen && window.innerWidth < 1024) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [menuOpen])

  const filteredGroups = useMemo(() => {
    return navGroups.map(g => ({
      ...g,
      items: g.items.filter(item => item.end || hasModule(item.modulo))
    })).filter(g => g.items.length > 0)
  }, [hasModule])

  const currentActive = useMemo(() => {
    for (const group of filteredGroups) {
      for (const item of group.items) {
        if (item.end ? location.pathname === item.to : (location.pathname === item.to || location.pathname.startsWith(`${item.to}/`))) {
          return { group: group.title, item: item.label, icon: item.icon }
        }
      }
    }
    return { group: 'Sistema', item: 'CORVUS ERP', icon: Leaf }
  }, [filteredGroups, location.pathname])

  const allExpanded = filteredGroups.every(g => openGroups[g.id])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Botón menú (solo móvil/tablet) */}
      <button
        className={`menu-toggle${menuOpen ? ' open' : ''}`}
        onClick={() => setMenuOpen(v => !v)}
        aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
      >
        {menuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Backdrop (solo móvil/tablet) */}
      {menuOpen && <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} />}

      {/* Sidebar */}
      <aside
        className={`app-sidebar${menuOpen ? ' open' : ''}${isCollapsed ? ' collapsed' : ''}`}
        style={{
          background: 'linear-gradient(180deg, #14532d 0%, #166534 100%)',
          display: 'flex', flexDirection: 'column',
          padding: isCollapsed ? '16px 8px' : '20px 12px 14px',
          flexShrink: 0, position: 'fixed', top: 0, left: 0, height: '100vh',
          overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'none',
        }}
      >
        {/* Header / Logo */}
        <div style={{
          paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between',
        }}>
          <div
            onClick={() => isCollapsed && toggleSidebar()}
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: isCollapsed ? 'pointer' : 'default' }}
            title={isCollapsed ? 'Clic para expandir menú' : undefined}
          >
            <div style={{
              width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
            }}>
              <Leaf size={22} color="white" />
            </div>
            {!isCollapsed && (
              <div>
                <div style={{ color: 'white', fontWeight: 800, fontSize: 16, letterSpacing: 0.5, lineHeight: 1.1 }}>CORVUS</div>
                <div style={{ color: '#86efac', fontSize: 11, fontWeight: 500 }}>Finca de Aguacates</div>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button onClick={toggleSidebar} style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
              color: '#bbf7d0', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }} title="Colapsar menú">
              <PanelLeftClose size={16} />
            </button>
          )}
        </div>

        {/* Quick toggle all */}
        {!isCollapsed && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 6px 4px' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Navegación
            </span>
            <button
              onClick={() => toggleAllGroups(!allExpanded)}
              style={{
                background: 'transparent', border: 'none', color: '#86efac', fontSize: 10.5,
                fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 4px'
              }}
              title={allExpanded ? 'Plegar todos los grupos' : 'Desplegar todos los grupos'}
            >
              {allExpanded ? <FoldVertical size={12} /> : <UnfoldVertical size={12} />}
              {allExpanded ? 'Plegar' : 'Desplegar'}
            </button>
          </div>
        )}

        <nav style={{ flex: 1, paddingTop: isCollapsed ? 12 : 6, display: 'flex', flexDirection: 'column', gap: isCollapsed ? 6 : 8 }}>
          {filteredGroups.map(group => {
            const isOpen = isCollapsed ? false : (openGroups[group.id] ?? true)
            const hasActiveItem = group.items.some(it => {
              if (it.end) return location.pathname === it.to
              return location.pathname === it.to || location.pathname.startsWith(`${it.to}/`)
            })

            return (
              <div key={group.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {!isCollapsed ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={`sidebar-group-btn${hasActiveItem ? ' has-active' : ''}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <group.icon size={13} style={{ opacity: 0.8 }} />
                      <span>{group.title}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontSize: 9.5,
                        background: hasActiveItem ? '#16a34a' : 'rgba(255,255,255,0.15)',
                        color: 'white', padding: '1px 5px', borderRadius: 99, fontWeight: 700,
                      }}>
                        {group.items.length}
                      </span>
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                  </button>
                ) : (
                  <div title={group.title} style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.12)', margin: '6px 0 2px' }} />
                )}

                {!isCollapsed && isOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 4 }}>
                    {group.items.map(item => (
                      <NavLink
                        key={item.to} to={item.to} end={item.end} onClick={() => setMenuOpen(false)}
                        className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                      >
                        <item.icon size={17} style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}

                {isCollapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {group.items.map(item => (
                      <NavLink
                        key={item.to} to={item.to} end={item.end} onClick={() => setMenuOpen(false)}
                        className={({ isActive }) => `sidebar-link-collapsed${isActive ? ' active' : ''}`}
                        title={item.label}
                      >
                        <item.icon size={20} />
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 12, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {!isCollapsed ? (
            <>
              <div style={{
                padding: '6px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ color: 'white', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {user?.nombre || 'Usuario'}
                  </div>
                  <div style={{ color: '#86efac', fontSize: 11, textTransform: 'capitalize' }}>
                    {user?.rol || 'Operador'}
                  </div>
                </div>
                <button
                  onClick={toggleSidebar}
                  style={{ background: 'transparent', border: 'none', color: '#86efac', cursor: 'pointer', padding: 4 }}
                  title="Colapsar menú"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>
              <button onClick={handleLogout} className="sidebar-link" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: '#fca5a5' }}>
                <LogOut size={16} />
                <span>Cerrar sesión</span>
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <button onClick={toggleSidebar} className="sidebar-link-collapsed" style={{ background: 'rgba(255,255,255,0.1)', cursor: 'pointer', border: 'none' }} title="Expandir menú lateral">
                <PanelLeft size={18} color="white" />
              </button>
              <button onClick={handleLogout} className="sidebar-link-collapsed" style={{ color: '#fca5a5', background: 'transparent', border: 'none', cursor: 'pointer' }} title={`Cerrar sesión (${user?.nombre})`}>
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className={`app-main${isCollapsed ? ' collapsed' : ''}`} style={{ flex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Modern TopBar */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 30, background: 'rgba(248, 245, 240, 0.95)',
          backdropFilter: 'blur(8px)', borderBottom: '1px solid #e7e3dc',
          padding: '10px clamp(16px, 3vw, 32px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Left: Sidebar toggle + Active section indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={toggleSidebar}
              style={{
                background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8,
                padding: '6px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
                gap: 6, color: '#374151', fontSize: 12, fontWeight: 600,
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'all 0.15s ease',
              }}
              title={isCollapsed ? 'Mostrar menú completo' : 'Ocultar / Colapsar menú'}
            >
              {isCollapsed ? <PanelLeft size={16} color="#166534" /> : <PanelLeftClose size={16} color="#166534" />}
              <span style={{ fontSize: 12 }}>
                {isCollapsed ? 'Expandir' : 'Ocultar'}
              </span>
            </button>

            {/* Breadcrumb indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280' }}>
              <span style={{ fontWeight: 500 }}>{currentActive.group}</span>
              <span style={{ opacity: 0.5 }}>/</span>
              <span style={{ fontWeight: 700, color: '#166534' }}>{currentActive.item}</span>
            </div>
          </div>

          {/* Right: Notifications & Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <NotificationBar />
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px',
              borderRadius: 20, background: '#ffffff', border: '1px solid #e5e7eb',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', background: '#166534',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
              }}>
                {(user?.nombre || 'U').charAt(0).toUpperCase()}
              </div>
              <div style={{ lineHeight: 1.1 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{user?.nombre?.split(' ')[0] || 'Usuario'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="main-content" style={{ flex: 1 }}>
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
    <div ref={ref} style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end', padding: '10px clamp(16px, 4vw, 32px) 0' }}>
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
          position: 'absolute', top: 42, right: 16, width: 'min(360px, calc(100vw - 32px))', maxHeight: 420, overflowY: 'auto',
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
