import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext()

// Configurar axios con base URL
const API_BASE_URL = 'http://localhost:3001'
axios.defaults.baseURL = API_BASE_URL

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(null)

  useEffect(() => {
    // Intentar recuperar token del localStorage al iniciar
    const savedToken = localStorage.getItem('authToken')
    if (savedToken) {
      setToken(savedToken)
      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`
      // Verificar si el token es válido
      checkAuth(savedToken)
    } else {
      setLoading(false)
    }
  }, [])

  const checkAuth = async (tokenToCheck) => {
    try {
      const response = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${tokenToCheck}` }
      })
      if (response.data.success) {
        setUser(response.data.data.user)
      } else {
        logout()
      }
    } catch (error) {
      console.error('Error verificando autenticación:', error)
      logout()
    } finally {
      setLoading(false)
    }
  }

  const login = async (username, password) => {
    try {
      const response = await axios.post('/api/auth/login', {
        username,
        password
      })

      if (response.data.success) {
        const { token: newToken, user: userData } = response.data.data
        
        // Guardar token
        setToken(newToken)
        setUser(userData)
        localStorage.setItem('authToken', newToken)
        
        // Configurar header de axios para futuras peticiones
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
        
        return { success: true, user: userData }
      } else {
        return { success: false, message: response.data.message }
      }
    } catch (error) {
      console.error('Error en login:', error)
      return { 
        success: false, 
        message: error.response?.data?.message || 'Error de conexión' 
      }
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('authToken')
    delete axios.defaults.headers.common['Authorization']
  }

  const value = {
    user,
    token,
    login,
    logout,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  return context
}