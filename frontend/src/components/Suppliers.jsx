import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Suppliers({ onBack }) {
  const { token, user } = useAuth()
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [supplierToDelete, setSupplierToDelete] = useState(null)

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
      modal: '0 20px 40px rgba(0, 0, 0, 0.3)'
    },
    gradients: {
      primary: 'linear-gradient(135deg, #FFC107 0%, #FF8C00 100%)',
      secondary: 'linear-gradient(135deg, #FF8C00 0%, #E53E3E 100%)',
      accent: 'linear-gradient(135deg, #E53E3E 0%, #DC2626 100%)'
    }
  }

  const [formData, setFormData] = useState({
    cuit: '',
    category: 'responsable_inscripto',
    business_name: '',
    fiscal_address: '',
    phone: '',
    email: '',
    province: '',
    city: '',
    postal_code: '',
    notes: ''
  })

  useEffect(() => {
    if (token) {
      loadSuppliers()
    }
  }, [token])

  const loadSuppliers = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('http://localhost:3001/api/suppliers', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSuppliers(data.data.suppliers)
        setError('')
      } else {
        setError(`Error del servidor: ${data.message}`)
      }
    } catch (error) {
      setError(`Error de conexión: ${error.message}`)
      console.error('Error completo:', error)
    } finally {
      setLoading(false)
    }
  }

  // Validaciones en tiempo real
  const validateCuit = (value) => {
    return /^\d{11}$|^\d{2}-\d{8}-\d{1}$/.test(value)
  }

  const validatePhone = (value) => {
    if (!value) return true // Teléfono es opcional
    return /^[\d\s\-\(\)\+]*$/.test(value)
  }

  const validateTextOnly = (value) => {
    if (!value) return true
    return /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-\.]*$/.test(value)
  }

  const handleCuitChange = (e) => {
    const value = e.target.value.replace(/[^\d\-]/g, '')
    setFormData({...formData, cuit: value})
  }

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/[^\d\s\-\(\)\+]/g, '')
    setFormData({...formData, phone: value})
  }

  const handleProvinceChange = (e) => {
    const value = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-\.]/g, '')
    setFormData({...formData, province: value})
  }

  const handleCityChange = (e) => {
    const value = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-\.]/g, '')
    setFormData({...formData, city: value})
  }

  const handleNotesChange = (e) => {
    const value = e.target.value.slice(0, 150)
    setFormData({...formData, notes: value})
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validaciones obligatorias
    if (!formData.cuit || !formData.business_name || !formData.fiscal_address || !formData.province || !formData.city) {
      setError('Complete los campos obligatorios: CUIT, Razón Social, Domicilio Fiscal, Provincia y Ciudad')
      return
    }

    // Validar formato de CUIT
    const cleanCuit = formData.cuit.replace(/\D/g, '')
    if (cleanCuit.length !== 11) {
      setError('El CUIT debe tener exactamente 11 dígitos')
      return
    }

    // Validar formato de teléfono
    if (formData.phone && !validatePhone(formData.phone)) {
      setError('El teléfono solo puede contener números, espacios, guiones, paréntesis y el signo +')
      return
    }

    // Validar que Provincia y Ciudad solo contengan letras
    if (formData.province && !validateTextOnly(formData.province)) {
      setError('La provincia solo puede contener letras, espacios y guiones')
      return
    }

    if (formData.city && !validateTextOnly(formData.city)) {
      setError('La ciudad solo puede contener letras, espacios y guiones')
      return
    }

    try {
      setLoading(true)
      
      const url = editingSupplier 
        ? `http://localhost:3001/api/suppliers/${editingSupplier.id}`
        : 'http://localhost:3001/api/suppliers'
      
      const method = editingSupplier ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        await loadSuppliers()
        resetForm()
        setShowForm(false)
      } else {
        setError(data.message || 'Error al guardar proveedor')
      }
    } catch (error) {
      setError(`Error de conexión: ${error.message}`)
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier)
    setFormData({
      cuit: supplier.cuit,
      category: supplier.category,
      business_name: supplier.business_name,
      fiscal_address: supplier.fiscal_address,
      phone: supplier.phone || '',
      email: supplier.email || '',
      province: supplier.province,
      city: supplier.city,
      postal_code: supplier.postal_code || '',
      notes: supplier.notes || ''
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setFormData({
      cuit: '',
      category: 'responsable_inscripto',
      business_name: '',
      fiscal_address: '',
      phone: '',
      email: '',
      province: '',
      city: '',
      postal_code: '',
      notes: ''
    })
    setEditingSupplier(null)
    setError('')
  }

  const handleDelete = async () => {
    if (!supplierToDelete) return

    try {
      setLoading(true)
      
      const response = await fetch(`http://localhost:3001/api/suppliers/${supplierToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.success) {
        await loadSuppliers()
        setShowDeleteModal(false)
        setSupplierToDelete(null)
        setError('')
      } else {
        setError(data.message || 'Error al eliminar proveedor')
        setShowDeleteModal(false)
        setSupplierToDelete(null)
      }
    } catch (error) {
      setError(`Error de conexión: ${error.message}`)
      setShowDeleteModal(false)
      setSupplierToDelete(null)
    } finally {
      setLoading(false)
    }
  }

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.cuit.includes(searchTerm)
  )

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
        case 'warning':
          return {
            ...baseStyle,
            background: sergasStyles.colors.warning,
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

  if (showForm) {
    return (
      <div style={{ 
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${sergasStyles.colors.lightGray} 0%, ${sergasStyles.colors.white} 100%)`,
        padding: '20px'
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          {/* Header con gradiente SerGas */}
          <div style={{
            background: sergasStyles.gradients.primary,
            borderRadius: '16px 16px 0 0',
            padding: '24px 32px',
            marginBottom: '0',
            boxShadow: sergasStyles.shadows.card
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <SerGasButton 
                variant="ghost"
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
                style={{ 
                  color: sergasStyles.colors.dark,
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                ← Volver
              </SerGasButton>
              
              <h2 style={{ 
                margin: 0, 
                color: sergasStyles.colors.dark,
                fontSize: '28px',
                fontWeight: '700'
              }}>
                {editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h2>
            </div>
          </div>

          {/* Contenido del formulario */}
          <div style={{
            background: sergasStyles.colors.white,
            borderRadius: '0 0 16px 16px',
            padding: '32px',
            boxShadow: sergasStyles.shadows.card
          }}>
            {error && (
              <div style={{
                background: `linear-gradient(135deg, ${sergasStyles.colors.error}15 0%, ${sergasStyles.colors.error}25 100%)`,
                border: `2px solid ${sergasStyles.colors.error}`,
                color: sergasStyles.colors.error,
                padding: '16px 20px',
                borderRadius: '12px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontWeight: '500'
              }}>
                <span style={{ fontSize: '20px' }}>⚠️</span>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Información básica */}
              <div style={{
                background: `linear-gradient(135deg, ${sergasStyles.colors.lightGray} 0%, ${sergasStyles.colors.white} 100%)`,
                padding: '24px',
                borderRadius: '12px',
                marginBottom: '24px',
                border: `1px solid ${sergasStyles.colors.primary}20`
              }}>
                <h3 style={{ 
                  color: sergasStyles.colors.dark, 
                  marginBottom: '20px',
                  fontSize: '18px',
                  fontWeight: '600'
                }}>
                  Información Fiscal
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '600',
                      color: sergasStyles.colors.dark 
                    }}>
                      CUIT *
                    </label>
                    <input
                      type="text"
                      value={formData.cuit}
                      onChange={handleCuitChange}
                      placeholder="20-12345678-9"
                      maxLength="13"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: `2px solid ${formData.cuit && !validateCuit(formData.cuit.replace(/\D/g, '')) ? sergasStyles.colors.error : `${sergasStyles.colors.primary}40`}`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: sergasStyles.colors.white
                      }}
                    />
                    {formData.cuit && !validateCuit(formData.cuit.replace(/\D/g, '')) && (
                      <small style={{ color: sergasStyles.colors.error, fontSize: '12px' }}>
                        El CUIT debe tener 11 dígitos
                      </small>
                    )}
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '600',
                      color: sergasStyles.colors.dark 
                    }}>
                      Categoría Fiscal *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: `2px solid ${sergasStyles.colors.primary}40`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: sergasStyles.colors.white,
                        color: sergasStyles.colors.dark
                      }}
                    >
                      <option value="responsable_inscripto">Responsable Inscripto</option>
                      <option value="monotributista">Monotributista</option>
                      <option value="iva_exento">IVA Exento</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '600',
                    color: sergasStyles.colors.dark 
                  }}>
                    Razón Social *
                  </label>
                  <input
                    type="text"
                    value={formData.business_name}
                    onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                    placeholder="Nombre de la empresa"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: `2px solid ${sergasStyles.colors.primary}40`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: sergasStyles.colors.white
                    }}
                  />
                </div>
              </div>

              {/* Domicilio */}
              <div style={{
                background: `linear-gradient(135deg, ${sergasStyles.colors.lightGray} 0%, ${sergasStyles.colors.white} 100%)`,
                padding: '24px',
                borderRadius: '12px',
                marginBottom: '24px',
                border: `1px solid ${sergasStyles.colors.primary}20`
              }}>
                <h3 style={{ 
                  color: sergasStyles.colors.dark, 
                  marginBottom: '20px',
                  fontSize: '18px',
                  fontWeight: '600'
                }}>
                  Domicilio Fiscal
                </h3>
                
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '600',
                    color: sergasStyles.colors.dark 
                  }}>
                    Dirección *
                  </label>
                  <input
                    type="text"
                    value={formData.fiscal_address}
                    onChange={(e) => setFormData({...formData, fiscal_address: e.target.value})}
                    placeholder="Dirección completa"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: `2px solid ${sergasStyles.colors.primary}40`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: sergasStyles.colors.white
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '600',
                      color: sergasStyles.colors.dark 
                    }}>
                      Provincia *
                    </label>
                    <input
                      type="text"
                      value={formData.province}
                      onChange={handleProvinceChange}
                      placeholder="Buenos Aires"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: `2px solid ${formData.province && !validateTextOnly(formData.province) ? sergasStyles.colors.error : `${sergasStyles.colors.primary}40`}`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: sergasStyles.colors.white
                      }}
                    />
                    {formData.province && !validateTextOnly(formData.province) && (
                      <small style={{ color: sergasStyles.colors.error, fontSize: '12px' }}>
                        Solo se permiten letras, espacios y guiones
                      </small>
                    )}
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '600',
                      color: sergasStyles.colors.dark 
                    }}>
                      Ciudad *
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={handleCityChange}
                      placeholder="La Plata"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: `2px solid ${formData.city && !validateTextOnly(formData.city) ? sergasStyles.colors.error : `${sergasStyles.colors.primary}40`}`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: sergasStyles.colors.white
                      }}
                    />
                    {formData.city && !validateTextOnly(formData.city) && (
                      <small style={{ color: sergasStyles.colors.error, fontSize: '12px' }}>
                        Solo se permiten letras, espacios y guiones
                      </small>
                    )}
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '600',
                      color: sergasStyles.colors.dark 
                    }}>
                      Código Postal
                    </label>
                    <input
                      type="text"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                      placeholder="CP"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: `2px solid ${sergasStyles.colors.primary}40`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: sergasStyles.colors.white
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Contacto */}
              <div style={{
                background: `linear-gradient(135deg, ${sergasStyles.colors.lightGray} 0%, ${sergasStyles.colors.white} 100%)`,
                padding: '24px',
                borderRadius: '12px',
                marginBottom: '24px',
                border: `1px solid ${sergasStyles.colors.primary}20`
              }}>
                <h3 style={{ 
                  color: sergasStyles.colors.dark, 
                  marginBottom: '20px',
                  fontSize: '18px',
                  fontWeight: '600'
                }}>
                  Información de Contacto
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '600',
                      color: sergasStyles.colors.dark 
                    }}>
                      Teléfono
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      placeholder="011-1234-5678"
                      maxLength="20"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: `2px solid ${formData.phone && !validatePhone(formData.phone) ? sergasStyles.colors.error : `${sergasStyles.colors.primary}40`}`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: sergasStyles.colors.white
                      }}
                    />
                    {formData.phone && !validatePhone(formData.phone) && (
                      <small style={{ color: sergasStyles.colors.error, fontSize: '12px' }}>
                        Solo se permiten números, espacios, guiones, paréntesis y el signo +
                      </small>
                    )}
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '600',
                      color: sergasStyles.colors.dark 
                    }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="contacto@empresa.com"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: `2px solid ${sergasStyles.colors.primary}40`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: sergasStyles.colors.white
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Notas */}
              <div style={{
                background: `linear-gradient(135deg, ${sergasStyles.colors.lightGray} 0%, ${sergasStyles.colors.white} 100%)`,
                padding: '24px',
                borderRadius: '12px',
                marginBottom: '32px',
                border: `1px solid ${sergasStyles.colors.primary}20`
              }}>
                <h3 style={{ 
                  color: sergasStyles.colors.dark, 
                  marginBottom: '20px',
                  fontSize: '18px',
                  fontWeight: '600'
                }}>
                  Observaciones
                </h3>
                
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '600',
                    color: sergasStyles.colors.dark 
                  }}>
                    Notas
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={handleNotesChange}
                    placeholder="Observaciones adicionales"
                    rows="3"
                    maxLength="150"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: `2px solid ${sergasStyles.colors.primary}40`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: sergasStyles.colors.white,
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                  <div style={{ 
                    textAlign: 'right', 
                    fontSize: '12px', 
                    color: formData.notes.length > 140 ? sergasStyles.colors.error : sergasStyles.colors.gray,
                    marginTop: '6px'
                  }}>
                    {formData.notes.length}/150 caracteres
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <SerGasButton
                  variant="ghost"
                  size="large"
                  onClick={() => {
                    setShowForm(false)
                    resetForm()
                  }}
                >
                  Cancelar
                </SerGasButton>

                <SerGasButton
                  type="submit"
                  variant="primary"
                  size="large"
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : (editingSupplier ? 'Actualizar' : 'Crear')} Proveedor
                </SerGasButton>
              </div>
            </form>
          </div>
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
      <div style={{ maxWidth: '1300px', margin: '0 auto' }}>
        {/* Header principal con branding SerGas */}
        <div style={{
          background: sergasStyles.gradients.primary,
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '24px',
          boxShadow: sergasStyles.shadows.card,
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Patrón de fondo sutil */}
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
                  Gestión de Proveedores
                </h2>
                <p style={{ 
                  margin: '4px 0 0 0', 
                  color: sergasStyles.colors.dark,
                  fontSize: '16px',
                  opacity: 0.8
                }}>
                  Administra tu base de datos de proveedores
                </p>
              </div>
            </div>

            <SerGasButton
              onClick={() => setShowForm(true)}
              variant="secondary"
              size="large"
              style={{ boxShadow: sergasStyles.shadows.button }}
            >
              + Nuevo Proveedor
            </SerGasButton>
          </div>
        </div>

        {/* Filtros con estilo SerGas */}
        <div style={{
          background: sergasStyles.colors.white,
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: sergasStyles.shadows.card,
          border: `1px solid ${sergasStyles.colors.primary}20`
        }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <input
                type="text"
                placeholder="Buscar por razón social o CUIT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: `2px solid ${sergasStyles.colors.primary}40`,
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: sergasStyles.colors.lightGray,
                  color: sergasStyles.colors.dark
                }}
              />
            </div>
          </div>
        </div>

        {error && (
          <div style={{
            background: `linear-gradient(135deg, ${sergasStyles.colors.error}15 0%, ${sergasStyles.colors.error}25 100%)`,
            border: `2px solid ${sergasStyles.colors.error}`,
            color: sergasStyles.colors.error,
            padding: '16px 20px',
            borderRadius: '12px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontWeight: '500'
          }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px',
            background: sergasStyles.colors.white,
            borderRadius: '12px',
            boxShadow: sergasStyles.shadows.card
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
            <p style={{ color: sergasStyles.colors.gray, fontSize: '18px' }}>Cargando proveedores...</p>
          </div>
        ) : (
          <div style={{
            background: sergasStyles.colors.white,
            borderRadius: '12px',
            boxShadow: sergasStyles.shadows.card,
            overflow: 'hidden',
            border: `1px solid ${sergasStyles.colors.primary}20`
          }}>
            {filteredSuppliers.length === 0 ? (
              <div style={{ 
                padding: '60px', 
                textAlign: 'center', 
                color: sergasStyles.colors.gray
              }}>
                <div style={{ fontSize: '48px', marginBottom: '20px', opacity: 0.5 }}>🏢</div>
                <h3 style={{ color: sergasStyles.colors.dark, marginBottom: '10px' }}>
                  {suppliers.length === 0 ? 'No hay proveedores registrados' : 'No se encontraron proveedores'}
                </h3>
                <p>
                  {suppliers.length === 0 
                    ? 'Comience registrando su primer proveedor usando el botón "Nuevo Proveedor"'
                    : 'Intente modificar los criterios de búsqueda'
                  }
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: sergasStyles.gradients.primary }}>
                      <th style={{ 
                        padding: '20px 16px', 
                        textAlign: 'left', 
                        borderBottom: `2px solid ${sergasStyles.colors.primary}`,
                        color: sergasStyles.colors.dark,
                        fontWeight: '600',
                        fontSize: '14px'
                      }}>
                        CUIT
                      </th>
                      <th style={{ 
                        padding: '20px 16px', 
                        textAlign: 'left', 
                        borderBottom: `2px solid ${sergasStyles.colors.primary}`,
                        color: sergasStyles.colors.dark,
                        fontWeight: '600',
                        fontSize: '14px'
                      }}>
                        Razón Social
                      </th>
                      <th style={{ 
                        padding: '20px 16px', 
                        textAlign: 'left', 
                        borderBottom: `2px solid ${sergasStyles.colors.primary}`,
                        color: sergasStyles.colors.dark,
                        fontWeight: '600',
                        fontSize: '14px'
                      }}>
                        Categoría
                      </th>
                      <th style={{ 
                        padding: '20px 16px', 
                        textAlign: 'left', 
                        borderBottom: `2px solid ${sergasStyles.colors.primary}`,
                        color: sergasStyles.colors.dark,
                        fontWeight: '600',
                        fontSize: '14px'
                      }}>
                        Localidad
                      </th>
                      <th style={{ 
                        padding: '20px 16px', 
                        textAlign: 'left', 
                        borderBottom: `2px solid ${sergasStyles.colors.primary}`,
                        color: sergasStyles.colors.dark,
                        fontWeight: '600',
                        fontSize: '14px'
                      }}>
                        Teléfono
                      </th>
                      <th style={{ 
                        padding: '20px 16px', 
                        textAlign: 'center', 
                        borderBottom: `2px solid ${sergasStyles.colors.primary}`,
                        color: sergasStyles.colors.dark,
                        fontWeight: '600',
                        fontSize: '14px'
                      }}>
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSuppliers.map((supplier, index) => (
                      <tr key={supplier.id} style={{ 
                        borderBottom: `1px solid ${sergasStyles.colors.primary}20`,
                        backgroundColor: index % 2 === 0 ? sergasStyles.colors.white : `${sergasStyles.colors.lightGray}50`,
                        transition: 'background-color 0.2s ease'
                      }}>
                        <td style={{ padding: '16px' }}>
                          <span style={{ 
                            fontWeight: '600', 
                            color: sergasStyles.colors.dark,
                            fontFamily: 'monospace',
                            fontSize: '14px'
                          }}>
                            {supplier.cuit}
                          </span>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontWeight: '600', color: sergasStyles.colors.dark, marginBottom: '4px' }}>
                            {supplier.business_name}
                          </div>
                          {supplier.email && (
                            <div style={{ fontSize: '12px', color: sergasStyles.colors.gray }}>
                              📧 {supplier.email}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{
                            backgroundColor: supplier.category === 'responsable_inscripto' ? `${sergasStyles.colors.accent}15` : 
                                           supplier.category === 'monotributista' ? `${sergasStyles.colors.secondary}15` : `${sergasStyles.colors.warning}15`,
                            color: supplier.category === 'responsable_inscripto' ? sergasStyles.colors.accent : 
                                   supplier.category === 'monotributista' ? sergasStyles.colors.secondary : sergasStyles.colors.warning,
                            padding: '4px 12px',
                            borderRadius: '16px',
                            fontSize: '12px',
                            fontWeight: '600',
                            border: `1px solid ${supplier.category === 'responsable_inscripto' ? `${sergasStyles.colors.accent}30` : 
                                                 supplier.category === 'monotributista' ? `${sergasStyles.colors.secondary}30` : `${sergasStyles.colors.warning}30`}`
                          }}>
                            {supplier.category === 'responsable_inscripto' ? 'Resp. Inscripto' : 
                             supplier.category === 'monotributista' ? 'Monotributo' : 'IVA Exento'}
                          </span>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ color: sergasStyles.colors.dark, fontWeight: '500' }}>
                            {supplier.city}
                          </div>
                          <div style={{ fontSize: '12px', color: sergasStyles.colors.gray }}>
                            {supplier.province}
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ 
                            color: supplier.phone ? sergasStyles.colors.dark : sergasStyles.colors.gray,
                            fontFamily: supplier.phone ? 'monospace' : 'inherit'
                          }}>
                            {supplier.phone || '-'}
                          </span>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <SerGasButton
                            onClick={() => handleEdit(supplier)}
                            variant="accent"
                            size="small"
                          >
                            Editar
                          </SerGasButton>
                          
                          {user?.role === 'admin' && (
                            <SerGasButton
                              onClick={() => {
                                setSupplierToDelete(supplier)
                                setShowDeleteModal(true)
                              }}
                              variant="error"
                              size="small"
                            >
                              Eliminar
                            </SerGasButton>
                          )}
                        </div>
                      </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Agregar animación de loading */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

    {showDeleteModal && supplierToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: sergasStyles.colors.white,
            borderRadius: '16px',
            padding: '32px',
            boxShadow: sergasStyles.shadows.modal,
            width: '500px',
            maxWidth: '90vw',
            border: `2px solid ${sergasStyles.colors.error}40`
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ 
                fontSize: '48px', 
                marginBottom: '16px',
                color: sergasStyles.colors.error
              }}>
                ⚠️
              </div>
              <h3 style={{ 
                color: sergasStyles.colors.dark, 
                marginBottom: '12px',
                fontSize: '24px',
                fontWeight: '700'
              }}>
                Confirmar Eliminación
              </h3>
              <p style={{ 
                color: sergasStyles.colors.gray,
                fontSize: '14px',
                lineHeight: '1.6'
              }}>
                Esta acción no se puede deshacer
              </p>
            </div>
            
            <div style={{ 
              background: `linear-gradient(135deg, ${sergasStyles.colors.lightGray} 0%, ${sergasStyles.colors.white} 100%)`,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '24px',
              border: `1px solid ${sergasStyles.colors.error}20`
            }}>
              <p style={{ margin: '0 0 8px 0', color: sergasStyles.colors.gray, fontSize: '14px' }}>
                <strong style={{ color: sergasStyles.colors.dark }}>Proveedor:</strong>
              </p>
              <p style={{ margin: '0 0 12px 0', color: sergasStyles.colors.dark, fontSize: '16px', fontWeight: '600' }}>
                {supplierToDelete.business_name}
              </p>
              <p style={{ margin: '0', color: sergasStyles.colors.gray, fontSize: '14px' }}>
                <strong style={{ color: sergasStyles.colors.dark }}>CUIT:</strong> {supplierToDelete.cuit}
              </p>
            </div>

            <div style={{
              background: `linear-gradient(135deg, ${sergasStyles.colors.warning}15 0%, ${sergasStyles.colors.warning}25 100%)`,
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '24px',
              border: `1px solid ${sergasStyles.colors.warning}40`
            }}>
              <p style={{ 
                margin: 0, 
                color: sergasStyles.colors.dark,
                fontSize: '13px',
                lineHeight: '1.5'
              }}>
                <strong>Nota:</strong> Solo se puede eliminar si no tiene facturas asociadas.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <SerGasButton
                onClick={() => {
                  setShowDeleteModal(false)
                  setSupplierToDelete(null)
                }}
                variant="ghost"
                size="large"
              >
                Cancelar
              </SerGasButton>
              
              <SerGasButton
                onClick={handleDelete}
                disabled={loading}
                variant="error"
                size="large"
              >
                {loading ? 'Eliminando...' : 'Eliminar Proveedor'}
              </SerGasButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}