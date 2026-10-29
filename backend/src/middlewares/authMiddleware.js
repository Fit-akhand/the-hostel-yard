import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export const protect = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      })
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    )

    const user = await User.findById(decoded.userId)

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists.',
      })
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Your account is not active.',
      })
    }

    // Shared demo guests may look around but never change data.
    if (
      user.isDemo &&
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      !req.originalUrl.startsWith('/api/auth/logout')
    ) {
      return res.status(403).json({
        success: false,
        message:
          'This is a read-only demo. Sign in with your own account to make changes.',
      })
    }

    req.user = user

    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication.',
    })
  }
}