const { DataTypes } = require('sequelize');
const { sequelize } = require('./database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('users', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  full_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'employee'),
    defaultValue: 'employee'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

// Hook para hashear la contraseña antes de crear/actualizar
User.beforeCreate(async (user) => {
  if (user.password) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

User.beforeUpdate(async (user) => {
  if (user.changed('password')) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

// Método para validar contraseña
User.prototype.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Método para obtener datos seguros (sin password)
User.prototype.toSafeObject = function() {
  const { password, ...safeUser } = this.toJSON();
  return safeUser;
};

module.exports = User;