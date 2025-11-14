const express = require('express');
const router = express.Router();
const { ExpenseCategory, Invoice } = require('../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// GET /api/expense-categories - Listar todas las categorías (todos los usuarios)
router.get('/', async (req, res) => {
  try {
    const categories = await ExpenseCategory.findAll({
      where: { is_active: true },
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: { categories }
    });

  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/expense-categories/:id - Obtener una categoría específica
router.get('/:id', async (req, res) => {
  try {
    const category = await ExpenseCategory.findByPk(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    res.json({
      success: true,
      data: { category }
    });

  } catch (error) {
    console.error('Error obteniendo categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/expense-categories - Crear nueva categoría (solo admin)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, subcategories } = req.body;

    // Validaciones básicas
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la categoría es requerido'
      });
    }

    // Verificar si ya existe la categoría
    const existingCategory = await ExpenseCategory.findOne({ 
      where: { name: name.trim() } 
    });
    
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una categoría con ese nombre'
      });
    }

    // Crear la categoría
    const category = await ExpenseCategory.create({
      name: name.trim(),
      subcategories: subcategories || []
    });

    res.status(201).json({
      success: true,
      message: 'Categoría creada exitosamente',
      data: { category }
    });

  } catch (error) {
    console.error('Error creando categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/expense-categories/:id - Actualizar categoría (solo admin)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const category = await ExpenseCategory.findByPk(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    const { name, subcategories } = req.body;

    // Si se actualiza el nombre, validar que no exista otra categoría con ese nombre
    if (name && name.trim() !== category.name) {
      const existingCategory = await ExpenseCategory.findOne({ 
        where: { 
          name: name.trim(),
          id: { [Op.ne]: category.id }
        } 
      });
      
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otra categoría con ese nombre'
        });
      }
    }

    // Actualizar la categoría
    await category.update({
      name: name ? name.trim() : category.name,
      subcategories: subcategories !== undefined ? subcategories : category.subcategories
    });

    res.json({
      success: true,
      message: 'Categoría actualizada exitosamente',
      data: { category }
    });

  } catch (error) {
    console.error('Error actualizando categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /api/expense-categories/:id - Eliminar categoría (solo admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const category = await ExpenseCategory.findByPk(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    // Verificar si hay facturas usando esta categoría
    const invoiceCount = await Invoice.count({
      where: { expense_category: category.name }
    });

    if (invoiceCount > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar la categoría porque tiene ${invoiceCount} factura(s) asociada(s)`
      });
    }

    // Soft delete (marcar como inactivo)
    await category.update({ is_active: false });

    res.json({
      success: true,
      message: 'Categoría eliminada exitosamente',
      data: { category }
    });

  } catch (error) {
    console.error('Error eliminando categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;