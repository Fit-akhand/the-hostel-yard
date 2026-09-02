export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Resource not found.',
  })
}

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err)
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid resource ID.',
    })
  }

  const statusCode = err.statusCode || 500
  const isProduction = process.env.NODE_ENV === 'production'

  if (!isProduction && statusCode === 500) {
    console.error(err)
  }

  const message =
    statusCode === 500 && isProduction
      ? 'Internal server error.'
      : err.message || 'Internal server error.'

  res.status(statusCode).json({
    success: false,
    message,
  })
}
