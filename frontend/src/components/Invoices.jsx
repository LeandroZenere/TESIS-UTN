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
    subtotal: '',
    tax_details: [], // Array de objetos {type, rate, amount}
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
  const [availableSubcategories, setAvailableSubcategories] = useState([])

  useEffect(() => {
    if (token) {
      loadInvoices()
      loadSuppliers()
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
    const subtotal = parseFloat(formData.subtotal) || 0
    const taxesTotal = formData.tax_details.reduce((sum, tax) => sum + parseFloat(tax.amount || 0), 0)
    const noGravado = parseFloat(formData.no_gravado) || 0
    
    return (subtotal + taxesTotal + noGravado).toFixed(2)
  }

  const handleSubtotalChange = (e) => {
    const subtotal = e.target.value
    setFormData(prev => {
      // Recalcular todos los impuestos basados en el nuevo subtotal
      const updatedTaxDetails = prev.tax_details.map(tax => ({
        ...tax,
        amount: subtotal ? (parseFloat(subtotal) * tax.rate).toFixed(2) : ''
      }))
      
      return {
        ...prev,
        subtotal,
        tax_details: updatedTaxDetails
      }
    })
  }

  const addTaxDetail = (taxType) => {
    const subtotal = parseFloat(formData.subtotal) || 0
    const calculatedAmount = subtotal * taxType.rate
    
    const newTaxDetail = {
      id: Date.now(),
      type: taxType.id,
      label: taxType.label,
      rate: taxType.rate,
      amount: calculatedAmount.toFixed(2)
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

  const updateTaxAmount = (id, amount) => {
    setFormData(prev => ({
      ...prev,
      tax_details: prev.tax_details.map(tax => 
        tax.id === id ? { ...tax, amount } : tax
      )
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.supplier_id || !formData.punto_venta || !formData.numero_factura || !formData.invoice_date || !formData.expense_category) {
      setError('Complete los campos obligatorios: Proveedor, Punto de Venta, Número, Fecha de Emisión y Categoría')
      return
    }

    try {
      setLoading(true)
      
      // Combinar punto de venta y número para el número de factura completo
      const fullInvoiceNumber = `${formData.invoice_type}-${formData.punto_venta.padStart(4, '0')}-${formData.numero_factura.padStart(8, '0')}`
      
      const dataToSend = {
        ...formData,
        invoice_number: fullInvoiceNumber,
        otros_impuestos: formData.no_gravado // Mapear no_gravado a otros_impuestos para backend
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

  const handleMarkAsPaid = async (invoiceId) => {
    if (!user || user.role !== 'admin') {
      setError('Solo los administradores pueden marcar facturas como pagadas')
      return
    }

    try {
      const response = await fetch(`http://localhost:3001/api/invoices/${invoiceId}/mark-paid`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          admin_notes: 'Marcada como pagada desde el sistema'
        })
      })

      const data = await response.json()

      if (data.success) {
        await loadInvoices()
      } else {
        setError(data.message || 'Error al marcar como pagada')
      }
    } catch (error) {
      setError(`Error de conexión: ${error.message}`)
    }
  }

  const handleEdit = (invoice) => {
    if (invoice.is_paid) {
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
      punto_venta: puntoVenta.replace(/^0+/, '') || puntoVenta, // Remover ceros a la izquierda
      numero_factura: numeroFactura.replace(/^0+/, '') || numeroFactura,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date || '',
      load_date: invoice.load_date || new Date().toISOString().split('T')[0],
      payment_type: invoice.payment_type,
      subtotal: invoice.subtotal,
      iva_21: invoice.iva_21,
      iva_27: invoice.iva_27,
      iva_105: invoice.iva_105,
      perc_iva: invoice.perc_iva,
      perc_iibb: invoice.perc_iibb,
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
      subtotal: '',
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
      return ['B', 'C'] // Monotributista e IVA Exento no pueden emitir factura A
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
            {editingInvoice ? 'Editar Factura' : 'Cargar Nueva Factura'}
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

        <form onSubmit={handleSubmit} style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          
          <style>{`
            /* Ocultar flechitas de inputs numéricos */
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

          {/* Fechas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Fecha de Emisión *
              </label>
              <input
                type="date"
                value={formData.invoice_date}
                onChange={(e) => setFormData({...formData, invoice_date: e.target.value})}
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
                onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px'
                }}
              />
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

          {/* Importes fiscales */}
          <h3 style={{ color: '#333', marginBottom: '15px' }}>Importes Fiscales</h3>
          
          {/* Subtotal principal */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Subtotal (Neto) *
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.subtotal}
              onChange={handleSubtotalChange}
              placeholder="0.00"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #4CAF50',
                borderRadius: '5px',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            />
            <small style={{ color: '#666', fontSize: '12px' }}>
              Este es el importe base para calcular los impuestos
            </small>
          </div>

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
                  disabled={!formData.subtotal}
                  style={{
                    backgroundColor: formData.subtotal ? '#2196F3' : '#ccc',
                    color: 'white',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: '5px',
                    cursor: formData.subtotal ? 'pointer' : 'not-allowed',
                    fontSize: '12px'
                  }}
                >
                  + {taxType.label}
                </button>
              ))}
            </div>
            {!formData.subtotal && (
              <small style={{ color: '#f44336', fontSize: '12px' }}>
                Primero ingrese el subtotal para poder agregar impuestos
              </small>
            )}
          </div>

          {/* Lista de impuestos agregados */}
          {formData.tax_details.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#333', marginBottom: '10px' }}>Impuestos Aplicados:</h4>
              <div style={{ display: 'grid', gap: '10px' }}>
                {formData.tax_details.map(tax => (
                  <div key={tax.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '5px',
                    border: '1px solid #e9ecef'
                  }}>
                    <span style={{ minWidth: '120px', fontSize: '14px' }}>{tax.label}:</span>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      (${formData.subtotal} × {(tax.rate * 100).toFixed(2)}%)
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={tax.amount}
                      onChange={(e) => updateTaxAmount(tax.id, e.target.value)}
                      style={{
                        width: '100px',
                        padding: '5px',
                        border: '1px solid #ddd',
                        borderRadius: '3px',
                        textAlign: 'right'
                      }}
                    />
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
              placeholder="0.00"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px'
              }}
            />
            <small style={{ color: '#666', fontSize: '12px' }}>
              Importes que no están sujetos a impuestos (independiente del subtotal)
            </small>
          </div>

          {/* Total calculado */}
          <div style={{
            backgroundColor: '#f8f9fa',
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
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                          {!invoice.is_paid && (
                            <button
                              onClick={() => handleEdit(invoice)}
                              disabled={user.role !== 'admin' && user.id !== invoice.created_by}
                              style={{
                                backgroundColor: '#2196F3',
                                color: 'white',
                                border: 'none',
                                padding: '5px 10px',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                opacity: (user.role !== 'admin' && user.id !== invoice.created_by) ? 0.5 : 1
                              }}
                            >
                              Editar
                            </button>
                          )}
                          
                          {user.role === 'admin' && !invoice.is_paid && (
                            <button
                              onClick={() => handleMarkAsPaid(invoice.id)}
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
                          
                          {invoice.is_paid && (
                            <span style={{ 
                              color: '#666', 
                              fontSize: '12px',
                              padding: '5px 10px'
                            }}>
                              Pagada el {invoice.paid_date ? new Date(invoice.paid_date).toLocaleDateString('es-ES') : 'N/A'}
                            </span>
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
  )
}