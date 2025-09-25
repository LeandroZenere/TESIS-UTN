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

// GET /api/invoices/:id/report - Generar reporte con comprobante embebido
router.get('/:id/report', async (req, res) => {

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


    // Solo permitir acceso al creador, admin, o si es una factura pagada
    if (req.user.role !== 'admin' && req.user.id !== invoice.created_by && !invoice.is_paid) {
      return res.status(403).json({
        success: false,
        message: 'Sin permisos para ver este reporte'
      });
    }

    // Convertir comprobante a base64 si existe
    let paymentProofBase64 = null;
    let paymentProofType = null;
    
    if (invoice.payment_proof) {
      try {
        const paymentFilePath = path.join(__dirname, '../../uploads/payments', invoice.payment_proof);
        console.log('DEBUG REPORTE: Buscando comprobante en:', paymentFilePath);
        console.log('DEBUG REPORTE: Archivo existe?', fs.existsSync(paymentFilePath));
        
        if (fs.existsSync(paymentFilePath)) {
          const fileBuffer = fs.readFileSync(paymentFilePath);
          paymentProofBase64 = fileBuffer.toString('base64');
          
          // Determinar tipo de archivo
          const fileExt = path.extname(invoice.payment_proof).toLowerCase();
          if (['.jpg', '.jpeg'].includes(fileExt)) {
            paymentProofType = 'image/jpeg';
          } else if (fileExt === '.png') {
            paymentProofType = 'image/png';
          } else if (fileExt === '.pdf') {
            paymentProofType = 'application/pdf';
          }
          
          console.log('DEBUG: Comprobante convertido a base64, tipo:', paymentProofType);
        } else {
          console.log('DEBUG: Archivo de comprobante no encontrado');
        }
      } catch (error) {
        console.error('Error procesando comprobante:', error);
      }
    }

// Generar HTML del reporte con comprobante embebido
const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte de Factura ${invoice.invoice_number}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .report-container {
            background-color: white;
            max-width: 800px;
            margin: 0 auto;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header { 
            text-align: center; 
            border-bottom: 3px solid #333; 
            padding: 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .header h1 { margin: 0 0 10px 0; font-size: 28px; }
        .header h2 { margin: 0; font-size: 24px; font-weight: normal; }
        
        .content { padding: 30px; }
        
        .info-section { 
            margin-bottom: 30px;
        }
        .info-section h3 { 
            color: #333; 
            border-bottom: 2px solid #667eea; 
            padding-bottom: 5px;
            margin-bottom: 15px;
        }
        
        .info-grid { 
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .info-item { 
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
        }
        .info-item strong { 
            display: block;
            color: #495057;
            font-size: 12px;
            margin-bottom: 5px;
        }
        .info-item span {
            font-size: 14px;
            color: #212529;
        }
        
        .status { 
            color: #28a745; 
            font-weight: bold; 
            font-size: 16px;
        }
        
        .payment-section { 
            margin-top: 30px; 
            padding: 20px; 
            border-radius: 8px;
            border: 2px solid #dee2e6;
        }
        .with-payment { 
            background-color: #d4edda; 
            border-color: #28a745;
        }
        .without-payment { 
            background-color: #fff3cd; 
            border-color: #ffc107;
        }
        
        .payment-proof-container {
            margin-top: 20px;
            text-align: center;
        }
        .payment-proof-container img {
            max-width: 100%;
            max-height: 400px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .payment-proof-container embed {
            width: 100%;
            height: 500px;
            border-radius: 8px;
        }
        
        .footer { 
            margin-top: 40px; 
            padding-top: 20px; 
            border-top: 1px solid #dee2e6; 
            font-size: 12px; 
            color: #6c757d;
            text-align: center;
        }
        
        .financial-details {
            background-color: #e8f4fd;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .total-amount {
            font-size: 18px;
            font-weight: bold;
            color: #0056b3;
            text-align: center;
            padding: 10px;
            background-color: white;
            border-radius: 5px;
            margin-top: 10px;
        }

        /* Botón para generar PDF */
        .pdf-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #007bff;
            color: white;
            border: none;
            padding: 12px 18px;
            border-radius: 5px;
            cursor: pointer;
            z-index: 1000;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }
        
        .pdf-button:hover {
            background: #0056b3;
        }

        @media print {
            body { background-color: white; }
            .report-container { box-shadow: none; }
            .payment-proof-container img { max-height: 300px; }
            .pdf-button { display: none !important; }
            .header {
                background: #667eea !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <!-- Botón para generar PDF -->
    <button class="pdf-button" onclick="window.print()">🖨️ Generar PDF</button>
    
    <div class="report-container">
        <div class="header">
            <h1>REPORTE DE FACTURA</h1>
            <h2>${invoice.invoice_number}</h2>
        </div>
        
        <div class="content">
            <!-- Información del Proveedor -->
            <div class="info-section">
                <h3>📋 Información del Proveedor</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <strong>RAZÓN SOCIAL</strong>
                        <span>${invoice.supplier.business_name}</span>
                    </div>
                    <div class="info-item">
                        <strong>CUIT</strong>
                        <span>${invoice.supplier.cuit}</span>
                    </div>
                    <div class="info-item">
                        <strong>CATEGORÍA</strong>
                        <span>${invoice.supplier.category}</span>
                    </div>
                    <div class="info-item">
                        <strong>TELÉFONO</strong>
                        <span>${invoice.supplier.phone || 'N/A'}</span>
                    </div>
                </div>
            </div>
            
            <!-- Información de la Factura -->
            <div class="info-section">
                <h3>🧾 Detalles de la Factura</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <strong>NÚMERO DE FACTURA</strong>
                        <span>${invoice.invoice_number}</span>
                    </div>
                    <div class="info-item">
                        <strong>FECHA DE EMISIÓN</strong>
                        <span>${new Date(invoice.invoice_date).toLocaleDateString('es-ES')}</span>
                    </div>
                    <div class="info-item">
                        <strong>FECHA DE VENCIMIENTO</strong>
                        <span>${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('es-ES') : 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <strong>TIPO DE PAGO</strong>
                        <span>${invoice.payment_type}</span>
                    </div>
                    <div class="info-item">
                        <strong>CATEGORÍA</strong>
                        <span>${invoice.expense_category}</span>
                    </div>
                    <div class="info-item">
                        <strong>SUBCATEGORÍA</strong>
                        <span>${invoice.expense_subcategory || 'N/A'}</span>
                    </div>
                </div>
            </div>
            
            <!-- Detalles Financieros -->
            <div class="financial-details">
                <h3 style="margin-top: 0;">💰 Detalles Financieros</h3>
                <div class="info-grid">
                    ${invoice.subtotal > 0 ? `<div class="info-item">
                        <strong>SUBTOTAL</strong>
                        <span>$${parseFloat(invoice.subtotal).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                    </div>` : ''}
                    ${invoice.iva_21 > 0 ? `<div class="info-item">
                        <strong>IVA 21%</strong>
                        <span>$${parseFloat(invoice.iva_21).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                    </div>` : ''}
                    ${invoice.iva_27 > 0 ? `<div class="info-item">
                        <strong>IVA 27%</strong>
                        <span>$${parseFloat(invoice.iva_27).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                    </div>` : ''}
                    ${invoice.iva_105 > 0 ? `<div class="info-item">
                        <strong>IVA 10.5%</strong>
                        <span>$${parseFloat(invoice.iva_105).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                    </div>` : ''}
                    ${invoice.perc_iva > 0 ? `<div class="info-item">
                        <strong>PERC. IVA</strong>
                        <span>$${parseFloat(invoice.perc_iva).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                    </div>` : ''}
                    ${invoice.perc_iibb > 0 ? `<div class="info-item">
                        <strong>PERC. IIBB</strong>
                        <span>$${parseFloat(invoice.perc_iibb).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                    </div>` : ''}
                    ${invoice.otros_impuestos > 0 ? `<div class="info-item">
                        <strong>OTROS/NO GRAVADO</strong>
                        <span>$${parseFloat(invoice.otros_impuestos).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                    </div>` : ''}
                </div>
                <div class="total-amount">
                    TOTAL: $${parseFloat(invoice.total_amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </div>
            </div>
            
            <!-- Estado y Pago -->
            <div class="info-section">
                <h3>📊 Estado del Pago</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <strong>ESTADO</strong>
                        <span class="status">${invoice.is_paid ? 'PAGADA' : 'PENDIENTE'}</span>
                    </div>
                    ${invoice.is_paid && invoice.paid_date ? `<div class="info-item">
                        <strong>FECHA DE PAGO</strong>
                        <span>${new Date(invoice.paid_date).toLocaleDateString('es-ES')}</span>
                    </div>` : ''}
                    ${invoice.paid_by_user ? `<div class="info-item">
                        <strong>PAGADA POR</strong>
                        <span>${invoice.paid_by_user.full_name} (${invoice.paid_by_user.username})</span>
                    </div>` : ''}
                </div>
                
                ${invoice.notes ? `<div class="info-item" style="grid-column: 1 / -1; margin-top: 15px;">
                    <strong>OBSERVACIONES</strong>
                    <span>${invoice.notes}</span>
                </div>` : ''}
            </div>
            
            <!-- Comprobante de Pago -->
            <div class="payment-section ${paymentProofBase64 ? 'with-payment' : 'without-payment'}">
                <h3>📎 Comprobante de Pago</h3>
                ${paymentProofBase64 ? `
                    <p><strong>Estado:</strong> ✅ Comprobante adjunto</p>
                    <p><strong>Archivo:</strong> ${invoice.payment_proof}</p>
                    <div class="payment-proof-container">
                        ${paymentProofType === 'application/pdf' ? 
                            `<embed src="data:${paymentProofType};base64,${paymentProofBase64}" type="application/pdf" />` :
                            `<img src="data:${paymentProofType};base64,${paymentProofBase64}" alt="Comprobante de Pago" />`
                        }
                    </div>
                ` : `
                    <p><strong>Estado:</strong> ⚠️ No hay comprobante de pago adjunto</p>
                    <p><em>El comprobante puede ser cargado posteriormente por el administrador a través del sistema de gestión.</em></p>
                `}
            </div>
            
            <div class="footer">
                <p><strong>Reporte generado el:</strong> ${new Date().toLocaleString('es-ES')}</p>
                <p><strong>Sistema de Gestión de Facturas</strong> - Versión 1.0</p>
                <p>Este reporte incluye toda la información disponible al momento de la generación.</p>
                ${invoice.creator ? `<p><strong>Factura cargada por:</strong> ${invoice.creator.full_name} (${invoice.creator.username})</p>` : ''}
            </div>
        </div>
    </div>
    
    <script>
        window.addEventListener('load', function() {
            console.log('Reporte cargado correctamente. Use el botón "Generar PDF" para imprimir.');
        });
    </script>
</body>
</html>
`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="reporte_factura_${invoice.invoice_number.replace(/[\/\\:*?"<>|]/g, '_')}.html"`);
    res.send(htmlContent);
console.log('DEBUG HTML LENGTH:', htmlContent.length);
console.log('DEBUG HTML PREVIEW:', htmlContent.substring(0, 1000));
  } catch (error) {
    console.error('Error generando reporte:', error);
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