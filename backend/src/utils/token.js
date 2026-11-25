import jwt from 'jsonwebtoken'

const ACCESS_TOKEN_EXPIRES_IN = '15m'

export const generateAccessToken = (
  user,
  expiresIn = ACCESS_TOKEN_EXPIRES_IN
) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
      organizationId: user.organization?.toString() || null,
      // Raised when the password is reset or the account is switched off, which ends every older session.
      tv: user.tokenVersion || 0,
    },
    process.env.JWT_SECRET,
    {
      expiresIn,
    }
  )
}