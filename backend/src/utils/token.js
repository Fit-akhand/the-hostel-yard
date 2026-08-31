import jwt from 'jsonwebtoken'

const ACCESS_TOKEN_EXPIRES_IN = '15m'

export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
      organizationId: user.organization?.toString() || null,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    }
  )
}