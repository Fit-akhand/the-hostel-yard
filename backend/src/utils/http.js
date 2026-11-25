import { z } from 'zod'

// Wraps a service call in the usual { success, message, data } answer and passes errors on.
export const handle = (work, { status = 200, message } = {}) => async (req, res, next) => {
  try {
    const data = await work(req, res)
    if (res.headersSent) return
    res.status(status).json({ success: true, ...(message ? { message } : {}), data })
  } catch (error) {
    next(error)
  }
}

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id.')
export const idParam = (name = 'id') => z.object({ [name]: objectId })
export const optionalDate = z.union([z.coerce.date(), z.literal(''), z.null()]).optional().transform((v) => (v ? v : v === undefined ? undefined : null))
export const phoneField = z.string().trim().min(10, 'Enter a valid mobile number.').max(16, 'Enter a valid mobile number.')
