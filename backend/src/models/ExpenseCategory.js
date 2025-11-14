const { DataTypes } = require('sequelize');
const { sequelize } = require('./database');

const ExpenseCategory = sequelize.define('expense_categories', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  subcategories: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('subcategories');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('subcategories', JSON.stringify(value));
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

module.exports = ExpenseCategory;