import React, { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './components/Login'
import Suppliers from './components/Suppliers'

function AppContent() {
  const { user, loading, logout } = useAuth()
  const [currentView, setCurrentView] = useState('dashboard')

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando...</div>
  }

  if (!user) {
    return <Login />
  }

  if (currentView === 'suppliers') {
    return <Suppliers onBack={() => setCurrentView('dashboard')} />
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <header style={{
        backgroundColor: 'white',
        padding: '20px',
        borderBottom: '1px solid #ddd',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ margin: 0 }}>Sistema de Gestión de Facturas</h1>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <span>Bienvenido, {user.full_name}</span>
          <button onClick={logout} style={{ padding: '8px 16px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '5px' }}>
            Cerrar Sesión
          </button>
        </div>
      </header>

      <main style={{ padding: '40px 20px', textAlign: 'center' }}>
        <h2>Dashboard Principal</h2>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          maxWidth: '800px',
          margin: '40px auto'
        }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            <h3>Proveedores</h3>
            <p>Gestionar información de proveedores</p>
            <button 
              onClick={() => setCurrentView('suppliers')}
              style={{ backgroundColor: '#2196F3', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}
            >
              Ver Proveedores
            </button>
          </div>
          
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            <h3>Facturas</h3>
            <p>Crear y gestionar facturas</p>
            <button style={{ backgroundColor: '#4CAF50', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}>
              Ver Facturas
            </button>
          </div>
          
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            <h3>Reportes</h3>
            <p>Análisis y estadísticas</p>
            <button style={{ backgroundColor: '#9C27B0', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}>
              Ver Reportes
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App