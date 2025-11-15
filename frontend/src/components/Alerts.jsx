import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Alerts({ onBack }) {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [alertsData, setAlertsData] = useState(null)
  const [selectedFilter, setSelectedFilter] = useState('all') // 'all', 'overdue', 'urgent', 'upcoming'

  //Estados para marcar como pagada (atajo)
  const [showPaymentModal, setShowPaymentModal] = useState(false) 
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null)
  const [paymentFile, setPaymentFile] = useState(null)

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

  useEffect(() => {
    if (token) {
      loadAlerts()
    }
  }, [token])

  const loadAlerts = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('http://localhost:3001/api/invoices/alerts/due-soon', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        setAlertsData(data.data)
        setError('')
      } else {
        setError(`Error del servidor: ${data.message}`)
      }
    } catch (error) {
      setError(`Error de conexión: ${error.message}`)
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsPaid = (invoice) => {
    setSelectedInvoiceForPayment(invoice)
    setShowPaymentModal(true)
  }

  const confirmPayment = async () => {
    if (!selectedInvoiceForPayment) return

    try {
      setLoading(true)
      
      const formData = new FormData()
      formData.append('admin_notes', 'Marcada como pagada desde Alertas')
      
      if (paymentFile) {
        formData.append('payment_file', paymentFile)
      }

      const response = await fetch(`http://localhost:3001/api/invoices/${selectedInvoiceForPayment.id}/mark-paid`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        // Recargar alertas para actualizar el estado
        await loadAlerts()
        setShowPaymentModal(false)
        setSelectedInvoiceForPayment(null)
        setPaymentFile(null)
        setError('')
      } else {
        setError(data.message || 'Error al marcar como pagada')
      }
    } catch (error) {
      setError(`Error de conexión: ${error.message}`)
    } finally {
      setLoading(false)
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
        case 'danger':
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

  const getFilteredInvoices = () => {
    if (!alertsData) return []
    
    switch (selectedFilter) {
      case 'overdue':
        return alertsData.overdue.invoices
      case 'urgent':
        return alertsData.urgent.invoices
      case 'upcoming':
        return alertsData.upcoming.invoices
      default:
        return [
          ...alertsData.overdue.invoices,
          ...alertsData.urgent.invoices,
          ...alertsData.upcoming.invoices
        ]
    }
  }

  const getUrgencyColor = (daysUntilDue) => {
    if (daysUntilDue < 0) return sergasStyles.colors.error
    if (daysUntilDue <= 7) return sergasStyles.colors.warning
    return sergasStyles.colors.success
  }

  const getUrgencyLabel = (daysUntilDue) => {
    if (daysUntilDue < 0) return `Vencida hace ${Math.abs(daysUntilDue)} días`
    if (daysUntilDue === 0) return 'Vence hoy'
    if (daysUntilDue === 1) return 'Vence mañana'
    return `Vence en ${daysUntilDue} días`
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${sergasStyles.colors.lightGray} 0%, ${sergasStyles.colors.white} 100%)`,
      padding: '20px'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Header */}
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
                ← Volver
              </SerGasButton>
              
              <div>
                <h2 style={{ 
                  margin: 0, 
                  color: sergasStyles.colors.dark,
                  fontSize: '32px',
                  fontWeight: '700',
                  textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}>
                  🔔 Alertas de Vencimiento
                </h2>
                <p style={{ 
                  margin: '4px 0 0 0', 
                  color: sergasStyles.colors.dark,
                  fontSize: '16px',
                  opacity: 0.8
                }}>
                  Facturas pendientes próximas a vencer
                </p>
              </div>
            </div>

            <SerGasButton
              onClick={loadAlerts}
              variant="secondary"
              size="large"
              disabled={loading}
            >
              🔄 Actualizar
            </SerGasButton>
          </div>
        </div>

        {/* Error */}
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

        {/* Loading */}
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
            <p style={{ color: sergasStyles.colors.gray, fontSize: '18px' }}>Cargando alertas...</p>
          </div>
        ) : alertsData ? (
          <>
            {/* Tarjetas de Resumen */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
              marginBottom: '24px'
            }}>
              {/* Vencidas */}
              <div style={{
                background: sergasStyles.colors.white,
                borderRadius: '12px',
                padding: '24px',
                boxShadow: sergasStyles.shadows.card,
                border: `2px solid ${sergasStyles.colors.error}`,
                cursor: 'pointer',
                transition: 'transform 0.2s',
                transform: selectedFilter === 'overdue' ? 'scale(1.02)' : 'scale(1)'
              }}
              onClick={() => setSelectedFilter('overdue')}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '32px' }}>⛔</span>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: '600',
                    color: sergasStyles.colors.error
                  }}>
                    VENCIDAS
                  </span>
                </div>
                <div style={{ 
                  fontSize: '32px', 
                  fontWeight: '700',
                  color: sergasStyles.colors.error,
                  marginBottom: '8px'
                }}>
                  {alertsData.overdue.count}
                </div>
                <div style={{ 
                  fontSize: '14px',
                  color: sergasStyles.colors.gray
                }}>
                  Total: ${alertsData.overdue.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Urgentes */}
              <div style={{
                background: sergasStyles.colors.white,
                borderRadius: '12px',
                padding: '24px',
                boxShadow: sergasStyles.shadows.card,
                border: `2px solid ${sergasStyles.colors.warning}`,
                cursor: 'pointer',
                transition: 'transform 0.2s',
                transform: selectedFilter === 'urgent' ? 'scale(1.02)' : 'scale(1)'
              }}
              onClick={() => setSelectedFilter('urgent')}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '32px' }}>⚠️</span>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: '600',
                    color: sergasStyles.colors.warning
                  }}>
                    URGENTES (≤7 días)
                  </span>
                </div>
                <div style={{ 
                  fontSize: '32px', 
                  fontWeight: '700',
                  color: sergasStyles.colors.warning,
                  marginBottom: '8px'
                }}>
                  {alertsData.urgent.count}
                </div>
                <div style={{ 
                  fontSize: '14px',
                  color: sergasStyles.colors.gray
                }}>
                  Total: ${alertsData.urgent.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Próximas */}
              <div style={{
                background: sergasStyles.colors.white,
                borderRadius: '12px',
                padding: '24px',
                boxShadow: sergasStyles.shadows.card,
                border: `2px solid ${sergasStyles.colors.success}`,
                cursor: 'pointer',
                transition: 'transform 0.2s',
                transform: selectedFilter === 'upcoming' ? 'scale(1.02)' : 'scale(1)'
              }}
              onClick={() => setSelectedFilter('upcoming')}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '32px' }}>📅</span>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: '600',
                    color: sergasStyles.colors.success
                  }}>
                    PRÓXIMAS (≤30 días)
                  </span>
                </div>
                <div style={{ 
                  fontSize: '32px', 
                  fontWeight: '700',
                  color: sergasStyles.colors.success,
                  marginBottom: '8px'
                }}>
                  {alertsData.upcoming.count}
                </div>
                <div style={{ 
                  fontSize: '14px',
                  color: sergasStyles.colors.gray
                }}>
                  Total: ${alertsData.upcoming.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Filtros */}
            <div style={{
              background: sergasStyles.colors.white,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
              boxShadow: sergasStyles.shadows.card,
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontWeight: '600', color: sergasStyles.colors.dark }}>Filtrar:</span>
              <SerGasButton
                onClick={() => setSelectedFilter('all')}
                variant={selectedFilter === 'all' ? 'primary' : 'outline'}
                size="small"
              >
                Todas ({alertsData.summary.total_count})
              </SerGasButton>
              <SerGasButton
                onClick={() => setSelectedFilter('overdue')}
                variant={selectedFilter === 'overdue' ? 'danger' : 'outline'}
                size="small"
              >
                Vencidas ({alertsData.overdue.count})
              </SerGasButton>
              <SerGasButton
                onClick={() => setSelectedFilter('urgent')}
                variant={selectedFilter === 'urgent' ? 'secondary' : 'outline'}
                size="small"
              >
                Urgentes ({alertsData.urgent.count})
              </SerGasButton>
              <SerGasButton
                onClick={() => setSelectedFilter('upcoming')}
                variant={selectedFilter === 'upcoming' ? 'outline' : 'ghost'}
                size="small"
              >
                Próximas ({alertsData.upcoming.count})
              </SerGasButton>
            </div>

            {/* Listado de Facturas */}
            <div style={{
              background: sergasStyles.colors.white,
              borderRadius: '12px',
              padding: '32px',
              boxShadow: sergasStyles.shadows.card,
              border: `1px solid ${sergasStyles.colors.primary}20`
            }}>
              <h3 style={{ 
                color: sergasStyles.colors.dark, 
                marginBottom: '24px',
                fontSize: '24px',
                fontWeight: '700'
              }}>
                📋 Listado de Facturas
              </h3>

              {getFilteredInvoices().length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px',
                  color: sergasStyles.colors.gray
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>✅</div>
                  <p>No hay facturas en esta categoría</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                  {getFilteredInvoices().map((invoice, index) => (
                    <div key={index} style={{
                      background: `linear-gradient(135deg, ${sergasStyles.colors.lightGray} 0%, ${sergasStyles.colors.white} 100%)`,
                      borderRadius: '12px',
                      padding: '20px',
                      border: `2px solid ${getUrgencyColor(invoice.days_until_due)}40`,
                      borderLeft: `6px solid ${getUrgencyColor(invoice.days_until_due)}`,
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateX(4px)'
                      e.currentTarget.style.boxShadow = sergasStyles.shadows.card
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateX(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            fontSize: '18px', 
                            fontWeight: '600',
                            color: sergasStyles.colors.dark,
                            marginBottom: '4px'
                          }}>
                            Factura #{invoice.invoice_number}
                          </div>
                          <div style={{ 
                            fontSize: '14px',
                            color: sergasStyles.colors.gray,
                            marginBottom: '4px'
                          }}>
                            Proveedor: {invoice.supplier_name}
                          </div>
                          <div style={{ 
                            fontSize: '14px',
                            color: sergasStyles.colors.gray
                          }}>
                            Categoría: {invoice.category}
                          </div>
                        </div>
                        
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ 
                            fontSize: '24px', 
                            fontWeight: '700',
                            color: sergasStyles.colors.dark,
                            marginBottom: '4px'
                          }}>
                            ${invoice.total_amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </div>
                          <div style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: '6px',
                            background: getUrgencyColor(invoice.days_until_due),
                            color: sergasStyles.colors.white,
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {getUrgencyLabel(invoice.days_until_due)}
                          </div>
                        </div>
                      </div>
                      
                        <div style={{
                        fontSize: '12px',
                        color: sergasStyles.colors.gray,
                        display: 'flex',
                        gap: '20px'
                      }}>
                        <span>📅 Emisión: {new Date(invoice.invoice_date + 'T00:00:00').toLocaleDateString('es-ES')}</span>
                        <span>⏰ Vencimiento: {new Date(invoice.due_date + 'T00:00:00').toLocaleDateString('es-ES')}</span>
                      </div>

                      {/* Sección de acciones - NUEVO CÓDIGO */}
                      <div style={{ 
                        marginTop: '16px', 
                        paddingTop: '16px', 
                        borderTop: `1px solid ${sergasStyles.colors.primary}20`,
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        {invoice.is_paid ? (
                          // Si ya está pagada, mostrar estado y botón para ver comprobante
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '12px',
                            flex: 1
                          }}>
                            <span style={{
                              backgroundColor: sergasStyles.colors.success,
                              color: sergasStyles.colors.white,
                              padding: '6px 12px',
                              borderRadius: '16px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}>
                              ✅ Pagada
                            </span>
                            {invoice.paid_date && (
                              <span style={{ fontSize: '12px', color: sergasStyles.colors.gray }}>
                                {new Date(invoice.paid_date + 'T00:00:00').toLocaleDateString('es-ES')}
                              </span>
                            )}
                            {invoice.payment_proof && (
                              <SerGasButton
                                variant="outline"
                                size="small"
                                onClick={() => window.open(`http://localhost:3001/api/invoices/payment-file/${invoice.payment_proof}`, '_blank')}
                              >
                                📎 Ver Comprobante
                              </SerGasButton>
                            )}
                          </div>
                        ) : (
                          // Si no está pagada, mostrar botón para marcar como pagada
                          <SerGasButton
                            variant="primary"
                            size="small"
                            onClick={() => handleMarkAsPaid(invoice)}
                            style={{
                              background: sergasStyles.gradients.primary,
                              color: sergasStyles.colors.dark
                            }}
                          >
                            💰 Marcar como Pagada
                          </SerGasButton>
                        )}
                      </div>
                      {/* FIN NUEVO CÓDIGO */}
                    </div>
                  ))}
                  
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px',
            background: sergasStyles.colors.white,
            borderRadius: '12px',
            boxShadow: sergasStyles.shadows.card
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px', opacity: 0.5 }}>🔔</div>
            <h3 style={{ color: sergasStyles.colors.dark, marginBottom: '10px' }}>
              No hay alertas disponibles
            </h3>
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

      {/* Modal para marcar como pagada - NUEVO CÓDIGO */}
      {showPaymentModal && selectedInvoiceForPayment && (
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
            border: `2px solid ${sergasStyles.colors.primary}40`
          }}>
            <h3 style={{ 
              color: sergasStyles.colors.dark, 
              marginBottom: '24px',
              fontSize: '24px',
              fontWeight: '700',
              textAlign: 'center'
            }}>
              Marcar Factura como Pagada
            </h3>
            
            <div style={{ 
              background: `linear-gradient(135deg, ${sergasStyles.colors.lightGray} 0%, ${sergasStyles.colors.white} 100%)`,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '24px',
              border: `1px solid ${sergasStyles.colors.primary}20`
            }}>
              <p style={{ margin: '0 0 8px 0', color: sergasStyles.colors.gray }}>
                <strong style={{ color: sergasStyles.colors.dark }}>Factura:</strong> {selectedInvoiceForPayment.invoice_number}
              </p>
              <p style={{ margin: '0 0 8px 0', color: sergasStyles.colors.gray }}>
                <strong style={{ color: sergasStyles.colors.dark }}>Proveedor:</strong> {selectedInvoiceForPayment.supplier_name}
              </p>
              <p style={{ margin: '0', color: sergasStyles.colors.gray }}>
                <strong style={{ color: sergasStyles.colors.dark }}>Total:</strong> 
                <span style={{ 
                  color: sergasStyles.colors.success, 
                  fontWeight: 'bold', 
                  fontSize: '18px',
                  marginLeft: '8px'
                }}>
                  ${parseFloat(selectedInvoiceForPayment.total_amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </span>
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '12px', 
                fontWeight: '600',
                color: sergasStyles.colors.dark,
                fontSize: '16px'
              }}>
                Comprobante de Pago (Opcional)
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setPaymentFile(e.target.files[0])}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: `2px solid ${sergasStyles.colors.primary}40`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: sergasStyles.colors.lightGray
                }}
              />
              <small style={{ color: sergasStyles.colors.gray, fontSize: '12px' }}>
                Formatos aceptados: PDF, JPG, PNG
              </small>
              
              {paymentFile && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px 16px',
                  background: `linear-gradient(135deg, ${sergasStyles.colors.success}15 0%, ${sergasStyles.colors.success}25 100%)`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: sergasStyles.colors.dark,
                  border: `1px solid ${sergasStyles.colors.success}40`
                }}>
                  📎 Archivo seleccionado: {paymentFile.name}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <SerGasButton
                onClick={() => {
                  setShowPaymentModal(false)
                  setSelectedInvoiceForPayment(null)
                  setPaymentFile(null)
                }}
                variant="ghost"
                size="large"
              >
                Cancelar
              </SerGasButton>
              
              <SerGasButton
                onClick={confirmPayment}
                disabled={loading}
                variant="primary"
                size="large"
                style={{
                  background: sergasStyles.colors.success,
                  color: sergasStyles.colors.white
                }}
              >
                {loading ? 'Procesando...' : '✅ Confirmar Pago'}
              </SerGasButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}