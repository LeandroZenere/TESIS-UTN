const express = require('express');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Usuario y contraseña son requeridos'
      });
    }

    // Buscar usuario por username o email
    const user = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { username: username },
          { email: username }
        ],
        is_active: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Validar contraseña
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Generar JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        token,
        user: user.toSafeObject()
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/auth/register (solo admins pueden crear usuarios)
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, full_name, role = 'employee' } = req.body;

    if (!username || !email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos'
      });
    }

    // Verificar si ya existe el usuario
    const existingUser = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { username: username },
          { email: email }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'El usuario o email ya existe'
      });
    }

    // Crear nuevo usuario
    const newUser = await User.create({
      username,
      email,
      password,
      full_name,
      role
    });

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: {
        user: newUser.toSafeObject()
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/auth/me (obtener datos del usuario actual)
router.get('/me', async (req, res) => {
  try {
    // Este endpoint requiere middleware de autenticación
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token requerido'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId);

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no válido'
      });
    }

    res.json({
      success: true,
      data: {
        user: user.toSafeObject()
      }
    });

  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
});

module.exports = router;