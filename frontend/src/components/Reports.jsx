import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Reports({ onBack }) {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reportData, setReportData] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

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
      loadReportData()
    }
  }, [token, selectedMonth, selectedYear])

  const loadReportData = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`http://localhost:3001/api/invoices/reports/summary?month=${selectedMonth}&year=${selectedYear}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        setReportData(data.data)
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

  const exportToExcel = () => {
    if (!reportData) return

    // Crear contenido CSV
    let csv = 'REPORTE MENSUAL DE GASTOS - SERGAS\n'
    csv += `Período: ${selectedMonth}/${selectedYear}\n\n`
    csv += `Total del Mes:,${reportData.total_amount}\n`
    csv += `Total de Facturas:,${reportData.total_invoices}\n\n`
    csv += 'DETALLE POR CATEGORÍA\n'
    csv += 'Categoría,Total,Cantidad de Facturas,Porcentaje\n'
    
    reportData.categories.forEach(cat => {
      const percentage = ((parseFloat(cat.dataValues.total) / reportData.total_amount) * 100).toFixed(2)
      csv += `${cat.expense_category},${cat.dataValues.total},${cat.dataValues.count},${percentage}%\n`
    })

    // Descargar archivo
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `reporte_${selectedMonth}_${selectedYear}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Componente de Botón SerGas
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
        case 'success':
          return {
            ...baseStyle,
            background: sergasStyles.colors.success,
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

  // Generar array de meses
  const months = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' }
  ]

  // Generar años (últimos 5 años)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

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
                  📊 Reportes Financieros
                </h2>
                <p style={{ 
                  margin: '4px 0 0 0', 
                  color: sergasStyles.colors.dark,
                  fontSize: '16px',
                  opacity: 0.8
                }}>
                  Análisis detallado de gastos y estadísticas
                </p>
              </div>
            </div>

            <SerGasButton
              onClick={exportToExcel}
              variant="success"
              size="large"
              disabled={!reportData || loading}
              style={{ boxShadow: sergasStyles.shadows.button }}
            >
              📥 Exportar Excel
            </SerGasButton>
          </div>
        </div>

        {/* Filtros */}
        <div style={{
          background: sergasStyles.colors.white,
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: sergasStyles.shadows.card,
          border: `1px solid ${sergasStyles.colors.primary}20`
        }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: sergasStyles.colors.dark,
                fontSize: '14px'
              }}>
                Mes
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                style={{
                  padding: '12px 16px',
                  border: `2px solid ${sergasStyles.colors.primary}40`,
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: sergasStyles.colors.white,
                  color: sergasStyles.colors.dark,
                  minWidth: '180px',
                  cursor: 'pointer'
                }}
              >
                {months.map(month => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: sergasStyles.colors.dark,
                fontSize: '14px'
              }}>
                Año
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                style={{
                  padding: '12px 16px',
                  border: `2px solid ${sergasStyles.colors.primary}40`,
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: sergasStyles.colors.white,
                  color: sergasStyles.colors.dark,
                  minWidth: '140px',
                  cursor: 'pointer'
                }}
              >
                {years.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginLeft: 'auto' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: sergasStyles.colors.dark,
                fontSize: '14px',
                opacity: 0
              }}>
                Acción
              </label>
              <SerGasButton
                onClick={loadReportData}
                variant="primary"
                disabled={loading}
              >
                🔄 Actualizar
              </SerGasButton>
            </div>
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
            <p style={{ color: sergasStyles.colors.gray, fontSize: '18px' }}>Cargando reporte...</p>
          </div>
        ) : reportData ? (
          <>
            {/* Tarjetas de Resumen */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
              marginBottom: '24px'
            }}>
              {/* Total del Mes */}
              <div style={{
                background: sergasStyles.gradients.primary,
                borderRadius: '12px',
                padding: '24px',
                boxShadow: sergasStyles.shadows.card,
                border: `2px solid ${sergasStyles.colors.primary}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '32px' }}>💰</span>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: '600',
                    color: sergasStyles.colors.dark,
                    opacity: 0.7
                  }}>
                    TOTAL DEL MES
                  </span>
                </div>
                <div style={{ 
                  fontSize: '32px', 
                  fontWeight: '700',
                  color: sergasStyles.colors.dark,
                  marginBottom: '8px'
                }}>
                  ${parseFloat(reportData.total_amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </div>
                <div style={{ 
                  fontSize: '14px',
                  color: sergasStyles.colors.dark,
                  opacity: 0.7
                }}>
                  {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                </div>
              </div>

             {/* Total de Facturas */}
              <div style={{
                background: sergasStyles.colors.white,
                borderRadius: '12px',
                padding: '24px',
                boxShadow: sergasStyles.shadows.card,
                border: `2px solid ${sergasStyles.colors.primary}40`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '32px' }}>📄</span>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: '600',
                    color: sergasStyles.colors.gray
                  }}>
                    TOTAL FACTURAS
                  </span>
                </div>
                <div style={{ 
                  fontSize: '32px', 
                  fontWeight: '700',
                  color: sergasStyles.colors.dark,
                  marginBottom: '8px'
                }}>
                  {reportData.total_invoices}
                </div>
                <div style={{ 
                  fontSize: '14px',
                  color: sergasStyles.colors.gray
                }}>
                  Facturas procesadas
                </div>
              </div>

              {/* Comparación con Mes Anterior */}
                <div style={{
                  background: sergasStyles.colors.white,
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: sergasStyles.shadows.card,
                  border: `2px solid ${
                    (reportData.percentage_change || 0) > 0 
                      ? sergasStyles.colors.error + '40'
                      : (reportData.percentage_change || 0) < 0 
                        ? sergasStyles.colors.success + '40'
                        : sergasStyles.colors.secondary + '40'
                  }`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '32px' }}>
                      {(reportData.percentage_change || 0) > 0 ? '📈' : (reportData.percentage_change || 0) < 0 ? '📉' : '➡️'}
                    </span>
                    <span style={{ 
                      fontSize: '12px', 
                      fontWeight: '600',
                      color: sergasStyles.colors.gray
                    }}>
                      VS MES ANTERIOR
                    </span>
                  </div>
                  
                  {reportData.previous_month_total === null || reportData.previous_month_total === undefined || isNaN(reportData.previous_month_total) ? (
                    // Cuando no hay datos del mes anterior
                    <div>
                      <div style={{ 
                        fontSize: '24px', 
                        fontWeight: '700',
                        color: sergasStyles.colors.gray,
                        marginBottom: '8px'
                      }}>
                        Sin datos
                      </div>
                      <div style={{ 
                        fontSize: '14px',
                        color: sergasStyles.colors.gray
                      }}>
                        No hay información del mes anterior para comparar
                      </div>
                    </div>
                  ) : (
                    // Cuando sí hay datos del mes anterior
                    <div>
                      <div style={{ 
                        fontSize: '28px', 
                        fontWeight: '700',
                        color: (reportData.percentage_change || 0) > 0 
                          ? sergasStyles.colors.error
                          : (reportData.percentage_change || 0) < 0 
                            ? sergasStyles.colors.success
                            : sergasStyles.colors.dark,
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        {(reportData.percentage_change || 0) > 0 ? '+' : ''}{(reportData.percentage_change || 0).toFixed(1)}%
                        <span style={{ fontSize: '16px' }}>
                          {(reportData.percentage_change || 0) > 0 ? '↑' : (reportData.percentage_change || 0) < 0 ? '↓' : '→'}
                        </span>
                      </div>
                      <div style={{ 
                        fontSize: '14px',
                        color: sergasStyles.colors.gray,
                        marginBottom: '4px'
                      }}>
                        {(reportData.difference || 0) >= 0 ? 'Aumento de' : 'Reducción de'} ${Math.abs(reportData.difference || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </div>
                      <div style={{ 
                        fontSize: '12px',
                        color: sergasStyles.colors.gray,
                        opacity: 0.8
                      }}>
                        Mes anterior: ${parseFloat(reportData.previous_month_total || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  )}
                  </div>
                </div>

            {/* Detalle por Categorías */}
            <div style={{
              background: sergasStyles.colors.white,
              borderRadius: '12px',
              padding: '32px',
              boxShadow: sergasStyles.shadows.card,
              border: `1px solid ${sergasStyles.colors.primary}20`,
              marginBottom: '24px'
            }}>
              <h3 style={{ 
                color: sergasStyles.colors.dark, 
                marginBottom: '24px',
                fontSize: '24px',
                fontWeight: '700'
              }}>
                📈 Gastos por Categoría
              </h3>

              {reportData.categories.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px',
                  color: sergasStyles.colors.gray
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📭</div>
                  <p>No hay datos para el período seleccionado</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                  {reportData.categories.map((category, index) => {
                    // Manejar tanto dataValues como acceso directo
                    const total = category.dataValues?.total || category.total || 0
                    const count = category.dataValues?.count || category.count || 0
                    const categoryName = category.expense_category || 'Sin categoría'
                    
                    const percentage = reportData.total_amount > 0 
                      ? ((parseFloat(total) / reportData.total_amount) * 100).toFixed(1)
                      : 0
                    
                    return (
   
                      <div key={index} style={{
                        background: `linear-gradient(135deg, ${sergasStyles.colors.lightGray} 0%, ${sergasStyles.colors.white} 100%)`,
                        borderRadius: '12px',
                        padding: '20px',
                        border: `1px solid ${sergasStyles.colors.primary}20`,
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = sergasStyles.shadows.card
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <div>
                            <div style={{ 
                              fontSize: '18px', 
                              fontWeight: '600',
                              color: sergasStyles.colors.dark,
                              marginBottom: '4px'
                            }}>
                              {categoryName}
                            </div>
                            <div style={{ 
                              fontSize: '14px',
                              color: sergasStyles.colors.gray
                            }}>
                              {count} {count === 1 ? 'factura' : 'facturas'}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ 
                              fontSize: '24px', 
                              fontWeight: '700',
                              color: sergasStyles.colors.dark
                            }}>
                              ${parseFloat(total).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                            </div>
                            <div style={{ 
                              fontSize: '14px',
                              fontWeight: '600',
                              color: sergasStyles.colors.secondary
                            }}>
                              {percentage}%
                            </div>
                          </div>
                        </div>
                        
                        {/* Barra de progreso */}
                        <div style={{
                          width: '100%',
                          height: '8px',
                          background: `${sergasStyles.colors.lightGray}`,
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${percentage}%`,
                            height: '100%',
                            background: sergasStyles.gradients.primary,
                            borderRadius: '4px',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      </div>
                    )
                  })}
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
            <div style={{ fontSize: '48px', marginBottom: '20px', opacity: 0.5 }}>📊</div>
            <h3 style={{ color: sergasStyles.colors.dark, marginBottom: '10px' }}>
              No hay datos disponibles
            </h3>
            <p style={{ color: sergasStyles.colors.gray }}>
              Seleccione un período para ver el reporte
            </p>
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
