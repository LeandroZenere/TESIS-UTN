const express = require('express');
const { Supplier } = require('../models');
const { authenticateToken, canDeleteSuppliers } = require('../middleware/auth');
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

    // Limpiar y validar CUIT
    const cleanCuit = cuit.replace(/\D/g, '');
    if (cleanCuit.length !== 11) {
      return res.status(400).json({
        success: false,
        message: 'El CUIT debe tener exactamente 11 dígitos'
      });
    }

    // Validar teléfono si se proporciona
    if (phone && !/^[\d\s\-\(\)\+]*$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'El teléfono solo puede contener números, espacios, guiones, paréntesis y el signo +'
      });
    }

    // Validar que Provincia y Ciudad solo contengan letras
    if (province && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-\.]*$/.test(province)) {
      return res.status(400).json({
        success: false,
        message: 'La provincia solo puede contener letras, espacios y guiones'
      });
    }

    if (city && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-\.]*$/.test(city)) {
      return res.status(400).json({
        success: false,
        message: 'La ciudad solo puede contener letras, espacios y guiones'
      });
    }

    // Validar longitud de notas
    if (notes && notes.length > 150) {
      return res.status(400).json({
        success: false,
        message: 'Las notas no pueden exceder los 150 caracteres'
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
      phone: phone || null,
      email: email || null,
      province,
      city,
      postal_code: postal_code || null,
      notes: notes || null
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
          message: 'El CUIT debe tener exactamente 11 dígitos'
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

    // Validar teléfono si se proporciona
    if (phone && !/^[\d\s\-\(\)\+]*$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'El teléfono solo puede contener números, espacios, guiones, paréntesis y el signo +'
      });
    }

    // Validar que Provincia y Ciudad solo contengan letras
    if (province && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-\.]*$/.test(province)) {
      return res.status(400).json({
        success: false,
        message: 'La provincia solo puede contener letras, espacios y guiones'
      });
    }

    if (city && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-\.]*$/.test(city)) {
      return res.status(400).json({
        success: false,
        message: 'La ciudad solo puede contener letras, espacios y guiones'
      });
    }

    // Validar longitud de notas
    if (notes && notes.length > 150) {
      return res.status(400).json({
        success: false,
        message: 'Las notas no pueden exceder los 150 caracteres'
      });
    }

    await supplier.update({
      cuit: cuit ? cuit.replace(/\D/g, '') : supplier.cuit,
      category: category || supplier.category,
      business_name: business_name || supplier.business_name,
      fiscal_address: fiscal_address || supplier.fiscal_address,
      phone: phone || null,
      email: email || null,
      province: province || supplier.province,
      city: city || supplier.city,
      postal_code: postal_code || null,
      notes: notes || null
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

// DELETE /api/suppliers/:id - Eliminar proveedor (solo admin)
router.delete('/:id', canDeleteSuppliers, async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }

    // Verificar si tiene facturas asociadas
    const { Invoice } = require('../models');
    const invoiceCount = await Invoice.count({
      where: { supplier_id: supplier.id }
    });

    if (invoiceCount > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar el proveedor porque tiene ${invoiceCount} factura(s) asociada(s). Primero debe eliminar o reasignar las facturas.`
      });
    }

    // Soft delete (marcar como inactivo)
    await supplier.update({ is_active: false });

    res.json({
      success: true,
      message: 'Proveedor eliminado exitosamente',
      data: { supplier }
    });

  } catch (error) {
    console.error('Error eliminando proveedor:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;