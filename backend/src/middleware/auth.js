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

module.exports = {
  authenticateToken,
  requireAdmin,
  requireAdminOrSelf
};