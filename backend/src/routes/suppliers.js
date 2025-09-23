const express = require('express');
const { Supplier } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// GET /api/suppliers - Listar todos los proveedores
router.get('/', async (req, res) => {
  try {
    const suppliers = await Supplier.findAll({
      where: { is_active: true },
      order: [['business_name', 'ASC']]
    });

    res.json({
      success: true,
      data: { suppliers }
    });

  } catch (error) {
    console.error('Error obteniendo proveedores:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/suppliers - Crear nuevo proveedor
router.post('/', async (req, res) => {
  try {
    const {
      cuit, category, business_name, fiscal_address,
      phone, email, province, city, postal_code, notes
    } = req.body;

    // Validaciones básicas
    if (!cuit || !category || !business_name || !fiscal_address || !province || !city) {
      return res.status(400).json({
        success: false,
        message: 'Campos requeridos: CUIT, categoría, razón social, domicilio fiscal, provincia y localidad'
      });
    }

    // Limpiar CUIT (solo números)
    const cleanCuit = cuit.replace(/\D/g, '');
    if (cleanCuit.length !== 11) {
      return res.status(400).json({
        success: false,
        message: 'El CUIT debe tener 11 dígitos'
      });
    }

    // Verificar si ya existe el CUIT
    const existingSupplier = await Supplier.findOne({ where: { cuit: cleanCuit } });
    if (existingSupplier) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un proveedor con ese CUIT'
      });
    }

    const supplier = await Supplier.create({
      cuit: cleanCuit,
      category,
      business_name,
      fiscal_address,
      phone,
      email,
      province,
      city,
      postal_code,
      notes
    });

    res.status(201).json({
      success: true,
      message: 'Proveedor creado exitosamente',
      data: { supplier }
    });

  } catch (error) {
    console.error('Error creando proveedor:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/suppliers/:id - Actualizar proveedor
router.put('/:id', async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }

    const {
      cuit, category, business_name, fiscal_address,
      phone, email, province, city, postal_code, notes
    } = req.body;

    // Si se actualiza el CUIT, validar
    if (cuit && cuit !== supplier.cuit) {
      const cleanCuit = cuit.replace(/\D/g, '');
      if (cleanCuit.length !== 11) {
        return res.status(400).json({
          success: false,
          message: 'El CUIT debe tener 11 dígitos'
        });
      }

      const existingSupplier = await Supplier.findOne({ where: { cuit: cleanCuit } });
      if (existingSupplier && existingSupplier.id !== supplier.id) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otro proveedor con ese CUIT'
        });
      }
    }

    await supplier.update({
      cuit: cuit ? cuit.replace(/\D/g, '') : supplier.cuit,
      category: category || supplier.category,
      business_name: business_name || supplier.business_name,
      fiscal_address: fiscal_address || supplier.fiscal_address,
      phone,
      email,
      province: province || supplier.province,
      city: city || supplier.city,
      postal_code,
      notes
    });

    res.json({
      success: true,
      message: 'Proveedor actualizado exitosamente',
      data: { supplier }
    });

  } catch (error) {
    console.error('Error actualizando proveedor:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;