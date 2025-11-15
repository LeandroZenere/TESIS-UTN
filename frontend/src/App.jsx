import React, { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './components/Login'
import Suppliers from './components/Suppliers'
import Invoices from './components/Invoices'
import Settings from './components/Settings'
import ExpenseCategories from './components/ExpenseCategories'
import Reports from './components/Reports'
import Alerts from './components/Alerts'

function AppContent() {
  const { user, loading, logout, token } = useAuth()
  const [currentView, setCurrentView] = useState('dashboard')

  
  
  // AGREGAR: Estados para estadísticas
  const [dashboardStats, setDashboardStats] = useState({
    activeSuppliers: 0,
    pendingInvoices: 0,
    paidInvoices: 0
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const [alertsCount, setAlertsCount] = useState(0)

  // Estilos SerGas (mantener igual)
  const sergasStyles = {
    colors: {
      primary: '#FFC107',      // Amarillo SerGas
      secondary: '#FF8C00',    // Naranja
      accent: '#E53E3E',       // Rojo
      dark: '#1A1A1A',         // Negro/Gris oscuro
      gray: '#4A5568',         // Gris medio
      lightGray: '#F7FAFC',    // Gris claro
      white: '#FFFFFF',
      success: '#22C55E',      // Verde para estados positivos
      warning: '#F59E0B',      // Amarillo/naranja para advertencias
      error: '#EF4444'         // Rojo para errores
    },
    shadows: {
      card: '0 4px 16px rgba(255, 193, 7, 0.15)',
      button: '0 2px 8px rgba(255, 193, 7, 0.3)',
      header: '0 2px 12px rgba(255, 193, 7, 0.1)'
    },
    gradients: {
      primary: 'linear-gradient(135deg, #FFC107 0%, #FF8C00 100%)',
      secondary: 'linear-gradient(135deg, #FF8C00 0%, #E53E3E 100%)',
      accent: 'linear-gradient(135deg, #E53E3E 0%, #DC2626 100%)',
      background: 'linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 100%)'
    }
  }

  // AGREGAR: Función para cargar estadísticas
  const loadDashboardStats = async () => {
    try {
      setStatsLoading(true)
      
      const response = await fetch('http://localhost:3001/api/stats/dashboard', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        setDashboardStats({
          activeSuppliers: data.data.activeSuppliers,
          pendingInvoices: data.data.pendingInvoices,
          paidInvoices: data.data.paidInvoices
        })
      } else {
        console.error('Error loading stats:', data.message)
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

   // Función para cargar contador de alertas
  const loadAlertsCount = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/invoices/alerts/due-soon', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Contar solo vencidas + urgentes para el badge
        const criticalCount = data.data.overdue.count + data.data.urgent.count
        setAlertsCount(criticalCount)
      }
    } catch (error) {
      console.error('Error cargando alertas:', error)
    }
  }

  // AGREGAR: useEffect para cargar estadísticas
  useEffect(() => {
    if (user && token && currentView === 'dashboard') {
      loadDashboardStats()
      loadAlertsCount()
    }
  }, [user, token, currentView])

  // Componente de Botón Personalizado SerGas (mantener igual)
  const SerGasButton = ({ 
    children, 
    variant = 'primary', 
    size = 'medium', 
    onClick, 
    disabled = false, 
    type = 'button',
    style = {},
    ...props 
  }) => {
    const getButtonStyle = () => {
      const baseStyle = {
        border: 'none',
        borderRadius: '8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: '600',
        fontSize: size === 'small' ? '12px' : size === 'large' ? '16px' : '14px',
        padding: size === 'small' ? '6px 12px' : size === 'large' ? '14px 28px' : '10px 20px',
        transition: 'all 0.3s ease',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        opacity: disabled ? 0.6 : 1,
        ...style
      }

      switch (variant) {
        case 'primary':
          return {
            ...baseStyle,
            background: sergasStyles.gradients.primary,
            color: sergasStyles.colors.dark,
            boxShadow: disabled ? 'none' : sergasStyles.shadows.button,
          }
        case 'secondary':
          return {
            ...baseStyle,
            background: sergasStyles.gradients.secondary,
            color: sergasStyles.colors.white,
            boxShadow: disabled ? 'none' : sergasStyles.shadows.button,
          }
        case 'accent':
          return {
            ...baseStyle,
            background: sergasStyles.gradients.accent,
            color: sergasStyles.colors.white,
            boxShadow: disabled ? 'none' : sergasStyles.shadows.button,
          }
        case 'outline':
          return {
            ...baseStyle,
            background: 'transparent',
            color: sergasStyles.colors.primary,
            border: `2px solid ${sergasStyles.colors.primary}`,
            boxShadow: 'none',
          }
        case 'ghost':
          return {
            ...baseStyle,
            background: 'transparent',
            color: sergasStyles.colors.gray,
            boxShadow: 'none',
          }
        case 'success':
          return {
            ...baseStyle,
            background: sergasStyles.colors.success,
            color: sergasStyles.colors.white,
          }
        case 'error':
          return {
            ...baseStyle,
            background: sergasStyles.colors.error,
            color: sergasStyles.colors.white,
          }
        default:
          return baseStyle
      }
    }

    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        style={getButtonStyle()}
        {...props}
      >
        {children}
      </button>
    )
  }

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh',
        background: sergasStyles.gradients.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: sergasStyles.colors.white,
          padding: '40px',
          borderRadius: '16px',
          boxShadow: sergasStyles.shadows.card,
          textAlign: 'center'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: `4px solid ${sergasStyles.colors.primary}20`,
            borderTop: `4px solid ${sergasStyles.colors.primary}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <p style={{ color: sergasStyles.colors.gray, fontSize: '18px', margin: 0 }}>
            Cargando...
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  if (currentView === 'suppliers') {
    return <Suppliers onBack={() => setCurrentView('dashboard')} />
  }

  if (currentView === 'invoices') {
    return <Invoices onBack={() => setCurrentView('dashboard')} />
  }

  if (currentView === 'settings') {
    return <Settings 
      onBack={() => setCurrentView('dashboard')} 
      onNavigate={(view) => setCurrentView(view)}
    />
  }

  if (currentView === 'categories') {
    return <ExpenseCategories onBack={() => setCurrentView('settings')} />
  }

    if (currentView === 'reports') {
    return <Reports onBack={() => setCurrentView('dashboard')} />
  }

    if (currentView === 'alerts') {
    return <Alerts onBack={() => setCurrentView('dashboard')} />
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: sergasStyles.gradients.background
    }}>
      {/* Header con branding SerGas (mantener igual) */}
      <header style={{
        background: sergasStyles.gradients.primary,
        padding: '20px 32px',
        boxShadow: sergasStyles.shadows.header,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '150px',
          height: '150px',
          background: `radial-gradient(circle, ${sergasStyles.colors.white}15 0%, transparent 70%)`,
          borderRadius: '50%'
        }} />
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px',
          position: 'relative',
          zIndex: 1
        }}>
          <img 
            src="/sergas-logo.png"
            alt="SerGas Logo"
            style={{
              width: '110px',
              height: '110px',
              objectFit: 'contain',
              background: sergasStyles.colors.white,
              borderRadius: '12px',
              padding: '2px',
              boxShadow: sergasStyles.shadows.card
            }}
          />
          <div>
            <h1 style={{ 
              margin: 0, 
              color: sergasStyles.colors.dark,
              fontSize: '24px',
              fontWeight: '700',
              textShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}>
              SerGas Management
            </h1>
            <p style={{ 
              margin: 0, 
              color: sergasStyles.colors.dark,
              fontSize: '14px',
              opacity: 0.8
            }}>
              Sistema de Gestión de Facturas
            </p>
          </div>
        </div>
        
        <div style={{ 
          display: 'flex', 
          gap: '20px', 
          alignItems: 'center',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.2)',
            padding: '8px 16px',
            borderRadius: '8px',
            backdropFilter: 'blur(10px)',
            border: `1px solid rgba(255, 255, 255, 0.3)`
          }}>
            <span style={{ 
              color: sergasStyles.colors.dark,
              fontWeight: '500',
              fontSize: '14px'
            }}>
              Bienvenido, {user.full_name}
            </span>
          </div>
          
 {/* Botón Alertas con animación */}
          {currentView === 'dashboard' && user.role === 'admin' && (
            <div style={{ position: 'relative' }}>
              <SerGasButton 
                onClick={() => setCurrentView('alerts')} 
                variant="secondary"
                size="small"
                style={{
                  background: alertsCount > 0 
                    ? 'linear-gradient(135deg, #E53E3E 0%, #DC2626 100%)'
                    : sergasStyles.gradients.secondary,
                  animation: alertsCount > 0 ? 'alertPulse 10s infinite' : 'none',
                  boxShadow: alertsCount > 0 
                    ? '0 4px 12px rgba(229, 62, 62, 0.4)' 
                    : sergasStyles.shadows.button
                }}
              >
                🔔
              </SerGasButton>
              {alertsCount > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  background: sergasStyles.colors.error,
                  color: sergasStyles.colors.white,
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '700',
                  border: `2px solid ${sergasStyles.colors.white}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  animation: 'badgePulse 2s infinite'
                }}>
                  {alertsCount > 9 ? '9+' : alertsCount}
                </div>
              )}
            </div>
          )}

        {/* Botón Configuración - Solo para Admin */}
          {user?.role === 'admin' && currentView === 'dashboard' && (
            <SerGasButton 
              onClick={() => setCurrentView('settings')} 
              variant="secondary"
              size="small"
            >
              ⚙️
            </SerGasButton>
          )}
          
          <SerGasButton 
            onClick={logout} 
            variant="accent"
            size="small"
          >
            Cerrar Sesión
          </SerGasButton>
        </div>
      </header>

      {/* Contenido principal */}
      <main style={{ padding: '40px 32px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Título del dashboard */}
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ 
              color: sergasStyles.colors.dark,
              fontSize: '32px',
              fontWeight: '700',
              margin: '0 0 12px 0'
            }}>
              Dashboard Principal
            </h2>
            <p style={{ 
              color: sergasStyles.colors.gray,
              fontSize: '16px',
              margin: 0
            }}>
              Gestiona pagos y facturas de tu negocio desde aquí
            </p>
          </div>
          
          {/* Grid de tarjetas (mantener igual) */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px',
            maxWidth: '1000px',
            margin: '0 auto'
          }}>
            {/* Tarjeta Proveedores */}
            <div style={{ 
              background: sergasStyles.colors.white,
              padding: '32px',
              borderRadius: '16px',
              boxShadow: sergasStyles.shadows.card,
              border: `1px solid ${sergasStyles.colors.primary}20`,
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-4px)'
              e.target.style.boxShadow = '0 8px 25px rgba(255, 193, 7, 0.25)'
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = sergasStyles.shadows.card
            }}>
              <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '60px',
                height: '60px',
                background: `${sergasStyles.colors.secondary}15`,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ fontSize: '24px' }}>🏢</span>
              </div>
              
              <h3 style={{ 
                color: sergasStyles.colors.dark,
                fontSize: '24px',
                fontWeight: '600',
                margin: '0 0 12px 0'
              }}>
                Proveedores
              </h3>
              <p style={{ 
                color: sergasStyles.colors.gray,
                fontSize: '14px',
                margin: '0 0 24px 0',
                lineHeight: '1.5'
              }}>
                Gestiona tu base de datos de proveedores, categorías fiscales e información de contacto
              </p>
              <SerGasButton 
                onClick={() => setCurrentView('suppliers')}
                variant="secondary"
              >
                Ver Proveedores
              </SerGasButton>
            </div>
            
            {/* Tarjeta Facturas */}
            <div style={{ 
              background: sergasStyles.colors.white,
              padding: '32px',
              borderRadius: '16px',
              boxShadow: sergasStyles.shadows.card,
              border: `1px solid ${sergasStyles.colors.primary}20`,
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-4px)'
              e.target.style.boxShadow = '0 8px 25px rgba(255, 193, 7, 0.25)'
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = sergasStyles.shadows.card
            }}>
              <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '60px',
                height: '60px',
                background: `${sergasStyles.colors.success}15`,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ fontSize: '24px' }}>📄</span>
              </div>
              
              <h3 style={{ 
                color: sergasStyles.colors.dark,
                fontSize: '24px',
                fontWeight: '600',
                margin: '0 0 12px 0'
              }}>
                Facturas
              </h3>
              <p style={{ 
                color: sergasStyles.colors.gray,
                fontSize: '14px',
                margin: '0 0 24px 0',
                lineHeight: '1.5'
              }}>
                Crea, edita y gestiona facturas con control de impuestos y seguimiento de pagos
              </p>
              <SerGasButton 
                onClick={() => setCurrentView('invoices')}
                variant="success"
              >
                Ver Facturas
              </SerGasButton>
            </div>
            
            {/* Tarjeta Reportes */}
            {user.role === 'admin' && (
            <div style={{ 
              background: sergasStyles.colors.white,
              padding: '32px',
              borderRadius: '16px',
              boxShadow: sergasStyles.shadows.card,
              border: `1px solid ${sergasStyles.colors.primary}20`,
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 193, 7, 0.25)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = sergasStyles.shadows.card
            }}>
              <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '60px',
                height: '60px',
                background: `${sergasStyles.colors.accent}15`,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ fontSize: '24px' }}>📊</span>
              </div>
              
              <h3 style={{ 
                color: sergasStyles.colors.dark,
                fontSize: '24px',
                fontWeight: '600',
                margin: '0 0 12px 0'
              }}>
                Reportes
              </h3>
              <p style={{ 
                color: sergasStyles.colors.gray,
                fontSize: '14px',
                margin: '0 0 24px 0',
                lineHeight: '1.5'
              }}>
                Análisis detallados, estadísticas y reportes financieros de tu negocio
              </p>
              <SerGasButton 
                onClick={() => setCurrentView('reports')}
                variant="accent"
              >
                Ver Reportes
              </SerGasButton>
            </div>
             )}
          </div>
          

          {/* MODIFICAR: Sección de estadísticas rápidas con datos reales */}
          {/* Sección de estadísticas rápidas - SOLO VISIBLE PARA ADMIN */}
        {user?.role === 'admin' && (
          <div style={{
            marginTop: '48px',
            background: sergasStyles.colors.white,
            borderRadius: '16px',
            padding: '32px',
            boxShadow: sergasStyles.shadows.card,
            border: `1px solid ${sergasStyles.colors.primary}20`
          }}>
            <h3 style={{ 
              color: sergasStyles.colors.dark,
              fontSize: '20px',
              fontWeight: '600',
              margin: '0 0 24px 0',
              textAlign: 'center'
            }}>
              Resumen Rápido
            </h3>
            
            {statsLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  border: `3px solid ${sergasStyles.colors.primary}20`,
                  borderTop: `3px solid ${sergasStyles.colors.primary}`,
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto'
                }} />
                <p style={{ color: sergasStyles.colors.gray, marginTop: '12px', fontSize: '14px' }}>
                  Cargando estadísticas...
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '24px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    background: sergasStyles.gradients.primary,
                    borderRadius: '50%',
                    margin: '0 auto 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: '24px', color: sergasStyles.colors.dark }}>🏢</span>
                  </div>
                  <p style={{ 
                    color: sergasStyles.colors.gray, 
                    fontSize: '14px', 
                    margin: '0 0 4px 0' 
                  }}>
                    Proveedores Activos
                  </p>
                  <p style={{ 
                    color: sergasStyles.colors.dark, 
                    fontSize: '24px', 
                    fontWeight: '700',
                    margin: 0
                  }}>
                    {dashboardStats.activeSuppliers}
                  </p>
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    background: sergasStyles.gradients.secondary,
                    borderRadius: '50%',
                    margin: '0 auto 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: '24px', color: sergasStyles.colors.white }}>📄</span>
                  </div>
                  <p style={{ 
                    color: sergasStyles.colors.gray, 
                    fontSize: '14px', 
                    margin: '0 0 4px 0' 
                  }}>
                    Facturas Pendientes
                  </p>
                  <p style={{ 
                    color: sergasStyles.colors.dark, 
                    fontSize: '24px', 
                    fontWeight: '700',
                    margin: 0
                  }}>
                    {dashboardStats.pendingInvoices}
                  </p>
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    background: `linear-gradient(135deg, ${sergasStyles.colors.success} 0%, #16A34A 100%)`,
                    borderRadius: '50%',
                    margin: '0 auto 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: '24px', color: sergasStyles.colors.white }}>✅</span>
                  </div>
                  <p style={{ 
                    color: sergasStyles.colors.gray, 
                    fontSize: '14px', 
                    margin: '0 0 4px 0' 
                  }}>
                    Facturas Pagadas
                  </p>
                  <p style={{ 
                    color: sergasStyles.colors.dark, 
                    fontSize: '24px', 
                    fontWeight: '700',
                    margin: 0
                  }}>
                    {dashboardStats.paidInvoices}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
  </main>

      {/* Animaciones CSS */}
<style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes alertPulse {
          0%, 100% { 
            background: linear-gradient(135deg, #E53E3E 0%, #DC2626 100%);
            transform: scale(1);
          }
          10% {
            background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
            transform: scale(1.05);
          }
          20%, 80% { 
            background: linear-gradient(135deg, #E53E3E 0%, #DC2626 100%);
            transform: scale(1);
          }
          90% {
            background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
            transform: scale(1.05);
          }
        }
        
        @keyframes badgePulse {
          0%, 100% { 
            transform: scale(1);
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          }
          50% { 
            transform: scale(1.15);
            box-shadow: 0 4px 12px rgba(229, 62, 62, 0.5);
          }
            10% {
            transform: scale(1.05) rotate(-5deg);
          }
        }
      `}</style>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}



export default App