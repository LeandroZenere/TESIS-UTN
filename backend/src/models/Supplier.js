const { DataTypes } = require('sequelize');
const { sequelize } = require('./database');

const Supplier = sequelize.define('suppliers', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cuit: {
    type: DataTypes.STRING(13), // Formato: XX-XXXXXXXX-X
    allowNull: false,
    unique: true,
    validate: {
      len: [11, 13] // Permite tanto con como sin guiones
    }
  },
  category: {
    type: DataTypes.ENUM('responsable_inscripto', 'monotributista', 'iva_exento'),
    allowNull: false
  },
  business_name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  fiscal_address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  province: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  city: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  postal_code: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

// Método para formatear CUIT
Supplier.prototype.getFormattedCuit = function() {
  const cuit = this.cuit.replace(/\D/g, ''); // Remove non-digits
  if (cuit.length === 11) {
    return `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`;
  }
  return this.cuit;
};

// Método para obtener el tipo de factura según la categoría
Supplier.prototype.getInvoiceType = function() {
  switch (this.category) {
    case 'responsable_inscripto':
      return 'A';
    case 'monotributista':
    case 'iva_exento':
      return 'B/C';
    default:
      return 'B/C';
  }
};

module.exports = Supplier;