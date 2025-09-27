import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Estilos SerGas
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
      modal: '0 20px 40px rgba(0, 0, 0, 0.3)',
      loginCard: '0 20px 60px rgba(255, 193, 7, 0.2)'
    },
    gradients: {
      primary: 'linear-gradient(135deg, #FFC107 0%, #FF8C00 100%)',
      secondary: 'linear-gradient(135deg, #FF8C00 0%, #E53E3E 100%)',
      accent: 'linear-gradient(135deg, #E53E3E 0%, #DC2626 100%)',
      background: 'linear-gradient(135deg, #FFC107 0%, #FF8C00 50%, #E53E3E 100%)'
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.username || !formData.password) {
      setError('Por favor complete todos los campos')
      return
    }

    setLoading(true)
    setError('')

    const result = await login(formData.username, formData.password)
    
    if (!result.success) {
      setError(result.message || 'Error de autenticación')
    }
    
    setLoading(false)
  }

  const fillDemoCredentials = () => {
    setFormData({
      username: 'admin',
      password: 'admin123'
    })
    setError('')
  }

  // Componente de Botón Personalizado SerGas
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
        width: '100%',
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

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: sergasStyles.gradients.background,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Elementos decorativos de fondo */}
      <div style={{
        position: 'absolute',
        top: '-50px',
        left: '-50px',
        width: '200px',
        height: '200px',
        background: `radial-gradient(circle, ${sergasStyles.colors.white}20 0%, transparent 70%)`,
        borderRadius: '50%',
        animation: 'float 6s ease-in-out infinite'
      }} />
      
      <div style={{
        position: 'absolute',
        bottom: '-100px',
        right: '-100px',
        width: '300px',
        height: '300px',
        background: `radial-gradient(circle, ${sergasStyles.colors.white}15 0%, transparent 70%)`,
        borderRadius: '50%',
        animation: 'float 8s ease-in-out infinite reverse'
      }} />

      <div style={{
        position: 'absolute',
        top: '20%',
        right: '10%',
        width: '150px',
        height: '150px',
        background: `radial-gradient(circle, ${sergasStyles.colors.white}10 0%, transparent 70%)`,
        borderRadius: '50%',
        animation: 'float 10s ease-in-out infinite'
      }} />

      {/* Tarjeta de login */}
      <div style={{ 
        backgroundColor: sergasStyles.colors.white,
        padding: '48px',
        borderRadius: '20px',
        boxShadow: sergasStyles.shadows.loginCard,
        width: '100%',
        maxWidth: '450px',
        position: 'relative',
        zIndex: 1,
        backdropFilter: 'blur(10px)'
      }}>
          {/* Header con branding SerGas */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{
              width: '120px',
              height: '120px',
              margin: '0 auto 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: sergasStyles.colors.white,
              borderRadius: '20px',
              boxShadow: sergasStyles.shadows.card,
              border: `3px solid ${sergasStyles.colors.primary}30`,
              overflow: 'hidden'
            }}>
              <img 
                src="/sergas-logo.png"
                alt="SerGas Logo"
                style={{
                  width: '1080px',
                  height: '1080px',
                  objectFit: 'contain'
                }}
              />
            </div>
        
            <h2 style={{ 
              color: sergasStyles.colors.gray, 
              fontSize: '18px',
              fontWeight: '500',
              margin: '0 0 8px 0'
            }}>
              Sistema de Gestión
            </h2>
            <p style={{ 
              color: sergasStyles.colors.gray,
              fontSize: '14px',
              margin: 0
            }}>
              Ingrese sus credenciales para continuar
            </p>
          </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              color: sergasStyles.colors.dark,
              fontWeight: '600',
              fontSize: '14px'
            }}>
              Usuario
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '14px 16px',
                border: `2px solid ${sergasStyles.colors.primary}40`,
                borderRadius: '8px',
                fontSize: '16px',
                backgroundColor: sergasStyles.colors.lightGray,
                color: sergasStyles.colors.dark,
                transition: 'border-color 0.3s ease',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = sergasStyles.colors.primary
                e.target.style.backgroundColor = sergasStyles.colors.white
              }}
              onBlur={(e) => {
                e.target.style.borderColor = `${sergasStyles.colors.primary}40`
                e.target.style.backgroundColor = sergasStyles.colors.lightGray
              }}
              placeholder="Ingrese su usuario"
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              color: sergasStyles.colors.dark,
              fontWeight: '600',
              fontSize: '14px'
            }}>
              Contraseña
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '14px 16px',
                border: `2px solid ${sergasStyles.colors.primary}40`,
                borderRadius: '8px',
                fontSize: '16px',
                backgroundColor: sergasStyles.colors.lightGray,
                color: sergasStyles.colors.dark,
                transition: 'border-color 0.3s ease',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = sergasStyles.colors.primary
                e.target.style.backgroundColor = sergasStyles.colors.white
              }}
              onBlur={(e) => {
                e.target.style.borderColor = `${sergasStyles.colors.primary}40`
                e.target.style.backgroundColor = sergasStyles.colors.lightGray
              }}
              placeholder="Ingrese su contraseña"
              disabled={loading}
            />
          </div>

          {error && (
            <div style={{
              background: `linear-gradient(135deg, ${sergasStyles.colors.error}15 0%, ${sergasStyles.colors.error}25 100%)`,
              border: `2px solid ${sergasStyles.colors.error}`,
              color: sergasStyles.colors.error,
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '24px',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '16px' }}>⚠️</span>
              {error}
            </div>
          )}

          <SerGasButton
            type="submit"
            variant="primary"
            size="large"
            disabled={loading}
            style={{ marginBottom: '24px' }}
          >
            {loading ? (
              <>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: `3px solid ${sergasStyles.colors.dark}30`,
                  borderTop: `3px solid ${sergasStyles.colors.dark}`,
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Iniciando sesión...
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </SerGasButton>
        </form>

        {/* Sección de demo */}
        <div style={{ 
          borderTop: `1px solid ${sergasStyles.colors.primary}30`, 
          paddingTop: '24px',
          textAlign: 'center'
        }}>
          <p style={{ 
            fontSize: '14px', 
            color: sergasStyles.colors.gray, 
            marginBottom: '12px',
            fontWeight: '500'
          }}>
            Credenciales de demo:
          </p>
          
          <SerGasButton
            onClick={fillDemoCredentials}
            disabled={loading}
            variant="outline"
            style={{ marginBottom: '12px' }}
          >
            Usar credenciales de demo
          </SerGasButton>
          
          <div style={{ 
            fontSize: '12px', 
            color: sergasStyles.colors.gray,
            background: `${sergasStyles.colors.primary}10`,
            padding: '8px 12px',
            borderRadius: '6px',
            fontFamily: 'monospace'
          }}>
            Usuario: admin | Contraseña: admin123
          </div>
        </div>

        {/* Footer con versión */}
        <div style={{
          textAlign: 'center',
          marginTop: '32px',
          paddingTop: '20px',
          borderTop: `1px solid ${sergasStyles.colors.primary}20`
        }}>
          <p style={{ 
            fontSize: '12px', 
            color: sergasStyles.colors.gray,
            margin: 0
          }}>
            SerGas Management System v1.0
          </p>
        </div>
      </div>

      {/* Animaciones CSS */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        /* Efectos hover para inputs */
        input:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(255, 193, 7, 0.15);
        }
        
        /* Efectos de focus mejorados */
        input:focus {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(255, 193, 7, 0.25);
        }
      `}</style>
    </div>
  )
}