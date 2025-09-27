import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Invoices({ onBack }) {
  const { token, user } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [availableSubcategories, setAvailableSubcategories] = useState([])
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null)
  const [paymentFile, setPaymentFile] = useState(null)
  const [originalInvoiceFile, setOriginalInvoiceFile] = useState(null)
  const [errorTimeout, setErrorTimeout] = useState(null)

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

  // Categorías con subcategorías
  const categories = {
    'Insumos': ['Gas envasado', 'Materiales de trabajo', 'Herramientas', 'Repuestos'],
    'Servicios': ['Electricidad', 'Gas natural', 'Agua', 'Telefono/Internet', 'Limpieza'],
    'Mantenimiento': ['Reparaciones', 'Mantenimiento preventivo', 'Servicio técnico'],
    'Equipamiento': ['Maquinaria', 'Vehículos', 'Equipos de oficina', 'Tecnología'],
    'Administración': ['Contable', 'Legal', 'Seguros', 'Impuestos', 'Papelería'],
    'Otros': ['Varios', 'Extraordinarios']
  }

  const [formData, setFormData] = useState({
    supplier_id: '',
    invoice_type: '',
    punto_venta: '',
    numero_factura: '',
    invoice_date: '',
    due_date: '',
    load_date: new Date().toISOString().split('T')[0],
    payment_type: 'cuenta_corriente',
    tax_details: [],
    no_gravado: '',
    expense_category: '',
    expense_subcategory: '',
    notes: ''
  })

  // Tipos de impuestos disponibles
  const taxTypes = [
    { id: 'iva_21', label: 'IVA 21%', rate: 0.21 },
    { id: 'iva_27', label: 'IVA 27%', rate: 0.27 },
    { id: 'iva_105', label: 'IVA 10,5%', rate: 0.105 },
    { id: 'perc_iva', label: 'Percepción IVA 3%', rate: 0.03 },
    { id: 'perc_iibb', label: 'Percepción IIBB 1,75%', rate: 0.0175 }
  ]

  const [selectedSupplier, setSelectedSupplier] = useState(null)

  useEffect(() => {
    if (token) {
      loadInvoices()
      loadSuppliers()
    }

    // Prevenir cambios con rueda del mouse en inputs numéricos
    const handleWheelOnNumberInputs = (e) => {
      if (e.target.type === 'number') {
        e.preventDefault()
      }
    }

    document.addEventListener('wheel', handleWheelOnNumberInputs, { passive: false })

    return () => {
      document.removeEventListener('wheel', handleWheelOnNumberInputs)
    }
  }, [token])

  const loadInvoices = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('http://localhost:3001/api/invoices', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        console.log('Facturas recibidas:', data.data.invoices);
        setInvoices(data.data.invoices)
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

  const loadSuppliers = async () => {
    try {
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
      }
    } catch (error) {
      console.error('Error cargando proveedores:', error)
    }
  }

  const calculateTotal = () => {
    const taxesTotal = formData.tax_details.reduce((sum, tax) => sum + parseFloat(tax.amount || 0), 0)
    const noGravado = parseFloat(formData.no_gravado) || 0
    const subtotalTotal = formData.tax_details.reduce((sum, tax) => sum + parseFloat(tax.subtotal || 0), 0)
    
    return (subtotalTotal + taxesTotal + noGravado).toFixed(2)
  }

  const addTaxDetail = (taxType) => {
    const newTaxDetail = {
      id: Date.now(),
      type: taxType.id,
      label: taxType.label,
      rate: taxType.rate,
      subtotal: '',
      amount: ''
    }
    
    setFormData(prev => ({
      ...prev,
      tax_details: [...prev.tax_details, newTaxDetail]
    }))
  }

  const removeTaxDetail = (id) => {
    setFormData(prev => ({
      ...prev,
      tax_details: prev.tax_details.filter(tax => tax.id !== id)
    }))
  }

  const updateTaxSubtotal = (id, subtotal) => {
    setFormData(prev => ({
      ...prev,
      tax_details: prev.tax_details.map(tax => {
        if (tax.id === id) {
          const calculatedAmount = subtotal ? (parseFloat(subtotal) * tax.rate).toFixed(2) : ''
          return { ...tax, subtotal, amount: calculatedAmount }
        }
        return tax
      })
    }))
  }

  const updateTaxAmount = (id, amount) => {
    setFormData(prev => ({
      ...prev,
      tax_details: prev.tax_details.map(tax => 
        tax.id === id ? { ...tax, amount } : tax
      )
    }))
  }

  // Validación de fechas
  const validateDates = () => {
    if (formData.invoice_date && formData.due_date) {
      const emissionDate = new Date(formData.invoice_date)
      const dueDate = new Date(formData.due_date)
      
      if (dueDate < emissionDate) {
        return 'La fecha de vencimiento no puede ser anterior a la fecha de emisión'
      }
    }
    return null
  }

  // Validación de facturas duplicadas
  const validateDuplicateInvoice = () => {
    if (!editingInvoice && formData.supplier_id && formData.punto_venta && formData.numero_factura) {
      const fullInvoiceNumber = `${formData.invoice_type}-${formData.punto_venta.padStart(4, '0')}-${formData.numero_factura.padStart(8, '0')}`
      
      const duplicateInvoice = invoices.find(invoice => 
        invoice.supplier_id === parseInt(formData.supplier_id) && 
        invoice.invoice_number === fullInvoiceNumber
      )
      
      if (duplicateInvoice) {
        return `Ya existe una factura ${fullInvoiceNumber} para este proveedor`
      }
    }
    return null
  }

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      invoice_type: 'A',
      punto_venta: '',
      numero_factura: '',
      invoice_date: '',
      due_date: '',
      payment_type: 'contado',
      tax_details: [],
      no_gravado: '',
      expense_category: '',
      expense_subcategory: '',
      notes: '',
      load_date: new Date().toISOString().split('T')[0],
    })
    
    setEditingInvoice(null)
    setError('')
    setSelectedSupplier(null)
    setOriginalInvoiceFile(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validar fechas
    const dateError = validateDates()
    if (dateError) {
      setError(dateError)
      return
    }

    // Validar facturas duplicadas
    const duplicateError = validateDuplicateInvoice()
    if (duplicateError) {
      setError(duplicateError)
      return
    }

    if (!formData.supplier_id || !formData.punto_venta || !formData.numero_factura || !formData.invoice_date || !formData.expense_category) {
      setError('Complete los campos obligatorios: Proveedor, Punto de Venta, Número, Fecha de Emisión y Categoría')
      return
    }

    // Validar que al menos haya un impuesto con subtotal o no_gravado
    const hasTaxes = formData.tax_details.some(tax => parseFloat(tax.subtotal) > 0)
    const hasNoGravado = parseFloat(formData.no_gravado) > 0
    
    if (!hasTaxes && !hasNoGravado) {
      setError('Debe ingresar al menos un subtotal para impuestos o un monto en "No Gravado"')
      return
    }

    try {
      setLoading(true)
      
      // Combinar punto de venta y número para el número de factura completo
      const fullInvoiceNumber = `${formData.invoice_type}-${formData.punto_venta.padStart(4, '0')}-${formData.numero_factura.padStart(8, '0')}`
      
      // Convertir tax_details a campos individuales para el backend
      const taxMapping = {
        'iva_21': 0,
        'iva_27': 0,
        'iva_105': 0,
        'perc_iva': 0,
        'perc_iibb': 0
      }

      // Mapear los tax_details a los campos que espera el backend
      formData.tax_details.forEach(tax => {
        const amount = parseFloat(tax.amount) || 0
        if (tax.type === 'iva_21') taxMapping.iva_21 = amount
        if (tax.type === 'iva_27') taxMapping.iva_27 = amount
        if (tax.type === 'iva_105') taxMapping.iva_105 = amount
        if (tax.type === 'perc_iva') taxMapping.perc_iva = amount
        if (tax.type === 'perc_iibb') taxMapping.perc_iibb = amount
      })

      // Calcular subtotal total (suma de todos los subtotales de impuestos)
      const subtotalTotal = formData.tax_details.reduce((sum, tax) => {
        return sum + (parseFloat(tax.subtotal) || 0)
      }, 0)

      // Crear FormData en lugar de objeto JSON
      const formDataToSend = new FormData()
      
      // Agregar todos los campos de datos como strings
      formDataToSend.append('supplier_id', formData.supplier_id)
      formDataToSend.append('invoice_number', fullInvoiceNumber)
      formDataToSend.append('invoice_date', formData.invoice_date)
      formDataToSend.append('due_date', formData.due_date || '')
      formDataToSend.append('payment_type', formData.payment_type)
      formDataToSend.append('subtotal', subtotalTotal)
      formDataToSend.append('iva_21', taxMapping.iva_21)
      formDataToSend.append('iva_27', taxMapping.iva_27)
      formDataToSend.append('iva_105', taxMapping.iva_105)
      formDataToSend.append('perc_iva', taxMapping.perc_iva)
      formDataToSend.append('perc_iibb', taxMapping.perc_iibb)
      formDataToSend.append('otros_impuestos', parseFloat(formData.no_gravado) || 0)
      formDataToSend.append('expense_category', formData.expense_category)
      formDataToSend.append('expense_subcategory', formData.expense_subcategory || '')
      formDataToSend.append('notes', formData.notes || '')
      formDataToSend.append('load_date', new Date().toISOString().split('T')[0])

      
      // Agregar archivo original si existe
      if (originalInvoiceFile) {
        formDataToSend.append('original_invoice', originalInvoiceFile)
      }
      
      const url = editingInvoice 
        ? `http://localhost:3001/api/invoices/${editingInvoice.id}`
        : 'http://localhost:3001/api/invoices'
      
      const method = editingInvoice ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      })

      const data = await response.json()

      if (data.success) {
        await loadInvoices()
        resetForm()
        setShowForm(false)
      } else {
        setError(data.message || 'Error al cargar factura')
      }
    } catch (error) {
      setError(`Error de conexión: ${error.message}`)
      console.error('Error:', error)
    } finally {
      setLoading(false)    
    }
  }

  const handleMarkAsPaid = async (invoice) => {
    if (!user || user.role !== 'admin') {
      setError('Solo los administradores pueden marcar facturas como pagadas')
      return
    }

    setSelectedInvoiceForPayment(invoice)
    setShowPaymentModal(true)
  }

  const confirmPayment = async () => {
    if (!selectedInvoiceForPayment) return

    try {
      setLoading(true)
      
      const formData = new FormData()
      formData.append('admin_notes', 'Marcada como pagada desde el sistema')
      
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
        await loadInvoices()
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

  const handleDownloadInvoiceReport = async (invoice) => {
    try {
      setLoading(true);
      
      const response = await fetch(`http://localhost:3001/api/invoices/${invoice.id}/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al generar el PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `reporte_factura_${invoice.invoice_number.replace(/[\/\\:*?"<>|]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Error al descargar PDF:', error);
      setError(`Error al generar el PDF: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const showTemporaryError = (message, duration = 10000) => {
  // Limpiar timeout anterior si existe
  if (errorTimeout) {
    clearTimeout(errorTimeout);
  }
  
  setError(message);
  
  const timeout = setTimeout(() => {
    setError('');
    setErrorTimeout(null);
  }, duration);
  
  setErrorTimeout(timeout);
};

const closeError = () => {
  setError('');
  if (errorTimeout) {
    clearTimeout(errorTimeout);
    setErrorTimeout(null);
  }
};

const handleViewOriginalInvoice = async (invoice) => {
  try {
    setLoading(true);
    
    // Hacer una petición HEAD para verificar si el archivo existe
    const response = await fetch(`http://localhost:3001/api/invoices/original-file/${invoice.original_invoice}`, {
      method: 'HEAD',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      // Si el archivo existe, abrirlo
      window.open(`http://localhost:3001/api/invoices/original-file/${invoice.original_invoice}`, '_blank');
    } else {
      // Si el archivo no existe, mostrar mensaje de error temporal
      showTemporaryError('No hay ningún archivo de la factura original cargado');
    }
  } catch (error) {
    console.error('Error al verificar archivo original:', error);
    showTemporaryError('Error al acceder al archivo original. No hay ningún archivo de la factura original cargado');
  } finally {
    setLoading(false);
  }
};

  const handleEdit = (invoice) => {
    if (invoice.is_paid && user.role !== 'admin') {
      setError('No se puede editar una factura que ya está pagada')
      return
    }

    const invoiceParts = invoice.invoice_number.split('-')
    const puntoVenta = invoiceParts[1] || ''
    const numeroFactura = invoiceParts[2] || ''

    const reconstructedTaxDetails = []
    let nextId = Date.now()

    if (invoice.iva_21 > 0) {
      reconstructedTaxDetails.push({
        id: nextId++,
        type: 'iva_21',
        label: 'IVA 21%',
        rate: 0.21,
        subtotal: (invoice.iva_21 / 0.21).toFixed(2),
        amount: invoice.iva_21.toString()
      })
    }

    if (invoice.iva_27 > 0) {
      reconstructedTaxDetails.push({
        id: nextId++,
        type: 'iva_27',
        label: 'IVA 27%',
        rate: 0.27,
        subtotal: (invoice.iva_27 / 0.27).toFixed(2),
        amount: invoice.iva_27.toString()
      })
    }

    if (invoice.iva_105 > 0) {
      reconstructedTaxDetails.push({
        id: nextId++,
        type: 'iva_105',
        label: 'IVA 10,5%',
        rate: 0.105,
        subtotal: (invoice.iva_105 / 0.105).toFixed(2),
        amount: invoice.iva_105.toString()
      })
    }

    if (invoice.perc_iva > 0) {
      reconstructedTaxDetails.push({
        id: nextId++,
        type: 'perc_iva',
        label: 'Percepción IVA 3%',
        rate: 0.03,
        subtotal: (invoice.perc_iva / 0.03).toFixed(2),
        amount: invoice.perc_iva.toString()
      })
    }

    if (invoice.perc_iibb > 0) {
      reconstructedTaxDetails.push({
        id: nextId++,
        type: 'perc_iibb',
        label: 'Percepción IIBB 1,75%',
        rate: 0.0175,
        subtotal: (invoice.perc_iibb / 0.0175).toFixed(2),
        amount: invoice.perc_iibb.toString()
      })
    }

    setEditingInvoice(invoice)
    setFormData({
      supplier_id: invoice.supplier_id,
      invoice_type: invoiceParts[0] || '',
      punto_venta: puntoVenta.replace(/^0+/, '') || puntoVenta,
      numero_factura: numeroFactura.replace(/^0+/, '') || numeroFactura,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date || '',
      load_date: invoice.load_date || new Date().toISOString().split('T')[0],
      payment_type: invoice.payment_type,
      tax_details: reconstructedTaxDetails,
      no_gravado: invoice.otros_impuestos || '',
      expense_category: invoice.expense_category,
      expense_subcategory: invoice.expense_subcategory || '',
      notes: invoice.notes || ''
    })
    
    const supplier = suppliers.find(s => s.id === invoice.supplier_id)
    setSelectedSupplier(supplier)
    
    if (invoice.expense_category && categories[invoice.expense_category]) {
      setAvailableSubcategories(categories[invoice.expense_category])
    }
    
    setShowForm(true)
  }

  const handleSupplierChange = (e) => {
    const supplierId = e.target.value
    setFormData({...formData, supplier_id: supplierId})
    
    const supplier = suppliers.find(s => s.id === parseInt(supplierId))
    setSelectedSupplier(supplier)
    
    if (supplier) {
      let invoiceType = ''
      if (supplier.category === 'responsable_inscripto') {
        invoiceType = 'A'
      } else if (supplier.category === 'monotributista' || supplier.category === 'iva_exento') {
        invoiceType = 'B'
      }
      setFormData(prev => ({...prev, supplier_id: supplierId, invoice_type: invoiceType}))
    }
  }

  const getAvailableInvoiceTypes = () => {
    if (!selectedSupplier) return ['A', 'B', 'C']
    
    if (selectedSupplier.category === 'responsable_inscripto') {
      return ['A', 'B']
    } else {
      return ['B', 'C']
    }
  }

  const handleCategoryChange = (e) => {
    const category = e.target.value
    setFormData({...formData, expense_category: category, expense_subcategory: ''})
    
    if (categories[category]) {
      setAvailableSubcategories(categories[category])
    } else {
      setAvailableSubcategories([])
    }
  }

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.supplier.business_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'paid' && invoice.is_paid) ||
                         (statusFilter === 'pending' && !invoice.is_paid)
    
    return matchesSearch && matchesStatus
  })

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
    const isPaidInvoiceEdit = editingInvoice && editingInvoice.is_paid && user.role === 'admin'
    
    return (
      <div style={{ 
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${sergasStyles.colors.lightGray} 0%, ${sergasStyles.colors.white} 100%)`,
        padding: '20px'
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
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
                {isPaidInvoiceEdit ? 'Gestión de Comprobante' : 
                 editingInvoice ? 'Editar Factura' : 'Nueva Factura'}
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
              onClick={() => {
                setError('');
                if (errorTimeout) {
                  clearTimeout(errorTimeout);
                  setErrorTimeout(null);
                }
              }}
              style={{
                background: `${sergasStyles.colors.error}20`,
                border: `1px solid ${sergasStyles.colors.error}40`,
                color: sergasStyles.colors.error,
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '4px',
                minWidth: '24px',
                height: '24px'
              }}
              title="Cerrar mensaje"
            >
              ×
            </button>
          </div>
        )}

            {/* Alerta especial para admin editando factura pagada */}
            {isPaidInvoiceEdit && (
              <div style={{
                background: `linear-gradient(135deg, ${sergasStyles.colors.primary}15 0%, ${sergasStyles.colors.secondary}15 100%)`,
                border: `2px solid ${sergasStyles.colors.primary}`,
                color: sergasStyles.colors.dark,
                padding: '20px 24px',
                borderRadius: '12px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span style={{ fontSize: '24px' }}>📋</span>
                <div>
                  <strong style={{ color: sergasStyles.colors.dark }}>Modo de visualización:</strong> Esta factura ya está pagada. Solo puede gestionar el comprobante de pago. 
                  Los datos de la factura no son editables para mantener la integridad contable.
                </div>
              </div>
            )}

            {/* Formulario de comprobante para facturas pagadas */}
            {isPaidInvoiceEdit ? (
              <div>
                {/* Resumen de la factura (solo lectura) */}
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
                    fontSize: '20px',
                    fontWeight: '600'
                  }}>
                    Información de la Factura
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ color: sergasStyles.colors.gray }}>
                      <strong style={{ color: sergasStyles.colors.dark }}>Número:</strong> {editingInvoice.invoice_number}
                    </div>
                    <div style={{ color: sergasStyles.colors.gray }}>
                      <strong style={{ color: sergasStyles.colors.dark }}>Proveedor:</strong> {editingInvoice.supplier?.business_name}
                    </div>
                    <div style={{ color: sergasStyles.colors.gray }}>
                      <strong style={{ color: sergasStyles.colors.dark }}>Fecha de Emisión:</strong> {new Date(editingInvoice.invoice_date).toLocaleDateString('es-ES')}
                    </div>
                    <div style={{ color: sergasStyles.colors.gray }}>
                      <strong style={{ color: sergasStyles.colors.dark }}>Total:</strong> 
                      <span style={{ 
                        color: sergasStyles.colors.success, 
                        fontWeight: 'bold',
                        fontSize: '18px',
                        marginLeft: '8px'
                      }}>
                        ${parseFloat(editingInvoice.total_amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div style={{ color: sergasStyles.colors.gray }}>
                      <strong style={{ color: sergasStyles.colors.dark }}>Estado:</strong> 
                      <span style={{ 
                        color: sergasStyles.colors.success, 
                        fontWeight: 'bold',
                        marginLeft: '8px'
                      }}>
                        PAGADA
                      </span>
                    </div>
                    <div style={{ color: sergasStyles.colors.gray }}>
                      <strong style={{ color: sergasStyles.colors.dark }}>Fecha de Pago:</strong> {editingInvoice.paid_date ? new Date(editingInvoice.paid_date).toLocaleDateString('es-ES') : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Sección de comprobante */}
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ 
                    color: sergasStyles.colors.dark, 
                    marginBottom: '20px',
                    fontSize: '20px',
                    fontWeight: '600'
                  }}>
                    Gestión de Comprobante de Pago
                  </h3>
                  
                  {editingInvoice.payment_proof && (
                    <div style={{
                      background: `linear-gradient(135deg, ${sergasStyles.colors.success}15 0%, ${sergasStyles.colors.success}25 100%)`,
                      padding: '20px',
                      borderRadius: '12px',
                      marginBottom: '20px',
                      border: `1px solid ${sergasStyles.colors.success}40`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '20px' }}>📎</span>
                        <strong style={{ color: sergasStyles.colors.dark }}>Comprobante actual:</strong>
                      </div>
                      <div style={{ fontSize: '14px', color: sergasStyles.colors.gray, marginBottom: '12px' }}>
                        Archivo: {editingInvoice.payment_proof}
                      </div>
                      <SerGasButton
                        variant="accent"
                        onClick={() => window.open(`http://localhost:3001/api/invoices/payment-file/${editingInvoice.payment_proof}`, '_blank')}
                      >
                        Ver Comprobante Actual
                      </SerGasButton>
                    </div>
                  )}

                  {!editingInvoice.payment_proof && (
                    <div style={{
                      background: `linear-gradient(135deg, ${sergasStyles.colors.warning}15 0%, ${sergasStyles.colors.warning}25 100%)`,
                      padding: '20px',
                      borderRadius: '12px',
                      marginBottom: '20px',
                      color: sergasStyles.colors.dark,
                      border: `1px solid ${sergasStyles.colors.warning}40`
                    }}>
                      No hay comprobante de pago cargado para esta factura.
                    </div>
                  )}

                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '12px', 
                      fontWeight: '600',
                      color: sergasStyles.colors.dark,
                      fontSize: '16px'
                    }}>
                      {editingInvoice.payment_proof ? 'Reemplazar Comprobante:' : 'Cargar Comprobante:'}
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
                        📎 Nuevo archivo seleccionado: {paymentFile.name}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  {paymentFile && (
                    <SerGasButton
                      variant="primary"
                      size="large"
                      onClick={async () => {
                        try {
                          setLoading(true)
                          
                          const formDataUpload = new FormData()
                          formDataUpload.append('payment_file', paymentFile)
                          
                          const response = await fetch(`http://localhost:3001/api/invoices/${editingInvoice.id}/payment-file`, {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${token}`
                            },
                            body: formDataUpload
                          })
                          
                          const data = await response.json()
                          
                          if (data.success) {
                            await loadInvoices()
                            setShowForm(false)
                            setPaymentFile(null)
                            resetForm()
                          } else {
                            setError(data.message || 'Error al cargar comprobante')
                          }
                        } catch (error) {
                          setError(`Error de conexión: ${error.message}`)
                        } finally {
                          setLoading(false)
                        }
                      }}
                      disabled={loading}
                    >
                      {loading ? 'Cargando...' : (editingInvoice.payment_file ? 'Actualizar Comprobante' : 'Cargar Comprobante')}
                    </SerGasButton>
                  )}
                  
                  <SerGasButton
                    variant="ghost"
                    size="large"
                    onClick={() => {
                      setShowForm(false)
                      setPaymentFile(null)
                      resetForm()
                    }}
                  >
                    Volver
                  </SerGasButton>
                </div>
              </div>
            ) : (
            
            // Formulario normal para facturas no pagadas o nuevas
            <form onSubmit={handleSubmit}>
              
              <style>{`
                input[type="number"]::-webkit-outer-spin-button,
                input[type="number"]::-webkit-inner-spin-button {
                  -webkit-appearance: none;
                  margin: 0;
                }
                
                input[type="number"] {
                  -moz-appearance: textfield;
                }
                
                input[style*="appearance: textfield"] {
                  -webkit-appearance: textfield;
                }
              `}</style>

              {/* Sección Proveedor */}
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
                  Información del Proveedor
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '600',
                      color: sergasStyles.colors.dark 
                    }}>
                      Proveedor *
                    </label>
                    <select
                      value={formData.supplier_id}
                      onChange={handleSupplierChange}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: `2px solid ${sergasStyles.colors.primary}40`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: sergasStyles.colors.white,
                        color: sergasStyles.colors.dark
                      }}
                      required
                    >
                      <option value="">Seleccionar proveedor</option>
                      {suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.business_name} - {supplier.cuit}
                        </option>
                      ))}
                    </select>
                    {selectedSupplier && (
                      <small style={{ color: sergasStyles.colors.gray, fontSize: '12px' }}>
                        Categoría: {selectedSupplier.category}
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
                      Tipo de Factura *
                    </label>
                    <select
                      value={formData.invoice_type}
                      onChange={(e) => setFormData({...formData, invoice_type: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: `2px solid ${sergasStyles.colors.primary}40`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: sergasStyles.colors.white,
                        color: sergasStyles.colors.dark
                      }}
                      required
                    >
                      <option value="">Seleccionar</option>
                      {getAvailableInvoiceTypes().map(type => (
                        <option key={type} value={type}>Factura {type}</option>
                      ))}
                    </select>
                    {selectedSupplier && selectedSupplier.category !== 'responsable_inscripto' && (
                      <small style={{ color: sergasStyles.colors.warning, fontSize: '12px' }}>
                        {selectedSupplier.category === 'monotributista' ? 'Monotributista' : 'IVA Exento'} - No puede emitir Factura A
                      </small>
                    )}
                  </div>
                </div>
              </div>

              {/* Número de factura */}
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
                  Número de Factura
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '600',
                      color: sergasStyles.colors.dark 
                    }}>
                      Punto de Venta *
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formData.punto_venta}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                        setFormData({...formData, punto_venta: value})
                      }}
                      placeholder="0001"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: `2px solid ${sergasStyles.colors.primary}40`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: sergasStyles.colors.white,
                        appearance: 'textfield'
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '600',
                      color: sergasStyles.colors.dark 
                    }}>
                      Número de Factura *
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formData.numero_factura}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 8)
                        setFormData({...formData, numero_factura: value})
                      }}
                      placeholder="00000123"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: `2px solid ${sergasStyles.colors.primary}40`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: sergasStyles.colors.white,
                        appearance: 'textfield'
                      }}
                      required
                    />
                  </div>
                </div>

                {/* Vista previa del número completo */}
                {formData.invoice_type && formData.punto_venta && formData.numero_factura && (
                  <div style={{
                    background: sergasStyles.gradients.primary,
                    padding: '16px 20px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: `2px solid ${sergasStyles.colors.primary}`
                  }}>
                    <strong style={{ 
                      fontSize: '18px',
                      color: sergasStyles.colors.dark
                    }}>
                      Número de Factura: {formData.invoice_type}-{formData.punto_venta.padStart(4, '0')}-{formData.numero_factura.padStart(8, '0')}
                    </strong>
                  </div>
                )}
              </div>

              {/* Fechas y Pago */}
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
                  Fechas y Forma de Pago
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '600',
                      color: sergasStyles.colors.dark 
                    }}>
                      Fecha de Emisión *
                    </label>
                    <input
                      type="date"
                      value={formData.invoice_date}
                      onChange={(e) => {
                        setFormData({...formData, invoice_date: e.target.value})
                        setError('')
                      }}
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

                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '600',
                      color: sergasStyles.colors.dark 
                    }}>
                      Fecha de Vencimiento
                    </label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => {
                        setFormData({...formData, due_date: e.target.value})
                        setError('')
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: `2px solid ${sergasStyles.colors.primary}40`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: sergasStyles.colors.white
                      }}
                    />
                    {formData.invoice_date && formData.due_date && new Date(formData.due_date) < new Date(formData.invoice_date) && (
                      <small style={{ color: sergasStyles.colors.error, fontSize: '12px' }}>
                        ⚠️ El vencimiento no puede ser anterior a la emisión
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
                      Fecha de Carga
                    </label>
                    <input
                      type="date"
                      value={formData.load_date}
                      disabled
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: `2px solid ${sergasStyles.colors.primary}20`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: sergasStyles.colors.lightGray,
                        color: sergasStyles.colors.gray
                      }}
                    />
                    <small style={{ color: sergasStyles.colors.gray, fontSize: '12px' }}>
                      (Automática - No editable)
                    </small>
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '600',
                      color: sergasStyles.colors.dark 
                    }}>
                      Tipo de Pago *
                    </label>
                    <select
                      value={formData.payment_type}
                      onChange={(e) => setFormData({...formData, payment_type: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: `2px solid ${sergasStyles.colors.primary}40`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: sergasStyles.colors.white
                      }}
                    >
                      <option value="cuenta_corriente">Cuenta Corriente</option>
                      <option value="contado">Contado</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Importes Fiscales */}
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
                  Importes Fiscales
                </h3>
                
                {/* Selector de impuestos */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '12px', 
                    fontWeight: '600',
                    color: sergasStyles.colors.dark 
                  }}>
                    Agregar Impuestos y Percepciones:
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {taxTypes
                      .filter(taxType => !formData.tax_details.some(tax => tax.type === taxType.id))
                      .map(taxType => (
                      <SerGasButton
                        key={taxType.id}
                        variant="outline"
                        size="small"
                        onClick={() => addTaxDetail(taxType)}
                      >
                        + {taxType.label}
                      </SerGasButton>
                    ))}
                  </div>
                </div>

                {/* Lista de impuestos con subtotales individuales */}
                {formData.tax_details.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ color: sergasStyles.colors.dark, marginBottom: '12px' }}>Impuestos Aplicados:</h4>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {formData.tax_details.map(tax => (
                        <div key={tax.id} style={{
                          padding: '16px',
                          background: `linear-gradient(135deg, ${sergasStyles.colors.primary}10 0%, ${sergasStyles.colors.secondary}10 100%)`,
                          borderRadius: '8px',
                          border: `1px solid ${sergasStyles.colors.primary}30`
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ fontWeight: '600', color: sergasStyles.colors.dark }}>{tax.label}</span>
                            <SerGasButton
                              variant="error"
                              size="small"
                              onClick={() => removeTaxDetail(tax.id)}
                            >
                              ×
                            </SerGasButton>
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'end' }}>
                            <div>
                              <label style={{ 
                                display: 'block', 
                                marginBottom: '6px', 
                                fontSize: '12px', 
                                color: sergasStyles.colors.gray,
                                fontWeight: '500'
                              }}>
                                Subtotal para este impuesto:
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={tax.subtotal}
                                onChange={(e) => updateTaxSubtotal(tax.id, e.target.value)}
                                onWheel={(e) => e.preventDefault()}
                                placeholder="0.00"
                                style={{
                                  width: '100%',
                                  padding: '10px 12px',
                                  border: `2px solid ${sergasStyles.colors.primary}40`,
                                  borderRadius: '6px',
                                  fontSize: '14px'
                                }}
                              />
                            </div>
                            
                            <div>
                              <label style={{ 
                                display: 'block', 
                                marginBottom: '6px', 
                                fontSize: '12px', 
                                color: sergasStyles.colors.gray,
                                fontWeight: '500'
                              }}>
                                Impuesto calculado ({(tax.rate * 100).toFixed(2)}%):
                              </label>
                              <input
                                  type="number"
                                  step="0.01"
                                  value={tax.amount}
                                  onChange={(e) => updateTaxAmount(tax.id, e.target.value)}
                                  onWheel={(e) => e.preventDefault()}
                                  style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: `2px solid ${sergasStyles.colors.primary}40`,
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    backgroundColor: tax.subtotal ? sergasStyles.colors.lightGray : sergasStyles.colors.white
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Gravado */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '600',
                    color: sergasStyles.colors.dark 
                  }}>
                    No Gravado
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.no_gravado}
                    onChange={(e) => setFormData({...formData, no_gravado: e.target.value})}
                    onWheel={(e) => e.preventDefault()}
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: `2px solid ${sergasStyles.colors.primary}40`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: sergasStyles.colors.white
                    }}
                  />
                  <small style={{ color: sergasStyles.colors.gray, fontSize: '12px' }}>
                    Importes que no están sujetos a impuestos
                  </small>
                  
                  {/* Alerta para facturas B y C */}
                  {selectedSupplier && 
                   (selectedSupplier.category === 'monotributista' || selectedSupplier.category === 'iva_exento') && 
                   (formData.invoice_type === 'B' || formData.invoice_type === 'C') && (
                    <div style={{
                      background: `linear-gradient(135deg, ${sergasStyles.colors.warning}15 0%, ${sergasStyles.colors.warning}25 100%)`,
                      border: `1px solid ${sergasStyles.colors.warning}`,
                      color: sergasStyles.colors.dark,
                      padding: '12px 16px',
                      borderRadius: '8px',
                      marginTop: '12px',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{ fontSize: '16px' }}>💡</span>
                      <div>
                        <strong>Sugerencia:</strong> Las facturas tipo {formData.invoice_type} de {selectedSupplier.category === 'monotributista' ? 'Monotributistas' : 'IVA Exentos'} 
                        generalmente no incluyen IVA ni percepciones. El importe total suele cargarse completo en "No Gravado".
                      </div>
                    </div>
                  )}
                </div>

                {/* Total calculado */}
                <div style={{
                  background: sergasStyles.gradients.primary,
                  padding: '20px 24px',
                  borderRadius: '12px',
                  textAlign: 'center',
                  border: `2px solid ${sergasStyles.colors.primary}`,
                  boxShadow: sergasStyles.shadows.card
                }}>
                  <strong style={{ 
                    fontSize: '24px', 
                    color: sergasStyles.colors.dark,
                    textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}>
                    Total: ${calculateTotal()}
                  </strong>
                </div>
              </div>

              {/* Categorización del gasto */}
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
                  Categorización del Gasto
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '600',
                      color: sergasStyles.colors.dark 
                    }}>
                      Categoría *
                    </label>
                    <select
                      value={formData.expense_category}
                      onChange={handleCategoryChange}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: `2px solid ${sergasStyles.colors.primary}40`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: sergasStyles.colors.white
                      }}
                      required
                    >
                      <option value="">Seleccionar categoría</option>
                      {Object.keys(categories).map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '600',
                      color: sergasStyles.colors.dark 
                    }}>
                      Subcategoría
                    </label>
                    <select
                      value={formData.expense_subcategory}
                      onChange={(e) => setFormData({...formData, expense_subcategory: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: `2px solid ${sergasStyles.colors.primary}40`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: sergasStyles.colors.white,
                        opacity: !formData.expense_category ? 0.6 : 1
                      }}
                      disabled={!formData.expense_category}
                    >
                      <option value="">Seleccionar subcategoría</option>
                      {availableSubcategories.map(subcategory => (
                        <option key={subcategory} value={subcategory}>{subcategory}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
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
                    onChange={(e) => setFormData({...formData, notes: e.target.value.slice(0, 250)})}
                    placeholder="Observaciones adicionales"
                    rows="3"
                    maxLength="250"
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
                    color: formData.notes.length > 230 ? sergasStyles.colors.error : sergasStyles.colors.gray,
                    marginTop: '6px'
                  }}>
                    {formData.notes.length}/250 caracteres
                  </div>
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '600',
                    color: sergasStyles.colors.dark 
                  }}>
                    Factura Original (PDF) - Opcional
                  </label>
                  <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          if (file.type !== 'application/pdf') {
                            setError('Solo se permiten archivos PDF para la factura original');
                            e.target.value = '';
                            return;
                          }
                          if (file.size > 10 * 1024 * 1024) {
                            setError('El archivo no puede superar los 10MB');
                            e.target.value = '';
                            return;
                          }
                          setError('');
                          setOriginalInvoiceFile(file);
                        }
                      }}
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
                    Suba aquí el PDF escaneado de la factura original (solo PDF, máximo 10MB)
                  </small>
                  
                  {originalInvoiceFile && (
                    <div style={{
                      marginTop: '12px',
                      padding: '12px 16px',
                      background: `linear-gradient(135deg, ${sergasStyles.colors.success}15 0%, ${sergasStyles.colors.success}25 100%)`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: sergasStyles.colors.dark,
                      border: `1px solid ${sergasStyles.colors.success}40`
                    }}>
                      📄 Archivo seleccionado: {originalInvoiceFile.name}
                    </div>
                  )}
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
                  {loading ? 'Cargando...' : (editingInvoice ? 'Actualizar' : 'Cargar')} Factura
                </SerGasButton>
              </div>
            </form>
            )}
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
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
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
                  Gestión de Facturas
                </h2>
                <p style={{ 
                  margin: '4px 0 0 0', 
                  color: sergasStyles.colors.dark,
                  fontSize: '16px',
                  opacity: 0.8
                }}>
                  Sistema integral de control de comprobantes
                </p>
              </div>
            </div>

            <SerGasButton
              onClick={() => setShowForm(true)}
              variant="secondary"
              size="large"
              style={{ boxShadow: sergasStyles.shadows.button }}
            >
              + Nueva Factura
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
                placeholder="Buscar por número de factura o proveedor..."
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

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '12px 16px',
                border: `2px solid ${sergasStyles.colors.primary}40`,
                borderRadius: '8px',
                fontSize: '16px',
                backgroundColor: sergasStyles.colors.white,
                color: sergasStyles.colors.dark,
                minWidth: '200px'
              }}
            >
              <option value="all">Todas las facturas</option>
              <option value="pending">Pendientes</option>
              <option value="paid">Pagadas</option>
            </select>
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
      onClick={() => {
        setError('');
        if (errorTimeout) {
          clearTimeout(errorTimeout);
          setErrorTimeout(null);
        }
      }}
      style={{
        background: 'none',
        border: 'none',
        color: sergasStyles.colors.error,
        fontSize: '24px',
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
            <p style={{ color: sergasStyles.colors.gray, fontSize: '18px' }}>Cargando facturas...</p>
          </div>
        ) : (
          <div style={{
            background: sergasStyles.colors.white,
            borderRadius: '12px',
            boxShadow: sergasStyles.shadows.card,
            overflow: 'hidden',
            border: `1px solid ${sergasStyles.colors.primary}20`
          }}>
            {filteredInvoices.length === 0 ? (
              <div style={{ 
                padding: '60px', 
                textAlign: 'center', 
                color: sergasStyles.colors.gray
              }}>
                <div style={{ fontSize: '48px', marginBottom: '20px', opacity: 0.5 }}>📄</div>
                <h3 style={{ color: sergasStyles.colors.dark, marginBottom: '10px' }}>
                  {invoices.length === 0 ? 'No hay facturas cargadas' : 'No se encontraron facturas'}
                </h3>
                <p>
                  {invoices.length === 0 
                    ? 'Comience cargando su primera factura usando el botón "Nueva Factura"'
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
                        Número
                      </th>
                      <th style={{ 
                        padding: '20px 16px', 
                        textAlign: 'left', 
                        borderBottom: `2px solid ${sergasStyles.colors.primary}`,
                        color: sergasStyles.colors.dark,
                        fontWeight: '600',
                        fontSize: '14px'
                      }}>
                        Proveedor
                      </th>
                      <th style={{ 
                        padding: '20px 16px', 
                        textAlign: 'left', 
                        borderBottom: `2px solid ${sergasStyles.colors.primary}`,
                        color: sergasStyles.colors.dark,
                        fontWeight: '600',
                        fontSize: '14px'
                      }}>
                        Fechas
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
                        textAlign: 'right', 
                        borderBottom: `2px solid ${sergasStyles.colors.primary}`,
                        color: sergasStyles.colors.dark,
                        fontWeight: '600',
                        fontSize: '14px'
                      }}>
                        Total
                      </th>
                      <th style={{ 
                        padding: '20px 16px', 
                        textAlign: 'center', 
                        borderBottom: `2px solid ${sergasStyles.colors.primary}`,
                        color: sergasStyles.colors.dark,
                        fontWeight: '600',
                        fontSize: '14px'
                      }}>
                        Estado
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
                    {filteredInvoices.map((invoice, index) => (
                      <tr key={invoice.id} style={{ 
                        borderBottom: `1px solid ${sergasStyles.colors.primary}20`,
                        backgroundColor: index % 2 === 0 ? sergasStyles.colors.white : `${sergasStyles.colors.lightGray}50`,
                        transition: 'background-color 0.2s ease'
                      }}>
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontWeight: '600', color: sergasStyles.colors.dark, marginBottom: '4px' }}>
                            {invoice.invoice_number}
                          </div>
                          <div style={{ 
                            fontSize: '12px', 
                            color: sergasStyles.colors.gray,
                            padding: '2px 8px',
                            backgroundColor: sergasStyles.colors.primary,
                            borderRadius: '4px',
                            display: 'inline-block'
                          }}>
                            {invoice.payment_type}
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontWeight: '600', color: sergasStyles.colors.dark, marginBottom: '4px' }}>
                            {invoice.supplier.business_name}
                          </div>
                          <div style={{ fontSize: '12px', color: sergasStyles.colors.gray }}>
                            CUIT: {invoice.supplier.cuit}
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ fontSize: '12px', color: sergasStyles.colors.gray, marginBottom: '2px' }}>
                            Emisión: {new Date(invoice.invoice_date).toLocaleDateString('es-ES')}
                          </div>
                          {invoice.due_date && (
                            <div style={{ fontSize: '12px', color: sergasStyles.colors.gray, marginBottom: '2px' }}>
                              Vto: {new Date(invoice.due_date).toLocaleDateString('es-ES')}
                            </div>
                          )}
                          <div style={{ fontSize: '12px', color: sergasStyles.colors.gray }}>
                            Carga: {invoice.load_date ? new Date(invoice.load_date).toLocaleDateString('es-ES') : 'N/A'}
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ color: sergasStyles.colors.dark, fontWeight: '500' }}>
                            {invoice.expense_category}
                          </div>
                          {invoice.expense_subcategory && (
                            <div style={{ fontSize: '12px', color: sergasStyles.colors.gray }}>
                              {invoice.expense_subcategory}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <span style={{ 
                            fontWeight: '700', 
                            fontSize: '16px',
                            color: sergasStyles.colors.dark 
                          }}>
                            ${parseFloat(invoice.total_amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <span style={{
                            backgroundColor: invoice.is_paid ? sergasStyles.colors.success : sergasStyles.colors.warning,
                            color: sergasStyles.colors.white,
                            padding: '6px 12px',
                            borderRadius: '16px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {invoice.is_paid ? 'Pagada' : 'Pendiente'}
                          </span>
                          
                          {invoice.is_paid && invoice.paid_date && (
                            <div style={{
                              fontSize: '10px',
                              color: sergasStyles.colors.gray,
                              marginTop: '6px'
                            }}>
                              {new Date(invoice.paid_date).toLocaleDateString('es-ES')}
                            </div>
                          )}
                        </td>                    
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {/* Botón Editar */}
                            {(!invoice.is_paid || user.role === 'admin') && (
                              <SerGasButton
                                onClick={() => handleEdit(invoice)}
                                disabled={!invoice.is_paid && user.role !== 'admin' && user.id !== invoice.created_by}
                                variant={invoice.is_paid ? "warning" : "accent"}
                                size="small"
                                style={{
                                  opacity: (!invoice.is_paid && user.role !== 'admin' && user.id !== invoice.created_by) ? 0.5 : 1
                                }}
                              >
                                {invoice.is_paid ? 'Gestionar' : 'Editar'}
                              </SerGasButton>
                            )}
                            
                            {/* Botón Marcar Pagada */}
                            {user.role === 'admin' && !invoice.is_paid && (
                              <SerGasButton
                                onClick={() => handleMarkAsPaid(invoice)}
                                variant="success"
                                size="small"
                              >
                                Marcar Pagada
                              </SerGasButton>
                            )}

                            {/* Botón Ver Original */}
                              {invoice.original_invoice && (
                                <SerGasButton
                                  onClick={() => handleViewOriginalInvoice(invoice)}
                                  variant="secondary"
                                  size="small"
                                  disabled={loading}
                                >
                                  📄 Original
                                </SerGasButton>
                              )}
                                                          
                            {/* Botón Descargar PDF para facturas pagadas */}
                            {invoice.is_paid && (
                              <SerGasButton
                                onClick={() => handleDownloadInvoiceReport(invoice)}
                                variant="outline"
                                size="small"
                              >
                                📄 Descargar PDF
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

        {/* Modal para comprobante de pago */}
        {showPaymentModal && (
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
              
              {selectedInvoiceForPayment && (
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
                    <strong style={{ color: sergasStyles.colors.dark }}>Proveedor:</strong> {selectedInvoiceForPayment.supplier.business_name}
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
              )}

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
                  variant="success"
                  size="large"
                >
                  {loading ? 'Procesando...' : 'Confirmar Pago'}
                </SerGasButton>
              </div>
            </div>
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
    </div>
  )
}