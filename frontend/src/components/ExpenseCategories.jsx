import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function ExpenseCategories({ onBack }) {
  const { token, user } = useAuth()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState(null)
  const [errorTimeout, setErrorTimeout] = useState(null)

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
    name: '',
    subcategories: ['']
  })

  useEffect(() => {
    if (token) {
      loadCategories()
    }
  }, [token])

  const loadCategories = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('http://localhost:3001/api/expense-categories', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        setCategories(data.data.categories)
        setError('')
      } else {
        showTemporaryError(`Error del servidor: ${data.message}`)
      }
    } catch (error) {
      showTemporaryError(`Error de conexión: ${error.message}`)
      console.error('Error completo:', error)
    } finally {
      setLoading(false)
    }
  }

  const showTemporaryError = (message, duration = 10000) => {
    if (errorTimeout) {
      clearTimeout(errorTimeout)
    }
    
    setError(message)
    
    const timeout = setTimeout(() => {
      setError('')
      setErrorTimeout(null)
    }, duration)
    
    setErrorTimeout(timeout)
  }

  const closeError = () => {
    setError('')
    if (errorTimeout) {
      clearTimeout(errorTimeout)
      setErrorTimeout(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.name) {
      showTemporaryError('El nombre de la categoría es requerido')
      return
    }

    // Filtrar subcategorías vacías
    const filteredSubcategories = formData.subcategories.filter(sub => sub.trim() !== '')

    try {
      setLoading(true)
      
      const url = editingCategory 
        ? `http://localhost:3001/api/expense-categories/${editingCategory.id}`
        : 'http://localhost:3001/api/expense-categories'
      
      const method = editingCategory ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          subcategories: filteredSubcategories
        })
      })

      const data = await response.json()

      if (data.success) {
        await loadCategories()
        resetForm()
        setShowForm(false)
      } else {
        showTemporaryError(data.message || 'Error al guardar categoría')
      }
    } catch (error) {
      showTemporaryError(`Error de conexión: ${error.message}`)
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      subcategories: category.subcategories.length > 0 ? category.subcategories : ['']
    })
    setShowForm(true)
  }

  const handleDelete = async () => {
    if (!categoryToDelete) return

    try {
      setLoading(true)
      
      const response = await fetch(`http://localhost:3001/api/expense-categories/${categoryToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.success) {
        await loadCategories()
        setShowDeleteModal(false)
        setCategoryToDelete(null)
        setError('')
      } else {
        showTemporaryError(data.message || 'Error al eliminar categoría')
        setShowDeleteModal(false)
        setCategoryToDelete(null)
      }
    } catch (error) {
      showTemporaryError(`Error de conexión: ${error.message}`)
      setShowDeleteModal(false)
      setCategoryToDelete(null)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      subcategories: ['']
    })
    setEditingCategory(null)
    setError('')
  }

  const addSubcategory = () => {
    setFormData({
      ...formData,
      subcategories: [...formData.subcategories, '']
    })
  }

  const removeSubcategory = (index) => {
    const newSubcategories = formData.subcategories.filter((_, i) => i !== index)
    setFormData({
      ...formData,
      subcategories: newSubcategories.length > 0 ? newSubcategories : ['']
    })
  }

  const updateSubcategory = (index, value) => {
    const newSubcategories = [...formData.subcategories]
    newSubcategories[index] = value
    setFormData({
      ...formData,
      subcategories: newSubcategories
    })
  }

  // Componente de Botón
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
        case 'error':
          return { ...baseStyle, background: sergasStyles.colors.error, color: sergasStyles.colors.white }
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
            Solo los administradores pueden gestionar las categorías de gasto.
          </p>
          <SerGasButton onClick={onBack} variant="primary" size="large">
            Volver al Dashboard
          </SerGasButton>
        </div>
      </div>
    )
  }

  if (showForm) {
    return (
      <div style={{ 
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${sergasStyles.colors.lightGray} 0%, ${sergasStyles.colors.white} 100%)`,
        padding: '20px'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Header */}
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
                {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
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
                justifyContent: 'space-between',
                gap: '12px',
                fontWeight: '500'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>⚠️</span>
                  {error}
                </div>
                <button
                  onClick={closeError}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: sergasStyles.colors.error,
                    fontSize: '20px',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    fontWeight: 'bold'
                  }}
                  title="Cerrar mensaje"
                >
                  ×
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Nombre de categoría */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: sergasStyles.colors.dark 
                }}>
                  Nombre de la Categoría *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ej: Servicios, Insumos, etc."
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `2px solid ${sergasStyles.colors.primary}40`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: sergasStyles.colors.white
                  }}
                  required
                />
              </div>

              {/* Subcategorías */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: sergasStyles.colors.dark 
                }}>
                  Subcategorías
                </label>
                
                {formData.subcategories.map((subcategory, index) => (
                  <div key={index} style={{ 
                    display: 'flex', 
                    gap: '8px', 
                    marginBottom: '12px' 
                  }}>
                    <input
                      type="text"
                      value={subcategory}
                      onChange={(e) => updateSubcategory(index, e.target.value)}
                      placeholder={`Subcategoría ${index + 1}`}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        border: `2px solid ${sergasStyles.colors.primary}40`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: sergasStyles.colors.white
                      }}
                    />
                    {formData.subcategories.length > 1 && (
                      <SerGasButton
                        variant="error"
                        size="small"
                        onClick={() => removeSubcategory(index)}
                      >
                        ×
                      </SerGasButton>
                    )}
                  </div>
                ))}
                
                <SerGasButton
                  variant="secondary"
                  size="small"
                  onClick={addSubcategory}
                  style={{ marginTop: '8px' }}
                >
                  + Agregar Subcategoría
                </SerGasButton>
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
                  {loading ? 'Guardando...' : (editingCategory ? 'Actualizar' : 'Crear')} Categoría
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
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Header principal */}
        <div style={{
          background: sergasStyles.gradients.primary,
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '24px',
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
                  Categorías de Gasto
                </h2>
                <p style={{ 
                  margin: '4px 0 0 0', 
                  color: sergasStyles.colors.dark,
                  fontSize: '16px',
                  opacity: 0.8
                }}>
                  Gestiona las categorías para clasificar tus facturas
                </p>
              </div>
            </div>

            <SerGasButton
              onClick={() => setShowForm(true)}
              variant="secondary"
              size="large"
              style={{ boxShadow: sergasStyles.shadows.button }}
            >
              + Nueva Categoría
            </SerGasButton>
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
            justifyContent: 'space-between',
            gap: '12px',
            fontWeight: '500'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>⚠️</span>
              {error}
            </div>
            <button
              onClick={closeError}
              style={{
                background: 'none',
                border: 'none',
                color: sergasStyles.colors.error,
                fontSize: '20px',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                fontWeight: 'bold'
              }}
              title="Cerrar mensaje"
            >
              ×
            </button>
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
            <p style={{ color: sergasStyles.colors.gray, fontSize: '18px' }}>Cargando categorías...</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '24px'
          }}>
            {categories.map((category) => (
              <div key={category.id} style={{
                background: sergasStyles.colors.white,
                borderRadius: '12px',
                padding: '24px',
                boxShadow: sergasStyles.shadows.card,
                border: `1px solid ${sergasStyles.colors.primary}20`,
                transition: 'transform 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <h3 style={{ 
                  color: sergasStyles.colors.dark,
                  fontSize: '20px',
                  fontWeight: '600',
                  marginBottom: '16px'
                }}>
                  {category.name}
                </h3>
                
                {category.subcategories && category.subcategories.length > 0 ? (
                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ 
                      color: sergasStyles.colors.gray, 
                      fontSize: '12px',
                      marginBottom: '8px',
                      fontWeight: '600'
                    }}>
                      SUBCATEGORÍAS:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {category.subcategories.map((sub, index) => (
                        <span key={index} style={{
                          background: `${sergasStyles.colors.primary}20`,
                          color: sergasStyles.colors.dark,
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          border: `1px solid ${sergasStyles.colors.primary}40`
                        }}>
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p style={{ 
                    color: sergasStyles.colors.gray, 
                    fontSize: '14px',
                    marginBottom: '16px',
                    fontStyle: 'italic'
                  }}>
                    Sin subcategorías
                  </p>
                )}
                
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <SerGasButton
                    onClick={() => handleEdit(category)}
                    variant="accent"
                    size="small"
                  >
                    Editar
                  </SerGasButton>
                  
                  <SerGasButton
                    onClick={() => {
                      setCategoryToDelete(category)
                      setShowDeleteModal(true)
                    }}
                    variant="error"
                    size="small"
                  >
                    Eliminar
                  </SerGasButton>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de confirmación para eliminar */}
        {showDeleteModal && categoryToDelete && (
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
                <div style={{ fontSize: '48px', marginBottom: '16px', color: sergasStyles.colors.error }}>
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
                <p style={{ color: sergasStyles.colors.gray, fontSize: '14px', lineHeight: '1.6' }}>
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
                  <strong style={{ color: sergasStyles.colors.dark }}>Categoría:</strong>
                </p>
                <p style={{ margin: '0', color: sergasStyles.colors.dark, fontSize: '16px', fontWeight: '600' }}>
                  {categoryToDelete.name}
                </p>
              </div>

              <div style={{
                background: `linear-gradient(135deg, ${sergasStyles.colors.warning}15 0%, ${sergasStyles.colors.warning}25 100%)`,
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '24px',
                border: `1px solid ${sergasStyles.colors.warning}40`
              }}>
                <p style={{ margin: 0, color: sergasStyles.colors.dark, fontSize: '13px', lineHeight: '1.5' }}>
                  <strong>Nota:</strong> Solo se puede eliminar si no tiene facturas asociadas.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <SerGasButton
                  onClick={() => {
                    setShowDeleteModal(false)
                    setCategoryToDelete(null)
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
                  {loading ? 'Eliminando...' : 'Eliminar Categoría'}
                </SerGasButton>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Animación de loading */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}