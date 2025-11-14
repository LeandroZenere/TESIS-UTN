import React from 'react'
import { useAuth } from '../context/AuthContext'

export default function Settings({ onBack, onNavigate }) {
  const { user } = useAuth()

  // Estilos SerGas
  const sergasStyles = {
    colors: {
      primary: '#FFC107',
      secondary: '#FF8C00',
      accent: '#E53E3E',
      dark: '#1A1A1A',
      gray: '#4A5568',
      lightGray: '#F7FAFC',
      white: '#FFFFFF',
      success: '#22C55E',
      warning: '#F59E0B',
      error: '#EF4444'
    },
    shadows: {
      card: '0 4px 16px rgba(255, 193, 7, 0.15)',
      button: '0 2px 8px rgba(255, 193, 7, 0.3)'
    },
    gradients: {
      primary: 'linear-gradient(135deg, #FFC107 0%, #FF8C00 100%)',
      secondary: 'linear-gradient(135deg, #FF8C00 0%, #E53E3E 100%)',
      accent: 'linear-gradient(135deg, #E53E3E 0%, #DC2626 100%)'
    }
  }

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
          return { ...baseStyle, background: sergasStyles.gradients.primary, color: sergasStyles.colors.dark, boxShadow: disabled ? 'none' : sergasStyles.shadows.button }
        case 'secondary':
          return { ...baseStyle, background: sergasStyles.gradients.secondary, color: sergasStyles.colors.white, boxShadow: disabled ? 'none' : sergasStyles.shadows.button }
        case 'accent':
          return { ...baseStyle, background: sergasStyles.gradients.accent, color: sergasStyles.colors.white, boxShadow: disabled ? 'none' : sergasStyles.shadows.button }
        case 'ghost':
          return { ...baseStyle, background: 'transparent', color: sergasStyles.colors.gray, boxShadow: 'none' }
        case 'outline':
          return { ...baseStyle, background: 'transparent', color: sergasStyles.colors.primary, border: `2px solid ${sergasStyles.colors.primary}`, boxShadow: 'none' }
        default:
          return baseStyle
      }
    }

    return (
      <button type={type} onClick={onClick} disabled={disabled} style={getButtonStyle()} {...props}>
        {children}
      </button>
    )
  }

  // Verificar si es admin
  if (user?.role !== 'admin') {
    return (
      <div style={{ 
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${sergasStyles.colors.lightGray} 0%, ${sergasStyles.colors.white} 100%)`,
        padding: '40px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: sergasStyles.colors.white,
          borderRadius: '16px',
          padding: '48px 32px',
          boxShadow: sergasStyles.shadows.card,
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔒</div>
          <h2 style={{ color: sergasStyles.colors.dark, marginBottom: '16px' }}>Acceso Restringido</h2>
          <p style={{ color: sergasStyles.colors.gray, marginBottom: '32px' }}>
            Solo los administradores pueden acceder a la configuración.
          </p>
          <SerGasButton onClick={onBack} variant="primary" size="large">
            Volver al Dashboard
          </SerGasButton>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${sergasStyles.colors.lightGray} 0%, ${sergasStyles.colors.white} 100%)`,
      padding: '20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header principal */}
        <div style={{
          background: sergasStyles.gradients.primary,
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '48px',
          boxShadow: sergasStyles.shadows.card,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '200px',
            height: '200px',
            background: `radial-gradient(circle, ${sergasStyles.colors.secondary}20 0%, transparent 70%)`,
            borderRadius: '50%',
            transform: 'translate(50%, -50%)'
          }} />
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            position: 'relative',
            zIndex: 1
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <SerGasButton
                onClick={onBack}
                variant="ghost"
                style={{ 
                  color: sergasStyles.colors.dark,
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  border: `1px solid rgba(255, 255, 255, 0.3)`
                }}
              >
                ← Volver al Dashboard
              </SerGasButton>
              
              <div>
                <h2 style={{ 
                  margin: 0, 
                  color: sergasStyles.colors.dark,
                  fontSize: '32px',
                  fontWeight: '700',
                  textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}>
                  ⚙️ Configuración
                </h2>
                <p style={{ 
                  margin: '4px 0 0 0', 
                  color: sergasStyles.colors.dark,
                  fontSize: '16px',
                  opacity: 0.8
                }}>
                  Administra la configuración del sistema
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Grid de tarjetas de configuración */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          maxWidth: '1000px',
          margin: '0 auto'
        }}>
          {/* Tarjeta Categorías de Gasto */}
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
              background: `${sergasStyles.colors.secondary}15`,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '24px' }}>📁</span>
            </div>
            
            <h3 style={{ 
              color: sergasStyles.colors.dark,
              fontSize: '24px',
              fontWeight: '600',
              margin: '0 0 12px 0'
            }}>
              Gestión de Gastos
            </h3>
            <p style={{ 
              color: sergasStyles.colors.gray,
              fontSize: '14px',
              margin: '0 0 24px 0',
              lineHeight: '1.5'
            }}>
              Gestiona las categorías y subcategorías para clasificar tus facturas
            </p>
            <SerGasButton 
              onClick={() => onNavigate('categories')}
              variant="secondary"
            >
              Gestionar Categorías
            </SerGasButton>
          </div>

          {/* Tarjeta Usuarios (futuro) */}
          <div style={{ 
            background: sergasStyles.colors.white,
            padding: '32px',
            borderRadius: '16px',
            boxShadow: sergasStyles.shadows.card,
            border: `1px solid ${sergasStyles.colors.primary}20`,
            position: 'relative',
            overflow: 'hidden',
            opacity: 0.7
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
              <span style={{ fontSize: '24px' }}>👥</span>
            </div>
            
            <h3 style={{ 
              color: sergasStyles.colors.dark,
              fontSize: '24px',
              fontWeight: '600',
              margin: '0 0 12px 0'
            }}>
              Usuarios
            </h3>
            <p style={{ 
              color: sergasStyles.colors.gray,
              fontSize: '14px',
              margin: '0 0 24px 0',
              lineHeight: '1.5'
            }}>
              Administra usuarios, roles y permisos del sistema
            </p>
            <SerGasButton 
              variant="outline"
              disabled
            >
              Próximamente
            </SerGasButton>
          </div>

          {/* Tarjeta Respaldos (futuro) */}
          <div style={{ 
            background: sergasStyles.colors.white,
            padding: '32px',
            borderRadius: '16px',
            boxShadow: sergasStyles.shadows.card,
            border: `1px solid ${sergasStyles.colors.primary}20`,
            position: 'relative',
            overflow: 'hidden',
            opacity: 0.7
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
              <span style={{ fontSize: '24px' }}>💾</span>
            </div>
            
            <h3 style={{ 
              color: sergasStyles.colors.dark,
              fontSize: '24px',
              fontWeight: '600',
              margin: '0 0 12px 0'
            }}>
              Respaldos
            </h3>
            <p style={{ 
              color: sergasStyles.colors.gray,
              fontSize: '14px',
              margin: '0 0 24px 0',
              lineHeight: '1.5'
            }}>
              Crea y restaura copias de seguridad de la base de datos
            </p>
            <SerGasButton 
              variant="outline"
              disabled
            >
              Próximamente
            </SerGasButton>
          </div>
        </div>
      </div>
    </div>
  )
}