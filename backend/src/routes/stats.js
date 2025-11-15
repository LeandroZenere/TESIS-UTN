const express = require('express');
const router = express.Router();
const { Invoice, Supplier } = require('../models');
const { authenticateToken } = require('../middleware/auth');

// Endpoint para obtener estadísticas del dashboard
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    // Obtener conteo de proveedores activos (solo is_active: true)
    const activeSuppliers = await Supplier.count({
      where: { is_active: true }
    });
    
    // Obtener conteo de facturas pendientes (no pagadas)
    const pendingInvoices = await Invoice.count({
      where: { 
        is_paid: false
      }
    });
    
    // Obtener conteo de facturas pagadas
    const paidInvoices = await Invoice.count({
      where: { 
        is_paid: true
      }
    });

    console.log('📊 Estadísticas calculadas:');
    console.log('  - Proveedores activos:', activeSuppliers);
    console.log('  - Facturas pendientes:', pendingInvoices);
    console.log('  - Facturas pagadas:', paidInvoices);
    console.log('  - Total facturas:', pendingInvoices + paidInvoices);

    res.json({
      success: true,
      data: {
        activeSuppliers,
        pendingInvoices,
        paidInvoices
      }
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas'
    });
  }
});

module.exports = router;