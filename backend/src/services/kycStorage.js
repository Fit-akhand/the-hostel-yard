import cloudinary from '../config/cloudinary.js'
import StoredFile from '../models/StoredFile.js'

// ID documents are personal data. With Cloudinary they are uploaded as *private* assets (no public URL);
// without it they are kept in the database. Either way they are only reachable through signed-in routes,
// which check access first and then hand out a link that expires in five minutes.

export const KYC_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
export const KYC_MAX_BYTES = 4 * 1024 * 1024 // Vercel accepts request bodies up to 4.5 MB.

const cloudinaryReady = () =>
  Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)

export const saveKycFile = async ({ organization, tenantId, buffer, mimeType }) => {
  if (cloudinaryReady()) {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `the-hostel-yard/kyc/${organization}/${tenantId}`, resource_type: 'image', type: 'private' },
        (error, uploaded) => (error ? reject(error) : resolve(uploaded))
      )
      stream.end(buffer)
    })
    return {
      storage: 'cloudinary',
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format,
      bytes: result.bytes,
    }
  }

  const file = await StoredFile.create({ organization, data: buffer, mimeType, bytes: buffer.length })
  return { storage: 'database', fileId: file._id, bytes: buffer.length }
}

export const sendKycFile = async (res, doc) => {
  res.set('Cache-Control', 'private, no-store')

  if (doc.storage === 'cloudinary') {
    const url = cloudinary.utils.private_download_url(doc.publicId, doc.format, {
      resource_type: doc.resourceType || 'image',
      type: 'private',
      expires_at: Math.floor(Date.now() / 1000) + 300,
    })
    return res.redirect(302, url)
  }

  const file = await StoredFile.findById(doc.fileId).lean()
  if (!file) return res.status(404).json({ success: false, message: 'File not found.' })
  // Let the browser show images and PDFs inline; the API's strict content policy would block its PDF viewer.
  res.removeHeader('Content-Security-Policy')
  res.type(file.mimeType)
  res.set('Content-Disposition', 'inline')
  return res.send(Buffer.from(file.data.buffer || file.data))
}

export const deleteKycFile = async (doc) => {
  try {
    if (doc.storage === 'cloudinary' && doc.publicId) {
      await cloudinary.uploader.destroy(doc.publicId, { resource_type: doc.resourceType || 'image', type: 'private', invalidate: true })
    }
    if (doc.storage === 'database' && doc.fileId) {
      await StoredFile.deleteOne({ _id: doc.fileId })
    }
  } catch (error) {
    console.error('[kyc] could not delete an old file:', error.message)
  }
}
