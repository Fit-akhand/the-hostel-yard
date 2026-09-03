import crypto from 'crypto'

export const generateInvitationToken = () => {
  const token = crypto.randomBytes(32).toString('hex')

  const tokenHash = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex')

  return {
    token,
    tokenHash,
  }
}

export const hashInvitationToken = (token) => {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex')
}