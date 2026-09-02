const sendValidationError = (res, result) => {
  return res.status(400).json({
    success: false,
    message: 'Validation failed.',
    errors: result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  })
}

export const validate = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      return sendValidationError(res, result)
    }

    req.body = result.data

    next()
  }
}

export const validateParams = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.params)

    if (!result.success) {
      return sendValidationError(res, result)
    }

    req.params = result.data

    next()
  }
}

export const validateQuery = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.query)

    if (!result.success) {
      return sendValidationError(res, result)
    }

    req.validatedQuery = result.data

    next()
  }
}