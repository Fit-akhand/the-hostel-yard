import { Readable } from 'stream'

import cloudinary from '../config/cloudinary.js'

// --------------------------------------------------
// UPLOAD BUFFER
// --------------------------------------------------

export const uploadBuffer = ({
  buffer,
  folder,
  resourceType = 'auto',
}) => {
  return new Promise(
    (resolve, reject) => {
      const uploadStream =
        cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type:
              resourceType,
          },

          (error, result) => {
            if (error) {
              reject(error)
              return
            }

            resolve(result)
          }
        )

      Readable.from(buffer).pipe(
        uploadStream
      )
    }
  )
}

// --------------------------------------------------
// DELETE FILE
// --------------------------------------------------

export const deleteUploadedFile =
  async ({
    publicId,
    resourceType = 'image',
  }) => {
    if (!publicId) {
      return
    }

    return cloudinary.uploader.destroy(
      publicId,
      {
        resource_type:
          resourceType,
      }
    )
  }