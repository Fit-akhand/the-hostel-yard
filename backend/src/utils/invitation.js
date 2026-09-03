import crypto from 'crypto'

export const generateInvitationToken = () => {
  return crypto.randomBytes(32).toString('hex')
}

export const hashInvitationToken = (
  token
) => {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex')
}