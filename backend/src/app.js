const express = require('express');
const cors = require('cors');
const path = require('path');
const { syncAllModels } = require('./models');
const expenseCategoriesRoutes = require('./routes/expenseCategories');

const app = express();

// Inicializar base de datos
syncAllModels();

// Middlewares básicos
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rutas de la API
const authRoutes = require('./routes/auth');
const suppliersRoutes = require('./routes/suppliers');
const invoicesRoutes = require('./routes/invoices');
const statsRoutes = require('./routes/stats');

app.use('/api/auth', authRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/expense-categories', expenseCategoriesRoutes);

// Ruta principal
app.get('/', (req, res) => {
  res.json({ 
    message: '🏢 Sistema de Gestión de Facturas - API',
    version: '1.0.0',
    status: 'running',
    endpoints: [
      'POST /api/auth/login',
      'POST /api/auth/register', 
      'GET /api/auth/me',
      'GET /api/suppliers - Listar proveedores',
      'POST /api/suppliers - Crear proveedor',
      'GET /api/suppliers/:id - Ver proveedor',
      'PUT /api/suppliers/:id - Editar proveedor',
      'GET /api/invoices - Listar facturas',
      'POST /api/invoices - Crear factura',
      'GET /api/invoices/:id - Ver factura',
      'PUT /api/invoices/:id - Editar factura',
      'PUT /api/invoices/:id/mark-paid - Marcar como pagada (Admin)',
      'GET /api/invoices/reports/summary - Resumen por categorías'
    ]
  });
});

// Ruta para crear usuario admin inicial
app.post('/api/setup/admin', async (req, res) => {
  try {
    const { User } = require('./models');
    
    // Verificar si ya existe un admin
    const adminExists = await User.findOne({ where: { role: 'admin' } });
    if (adminExists) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un usuario administrador'
      });
    }

    // Crear usuario admin
    const admin = await User.create({
      username: 'admin',
      email: 'admin@gascompany.com',
      password: 'admin123',
      full_name: 'Administrador del Sistema',
      role: 'admin'
    });

    res.status(201).json({
      success: true,
      message: 'Usuario administrador creado exitosamente',
      data: {
        username: 'admin',
        password: 'admin123',
        note: 'Por favor cambie la contraseña después del primer login'
      }
    });

  } catch (error) {
    console.error('Error creando admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando usuario administrador'
    });
  }
});

// Middleware para manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

module.exports = app;