import {
  setupBusinessOwner,
  verifyBusinessOwnerSetup,
  loginUser,
  demoLogin as demoLoginService,
  DEMO_SESSION_MS,
  forgotPassword as forgotPasswordService,
  resetPassword as resetPasswordService,
} from '../services/authService.js'
import { loginBlockedUntil, recordLoginFailure, clearLoginFailures } from '../services/loginGuard.js'
import { describeWait, secondsUntil, tooManyRequests } from '../middlewares/rateLimit.js'

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
  const guard = { identifier: req.body.identifier, ip: req.ip }

  try {
    const blockedUntil = await loginBlockedUntil(guard)
    if (blockedUntil) {
      const wait = secondsUntil(blockedUntil)
      return tooManyRequests(
        res,
        wait,
        `Too many wrong passwords. Try again in ${describeWait(wait)}, or use "Forgot password" to set a new one.`
      )
    }

    let result
    try {
      result = await loginUser(req.body)
    } catch (error) {
      if (error.statusCode === 401) await recordLoginFailure(guard)
      throw error
    }

    await clearLoginFailures(guard)

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
          isDemo: Boolean(req.user.isDemo),
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
    await forgotPasswordService({
      email: req.body.email,
    })

    // Always the same answer, whether the email belongs to an account or not. The link itself only ever
    // goes to the account's email address.
    res.status(200).json({
      success: true,
      message:
        'If an account exists with this email, a password reset link has been sent.',
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
export const demoLogin = async (req, res, next) => {
  try {
    const result = await demoLoginService(req.body)

    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite:
        process.env.NODE_ENV === 'production'
          ? 'none'
          : 'lax',
      maxAge: DEMO_SESSION_MS,
    })

    res.status(200).json({
      success: true,
      message: 'Signed in as a demo guest.',
      data: {
        user: result.user,
      },
    })
  } catch (error) {
    next(error)
  }
}
