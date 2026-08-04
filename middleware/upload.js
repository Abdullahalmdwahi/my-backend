

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { generateUUID, getFileExtension } = require('../utils/helpers');



const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB

// Ensure upload directories exist
const dirs = [
  UPLOAD_DIR,
  path.join(UPLOAD_DIR, 'products'),
  path.join(UPLOAD_DIR, 'auctions'),
  path.join(UPLOAD_DIR, 'avatars'),
  path.join(UPLOAD_DIR, 'receipts'),
  path.join(UPLOAD_DIR, 'temp'),
];

for (const dir of dirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'temp';
    
    // Determine folder based on field name
    if (file.fieldname === 'productImage' || file.fieldname === 'productImages') {
      folder = 'products';
    } else if (file.fieldname === 'auctionImage' || file.fieldname === 'auctionImages') {
      folder = 'auctions';
    } else if (file.fieldname === 'avatar') {
      folder = 'avatars';
    } else if (file.fieldname === 'receipt') {
      folder = 'receipts';
    }
    
    cb(null, path.join(UPLOAD_DIR, folder));
  },
  filename: (req, file, cb) => {
    const ext = getFileExtension(file.originalname);
    const filename = `${generateUUID()}.${ext}`;
    cb(null, filename);
  },
});



const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('⚠️ نوع الملف غير مدعوم. يُسمح فقط بالصور و PDF'), false);
  }
};



const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10,
  },
  fileFilter,
});


// Single file upload
function uploadSingle(fieldName) {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'FILE_TOO_LARGE') {
            return res.status(413).json({
              success: false,
              message: `⚠️ الملف كبير جداً. الحد الأقصى ${MAX_FILE_SIZE / 1024 / 1024}MB`,
            });
          }
          return res.status(400).json({
            success: false,
            message: `⚠️ خطأ في الرفع: ${err.message}`,
          });
        }
        return res.status(400).json({
          success: false,
          message: `⚠️ ${err.message}`,
        });
      }
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '⚠️ لم يتم رفع أي ملف',
        });
      }
      
      // Add file info to request
      req.uploadedFile = {
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype,
        originalName: req.file.originalname,
        url: `/uploads/${req.file.path.replace(/\\/g, '/').replace('uploads/', '')}`,
      };
      
      next();
    });
  };
}

// Multiple files upload
function uploadMultiple(fieldName, maxCount = 10) {
  return (req, res, next) => {
    upload.array(fieldName, maxCount)(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'FILE_TOO_LARGE') {
            return res.status(413).json({
              success: false,
              message: `⚠️ ملف كبير جداً. الحد الأقصى ${MAX_FILE_SIZE / 1024 / 1024}MB`,
            });
          }
          return res.status(400).json({
            success: false,
            message: `⚠️ خطأ في الرفع: ${err.message}`,
          });
        }
        return res.status(400).json({
          success: false,
          message: `⚠️ ${err.message}`,
        });
      }
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: '⚠️ لم يتم رفع أي ملف',
        });
      }
      
      // Add files info to request
      req.uploadedFiles = req.files.map(file => ({
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
        originalName: file.originalname,
        url: `/uploads/${file.path.replace(/\\/g, '/').replace('uploads/', '')}`,
      }));
      
      next();
    });
  };
}



function deleteUploadedFile(filePath) {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Failed to delete file:', error.message);
    return false;
  }
}



function cleanTempFiles(ageMinutes = 60) {
  try {
    const tempDir = path.join(__dirname, '..', UPLOAD_DIR, 'temp');
    if (!fs.existsSync(tempDir)) return;
    
    const files = fs.readdirSync(tempDir);
    const now = Date.now();
    const maxAge = ageMinutes * 60 * 1000;
    
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Deleted temp file: ${file}`);
      }
    }
  } catch (error) {
    console.error('❌ Failed to clean temp files:', error.message);
  }
}



module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  deleteUploadedFile,
  cleanTempFiles,
  UPLOAD_DIR,
  MAX_FILE_SIZE,
};