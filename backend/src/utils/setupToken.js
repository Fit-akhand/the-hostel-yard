import jwt from 'jsonwebtoken'

export const generateManagerSetupToken = ({
  userId,
  invitationId,
}) => {
  return jwt.sign(
    {
      userId,
      invitationId,
      purpose: 'MANAGER_PASSWORD_SETUP',
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '10m',
    }
  )
}

export const verifyManagerSetupToken = (token) => {
  const decoded = jwt.verify(
    token,
    process.env.JWT_SECRET
  )

  if (
    decoded.purpose !==
    'MANAGER_PASSWORD_SETUP'
  ) {
    throw new Error('Invalid setup token.')
  }

  return decoded
}