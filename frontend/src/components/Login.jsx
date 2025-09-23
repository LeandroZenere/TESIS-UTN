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

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{ 
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '10px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: '#333', marginBottom: '10px' }}>
            Sistema de Gestión de Facturas
          </h1>
          <p style={{ color: '#666' }}>
            Ingrese sus credenciales para continuar
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', color: '#333' }}>
              Usuario
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '16px'
              }}
              placeholder="Ingrese su usuario"
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', color: '#333' }}>
              Contraseña
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '16px'
              }}
              placeholder="Ingrese su contraseña"
              disabled={loading}
            />
          </div>

          {error && (
            <div style={{
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              color: '#c33',
              padding: '10px',
              borderRadius: '5px',
              marginBottom: '20px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              backgroundColor: loading ? '#999' : '#4F46E5',
              color: 'white',
              padding: '12px',
              border: 'none',
              borderRadius: '5px',
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '20px'
            }}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div style={{ 
          borderTop: '1px solid #eee', 
          paddingTop: '20px',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
            Credenciales de demo:
          </p>
          <button
            onClick={fillDemoCredentials}
            disabled={loading}
            style={{
              backgroundColor: '#f8f9fa',
              border: '1px solid #ddd',
              padding: '8px 16px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Usar credenciales de demo
          </button>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
            Usuario: admin | Contraseña: admin123
          </div>
        </div>
      </div>
    </div>
  )
}