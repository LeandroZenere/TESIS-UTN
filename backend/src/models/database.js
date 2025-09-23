const { Sequelize } = require('sequelize');
const path = require('path');

// Configuración de la base de datos
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../../database.sqlite'),
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
});

// Función para testear la conexión
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos exitosa');
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error);
  }
};

// Función para sincronizar modelos
const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ force });
    console.log('📊 Base de datos sincronizada');
  } catch (error) {
    console.error('❌ Error sincronizando base de datos:', error);
  }
};

module.exports = {
  sequelize,
  testConnection,
  syncDatabase
};