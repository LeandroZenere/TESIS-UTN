const express = require('express');
const { Invoice, Supplier, User } = require('../models');
const { authenticateToken, requireAdmin, canEditInvoice } = require('../middleware/auth');
const { Op } = require('sequelize');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const router = express.Router();

// GET /api/invoices/payment-file/:filename - Servir archivo de comprobante
router.get('/payment-file/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../../uploads/payments', filename);
  
    if (fs.existsSync(filePath)) { //Enviando archivo
      res.sendFile(path.resolve(filePath));
    } else {
      //Archivo no encontrado
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

// GET /api/invoices/original-file/:filename - Servir archivo de factura original
router.get('/original-file/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../../uploads/originals', filename);
    
    if (fs.existsSync(filePath)) {
      res.sendFile(path.resolve(filePath));
    } else {
      res.status(404).json({
        success: false,
        message: 'Archivo original no encontrado'
      });
    }
  } catch (error) {
    console.error('Error sirviendo archivo original:', error);
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

// POST /api/invoices - Crear nueva factura CON archivo original
router.post('/', (req, res, next) => {
  upload.fields([{ name: 'original_invoice', maxCount: 1 }])(req, res, (err) => {
    if (err) {
      console.error('ERROR UPLOAD:', err);
      return res.status(400).json({
        success: false,
        message: `Error subiendo archivo: ${err.message}`
      });
    }
    next();
  });
}, async (req, res) => {
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

          let originalInvoiceFile = null;
      if (req.files && req.files.original_invoice) {
        originalInvoiceFile = req.files.original_invoice[0].filename;
        //Archivo original recibido
      } else {
        console.log('DEBUG: No se recibió archivo original');
      }

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
      notes,
      original_invoice: originalInvoiceFile
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

// PUT /api/invoices/:id - Actualizar factura (con validación de permisos mediante middleware)
router.put('/:id', canEditInvoice, upload.fields([
  { name: 'original_invoice', maxCount: 1 }
]), async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    // Las validaciones de permisos ya las hizo el middleware canEditInvoice
    // No es necesario validar aquí

    // Manejo del archivo original en edición
    let originalInvoiceFile = invoice.original_invoice; // Mantener el existente por defecto
    
    if (req.files && req.files.original_invoice) {
      // Si hay un nuevo archivo, eliminar el anterior si existe
      if (invoice.original_invoice) {
        const oldFilePath = path.join(__dirname, '../../uploads/originals', invoice.original_invoice);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          console.log('DEBUG: Archivo original anterior eliminado:', invoice.original_invoice);
        }
      }
      
      // Usar el nuevo archivo
      originalInvoiceFile = req.files.original_invoice[0].filename;
      console.log('DEBUG: Nuevo archivo original guardado:', originalInvoiceFile);
    } else {
      console.log('DEBUG: Sin archivo original nuevo, manteniendo:', originalInvoiceFile);
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
      notes: notes !== undefined ? notes : invoice.notes,
      original_invoice: originalInvoiceFile
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
  updateData.payment_proof = req.file.filename;
} else {
  console.log('DEBUG: No se recibió archivo');
}


await invoice.update(updateData);

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
      const oldFilePath = path.join(__dirname, '../../uploads/payments', invoice.payment_proof);
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

// GET /api/invoices/:id/pdf - Generar PDF
router.get('/:id/pdf', async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['id', 'business_name', 'cuit', 'category', 'fiscal_address', 'phone', 'email', 'province', 'city', 'postal_code']
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

    if (req.user.role !== 'admin' && req.user.id !== invoice.created_by && !invoice.is_paid) {
      return res.status(403).json({
        success: false,
        message: 'Sin permisos para ver este reporte'
      });
    }

    const doc = new PDFDocument({ 
      margin: 40,
      size: 'A4'
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reporte_factura_${invoice.invoice_number.replace(/[\/\\:*?"<>|]/g, '_')}.pdf"`);
    
    doc.pipe(res);

    // HEADER CON DISEÑO SERGAS
    doc.rect(0, 0, doc.page.width, 80)
       .fill('#FFC107');

    // Efecto degradado sutil
    doc.rect(0, 0, doc.page.width, 80)
       .fillOpacity(0.2)
       .fill('#FF8C00')
       .fillOpacity(1);

doc.fillColor('#1A1A1A')
   .fontSize(24)
   .font('Helvetica-Bold')
   .text('REPORTE DE FACTURA', 0, 20, { 
     align: 'center',
     width: doc.page.width 
   })
   .fontSize(18)
   .text(invoice.invoice_number, 0, 45, { 
     align: 'center',
     width: doc.page.width 
   });

    let yPos = 100;

    // Función para títulos con estilo SerGas
    const addSectionTitle = (title, y) => {
      doc.rect(40, y, 515, 20)
         .fill('#f8f9fa')
         .stroke('#FFC107');
      
      // Barra lateral SerGas
      doc.rect(40, y, 4, 20)
         .fill('#FFC107');
      
      doc.fillColor('#1A1A1A')
         .fontSize(12)
         .font('Helvetica-Bold')
         .text(title, 52, y + 6);
      
      return y + 25;
    };

    // Función para datos compacta
    const addCompactData = (leftLabel, leftValue, rightLabel, rightValue, y) => {
      doc.fillColor('#666')
         .fontSize(8)
         .font('Helvetica-Bold')
         .text(leftLabel, 50, y);
      
      doc.fillColor('#333')
         .fontSize(10)
         .font('Helvetica')
         .text(leftValue || 'N/A', 50, y + 10);
      
      if (rightLabel) {
        doc.fillColor('#666')
           .fontSize(8)
           .font('Helvetica-Bold')
           .text(rightLabel, 300, y);
        
        doc.fillColor('#333')
           .fontSize(10)
           .font('Helvetica')
           .text(rightValue || 'N/A', 300, y + 10);
      }
      
      return y + 25;
    };

    // INFORMACIÓN DEL PROVEEDOR
    yPos = addSectionTitle('INFORMACIÓN DEL PROVEEDOR', yPos);
    yPos = addCompactData('RAZÓN SOCIAL', invoice.supplier.business_name, 
                         'CUIT', invoice.supplier.cuit, yPos);
    yPos = addCompactData('CATEGORÍA', invoice.supplier.category, 
                         'TELÉFONO', invoice.supplier.phone, yPos);
    yPos += 10;

    // DETALLES DE LA FACTURA
    yPos = addSectionTitle('DETALLES DE LA FACTURA', yPos);
    yPos = addCompactData('NÚMERO DE FACTURA', invoice.invoice_number,
                         'FECHA DE EMISIÓN', new Date(invoice.invoice_date).toLocaleDateString('es-ES'), yPos);
    yPos = addCompactData('FECHA DE VENCIMIENTO', 
                         invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('es-ES') : 'N/A',
                         'TIPO DE PAGO', invoice.payment_type, yPos);
    yPos = addCompactData('CATEGORÍA', invoice.expense_category,
                         'SUBCATEGORÍA', invoice.expense_subcategory, yPos);
    yPos += 10;

    // DETALLES FINANCIEROS (TAMAÑO UNIFORME)
    yPos = addSectionTitle('DETALLES FINANCIEROS', yPos);
    
    const financialStartY = yPos;
    
    // Función para filas financieras con MISMO TAMAÑO DE FUENTE
    const addFinancialRow = (label, amount, y) => {
      doc.fillColor('#666')
         .fontSize(10)  // MISMO TAMAÑO PARA TODOS
         .font('Helvetica-Bold')
         .text(label, 60, y);
      
      doc.fillColor('#333')
         .fontSize(10)  // MISMO TAMAÑO PARA TODOS
         .font('Helvetica')
         .text(amount, 420, y, { align: 'right' });
      
      return y + 16;
    };

    let rowCount = 0;
    
    // Agregar filas financieras con tamaño uniforme
    if (parseFloat(invoice.iva_21 || 0) > 0) {
      const subtotal = parseFloat(invoice.iva_21) / 0.21;
      yPos = addFinancialRow('IVA 21% - Subtotal', 
                           `$${subtotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, yPos);
      yPos = addFinancialRow('IVA 21% - Impuesto', 
                           `$${parseFloat(invoice.iva_21).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, yPos);
      rowCount += 2;
    }
    
    if (parseFloat(invoice.iva_27 || 0) > 0) {
      const subtotal = parseFloat(invoice.iva_27) / 0.27;
      yPos = addFinancialRow('IVA 27% - Subtotal', 
                           `$${subtotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, yPos);
      yPos = addFinancialRow('IVA 27% - Impuesto', 
                           `$${parseFloat(invoice.iva_27).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, yPos);
      rowCount += 2;
    }
    
    if (parseFloat(invoice.iva_105 || 0) > 0) {
      const subtotal = parseFloat(invoice.iva_105) / 0.105;
      yPos = addFinancialRow('IVA 10.5% - Subtotal', 
                           `$${subtotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, yPos);
      yPos = addFinancialRow('IVA 10.5% - Impuesto', 
                           `$${parseFloat(invoice.iva_105).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, yPos);
      rowCount += 2;
    }
    
    if (parseFloat(invoice.perc_iva || 0) > 0) {
      const subtotal = parseFloat(invoice.perc_iva) / 0.03;
      yPos = addFinancialRow('PERCEPCIÓN IVA - Subtotal', 
                           `$${subtotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, yPos);
      yPos = addFinancialRow('PERCEPCIÓN IVA - Impuesto', 
                           `$${parseFloat(invoice.perc_iva).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, yPos);
      rowCount += 2;
    }
    
    if (parseFloat(invoice.perc_iibb || 0) > 0) {
      const subtotal = parseFloat(invoice.perc_iibb) / 0.0175;
      yPos = addFinancialRow('PERCEPCIÓN IIBB - Subtotal', 
                           `$${subtotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, yPos);
      yPos = addFinancialRow('PERCEPCIÓN IIBB - Impuesto', 
                           `$${parseFloat(invoice.perc_iibb).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, yPos);
      rowCount += 2;
    }
    
    if (parseFloat(invoice.otros_impuestos || 0) > 0) {
      yPos = addFinancialRow('NO GRAVADO', 
                           `$${parseFloat(invoice.otros_impuestos).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, yPos);
      rowCount += 1;
    }

    // Aplicar fondo SerGas después de escribir
    if (rowCount > 0) {
      const backgroundHeight = rowCount * 16;
      doc.rect(45, financialStartY, 505, backgroundHeight)
         .fillOpacity(0.05)
         .fill('#FFC107')
         .fillOpacity(1);
    }

    // TOTAL CON DISEÑO SERGAS
    yPos += 5;
    doc.rect(45, yPos, 505, 30)
       .fill('#FFC107');

    // Borde lateral
    doc.rect(45, yPos, 6, 30)
       .fill('#FF8C00');

    doc.fillColor('#1A1A1A')
       .fontSize(16)
       .font('Helvetica-Bold')
       .text(`TOTAL: $${parseFloat(invoice.total_amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, 
             45, yPos + 8, { align: 'center' });

    yPos += 40;

    // ESTADO DEL PAGO CON COLORES DINÁMICOS
    yPos = addSectionTitle('ESTADO DEL PAGO', yPos);
    
    const statusColor = invoice.is_paid ? '#FF8C00' : '#E53E3E';
    const statusText = invoice.is_paid ? 'PAGADA' : 'PENDIENTE';
    
    doc.fillColor('#666')
       .fontSize(8)
       .font('Helvetica-Bold')
       .text('ESTADO', 50, yPos);
    
    doc.fillColor(statusColor)
       .fontSize(10)
       .font('Helvetica-Bold')
       .text(statusText, 50, yPos + 10);
    
    yPos += 25;
    
    if (invoice.is_paid && invoice.paid_date) {
      yPos = addCompactData('FECHA DE PAGO', new Date(invoice.paid_date).toLocaleDateString('es-ES'), '', '', yPos);
    }
    
    if (invoice.paid_by_user) {
      yPos = addCompactData('PAGADA POR', `${invoice.paid_by_user.full_name} (${invoice.paid_by_user.username})`, '', '', yPos);
    }

    // OBSERVACIONES (si existen, al final de página 1)
    if (invoice.notes) {
      yPos += 10;
      yPos = addSectionTitle('OBSERVACIONES', yPos);
      doc.fillColor('#333')
         .fontSize(9)
         .font('Helvetica')
         .text(invoice.notes, 50, yPos, { width: 500 });
      yPos += 30;
    }

    // FOOTER CON LÍNEA SERGAS
    yPos += 20;
    
    doc.moveTo(50, yPos)
       .lineTo(545, yPos)
       .strokeColor('#FFC107')
       .lineWidth(2)
       .stroke();
    
    yPos += 10;
    
    // Todo el footer en líneas consecutivas sin saltos
    doc.fillColor('#666')
       .fontSize(8)
       .font('Helvetica')
       .text(`Reporte generado: ${new Date().toLocaleString('es-ES')}`, 50, yPos, { align: 'center' });
    
    yPos += 12;
    doc.fillColor('#FFC107')
       .fontSize(9)
       .font('Helvetica-Bold')
       .text('SerGas Management System - v1.0', 50, yPos, { align: 'center' });

    if (invoice.creator) {
      yPos += 12;
      doc.fillColor('#666')
         .fontSize(8)
         .text(`Por: ${invoice.creator.full_name} (${invoice.creator.username})`, 50, yPos, { align: 'center' });
    }

    // NUEVA PÁGINA EXCLUSIVA PARA COMPROBANTE DE PAGO CON ESTILO SERGAS
    if (invoice.payment_proof) {
      try {
        const paymentFilePath = path.join(__dirname, '../../uploads/payments', invoice.payment_proof);
        
        if (fs.existsSync(paymentFilePath)) {
          // SIEMPRE nueva página para el comprobante
          doc.addPage();
          
          const fileExt = path.extname(invoice.payment_proof).toLowerCase();
          let yPosComprobante = 50;
          
          // Título único de la página de comprobante con estilo SerGas
          doc.rect(40, yPosComprobante, 515, 25)
             .fill('#f8f9fa')
             .stroke('#FFC107');
          
          doc.rect(40, yPosComprobante, 4, 25)
             .fill('#FFC107');
          
          doc.fillColor('#1A1A1A')
             .fontSize(14)
             .font('Helvetica-Bold')
             .text('COMPROBANTE DE PAGO', 52, yPosComprobante + 8);
          
          yPosComprobante += 35;
          
          doc.fillColor('#FF8C00')
             .fontSize(12)
             .font('Helvetica-Bold')
             .text('COMPROBANTE ADJUNTO', 50, yPosComprobante);
          
          doc.fillColor('#666')
             .fontSize(10)
             .font('Helvetica')
             .text(`Archivo: ${invoice.payment_proof}`, 50, yPosComprobante + 20);
          
          if (['.jpg', '.jpeg', '.png'].includes(fileExt)) {
            try {
              // Imagen en página dedicada - puede ser más grande
              doc.image(paymentFilePath, 50, yPosComprobante + 40, { 
                fit: [500, 600], // Más espacio disponible en página dedicada
                align: 'center'
              });
              
              console.log('Imagen insertada correctamente en página dedicada');
            } catch (imgError) {
              console.error('Error cargando imagen:', imgError);
              doc.fillColor('#E53E3E')
                 .fontSize(10)
                 .text('Error al cargar la imagen del comprobante', 50, yPosComprobante + 40);
            }
          } else if (fileExt === '.pdf') {
            doc.fillColor('#FF8C00')
               .fontSize(12)
               .font('Helvetica-Bold')
               .text('COMPROBANTE PDF DISPONIBLE', 50, yPosComprobante + 40);
            
            doc.fillColor('#666')
               .fontSize(10)
               .text('Para descargar el PDF original, use el siguiente enlace:', 50, yPosComprobante + 60);
            
            const pdfUrl = `${req.protocol}://${req.get('host')}/api/invoices/payment-file/${invoice.payment_proof}`;
            
            doc.fillColor('#FF8C00')
               .fontSize(10)
               .text(pdfUrl, 50, yPosComprobante + 80, { 
                 link: pdfUrl, 
                 underline: true 
               });
            
            doc.fillColor('#666')
               .fontSize(9)
               .text('Nota: Copie y pegue este enlace en su navegador para descargar el archivo PDF original.', 50, yPosComprobante + 100);
          }
        } else {
          // Nueva página incluso si no se encuentra el archivo
          doc.addPage();
          let yPosComprobante = 50;
          
          // Título único sin duplicar con estilo SerGas
          doc.rect(40, yPosComprobante, 515, 25)
             .fill('#f8f9fa')
             .stroke('#FFC107');
          
          doc.rect(40, yPosComprobante, 4, 25)
             .fill('#FFC107');
          
          doc.fillColor('#1A1A1A')
             .fontSize(14)
             .font('Helvetica-Bold')
             .text('COMPROBANTE DE PAGO', 52, yPosComprobante + 8);
          
          yPosComprobante += 35;
          
          doc.fillColor('#E53E3E')
             .fontSize(11)
             .font('Helvetica-Bold')
             .text('ARCHIVO NO ENCONTRADO', 50, yPosComprobante);
          
          doc.fillColor('#666')
             .fontSize(10)
             .text(`Se esperaba el archivo: ${invoice.payment_proof}`, 50, yPosComprobante + 20);
        }
      } catch (error) {
        console.error('Error procesando comprobante:', error);
        // Nueva página para mostrar el error
        doc.addPage();
        let yPosComprobante = 50;
        
        // Título único con estilo SerGas
        doc.rect(40, yPosComprobante, 515, 25)
           .fill('#f8f9fa')
           .stroke('#FFC107');
        
        doc.rect(40, yPosComprobante, 4, 25)
           .fill('#FFC107');
        
        doc.fillColor('#1A1A1A')
           .fontSize(14)
           .font('Helvetica-Bold')
           .text('COMPROBANTE DE PAGO', 52, yPosComprobante + 8);
        
        yPosComprobante += 35;
        
        doc.fillColor('#E53E3E')
           .fontSize(11)
           .text('ERROR AL PROCESAR COMPROBANTE', 50, yPosComprobante);
      }
    } else {
      // Nueva página para indicar que no hay comprobante
      doc.addPage();
      let yPosComprobante = 50;
      
      // Título único con estilo SerGas
      doc.rect(40, yPosComprobante, 515, 25)
         .fill('#f8f9fa')
         .stroke('#FFC107');
      
      doc.rect(40, yPosComprobante, 4, 25)
         .fill('#FFC107');
      
      doc.fillColor('#1A1A1A')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('COMPROBANTE DE PAGO', 52, yPosComprobante + 8);
      
      yPosComprobante += 35;
      
      doc.fillColor('#FFC107')
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('NO HAY COMPROBANTE ADJUNTO', 50, yPosComprobante);
      
      doc.fillColor('#666')
         .fontSize(10)
         .text('Esta factura no tiene un comprobante de pago cargado.', 50, yPosComprobante + 20);
    }

    doc.end();

  } catch (error) {
    console.error('Error generando PDF:', error);
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
    const currentMonth = parseInt(month) || (new Date().getMonth() + 1);
    const currentYear = parseInt(year) || new Date().getFullYear();

    // Fecha del mes actual
    const startDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
    const endDate = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];

    // Calcular mes anterior
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const prevStartDate = `${previousYear}-${previousMonth.toString().padStart(2, '0')}-01`;
    const prevEndDate = new Date(previousYear, previousMonth, 0).toISOString().split('T')[0];

    // Resumen del mes actual
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
    const totalInvoices = summary.reduce((acc, item) => acc + parseInt(item.dataValues.count), 0);

    // Total del mes anterior
        const previousMonthData = await Invoice.findOne({
          where: {
            invoice_date: {
              [Op.between]: [prevStartDate, prevEndDate]
            }
          },
          attributes: [
            [require('sequelize').fn('SUM', require('sequelize').col('total_amount')), 'total']
          ],
          raw: true
        });

        const previousMonthTotal = previousMonthData?.total 
          ? parseFloat(previousMonthData.total) 
          : 0;

    // Calcular diferencia y porcentaje
    const difference = totalAmount - previousMonthTotal;
    const percentageChange = previousMonthTotal > 0 
      ? ((difference / previousMonthTotal) * 100).toFixed(1)
      : (totalAmount > 0 ? 100 : 0);

    res.json({
      success: true,
      data: {
        period: `${currentMonth}/${currentYear}`,
        categories: summary,
        total_amount: totalAmount,
        total_invoices: totalInvoices,
        previous_month_total: previousMonthTotal,
        difference: difference,
        percentage_change: parseFloat(percentageChange)
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