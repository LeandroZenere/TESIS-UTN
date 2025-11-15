import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

import { Bar, Doughnut, Line } from 'react-chartjs-2'
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

import * as XLSX from 'xlsx-js-style'
import { saveAs } from 'file-saver'

export default function Reports({ onBack }) {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reportData, setReportData] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [filterType, setFilterType] = useState('monthly') // 'monthly' o 'daterange'
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [dateType, setDateType] = useState('emission') 

  // Estados para comparador de categorías
  const [showComparator, setShowComparator] = useState(false)
  const [comparisonData, setComparisonData] = useState(null)
  const [comparisonLoading, setComparisonLoading] = useState(false)
  
  // Configuración de comparación
  const [compareCategory, setCompareCategory] = useState('')
  const [compareSubcategory, setCompareSubcategory] = useState('todas')
  
  // Período 1
  const [p1Start, setP1Start] = useState('')
  const [p1End, setP1End] = useState('')
  
  // Período 2
  const [p2Start, setP2Start] = useState('')
  const [p2End, setP2End] = useState('')
  

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
      
      let url = 'http://localhost:3001/api/invoices/reports/summary?'
      
      if (filterType === 'monthly') {
        url += `month=${selectedMonth}&year=${selectedYear}&dateType=${dateType}`
      } else {
        if (!startDate || !endDate) {
          setError('Debe seleccionar fecha de inicio y fin')
          setLoading(false)
          return
        }
        url += `startDate=${startDate}&endDate=${endDate}&dateType=${dateType}`
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      
      console.log('📊 DATOS RECIBIDOS DEL BACKEND:', data)
      
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

  // Obtener categorías únicas del reporte actual
  const getUniqueCategories = () => {
    if (!reportData || !reportData.categories) return []
    return reportData.categories.map(cat => cat.expense_category || 'Sin categoría')
  }

  // Función para comparar categorías
  const compareCategories = async () => {
    if (!compareCategory || !p1Start || !p1End || !p2Start || !p2End) {
      alert('Debe completar todos los campos')
      return
    }

    try {
      setComparisonLoading(true)
      
      const url = `http://localhost:3001/api/invoices/reports/category-comparison?category=${encodeURIComponent(compareCategory)}&subcategory=${encodeURIComponent(compareSubcategory)}&period1_start=${p1Start}&period1_end=${p1End}&period2_start=${p2Start}&period2_end=${p2End}&dateType=${dateType}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        setComparisonData(data.data)
      } else {
        alert(`Error: ${data.message}`)
      }
    } catch (error) {
      alert(`Error de conexión: ${error.message}`)
      console.error('Error:', error)
    } finally {
      setComparisonLoading(false)
    }
  }

const exportToExcel = () => {
    if (!reportData) return

    try {
      // Crear un nuevo workbook
      const wb = XLSX.utils.book_new()

      // ESTILOS SERGAS
      const estiloTitulo = {
        font: { bold: true, sz: 16, color: { rgb: "1A1A1A" } },
        fill: { fgColor: { rgb: "FFC107" } },
        alignment: { horizontal: "center", vertical: "center" }
      }

      const estiloSubtitulo = {
        font: { bold: true, sz: 12, color: { rgb: "1A1A1A" } },
        fill: { fgColor: { rgb: "FFE082" } },
        alignment: { horizontal: "center", vertical: "center" }
      }

      const estiloEncabezado = {
        font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "FF8C00" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      }

      const estiloTotal = {
        font: { bold: true, sz: 11, color: { rgb: "1A1A1A" } },
        fill: { fgColor: { rgb: "FFD54F" } },
        alignment: { horizontal: "right", vertical: "center" },
        border: {
          top: { style: "medium", color: { rgb: "000000" } },
          bottom: { style: "medium", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      }

      const estiloDato = {
        alignment: { horizontal: "right", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "E0E0E0" } },
          bottom: { style: "thin", color: { rgb: "E0E0E0" } },
          left: { style: "thin", color: { rgb: "E0E0E0" } },
          right: { style: "thin", color: { rgb: "E0E0E0" } }
        }
      }

      const estiloTexto = {
        alignment: { horizontal: "left", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "E0E0E0" } },
          bottom: { style: "thin", color: { rgb: "E0E0E0" } },
          left: { style: "thin", color: { rgb: "E0E0E0" } },
          right: { style: "thin", color: { rgb: "E0E0E0" } }
        }
      }

      const estiloMoneda = {
        alignment: { horizontal: "right", vertical: "center" },
        numFmt: "$#,##0.00",
        border: {
          top: { style: "thin", color: { rgb: "E0E0E0" } },
          bottom: { style: "thin", color: { rgb: "E0E0E0" } },
          left: { style: "thin", color: { rgb: "E0E0E0" } },
          right: { style: "thin", color: { rgb: "E0E0E0" } }
        }
      }

      const estiloPorcentaje = {
        alignment: { horizontal: "right", vertical: "center" },
        numFmt: "0.00%",
        border: {
          top: { style: "thin", color: { rgb: "E0E0E0" } },
          bottom: { style: "thin", color: { rgb: "E0E0E0" } },
          left: { style: "thin", color: { rgb: "E0E0E0" } },
          right: { style: "thin", color: { rgb: "E0E0E0" } }
        }
      }

      // ==================== HOJA 1: RESUMEN GENERAL ====================
      const resumenData = [
        ['REPORTE FINANCIERO - SERGAS'],
        ['Sistema de Gestión de Facturas'],
        [],
        ['Período', reportData.period],
        ['Fecha de generación', new Date().toLocaleDateString('es-ES')],
        [],
        ['RESUMEN DEL MES'],
        ['Concepto', 'Valor'],
        ['Total del Mes', reportData.total_amount],
        ['Total de Facturas', reportData.total_invoices],
        ['Mes Anterior', reportData.previous_month_total],
        ['Diferencia', reportData.difference],
        ['Variación %', reportData.percentage_change / 100],
        [],
        ['ESTADO DE FACTURAS'],
        ['Estado', 'Cantidad', 'Total'],
        ['Pagadas', reportData.invoice_status?.paid?.count || 0, reportData.invoice_status?.paid?.total || 0],
        ['Pendientes', reportData.invoice_status?.pending?.count || 0, reportData.invoice_status?.pending?.total || 0],
      ]

      const wsResumen = XLSX.utils.aoa_to_sheet(resumenData)

      // Aplicar estilos a Resumen
      wsResumen['A1'].s = estiloTitulo
      wsResumen['A2'].s = estiloSubtitulo
      wsResumen['A7'].s = estiloEncabezado
      wsResumen['A8'].s = estiloEncabezado
      wsResumen['B8'].s = estiloEncabezado
      wsResumen['A15'].s = estiloEncabezado
      wsResumen['A16'].s = estiloEncabezado
      wsResumen['B16'].s = estiloEncabezado
      wsResumen['C16'].s = estiloEncabezado

      // Aplicar formato de moneda
      if (wsResumen['B9']) wsResumen['B9'].s = estiloMoneda
      if (wsResumen['B11']) wsResumen['B11'].s = estiloMoneda
      if (wsResumen['B12']) wsResumen['B12'].s = estiloMoneda
      if (wsResumen['B13']) wsResumen['B13'].s = estiloPorcentaje
      if (wsResumen['C17']) wsResumen['C17'].s = estiloMoneda
      if (wsResumen['C18']) wsResumen['C18'].s = estiloMoneda

      // Merge cells para títulos
      wsResumen['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
        { s: { r: 6, c: 0 }, e: { r: 6, c: 1 } },
        { s: { r: 14, c: 0 }, e: { r: 14, c: 2 } }
      ]

      wsResumen['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 20 }]
      wsResumen['!rows'] = [{ hpt: 25 }, { hpt: 18 }]

      // ==================== HOJA 2: DETALLE POR CATEGORÍAS ====================
      const categoriasData = [
        ['GASTOS POR CATEGORÍA'],
        [`Período: ${reportData.period}`],
        [],
        ['Categoría', 'Cantidad Facturas', 'Total', 'Porcentaje']
      ]

      reportData.categories.forEach(cat => {
        const total = cat.dataValues?.total || cat.total || 0
        const count = cat.dataValues?.count || cat.count || 0
        const categoryName = cat.expense_category || 'Sin categoría'
        const percentage = (parseFloat(total) / reportData.total_amount)

        categoriasData.push([
          categoryName,
          parseInt(count),
          parseFloat(total),
          percentage
        ])
      })

      categoriasData.push([])
      categoriasData.push([
        'TOTAL',
        reportData.total_invoices,
        parseFloat(reportData.total_amount),
        1
      ])

      const wsCategorias = XLSX.utils.aoa_to_sheet(categoriasData)

      // Aplicar estilos a Categorías
      wsCategorias['A1'].s = estiloTitulo
      wsCategorias['A2'].s = estiloSubtitulo
      wsCategorias['A4'].s = estiloEncabezado
      wsCategorias['B4'].s = estiloEncabezado
      wsCategorias['C4'].s = estiloEncabezado
      wsCategorias['D4'].s = estiloEncabezado

      // Estilos para datos de categorías
      const startRow = 5
      const endRow = startRow + reportData.categories.length - 1
      
      for (let i = startRow; i <= endRow; i++) {
        const cellA = `A${i}`
        const cellB = `B${i}`
        const cellC = `C${i}`
        const cellD = `D${i}`
        
        if (wsCategorias[cellA]) wsCategorias[cellA].s = estiloTexto
        if (wsCategorias[cellB]) wsCategorias[cellB].s = estiloDato
        if (wsCategorias[cellC]) wsCategorias[cellC].s = estiloMoneda
        if (wsCategorias[cellD]) wsCategorias[cellD].s = estiloPorcentaje
      }

      // Fila de total
      const totalRow = endRow + 2
      if (wsCategorias[`A${totalRow}`]) wsCategorias[`A${totalRow}`].s = estiloTotal
      if (wsCategorias[`B${totalRow}`]) wsCategorias[`B${totalRow}`].s = estiloTotal
      if (wsCategorias[`C${totalRow}`]) {
        wsCategorias[`C${totalRow}`].s = { ...estiloTotal, numFmt: "$#,##0.00" }
      }
      if (wsCategorias[`D${totalRow}`]) {
        wsCategorias[`D${totalRow}`].s = { ...estiloTotal, numFmt: "0.00%" }
      }

      wsCategorias['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }
      ]

      wsCategorias['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 15 }]
      wsCategorias['!rows'] = [{ hpt: 25 }, { hpt: 18 }]

      // ==================== HOJA 3: TOP PROVEEDORES ====================
      const proveedoresData = [
        ['TOP PROVEEDORES DEL MES'],
        [`Período: ${reportData.period}`],
        [],
        ['Posición', 'Proveedor', 'Cantidad Facturas', 'Total Gastado']
      ]

      if (reportData.top_suppliers && reportData.top_suppliers.length > 0) {
        reportData.top_suppliers.forEach((supplier, index) => {
          proveedoresData.push([
            index + 1,
            supplier.name,
            supplier.count,
            parseFloat(supplier.total)
          ])
        })

        const totalTopSuppliers = reportData.top_suppliers.reduce((sum, s) => sum + parseFloat(s.total), 0)
        const countTopSuppliers = reportData.top_suppliers.reduce((sum, s) => sum + parseInt(s.count), 0)
        
        proveedoresData.push([])
        proveedoresData.push([
          '',
          'TOTAL',
          countTopSuppliers,
          totalTopSuppliers
        ])
      } else {
        proveedoresData.push(['No hay datos disponibles', '', '', ''])
      }

      const wsProveedores = XLSX.utils.aoa_to_sheet(proveedoresData)

      // Aplicar estilos a Proveedores
      wsProveedores['A1'].s = estiloTitulo
      wsProveedores['A2'].s = estiloSubtitulo
      wsProveedores['A4'].s = estiloEncabezado
      wsProveedores['B4'].s = estiloEncabezado
      wsProveedores['C4'].s = estiloEncabezado
      wsProveedores['D4'].s = estiloEncabezado

      if (reportData.top_suppliers && reportData.top_suppliers.length > 0) {
        const provStartRow = 5
        const provEndRow = provStartRow + reportData.top_suppliers.length - 1
        
        for (let i = provStartRow; i <= provEndRow; i++) {
          if (wsProveedores[`A${i}`]) wsProveedores[`A${i}`].s = estiloDato
          if (wsProveedores[`B${i}`]) wsProveedores[`B${i}`].s = estiloTexto
          if (wsProveedores[`C${i}`]) wsProveedores[`C${i}`].s = estiloDato
          if (wsProveedores[`D${i}`]) wsProveedores[`D${i}`].s = estiloMoneda
        }

        const provTotalRow = provEndRow + 2
        if (wsProveedores[`B${provTotalRow}`]) wsProveedores[`B${provTotalRow}`].s = estiloTotal
        if (wsProveedores[`C${provTotalRow}`]) wsProveedores[`C${provTotalRow}`].s = estiloTotal
        if (wsProveedores[`D${provTotalRow}`]) {
          wsProveedores[`D${provTotalRow}`].s = { ...estiloTotal, numFmt: "$#,##0.00" }
        }
      }

      wsProveedores['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }
      ]

      wsProveedores['!cols'] = [{ wch: 12 }, { wch: 35 }, { wch: 20 }, { wch: 20 }]
      wsProveedores['!rows'] = [{ hpt: 25 }, { hpt: 18 }]

      // ==================== HOJA 4: TENDENCIA MENSUAL ====================
      const tendenciaData = [
        ['TENDENCIA DE GASTOS - ÚLTIMOS 6 MESES'],
        [`Generado: ${new Date().toLocaleDateString('es-ES')}`],
        [],
        ['Mes', 'Año', 'Total Gastado']
      ]

      if (reportData.monthly_trends && reportData.monthly_trends.length > 0) {
        reportData.monthly_trends.forEach(trend => {
          tendenciaData.push([
            trend.month,
            trend.year,
            parseFloat(trend.total)
          ])
        })
      } else {
        tendenciaData.push(['No hay datos disponibles', '', ''])
      }

      const wsTendencia = XLSX.utils.aoa_to_sheet(tendenciaData)

      // Aplicar estilos a Tendencia
      wsTendencia['A1'].s = estiloTitulo
      wsTendencia['A2'].s = estiloSubtitulo
      wsTendencia['A4'].s = estiloEncabezado
      wsTendencia['B4'].s = estiloEncabezado
      wsTendencia['C4'].s = estiloEncabezado

      if (reportData.monthly_trends && reportData.monthly_trends.length > 0) {
        for (let i = 5; i < 5 + reportData.monthly_trends.length; i++) {
          if (wsTendencia[`A${i}`]) wsTendencia[`A${i}`].s = estiloTexto
          if (wsTendencia[`B${i}`]) wsTendencia[`B${i}`].s = estiloDato
          if (wsTendencia[`C${i}`]) wsTendencia[`C${i}`].s = estiloMoneda
        }
      }

      wsTendencia['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } }
      ]

      wsTendencia['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 20 }]
      wsTendencia['!rows'] = [{ hpt: 25 }, { hpt: 18 }]

      // ==================== AGREGAR HOJAS AL WORKBOOK ====================
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen General')
      XLSX.utils.book_append_sheet(wb, wsCategorias, 'Gastos por Categoría')
      XLSX.utils.book_append_sheet(wb, wsProveedores, 'Top Proveedores')
      XLSX.utils.book_append_sheet(wb, wsTendencia, 'Tendencia Mensual')

      // ==================== EXPORTAR ARCHIVO ====================
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], { type: 'application/octet-stream' })
      saveAs(blob, `Reporte_SerGas_${selectedMonth}_${selectedYear}.xlsx`)

      console.log('✅ Excel con estilos exportado exitosamente')
    } catch (error) {
      console.error('❌ Error exportando Excel:', error)
      alert('Error al exportar el archivo Excel')
    }
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
          {/* Toggle entre Mensual y Rango de Fechas */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            marginBottom: '20px',
            justifyContent: 'center'
          }}>
            <SerGasButton
              onClick={() => setFilterType('monthly')}
              variant={filterType === 'monthly' ? 'primary' : 'outline'}
              size="small"
            >
              📅 Mensual
            </SerGasButton>
            <SerGasButton
              onClick={() => setFilterType('daterange')}
              variant={filterType === 'daterange' ? 'primary' : 'outline'}
              size="small"
            >
              📆 Rango de Fechas
            </SerGasButton>
          </div>

{/* Selector de Tipo de Fecha */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            marginBottom: '20px',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <span style={{ 
              fontSize: '14px', 
              fontWeight: '600', 
              color: sergasStyles.colors.gray 
            }}>
              Filtrar por:
            </span>
            <SerGasButton
              onClick={() => setDateType('emission')}
              variant={dateType === 'emission' ? 'secondary' : 'ghost'}
              size="small"
            >
              🧾 Fecha de Emisión
            </SerGasButton>
            <SerGasButton
              onClick={() => setDateType('payment')}
              variant={dateType === 'payment' ? 'secondary' : 'ghost'}
              size="small"
            >
              💰 Fecha de Pago
            </SerGasButton>
          </div>

          {/* Filtros según el tipo seleccionado */}
          {filterType === 'monthly' ? (
            // FILTRO MENSUAL (ACTUAL)
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
          ) : (
            // FILTRO POR RANGO DE FECHAS
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: sergasStyles.colors.dark,
                  fontSize: '14px'
                }}>
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
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
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: sergasStyles.colors.dark,
                  fontSize: '14px'
                }}>
                  Fecha Fin
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
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
                />
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
                  disabled={loading || !startDate || !endDate}
                >
                  🔄 Actualizar
                </SerGasButton>
              </div>
            </div>
          )}
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
                {/* Total del Período */}
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
                    {filterType === 'monthly' ? 'TOTAL DEL MES' : 'TOTAL DEL PERÍODO'}
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
                  {filterType === 'monthly' 
                    ? `${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`
                    : reportData.period
                  }
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
                    {filterType === 'monthly' ? 'VS MES ANTERIOR' : 'VS PERÍODO ANTERIOR'}
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
                  {filterType === 'monthly' ? 'Mes anterior:' : 'Período anterior:'} ${parseFloat(reportData.previous_month_total || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </div>
                    </div>
                  )}
                  </div>
                </div>

            {/* SECCIÓN DE GRÁFICOS */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
              gap: '24px',
              marginBottom: '24px'
            }}>
              
              {/* Gráfico de Torta - Gastos por Categoría */}
              <div style={{
                background: sergasStyles.colors.white,
                borderRadius: '12px',
                padding: '24px',
                boxShadow: sergasStyles.shadows.card,
                border: `1px solid ${sergasStyles.colors.primary}20`
              }}>
                <h3 style={{ 
                  color: sergasStyles.colors.dark, 
                  marginBottom: '20px',
                  fontSize: '18px',
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  📊 Distribución por Categoría
                </h3>
                  {reportData.categories.length > 0 ? (
                  <div style={{ maxWidth: '320px', margin: '0 auto' }}>
                    <Doughnut
                    data={{
                      labels: reportData.categories.map(cat => cat.expense_category || 'Sin categoría'),
                      datasets: [{
                        data: reportData.categories.map(cat => {
                          const total = cat.dataValues?.total || cat.total || 0;
                          return parseFloat(total);
                        }),
                        backgroundColor: [
                          '#FFC107',
                          '#FF8C00',
                          '#E53E3E',
                          '#22C55E',
                          '#3B82F6',
                          '#8B5CF6',
                          '#EC4899',
                          '#F59E0B'
                        ],
                        borderWidth: 2,
                        borderColor: '#fff'
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: {
                            padding: 15,
                            font: { size: 12 }
                          }
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              const value = context.parsed;
                              const total = context.dataset.data.reduce((a, b) => a + b, 0);
                              const percentage = ((value / total) * 100).toFixed(1);
                              return `${context.label}: $${value.toLocaleString('es-ES', { minimumFractionDigits: 2 })} (${percentage}%)`;
                            }
                          }
                        }
                      }
                    }}
                  />
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: sergasStyles.colors.gray }}>
                    <p>No hay datos para mostrar</p>
                  </div>
                )}
              </div>

              {/* Gráfico de Dona - Estado de Facturas */}
              <div style={{
                background: sergasStyles.colors.white,
                borderRadius: '12px',
                padding: '24px',
                boxShadow: sergasStyles.shadows.card,
                border: `1px solid ${sergasStyles.colors.primary}20`
              }}>
                <h3 style={{ 
                  color: sergasStyles.colors.dark, 
                  marginBottom: '20px',
                  fontSize: '18px',
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  💰 Estado de Facturas
                </h3>
                {reportData.invoice_status && reportData.total_invoices > 0 ? (
                  <div>
                    <div style={{ maxWidth: '300px', margin: '0 auto' }}>
                      <Doughnut
                        data={{
                          labels: ['Pagadas', 'Pendientes'],
                          datasets: [{
                            data: [
                              reportData.invoice_status.paid.total || 0,
                              reportData.invoice_status.pending.total || 0
                            ],
                            backgroundColor: ['#22C55E', '#F59E0B'],
                            borderWidth: 2,
                            borderColor: '#fff'
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: true,
                          aspectRatio: 1.2,
                          plugins: {
                            legend: {
                              position: 'bottom',
                              labels: {
                                padding: 15,
                                font: { size: 12 }
                              }
                            },
                            tooltip: {
                              callbacks: {
                                label: function(context) {
                                  const value = context.parsed;
                                  const count = context.dataIndex === 0 
                                    ? reportData.invoice_status.paid.count 
                                    : reportData.invoice_status.pending.count;
                                  return `${context.label}: $${value.toLocaleString('es-ES', { minimumFractionDigits: 2 })} (${count} facturas)`;
                                }
                              }
                            }
                          }
                        }}
                      />
                    </div>
                    <div style={{ 
                      marginTop: '20px', 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr', 
                      gap: '12px',
                      textAlign: 'center'
                    }}>
                      <div style={{ padding: '12px', background: '#22C55E15', borderRadius: '8px' }}>
                        <div style={{ fontSize: '12px', color: sergasStyles.colors.gray, marginBottom: '4px' }}>Pagadas</div>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: '#22C55E' }}>
                          {reportData.invoice_status.paid.count || 0}
                        </div>
                        <div style={{ fontSize: '12px', color: sergasStyles.colors.gray, marginTop: '4px' }}>
                          ${(reportData.invoice_status.paid.total || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div style={{ padding: '12px', background: '#F59E0B15', borderRadius: '8px' }}>
                        <div style={{ fontSize: '12px', color: sergasStyles.colors.gray, marginBottom: '4px' }}>Pendientes</div>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: '#F59E0B' }}>
                          {reportData.invoice_status.pending.count || 0}
                        </div>
                        <div style={{ fontSize: '12px', color: sergasStyles.colors.gray, marginTop: '4px' }}>
                          ${(reportData.invoice_status.pending.total || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: sergasStyles.colors.gray }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📊</div>
                    <p>No hay facturas en este período</p>
                  </div>
                )}
              </div>
            </div>

            {/* Gráfico de Línea - Tendencia de 6 meses (Ancho completo) */}
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
                fontSize: '20px',
                fontWeight: '700'
              }}>
                📈 {filterType === 'monthly' ? 'Tendencia de Gastos - Últimos 6 Meses' : 'Tendencia Histórica - Últimos 6 Meses'}
              </h3>
              {reportData.monthly_trends && reportData.monthly_trends.length > 0 ? (
                <Line
                  data={{
                    labels: reportData.monthly_trends.map(m => `${m.month} ${m.year}`),
                    datasets: [{
                      label: 'Gastos Mensuales',
                      data: reportData.monthly_trends.map(m => m.total),
                      borderColor: '#FFC107',
                      backgroundColor: 'rgba(255, 193, 7, 0.1)',
                      tension: 0.4,
                      fill: true,
                      pointRadius: 5,
                      pointHoverRadius: 7,
                      pointBackgroundColor: '#FFC107',
                      pointBorderColor: '#fff',
                      pointBorderWidth: 2
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: 4,
                    plugins: {
                      legend: {
                        display: false
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            return `Gastos: $${context.parsed.y.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`;
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: function(value) {
                            return '$' + value.toLocaleString('es-ES');
                          }
                        }
                      }
                    }
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: sergasStyles.colors.gray }}>
                  <p>No hay datos suficientes para mostrar la tendencia</p>
                </div>
              )}
            </div>

            {/* Top 5 Proveedores */}
            {reportData.top_suppliers && reportData.top_suppliers.length > 0 && (
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
                  fontSize: '20px',
                  fontWeight: '700'
                }}>
                  🏆 {filterType === 'monthly' ? 'Top 5 Proveedores del Mes' : 'Top 5 Proveedores del Período'}
                </h3>
                <Bar
                  data={{
                    labels: reportData.top_suppliers.map(s => s.name),
                    datasets: [{
                      label: 'Total Gastado',
                      data: reportData.top_suppliers.map(s => s.total),
                      backgroundColor: [
                        '#FFC107',
                        '#FF8C00',
                        '#E53E3E',
                        '#F59E0B',
                        '#EF4444'
                      ],
                      borderRadius: 8
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: 4,
                    indexAxis: 'x',
                    plugins: {
                      legend: {
                        display: false
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const supplier = reportData.top_suppliers[context.dataIndex];
                            return [
                              `Total: $${context.parsed.y.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`,
                              `Facturas: ${supplier.count}`
                            ];
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: function(value) {
                            return '$' + value.toLocaleString('es-ES');
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            )}

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

        {/* COMPARADOR DE CATEGORÍAS */}
            <div style={{
              background: sergasStyles.colors.white,
              borderRadius: '12px',
              padding: '32px',
              boxShadow: sergasStyles.shadows.card,
              border: `1px solid ${sergasStyles.colors.primary}20`,
              marginBottom: '24px'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '24px'
              }}>
                <h3 style={{ 
                  color: sergasStyles.colors.dark, 
                  fontSize: '20px',
                  fontWeight: '700',
                  margin: 0
                }}>
                  🔄 Comparador de Categorías
                </h3>
                <SerGasButton
                  onClick={() => setShowComparator(!showComparator)}
                  variant="outline"
                  size="small"
                >
                  {showComparator ? '▲ Ocultar' : '▼ Mostrar'}
                </SerGasButton>
              </div>

              {showComparator && (
                <div>
                  {/* Selector de Categoría */}
                  <div style={{ 
                    background: sergasStyles.colors.lightGray,
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '20px'
                  }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '600',
                      color: sergasStyles.colors.dark
                    }}>
                      Seleccionar Categoría
                    </label>
                    <select
                      value={compareCategory}
                      onChange={(e) => setCompareCategory(e.target.value)}
                      style={{
                        padding: '12px 16px',
                        border: `2px solid ${sergasStyles.colors.primary}40`,
                        borderRadius: '8px',
                        fontSize: '16px',
                        backgroundColor: sergasStyles.colors.white,
                        color: sergasStyles.colors.dark,
                        width: '100%',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">-- Seleccione una categoría --</option>
                      {getUniqueCategories().map((cat, idx) => (
                        <option key={idx} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Selectores de Períodos */}
                  <div style={{ 
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                    gap: '20px',
                    marginBottom: '20px'
                  }}>
                    {/* Período 1 */}
                    <div style={{
                      background: sergasStyles.colors.lightGray,
                      padding: '20px',
                      borderRadius: '8px'
                    }}>
                      <h4 style={{ 
                        margin: '0 0 16px 0',
                        color: sergasStyles.colors.dark,
                        fontSize: '16px',
                        fontWeight: '600'
                      }}>
                        📅 Período 1
                      </h4>
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ 
                            display: 'block', 
                            marginBottom: '6px', 
                            fontSize: '14px',
                            color: sergasStyles.colors.gray
                          }}>
                            Desde
                          </label>
                          <input
                            type="date"
                            value={p1Start}
                            onChange={(e) => setP1Start(e.target.value)}
                            style={{
                              padding: '10px',
                              border: `2px solid ${sergasStyles.colors.primary}40`,
                              borderRadius: '8px',
                              fontSize: '14px',
                              width: '100%'
                            }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ 
                            display: 'block', 
                            marginBottom: '6px', 
                            fontSize: '14px',
                            color: sergasStyles.colors.gray
                          }}>
                            Hasta
                          </label>
                          <input
                            type="date"
                            value={p1End}
                            onChange={(e) => setP1End(e.target.value)}
                            style={{
                              padding: '10px',
                              border: `2px solid ${sergasStyles.colors.primary}40`,
                              borderRadius: '8px',
                              fontSize: '14px',
                              width: '100%'
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Período 2 */}
                    <div style={{
                      background: sergasStyles.colors.lightGray,
                      padding: '20px',
                      borderRadius: '8px'
                    }}>
                      <h4 style={{ 
                        margin: '0 0 16px 0',
                        color: sergasStyles.colors.dark,
                        fontSize: '16px',
                        fontWeight: '600'
                      }}>
                        📅 Período 2
                      </h4>
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ 
                            display: 'block', 
                            marginBottom: '6px', 
                            fontSize: '14px',
                            color: sergasStyles.colors.gray
                          }}>
                            Desde
                          </label>
                          <input
                            type="date"
                            value={p2Start}
                            onChange={(e) => setP2Start(e.target.value)}
                            style={{
                              padding: '10px',
                              border: `2px solid ${sergasStyles.colors.primary}40`,
                              borderRadius: '8px',
                              fontSize: '14px',
                              width: '100%'
                            }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ 
                            display: 'block', 
                            marginBottom: '6px', 
                            fontSize: '14px',
                            color: sergasStyles.colors.gray
                          }}>
                            Hasta
                          </label>
                          <input
                            type="date"
                            value={p2End}
                            onChange={(e) => setP2End(e.target.value)}
                            style={{
                              padding: '10px',
                              border: `2px solid ${sergasStyles.colors.primary}40`,
                              borderRadius: '8px',
                              fontSize: '14px',
                              width: '100%'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Botón Comparar */}
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <SerGasButton
                      onClick={compareCategories}
                      variant="primary"
                      size="large"
                      disabled={comparisonLoading || !compareCategory || !p1Start || !p1End || !p2Start || !p2End}
                    >
                      {comparisonLoading ? '⏳ Comparando...' : '🔍 Comparar Períodos'}
                    </SerGasButton>
                  </div>

                  {/* Resultados de la Comparación */}
                  {comparisonData && (
                    <div style={{
                      background: `linear-gradient(135deg, ${sergasStyles.colors.lightGray} 0%, ${sergasStyles.colors.white} 100%)`,
                      padding: '24px',
                      borderRadius: '12px',
                      border: `2px solid ${sergasStyles.colors.primary}40`
                    }}>
                      <h4 style={{ 
                        margin: '0 0 20px 0',
                        color: sergasStyles.colors.dark,
                        fontSize: '18px',
                        fontWeight: '600',
                        textAlign: 'center'
                      }}>
                        Resultados: {comparisonData.category}
                      </h4>

                      {/* Gráfico Comparativo */}
                      <div style={{ marginBottom: '24px', maxWidth: '600px', margin: '0 auto 24px' }}>
                        <Bar
                          data={{
                            labels: [comparisonData.period1.label, comparisonData.period2.label],
                            datasets: [{
                              label: 'Total Gastado',
                              data: [comparisonData.period1.total, comparisonData.period2.total],
                              backgroundColor: ['#FFC107', '#FF8C00'],
                              borderRadius: 8
                            }]
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: true,
                            aspectRatio: 2,
                            plugins: {
                              legend: { display: false },
                              tooltip: {
                                callbacks: {
                                  label: function(context) {
                                    return `Total: $${context.parsed.y.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`;
                                  }
                                }
                              }
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                ticks: {
                                  callback: function(value) {
                                    return '$' + value.toLocaleString('es-ES');
                                  }
                                }
                              }
                            }
                          }}
                        />
                      </div>

                      {/* Tabla Comparativa */}
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ 
                          width: '100%', 
                          borderCollapse: 'collapse',
                          background: sergasStyles.colors.white,
                          borderRadius: '8px',
                          overflow: 'hidden'
                        }}>
                          <thead>
                            <tr style={{ background: sergasStyles.gradients.primary }}>
                              <th style={{ padding: '12px', textAlign: 'left', color: sergasStyles.colors.dark, fontWeight: '600' }}>Métrica</th>
                              <th style={{ padding: '12px', textAlign: 'right', color: sergasStyles.colors.dark, fontWeight: '600' }}>Período 1</th>
                              <th style={{ padding: '12px', textAlign: 'right', color: sergasStyles.colors.dark, fontWeight: '600' }}>Período 2</th>
                              <th style={{ padding: '12px', textAlign: 'right', color: sergasStyles.colors.dark, fontWeight: '600' }}>Diferencia</th>
                              <th style={{ padding: '12px', textAlign: 'right', color: sergasStyles.colors.dark, fontWeight: '600' }}>Variación</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ borderBottom: `1px solid ${sergasStyles.colors.lightGray}` }}>
                              <td style={{ padding: '12px', fontWeight: '600' }}>Total</td>
                              <td style={{ padding: '12px', textAlign: 'right' }}>${comparisonData.period1.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                              <td style={{ padding: '12px', textAlign: 'right' }}>${comparisonData.period2.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                              <td style={{ 
                                padding: '12px', 
                                textAlign: 'right',
                                color: comparisonData.comparison.total_difference >= 0 ? sergasStyles.colors.error : sergasStyles.colors.success,
                                fontWeight: '600'
                              }}>
                                {comparisonData.comparison.total_difference >= 0 ? '+' : ''}${comparisonData.comparison.total_difference.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                              </td>
                              <td style={{ 
                                padding: '12px', 
                                textAlign: 'right',
                                color: comparisonData.comparison.total_percentage >= 0 ? sergasStyles.colors.error : sergasStyles.colors.success,
                                fontWeight: '600'
                              }}>
                                {comparisonData.comparison.total_percentage >= 0 ? '+' : ''}{comparisonData.comparison.total_percentage}%
                              </td>
                            </tr>
                            <tr style={{ borderBottom: `1px solid ${sergasStyles.colors.lightGray}` }}>
                              <td style={{ padding: '12px', fontWeight: '600' }}>Cantidad</td>
                              <td style={{ padding: '12px', textAlign: 'right' }}>{comparisonData.period1.count} facturas</td>
                              <td style={{ padding: '12px', textAlign: 'right' }}>{comparisonData.period2.count} facturas</td>
                              <td style={{ 
                                padding: '12px', 
                                textAlign: 'right',
                                color: comparisonData.comparison.count_difference >= 0 ? sergasStyles.colors.error : sergasStyles.colors.success,
                                fontWeight: '600'
                              }}>
                                {comparisonData.comparison.count_difference >= 0 ? '+' : ''}{comparisonData.comparison.count_difference}
                              </td>
                              <td style={{ 
                                padding: '12px', 
                                textAlign: 'right',
                                color: comparisonData.comparison.count_percentage >= 0 ? sergasStyles.colors.error : sergasStyles.colors.success,
                                fontWeight: '600'
                              }}>
                                {comparisonData.comparison.count_percentage >= 0 ? '+' : ''}{comparisonData.comparison.count_percentage}%
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
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
