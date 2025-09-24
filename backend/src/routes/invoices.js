const express = require('express');
const { Invoice, Supplier, User } = require('../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// GET /api/invoices/payment-file/:filename - Servir archivo de comprobante
router.get('/payment-file/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    // CORREGIDO: Usar ../../uploads/payments en lugar de ../uploads/payments
    const filePath = path.join(__dirname, '../../uploads/payments', filename);
    
    console.log('DEBUG: Buscando archivo:', filename);
    console.log('DEBUG: Ruta completa:', filePath);
    console.log('DEBUG: Archivo existe?', fs.existsSync(filePath));
    
    if (fs.existsSync(filePath)) {
      console.log('DEBUG: Enviando archivo...');
      res.sendFile(path.resolve(filePath));
    } else {
      console.log('DEBUG: Archivo NO encontrado');
      res.status(404).json({
        success: false,
        message: 'Archivo no encontrado'
      });
    }
  } catch (error) {
    console.error('Error sirviendo archivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);


// GET /api/invoices - Listar todas las facturas
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status = 'all', 
      supplier_id,
      date_from,
      date_to,
      search = ''
    } = req.query;
    
    const where = {};
    
    // Filtrar por estado
    if (status !== 'all') {
      where.status = status;
    }
    
    // Filtrar por proveedor
    if (supplier_id) {
      where.supplier_id = supplier_id;
    }
    
    // Filtrar por rango de fechas
    if (date_from || date_to) {
      where.invoice_date = {};
      if (date_from) where.invoice_date[Op.gte] = date_from;
      if (date_to) where.invoice_date[Op.lte] = date_to;
    }
    
    // Búsqueda por número de factura - CORREGIDO
    if (search) {
      where.invoice_number = { [Op.like]: `%${search}%` };
    }

    const offset = (page - 1) * limit;
    
    const { count, rows } = await Invoice.findAndCountAll({
      where,
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['id', 'business_name', 'cuit', 'category']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'full_name']
        },
        {
          model: User,
          as: 'paid_by_user',
          attributes: ['id', 'username', 'full_name'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        invoices: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo facturas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/invoices/:id - Obtener una factura específica
router.get('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [
        {
          model: Supplier,
          as: 'supplier'
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'full_name']
        },
        {
          model: User,
          as: 'paid_by_user',
          attributes: ['id', 'username', 'full_name'],
          required: false
        }
      ]
    });
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    res.json({
      success: true,
      data: { invoice }
    });

  } catch (error) {
    console.error('Error obteniendo factura:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/invoices - Crear nueva factura
router.post('/', async (req, res) => {
  try {
    const {
      supplier_id,
      invoice_number,
      invoice_date,
      due_date,
      payment_type,
      subtotal,
      iva_21,
      iva_27,
      iva_105,
      perc_iva,
      perc_iibb,
      otros_impuestos,
      expense_category,
      expense_subcategory,
      notes
    } = req.body;

    // Validaciones básicas
    if (!supplier_id || !invoice_number || !invoice_date || !payment_type || !expense_category) {
      return res.status(400).json({
        success: false,
        message: 'Campos requeridos: proveedor, número de factura, fecha, tipo de pago y categoría de gasto'
      });
    }

    // Verificar que el proveedor existe
    const supplier = await Supplier.findByPk(supplier_id);
    if (!supplier) {
      return res.status(400).json({
        success: false,
        message: 'Proveedor no encontrado'
      });
    }

    // Determinar tipo de factura según categoría del proveedor
    const invoice_type = supplier.getInvoiceType();

    // Crear la factura
    const invoice = await Invoice.create({
      supplier_id,
      created_by: req.user.id,
      invoice_number,
      invoice_date,
      due_date,
      invoice_type,
      payment_type,
      subtotal: subtotal || 0,
      iva_21: iva_21 || 0,
      iva_27: iva_27 || 0,
      iva_105: iva_105 || 0,
      perc_iva: perc_iva || 0,
      perc_iibb: perc_iibb || 0,
      otros_impuestos: otros_impuestos || 0,
      total_amount: 0, // Se calculará después
      expense_category,
      expense_subcategory,
      notes
    });

    // Calcular el total automáticamente
    invoice.calculateTotal();
    await invoice.save();

    // Obtener la factura completa con relaciones
    const completeInvoice = await Invoice.findByPk(invoice.id, {
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['id', 'business_name', 'cuit', 'category']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'full_name']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Factura creada exitosamente',
      data: { invoice: completeInvoice }
    });

  } catch (error) {
    console.error('Error creando factura:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/invoices/:id - Actualizar factura
router.put('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    // Solo el creador o un admin puede editar (y solo si no está pagada)
    if (req.user.role !== 'admin' && req.user.id !== invoice.created_by) {
      return res.status(403).json({
        success: false,
        message: 'Sin permisos para editar esta factura'
      });
    }

    if (invoice.is_paid) {
      return res.status(400).json({
        success: false,
        message: 'No se puede editar una factura que ya está pagada'
      });
    }

    const {
      invoice_number,
      invoice_date,
      due_date,
      payment_type,
      subtotal,
      iva_21,
      iva_27,
      iva_105,
      perc_iva,
      perc_iibb,
      otros_impuestos,
      expense_category,
      expense_subcategory,
      notes
    } = req.body;

    await invoice.update({
      invoice_number: invoice_number || invoice.invoice_number,
      invoice_date: invoice_date || invoice.invoice_date,
      due_date: due_date || invoice.due_date,
      payment_type: payment_type || invoice.payment_type,
      subtotal: subtotal !== undefined ? subtotal : invoice.subtotal,
      iva_21: iva_21 !== undefined ? iva_21 : invoice.iva_21,
      iva_27: iva_27 !== undefined ? iva_27 : invoice.iva_27,
      iva_105: iva_105 !== undefined ? iva_105 : invoice.iva_105,
      perc_iva: perc_iva !== undefined ? perc_iva : invoice.perc_iva,
      perc_iibb: perc_iibb !== undefined ? perc_iibb : invoice.perc_iibb,
      otros_impuestos: otros_impuestos !== undefined ? otros_impuestos : invoice.otros_impuestos,
      expense_category: expense_category || invoice.expense_category,
      expense_subcategory: expense_subcategory || invoice.expense_subcategory,
      notes: notes !== undefined ? notes : invoice.notes
    });

    // Recalcular total
    invoice.calculateTotal();
    await invoice.save();

    res.json({
      success: true,
      message: 'Factura actualizada exitosamente',
      data: { invoice }
    });

  } catch (error) {
    console.error('Error actualizando factura:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/invoices/:id/mark-paid - Marcar factura como pagada CON comprobante
router.put('/:id/mark-paid', requireAdmin, upload.single('payment_file'), async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    if (invoice.is_paid) {
      return res.status(400).json({
        success: false,
        message: 'La factura ya está marcada como pagada'
      });
    }

    const { admin_notes } = req.body;
    const updateData = {
      status: 'pagada',
      is_paid: true,
      paid_date: new Date(),
      paid_by: req.user.id,
      admin_notes: admin_notes || invoice.admin_notes
    };

    // Si se subió un archivo, guardarlo
if (req.file) {
  console.log('DEBUG: Archivo recibido:', req.file.filename);
  updateData.payment_proof = req.file.filename;
} else {
  console.log('DEBUG: No se recibió archivo');
}

console.log('DEBUG: updateData final:', updateData);

await invoice.update(updateData);

console.log('DEBUG: Factura actualizada con payment_proof:', invoice.payment_proof);

    res.json({
      success: true,
      message: 'Factura marcada como pagada exitosamente',
      data: { invoice }
    });

  } catch (error) {
    console.error('Error marcando factura como pagada:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/invoices/:id/payment-file - Subir/actualizar comprobante
router.post('/:id/payment-file', requireAdmin, upload.single('payment_file'), async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    if (!invoice.is_paid) {
      return res.status(400).json({
        success: false,
        message: 'Solo se puede subir comprobante a facturas pagadas'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se recibió ningún archivo'
      });
    }

    // Eliminar archivo anterior si existe
    if (invoice.payment_proof) {
      const oldFilePath = path.join('uploads/payments', invoice.payment_proof);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    // Actualizar con nuevo archivo
    await invoice.update({
      payment_proof: req.file.filename
    });

    res.json({
      success: true,
      message: 'Comprobante subido exitosamente',
      data: { 
        invoice,
        filename: req.file.filename
      }
    });

  } catch (error) {
    console.error('Error subiendo comprobante:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});



// GET /api/invoices/reports/summary - Resumen de facturas
router.get('/reports/summary', async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentMonth = month || (new Date().getMonth() + 1);
    const currentYear = year || new Date().getFullYear();

    const startDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
    const endDate = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];

    const summary = await Invoice.findAll({
      where: {
        invoice_date: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        'expense_category',
        [require('sequelize').fn('SUM', require('sequelize').col('total_amount')), 'total'],
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['expense_category'],
      order: [[require('sequelize').literal('total'), 'DESC']]
    });

    const totalAmount = summary.reduce((acc, item) => acc + parseFloat(item.dataValues.total), 0);

    res.json({
      success: true,
      data: {
        period: `${currentMonth}/${currentYear}`,
        categories: summary,
        total_amount: totalAmount,
        total_invoices: summary.reduce((acc, item) => acc + parseInt(item.dataValues.count), 0)
      }
    });

  } catch (error) {
    console.error('Error generando resumen:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;