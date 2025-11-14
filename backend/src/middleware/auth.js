const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Middleware para verificar autenticación
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar que el usuario existe y está activo
    const user = await User.findByPk(decoded.userId);
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no válido'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Token inválido'
    });
  }
};

// Middleware para verificar rol de administrador
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado: Se requieren permisos de administrador'
    });
  }
  next();
};

// Middleware para verificar que sea admin o el mismo usuario
const requireAdminOrSelf = (req, res, next) => {
  const targetUserId = parseInt(req.params.userId || req.body.userId);
  
  if (req.user.role === 'admin' || req.user.id === targetUserId) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado: Sin permisos suficientes'
    });
  }
};

// Verificar si puede editar una factura
const canEditInvoice = async (req, res, next) => {
  try {
    const { Invoice } = require('../models');
    const invoiceId = req.params.id;
    
    const invoice = await Invoice.findByPk(invoiceId);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    // Admin siempre puede editar
    if (req.user.role === 'admin') {
      return next();
    }

    // Si está pagada, solo admin puede editar
    if (invoice.is_paid) {
      return res.status(403).json({
        success: false,
        message: 'No se puede editar una factura que ya está pagada. Solo los administradores pueden gestionarla.'
      });
    }

    // Si no está pagada, solo el creador puede editar
    if (invoice.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Solo puedes editar facturas que tú creaste'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error verificando permisos'
    });
  }
};

// Verificar si puede eliminar proveedores (solo admin)
const canDeleteSuppliers = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Solo los administradores pueden eliminar proveedores'
    });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireAdminOrSelf,
  canEditInvoice,
  canDeleteSuppliers
};