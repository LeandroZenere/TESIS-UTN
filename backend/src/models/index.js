const { sequelize } = require('./database');
const User = require('./User');
const Supplier = require('./Supplier');
const Invoice = require('./Invoice');
const ExpenseCategory = require('./ExpenseCategory');

// Definir las relaciones entre modelos
// Un proveedor puede tener muchas facturas
Supplier.hasMany(Invoice, {
  foreignKey: 'supplier_id',
  as: 'invoices'
});

Invoice.belongsTo(Supplier, {
  foreignKey: 'supplier_id',
  as: 'supplier'
});

// Un usuario puede crear muchas facturas
User.hasMany(Invoice, {
  foreignKey: 'created_by',
  as: 'created_invoices'
});

Invoice.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'creator'
});

// Un usuario puede marcar muchas facturas como pagadas
User.hasMany(Invoice, {
  foreignKey: 'paid_by',
  as: 'paid_invoices'
});

Invoice.belongsTo(User, {
  foreignKey: 'paid_by',
  as: 'paid_by_user'
});

// Función para sincronizar todos los modelos
const syncAllModels = async () => {
  try {
    await sequelize.sync();
    console.log('📊 Todos los modelos sincronizados correctamente');
  } catch (error) {
    console.error('❌ Error sincronizando modelos:', error);
  }
};

// Función para crear usuario administrador por defecto
const createDefaultAdmin = async () => {
  try {
    const adminExists = await User.findOne({ where: { role: 'admin' } });
    
    if (!adminExists) {
      await User.create({
        username: 'admin',
        email: 'admin@gascompany.com',
        password: 'admin123', // Se hasheará automáticamente
        full_name: 'Administrador del Sistema',
        role: 'admin'
      });
      console.log('👤 Usuario administrador creado: admin/admin123');
    }
  } catch (error) {
    console.error('❌ Error creando usuario admin:', error);
  }
};

module.exports = {
  sequelize,
  User,
  Supplier,
  Invoice,
  ExpenseCategory,
  syncAllModels,
  createDefaultAdmin
};