import multer from 'multer'

const storage =
  multer.memoryStorage()

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]

const fileFilter = (
  req,
  file,
  cb
) => {
  if (
    allowedMimeTypes.includes(
      file.mimetype
    )
  ) {
    cb(null, true)
  } else {
    const error = new Error(
      'Only JPG, PNG, WEBP images and PDF files are allowed.'
    )

    error.statusCode = 400

    cb(error)
  }
}

const upload = multer({
  storage,

  limits: {
    fileSize:
      5 * 1024 * 1024,
  },

  fileFilter,
})

export const uploadSingle =
  (fieldName) =>
  upload.single(fieldName)