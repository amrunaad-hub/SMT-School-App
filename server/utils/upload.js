const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const UPLOAD_ROOT = path.join(__dirname, '../uploads');

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

function sanitizeCategory(category) {
  const clean = String(category || 'general').toLowerCase().replace(/[^a-z0-9-]/g, '-');
  return clean || 'general';
}

// One shared multer instance; the category (subfolder) is read from the request
// body, so the storage engine's `destination` needs the raw body to already be
// parsed for text fields — multer parses multipart fields incrementally, so
// `req.body.category` is reliably available inside `destination` by the time
// the file field runs, as long as `category` is sent before `file` in the form.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_ROOT, sanitizeCategory(req.body.category));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 10);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error('Unsupported file type. Allowed: PDF, JPG, PNG, DOC, DOCX.'));
    }
    return cb(null, true);
  },
});

function publicUrlFor(filePath) {
  const relative = path.relative(UPLOAD_ROOT, filePath).split(path.sep).join('/');
  return `/uploads/${relative}`;
}

module.exports = { upload, UPLOAD_ROOT, publicUrlFor, sanitizeCategory };
