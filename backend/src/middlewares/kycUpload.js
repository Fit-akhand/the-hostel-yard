import multer from 'multer'

import { KYC_MAX_BYTES, KYC_MIME_TYPES } from '../services/kycStorage.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: KYC_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (KYC_MIME_TYPES.includes(file.mimetype)) return cb(null, true)
    const error = new Error('Only JPG, PNG, WEBP images and PDF files are allowed.')
    error.statusCode = 400
    return cb(error)
  },
})

// One file in the "file" field. Upload problems come back as a clear 400 instead of a server error.
export const kycUpload = (req, res, next) =>
  upload.single('file')(req, res, (error) => {
    if (!error) return next()
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'The file is larger than 4 MB. Take a smaller photo or compress the PDF.'
      : error.message || 'The file could not be uploaded.'
    return res.status(error.statusCode || 400).json({ success: false, message })
  })
