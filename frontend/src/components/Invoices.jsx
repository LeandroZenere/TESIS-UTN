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
    tax_details: [], // Array de objetos {id, type, label, rate, subtotal, amount}
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
      
      const dataToSend = {
        ...formData,
        invoice_number: fullInvoiceNumber,
        otros_impuestos: formData.no_gravado
      }
      
      const url = editingInvoice 
        ? `http://localhost:3001/api/invoices/${editingInvoice.id}`
        : 'http://localhost:3001/api/invoices'
      
      const method = editingInvoice ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dataToSend)
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
    
    // Usar la nueva ruta del backend que incluye el comprobante embebido
    const response = await fetch(`http://localhost:3001/api/invoices/${invoice.id}/report`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al generar el reporte');
    }

    // Obtener el contenido HTML del reporte
    const htmlContent = await response.text();
    
    // Crear y descargar el archivo HTML
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `reporte_completo_${invoice.invoice_number.replace(/[\/\\:*?"<>|]/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    console.log('Reporte descargado exitosamente');
    
  } catch (error) {
    console.error('Error al descargar reporte:', error);
    setError(`Error al generar el reporte: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

  const handleEdit = (invoice) => {
    // Solo restringir edición para usuarios comunes en facturas pagadas
    if (invoice.is_paid && user.role !== 'admin') {
      setError('No se puede editar una factura que ya está pagada')
      return
    }

    // Separar el número de factura en sus componentes
    const invoiceParts = invoice.invoice_number.split('-')
    const puntoVenta = invoiceParts[1] || ''
    const numeroFactura = invoiceParts[2] || ''

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
      tax_details: [], // Se podría cargar desde el backend si está disponible
      no_gravado: invoice.otros_impuestos,
      expense_category: invoice.expense_category,
      expense_subcategory: invoice.expense_subcategory || '',
      notes: invoice.notes || ''
    })
    
    const supplier = suppliers.find(s => s.id === invoice.supplier_id)
    setSelectedSupplier(supplier)
    
    // Cargar subcategorías
    if (invoice.expense_category && categories[invoice.expense_category]) {
      setAvailableSubcategories(categories[invoice.expense_category])
    }
    
    setShowForm(true)
  }

  const resetForm = () => {
    setFormData({
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
    setEditingInvoice(null)
    setSelectedSupplier(null)
    setAvailableSubcategories([])
    setError('')
  }

  const handleSupplierChange = (e) => {
    const supplierId = e.target.value
    setFormData({...formData, supplier_id: supplierId})
    
    const supplier = suppliers.find(s => s.id === parseInt(supplierId))
    setSelectedSupplier(supplier)
    
    // Determinar tipo de factura automáticamente
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

  if (showForm) {
    // Verificar si es una factura pagada siendo editada por admin
    const isPaidInvoiceEdit = editingInvoice && editingInvoice.is_paid && user.role === 'admin'
    
    return (
      <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => {
              setShowForm(false)
              resetForm()
            }}
            style={{
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            ← Volver
          </button>
          <h2 style={{ margin: 0, color: '#333' }}>
            {isPaidInvoiceEdit ? 'Ver Factura Pagada - Gestionar Comprobante' : 
             editingInvoice ? 'Editar Factura' : 'Cargar Nueva Factura'}
          </h2>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            color: '#c33',
            padding: '10px',
            borderRadius: '5px',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        {/* Alerta especial para admin editando factura pagada */}
        {isPaidInvoiceEdit && (
          <div style={{
            backgroundColor: '#e3f2fd',
            border: '1px solid #90caf9',
            color: '#1565c0',
            padding: '15px',
            borderRadius: '5px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '20px' }}>📎</span>
            <div>
              <strong>Modo de visualización:</strong> Esta factura ya está pagada. Solo puede gestionar el comprobante de pago. 
              Los datos de la factura no son editables para mantener la integridad contable.
            </div>
          </div>
        )}

        {/* Formulario de comprobante para facturas pagadas */}
        {isPaidInvoiceEdit ? (
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            {/* Resumen de la factura (solo lectura) */}
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '30px'
            }}>
              <h3 style={{ color: '#333', marginBottom: '15px' }}>Información de la Factura</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div><strong>Número:</strong> {editingInvoice.invoice_number}</div>
                <div><strong>Proveedor:</strong> {editingInvoice.supplier?.business_name}</div>
                <div><strong>Fecha de Emisión:</strong> {new Date(editingInvoice.invoice_date).toLocaleDateString('es-ES')}</div>
                <div><strong>Total:</strong> ${parseFloat(editingInvoice.total_amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
                <div><strong>Estado:</strong> <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>PAGADA</span></div>
                <div><strong>Fecha de Pago:</strong> {editingInvoice.paid_date ? new Date(editingInvoice.paid_date).toLocaleDateString('es-ES') : 'N/A'}</div>
              </div>
            </div>

            {/* Sección de comprobante */}
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ color: '#333', marginBottom: '15px' }}>Gestión de Comprobante de Pago</h3>
              
              {editingInvoice.payment_proof && (
                <div style={{
                  backgroundColor: '#e8f5e8',
                  padding: '15px',
                  borderRadius: '5px',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '16px' }}>📎</span>
                    <strong>Comprobante actual:</strong>
                  </div>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                    Archivo: {editingInvoice.payment_proof}
                  </div>
                  <button
                    onClick={() => window.open(`http://localhost:3001/api/invoices/payment-file/${editingInvoice.payment_proof}`, '_blank')}
                    style={{
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Ver Comprobante Actual
                  </button>
                </div>
              )}

              {!editingInvoice.payment_proof && (
                <div style={{
                  backgroundColor: '#fff3cd',
                  padding: '15px',
                  borderRadius: '5px',
                  marginBottom: '20px',
                  color: '#856404'
                }}>
                  No hay comprobante de pago cargado para esta factura.
                </div>
              )}

              <div>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                  {editingInvoice.payment_proof ? 'Reemplazar Comprobante:' : 'Cargar Comprobante:'}
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setPaymentFile(e.target.files[0])}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '5px'
                  }}
                />
                <small style={{ color: '#666', fontSize: '12px' }}>
                  Formatos aceptados: PDF, JPG, PNG
                </small>
                
                {paymentFile && (
                  <div style={{
                    marginTop: '10px',
                    padding: '10px',
                    backgroundColor: '#e8f5e8',
                    borderRadius: '5px',
                    fontSize: '14px'
                  }}>
                    📎 Nuevo archivo seleccionado: {paymentFile.name}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              {paymentFile && (
                <button
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
                  style={{
                    backgroundColor: loading ? '#999' : '#4CAF50',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '5px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '16px'
                  }}
                >
                  {loading ? 'Cargando...' : (editingInvoice.payment_file ? 'Actualizar Comprobante' : 'Cargar Comprobante')}
                </button>
              )}
              
              <button
                onClick={() => {
                  setShowForm(false)
                  setPaymentFile(null)
                  resetForm()
                }}
                style={{
                  backgroundColor: '#666',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Volver
              </button>
            </div>
          </div>
        ) : (
        
        // Formulario normal para facturas no pagadas o nuevas
        <form onSubmit={handleSubmit} style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          
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

          {/* Proveedor y tipo de factura */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Proveedor *
              </label>
              <select
                value={formData.supplier_id}
                onChange={handleSupplierChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px'
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
                <small style={{ color: '#666', fontSize: '12px' }}>
                  Categoría: {selectedSupplier.category}
                </small>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Tipo de Factura *
              </label>
              <select
                value={formData.invoice_type}
                onChange={(e) => setFormData({...formData, invoice_type: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px'
                }}
                required
              >
                <option value="">Seleccionar</option>
                {getAvailableInvoiceTypes().map(type => (
                  <option key={type} value={type}>Factura {type}</option>
                ))}
              </select>
              {selectedSupplier && selectedSupplier.category !== 'responsable_inscripto' && (
                <small style={{ color: '#f57c00', fontSize: '12px' }}>
                  {selectedSupplier.category === 'monotributista' ? 'Monotributista' : 'IVA Exento'} - No puede emitir Factura A
                </small>
              )}
            </div>
          </div>

          {/* Número de factura dividido */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
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
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  appearance: 'textfield'
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
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
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  appearance: 'textfield'
                }}
                required
              />
            </div>
          </div>

          {/* Vista previa del número completo */}
          {formData.invoice_type && formData.punto_venta && formData.numero_factura && (
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '10px',
              borderRadius: '5px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <strong>Número de Factura: {formData.invoice_type}-{formData.punto_venta.padStart(4, '0')}-{formData.numero_factura.padStart(8, '0')}</strong>
            </div>
          )}

          {/* Fechas - CON VALIDACIÓN */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Fecha de Emisión *
              </label>
              <input
                type="date"
                value={formData.invoice_date}
                onChange={(e) => {
                  setFormData({...formData, invoice_date: e.target.value})
                  setError('') // Limpiar error al cambiar fecha
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px'
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Fecha de Vencimiento
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => {
                  setFormData({...formData, due_date: e.target.value})
                  setError('') // Limpiar error al cambiar fecha
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px'
                }}
              />
              {formData.invoice_date && formData.due_date && new Date(formData.due_date) < new Date(formData.invoice_date) && (
                <small style={{ color: '#f44336', fontSize: '12px' }}>
                  ⚠️ El vencimiento no puede ser anterior a la emisión
                </small>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Fecha de Carga
              </label>
              <input
                type="date"
                value={formData.load_date}
                disabled
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  backgroundColor: '#f5f5f5',
                  color: '#666'
                }}
              />
              <small style={{ color: '#666', fontSize: '12px' }}>
                (Automática - No editable)
              </small>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Tipo de Pago *
              </label>
              <select
                value={formData.payment_type}
                onChange={(e) => setFormData({...formData, payment_type: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px'
                }}
              >
                <option value="cuenta_corriente">Cuenta Corriente</option>
                <option value="contado">Contado</option>
              </select>
            </div>
          </div>

          {/* NUEVA SECCIÓN FISCAL - Cada impuesto con su propio subtotal */}
          <h3 style={{ color: '#333', marginBottom: '15px' }}>Importes Fiscales</h3>
          
          {/* Selector de impuestos */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
              Agregar Impuestos y Percepciones:
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {taxTypes
                .filter(taxType => !formData.tax_details.some(tax => tax.type === taxType.id))
                .map(taxType => (
                <button
                  key={taxType.id}
                  type="button"
                  onClick={() => addTaxDetail(taxType)}
                  style={{
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  + {taxType.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de impuestos con subtotales individuales */}
          {formData.tax_details.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#333', marginBottom: '10px' }}>Impuestos Aplicados:</h4>
              <div style={{ display: 'grid', gap: '15px' }}>
                {formData.tax_details.map(tax => (
                  <div key={tax.id} style={{
                    padding: '15px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontWeight: 'bold', color: '#333' }}>{tax.label}</span>
                      <button
                        type="button"
                        onClick={() => removeTaxDetail(tax.id)}
                        style={{
                          backgroundColor: '#f44336',
                          color: 'white',
                          border: 'none',
                          padding: '5px 8px',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        ×
                      </button>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignItems: 'end' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#666' }}>
                          Subtotal para este impuesto:
                        </label>
                        <input
                          t  type="number"
                            step="0.01"
                            value={tax.subtotal}
                            onChange={(e) => updateTaxSubtotal(tax.id, e.target.value)}
                            onWheel={(e) => e.preventDefault()}
                            placeholder="0.00"
                            style={{
                              width: '100%',
                              padding: '8px',
                              border: '1px solid #ddd',
                              borderRadius: '4px'
                            }}
                        />
                      </div>
                      
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#666' }}>
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
                              padding: '8px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              backgroundColor: tax.subtotal ? '#f0f8ff' : 'white'
                          }}
                        />
                        {tax.subtotal && (
                          <small style={{ color: '#666', fontSize: '11px' }}>
                            Auto: ${(parseFloat(tax.subtotal) * tax.rate).toFixed(2)}
                          </small>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Gravado - Campo independiente */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
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
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '5px'
              }}
            />
            <small style={{ color: '#666', fontSize: '12px' }}>
              Importes que no están sujetos a impuestos
            </small>
            
            {/* Alerta para facturas B y C */}
            {selectedSupplier && 
             (selectedSupplier.category === 'monotributista' || selectedSupplier.category === 'iva_exento') && 
             (formData.invoice_type === 'B' || formData.invoice_type === 'C') && (
              <div style={{
                backgroundColor: '#fff3cd',
                border: '1px solid #ffeaa7',
                color: '#856404',
                padding: '10px',
                borderRadius: '5px',
                marginTop: '10px',
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
            backgroundColor: '#e8f5e8',
            padding: '15px',
            borderRadius: '5px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <strong style={{ fontSize: '18px', color: '#333' }}>
              Total: ${calculateTotal()}
            </strong>
          </div>

          {/* Categorización del gasto */}
          <h3 style={{ color: '#333', marginBottom: '15px' }}>Categorización del Gasto</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Categoría *
              </label>
              <select
                value={formData.expense_category}
                onChange={handleCategoryChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px'
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
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Subcategoría
              </label>
              <select
                value={formData.expense_subcategory}
                onChange={(e) => setFormData({...formData, expense_subcategory: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px'
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

          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
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
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                resize: 'vertical'
              }}
            />
            <div style={{ 
              textAlign: 'right', 
              fontSize: '12px', 
              color: formData.notes.length > 230 ? '#f44336' : '#666',
              marginTop: '5px'
            }}>
              {formData.notes.length}/250 caracteres
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: loading ? '#999' : '#4CAF50',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '5px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '16px'
              }}
            >
              {loading ? 'Cargando...' : (editingInvoice ? 'Actualizar' : 'Cargar')} Factura
            </button>

            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                resetForm()
              }}
              style={{
                backgroundColor: '#666',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onBack}
            style={{
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            ← Volver al Dashboard
          </button>
          <h2 style={{ margin: 0, color: '#333' }}>Gestión de Facturas</h2>
        </div>

        <button
          onClick={() => setShowForm(true)}
          style={{
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          + Cargar Factura
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Buscar por número de factura o proveedor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '300px',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '5px',
            fontSize: '16px'
          }}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '5px',
            fontSize: '16px'
          }}
        >
          <option value="all">Todas las facturas</option>
          <option value="pending">Pendientes</option>
          <option value="paid">Pagadas</option>
        </select>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          color: '#c33',
          padding: '10px',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Cargando facturas...</p>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          {filteredInvoices.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              {invoices.length === 0 ? 'No hay facturas cargadas' : 'No se encontraron facturas con ese criterio'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '15px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Número</th>
                    <th style={{ padding: '15px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Proveedor</th>
                    <th style={{ padding: '15px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Fechas</th>
                    <th style={{ padding: '15px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Categoría</th>
                    <th style={{ padding: '15px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>Total</th>
                    <th style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>Estado</th>
                    <th style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '15px' }}>
                        <div style={{ fontWeight: 'bold' }}>{invoice.invoice_number}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{invoice.payment_type}</div>
                      </td>
                      <td style={{ padding: '15px' }}>
                        <div style={{ fontWeight: 'bold' }}>{invoice.supplier.business_name}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>CUIT: {invoice.supplier.cuit}</div>
                      </td>
                      <td style={{ padding: '15px' }}>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          Emisión: {new Date(invoice.invoice_date).toLocaleDateString('es-ES')}
                        </div>
                        {invoice.due_date && (
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            Vto: {new Date(invoice.due_date).toLocaleDateString('es-ES')}
                          </div>
                        )}
                        <div style={{ fontSize: '12px', color: '#888' }}>
                          Carga: {invoice.load_date ? new Date(invoice.load_date).toLocaleDateString('es-ES') : 'N/A'}
                        </div>
                      </td>
                      <td style={{ padding: '15px' }}>
                        <div>{invoice.expense_category}</div>
                        {invoice.expense_subcategory && (
                          <div style={{ fontSize: '12px', color: '#666' }}>{invoice.expense_subcategory}</div>
                        )}
                      </td>
                      <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold' }}>
                        ${parseFloat(invoice.total_amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <span style={{
                          backgroundColor: invoice.is_paid ? '#e8f5e8' : '#fff3cd',
                          color: invoice.is_paid ? '#2e7d32' : '#856404',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}>
                          {invoice.is_paid ? 'Pagada' : 'Pendiente'}
                        </span>
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          {/* Botón Editar - Para facturas no pagadas o admin */}
                          {(!invoice.is_paid || user.role === 'admin') && (
                            <button
                              onClick={() => handleEdit(invoice)}
                              disabled={!invoice.is_paid && user.role !== 'admin' && user.id !== invoice.created_by}
                              style={{
                                backgroundColor: invoice.is_paid ? '#FF9800' : '#2196F3',
                                color: 'white',
                                border: 'none',
                                padding: '5px 10px',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                opacity: (!invoice.is_paid && user.role !== 'admin' && user.id !== invoice.created_by) ? 0.5 : 1
                              }}
                              title={invoice.is_paid ? 'Editar factura pagada (Solo Admin)' : 'Editar factura'}
                            >
                              {invoice.is_paid ? '⚠️ Editar' : 'Editar'}
                            </button>
                          )}
                          
                          {/* Botón Marcar Pagada - Solo para admin en facturas pendientes */}
                          {user.role === 'admin' && !invoice.is_paid && (
                            <button
                              onClick={() => handleMarkAsPaid(invoice)}
                              style={{
                                backgroundColor: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                padding: '5px 10px',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              Marcar Pagada
                            </button>
                          )}
                          
                          {/* Información y acciones para facturas pagadas */}
                          {invoice.is_paid && (
                            <>
                              <div style={{ 
                                color: '#666', 
                                fontSize: '11px',
                                padding: '5px',
                                textAlign: 'center'
                              }}>
                                Pagada el {invoice.paid_date ? new Date(invoice.paid_date).toLocaleDateString('es-ES') : 'N/A'}
                              </div>
                              
                              {/* Botón Descargar Resumen */}
                              <button
                                onClick={() => handleDownloadInvoiceReport(invoice)}
                                style={{
                                  backgroundColor: '#9C27B0',
                                  color: 'white',
                                  border: 'none',
                                  padding: '5px 10px',
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                                title="Descargar resumen con comprobante"
                              >
                                📄 Descargar
                              </button>
                            </>
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
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '10px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            width: '500px',
            maxWidth: '90vw'
          }}>
            <h3 style={{ color: '#333', marginBottom: '20px' }}>
              Marcar Factura como Pagada
            </h3>
            
            {selectedInvoiceForPayment && (
              <div style={{ 
                backgroundColor: '#f8f9fa',
                padding: '15px',
                borderRadius: '5px',
                marginBottom: '20px'
              }}>
                <p><strong>Factura:</strong> {selectedInvoiceForPayment.invoice_number}</p>
                <p><strong>Proveedor:</strong> {selectedInvoiceForPayment.supplier.business_name}</p>
                <p><strong>Total:</strong> ${parseFloat(selectedInvoiceForPayment.total_amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                Comprobante de Pago (Opcional)
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setPaymentFile(e.target.files[0])}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px'
                }}
              />
              <small style={{ color: '#666', fontSize: '12px' }}>
                Formatos aceptados: PDF, JPG, PNG
              </small>
              
              {paymentFile && (
                <div style={{
                  marginTop: '10px',
                  padding: '10px',
                  backgroundColor: '#e8f5e8',
                  borderRadius: '5px',
                  fontSize: '14px'
                }}>
                  📎 Archivo seleccionado: {paymentFile.name}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowPaymentModal(false)
                  setSelectedInvoiceForPayment(null)
                  setPaymentFile(null)
                }}
                style={{
                  backgroundColor: '#666',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              
              <button
                onClick={confirmPayment}
                disabled={loading}
                style={{
                  backgroundColor: loading ? '#999' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Procesando...' : 'Confirmar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}