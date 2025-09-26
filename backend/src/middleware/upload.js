const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Crear directorios si no existen
const uploadsDir = path.join(__dirname, '../../uploads');
const paymentsDir = path.join(uploadsDir, 'payments');
const originalsDir = path.join(uploadsDir, 'originals');


[uploadsDir, paymentsDir, originalsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Directorio creado: ${dir}`);
  } else {
    console.log(`📁 Directorio existe: ${dir}`);
  }
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    
    let destPath = '';
    if (file.fieldname === 'original_invoice') {
      destPath = originalsDir;
    } else if (file.fieldname === 'payment_file') {
      destPath = paymentsDir;
    } else {
      destPath = uploadsDir;
    }
    
    cb(null, destPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    
    let prefix = '';
    if (file.fieldname === 'original_invoice') {
      prefix = 'original-';
    } else if (file.fieldname === 'payment_file') {
      prefix = 'payment-';
    } else {
      prefix = 'file-';
    }
    
    const filename = prefix + uniqueSuffix + extension;
    
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  
  if (file.fieldname === 'original_invoice') {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF para facturas originales'), false);
    }
  } else if (file.fieldname === 'payment_file') {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF, JPG, PNG para comprobantes'), false);
    }
  } else {
    cb(null, true);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB máximo
  }
});

module.exports = upload;