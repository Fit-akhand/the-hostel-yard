import {
  setupBusinessOwner,
  verifyBusinessOwnerSetup,
  loginUser,
  forgotPassword as forgotPasswordService,
  resetPassword as resetPasswordService,
} from '../services/authService.js'

export const setupOwner = async (req, res, next) => {
  try {
    const result = await setupBusinessOwner(req.body)

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        verificationId: result.verificationId,
        expiresIn: result.expiresIn,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const verifyOwnerSetup = async (req, res, next) => {
  try {
    const result = await verifyBusinessOwnerSetup(req.body)

    res.status(201).json({
      success: true,
      message: 'Business Owner account created successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export const login = async (req, res, next) => {
  try {
    const result = await loginUser(req.body)

    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite:
        process.env.NODE_ENV === 'production'
          ? 'none'
          : 'lax',
      maxAge: 15 * 60 * 1000,
    })

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user: result.user,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user._id,
          name: req.user.name,
          phone: req.user.phone,
          email: req.user.email,
          role: req.user.role,
          organization: req.user.organization,
          profilePhoto: req.user.profilePhoto,
          isPhoneVerified: req.user.isPhoneVerified,
          isEmailVerified: req.user.isEmailVerified,
          status: req.user.status,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

export const logout = async (req, res, next) => {
  try {
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite:
        process.env.NODE_ENV === 'production'
          ? 'none'
          : 'lax',
    })

    res.status(200).json({
      success: true,
      message: 'Logout successful.',
    })
  } catch (error) {
    next(error)
  }
}

export const ownerTest = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Business Owner authorization successful.',
    data: {
      userId: req.user._id,
      role: req.user.role,
      organization: req.user.organization,
    },
  })
}

export const forgotPassword = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await forgotPasswordService({
        email: req.body.email,
      })

    // Always return the same response,
    // whether the email exists or not.
    res.status(200).json({
  success: true,
  message:
    'If an account exists with this email, a password reset link has been sent.',
  data: result || undefined,
})
  } catch (error) {
    next(error)
  }
}

export const resetPassword =
  async (req, res, next) => {
    try {
      await resetPasswordService({
        token: req.body.token,
        password: req.body.password,
      })

      res.status(200).json({
        success: true,
        message:
          'Password reset successfully. Please login again.',
      })
    } catch (error) {
      next(error)
    }
  }