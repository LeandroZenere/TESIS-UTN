import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Suppliers({ onBack }) {
  const { token } = useAuth()
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.cuit || !formData.business_name || !formData.fiscal_address || !formData.province || !formData.city) {
      setError('Complete los campos obligatorios: CUIT, Razón Social, Domicilio Fiscal, Provincia y Ciudad')
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

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.cuit.includes(searchTerm)
  )

  if (showForm) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
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
            {editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                CUIT *
              </label>
              <input
                type="text"
                value={formData.cuit}
                onChange={(e) => setFormData({...formData, cuit: e.target.value})}
                placeholder="20-12345678-9"
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
                Categoría Fiscal *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px'
                }}
              >
                <option value="responsable_inscripto">Responsable Inscripto</option>
                <option value="monotributista">Monotributista</option>
                <option value="iva_exento">IVA Exento</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Razón Social *
            </label>
            <input
              type="text"
              value={formData.business_name}
              onChange={(e) => setFormData({...formData, business_name: e.target.value})}
              placeholder="Nombre de la empresa"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Domicilio Fiscal *
            </label>
            <input
              type="text"
              value={formData.fiscal_address}
              onChange={(e) => setFormData({...formData, fiscal_address: e.target.value})}
              placeholder="Dirección completa"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Provincia *
              </label>
              <input
                type="text"
                value={formData.province}
                onChange={(e) => setFormData({...formData, province: e.target.value})}
                placeholder="Provincia"
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
                Ciudad *
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                placeholder="Ciudad"
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
                Código Postal
              </label>
              <input
                type="text"
                value={formData.postal_code}
                onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                placeholder="CP"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Teléfono
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="011-1234-5678"
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
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="contacto@empresa.com"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Notas
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Observaciones adicionales"
              rows="3"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                resize: 'vertical'
              }}
            />
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
              {loading ? 'Guardando...' : (editingSupplier ? 'Actualizar' : 'Crear')} Proveedor
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
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
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
          <h2 style={{ margin: 0, color: '#333' }}>Gestión de Proveedores</h2>
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
          + Nuevo Proveedor
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Buscar por razón social o CUIT..."
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
          <p>Cargando proveedores...</p>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          {filteredSuppliers.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              {suppliers.length === 0 ? 'No hay proveedores registrados' : 'No se encontraron proveedores con ese criterio'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '15px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>CUIT</th>
                    <th style={{ padding: '15px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Razón Social</th>
                    <th style={{ padding: '15px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Categoría</th>
                    <th style={{ padding: '15px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Localidad</th>
                    <th style={{ padding: '15px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Teléfono</th>
                    <th style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '15px' }}>{supplier.cuit}</td>
                      <td style={{ padding: '15px', fontWeight: 'bold' }}>{supplier.business_name}</td>
                      <td style={{ padding: '15px' }}>
                        <span style={{
                          backgroundColor: supplier.category === 'responsable_inscripto' ? '#e3f2fd' : 
                                         supplier.category === 'monotributista' ? '#f3e5f5' : '#fff3e0',
                          color: supplier.category === 'responsable_inscripto' ? '#1976d2' : 
                                 supplier.category === 'monotributista' ? '#7b1fa2' : '#f57c00',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}>
                          {supplier.category === 'responsable_inscripto' ? 'Resp. Inscripto' : 
                           supplier.category === 'monotributista' ? 'Monotributo' : 'IVA Exento'}
                        </span>
                      </td>
                      <td style={{ padding: '15px' }}>{supplier.city}, {supplier.province}</td>
                      <td style={{ padding: '15px' }}>{supplier.phone || '-'}</td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleEdit(supplier)}
                          style={{
                            backgroundColor: '#2196F3',
                            color: 'white',
                            border: 'none',
                            padding: '5px 10px',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Editar
                        </button>
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