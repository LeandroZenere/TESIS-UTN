const { DataTypes } = require('sequelize');
const { sequelize } = require('./database');

const Invoice = sequelize.define('invoices', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  supplier_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'suppliers',
      key: 'id'
    }
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  invoice_number: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  invoice_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  invoice_type: {
    type: DataTypes.ENUM('A', 'B', 'C'),
    allowNull: false
  },
  payment_type: {
    type: DataTypes.ENUM('contado', 'cuenta_corriente'),
    allowNull: false
  },
  
  // Importes fiscales
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  iva_21: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  iva_27: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  iva_105: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  perc_iva: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  perc_iibb: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  otros_impuestos: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  total_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  
  // Categorización del gasto
  expense_category: {
    type: DataTypes.STRING(100),
    allowNull: false // ej: "Servicios", "Insumos", "Mantenimiento"
  },
  expense_subcategory: {
    type: DataTypes.STRING(100),
    allowNull: true // ej: "Luz bimestral", "Gas envasado", "Reparación equipos"
  },
  
  // Estados y pagos
  status: {
    type: DataTypes.ENUM('pendiente', 'en_revision', 'observada', 'pagada'),
    defaultValue: 'pendiente'
  },
  is_paid: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  paid_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  paid_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // Archivos adjuntos
  invoice_file: {
    type: DataTypes.STRING(255),
    allowNull: true // Ruta del archivo de la factura
  },
  payment_proof: {
    type: DataTypes.STRING(255),
    allowNull: true // Ruta del comprobante de pago
  },
  
  // Observaciones
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  admin_notes: {
    type: DataTypes.TEXT,
    allowNull: true // Solo el admin puede editarlas
  }
});

// Método para calcular el total automáticamente
Invoice.prototype.calculateTotal = function() {
  const total = parseFloat(this.subtotal || 0) +
               parseFloat(this.iva_21 || 0) +
               parseFloat(this.iva_27 || 0) +
               parseFloat(this.iva_105 || 0) +
               parseFloat(this.perc_iva || 0) +
               parseFloat(this.perc_iibb || 0) +
               parseFloat(this.otros_impuestos || 0);
  
  this.total_amount = total.toFixed(2);
  return this.total_amount;
};

// Método para verificar si está vencida
Invoice.prototype.isOverdue = function() {
  if (!this.due_date || this.is_paid) return false;
  return new Date(this.due_date) < new Date();
};

// Método para obtener días hasta vencimiento
Invoice.prototype.getDaysUntilDue = function() {
  if (!this.due_date || this.is_paid) return null;
  const today = new Date();
  const dueDate = new Date(this.due_date);
  const diffTime = dueDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

module.exports = Invoice;