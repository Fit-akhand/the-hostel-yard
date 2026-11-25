import { v2 as cloudinary } from 'cloudinary'

// Loads .env first: this file is imported long before the server's own config, and the keys must be
// in place when the SDK is configured.
import './env.js'

cloudinary.config({
  cloud_name:
    process.env.CLOUDINARY_CLOUD_NAME,

  api_key:
    process.env.CLOUDINARY_API_KEY,

  api_secret:
    process.env.CLOUDINARY_API_SECRET,
})

export default cloudinary
