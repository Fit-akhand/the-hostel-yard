import Payment from '../models/Payment.js'
import Tenant from '../models/Tenant.js'
import Organization from '../models/Organization.js'
import { getPaymentById } from './paymentService.js'
import { nextReceiptNumber } from './receiptNumber.js'

const fail = (message, statusCode) => Object.assign(new Error(message), { statusCode })

// Receipt data for a verified payment. Tenants may open their own, staff those they may see payments for.
export const getReceipt = async ({ user, paymentId }) => {
  if (!user.organization) throw fail('User is not associated with an organization.', 400)

  let payment
  if (user.role === 'TENANT') {
    const tenant = await Tenant.findOne({ user: user._id, organization: user.organization }).select('_id')
    payment = await Payment.findOne({ _id: paymentId, organization: user.organization, tenant: tenant?._id })
    if (!payment) throw fail('Payment not found.', 404)
  } else {
    await getPaymentById({ user, paymentId }) // throws when the user has no access
    payment = await Payment.findOne({ _id: paymentId, organization: user.organization })
  }

  if (payment.status !== 'VERIFIED') throw fail('A receipt is issued once the payment is verified.', 409)

  // Payments verified before receipt numbers existed get theirs the first time a receipt is opened.
  if (!payment.receiptNumber) {
    payment.receiptNumber = await nextReceiptNumber(payment.organization)
    await payment.save()
  }

  await payment.populate([
    { path: 'tenant', select: 'name phone' },
    { path: 'property', select: 'name address city state pincode' },
    { path: 'rentDue', select: 'billingMonth amount paidAmount lateFee' },
    { path: 'verifiedBy', select: 'name' },
  ])
  const organization = await Organization.findById(payment.organization).select('name legalName').lean()

  return {
    receiptNumber: payment.receiptNumber,
    paymentId: payment._id,
    date: payment.verifiedAt || payment.paymentDate,
    paymentDate: payment.paymentDate,
    amount: payment.amount,
    method: payment.method,
    reference: payment.transactionReference,
    notes: payment.notes,
    organization: organization?.legalName || organization?.name,
    property: payment.property,
    tenant: payment.tenant,
    billingMonth: payment.rentDue?.billingMonth,
    rentAmount: (payment.rentDue?.amount || 0) - (payment.rentDue?.lateFee || 0),
    lateFee: payment.rentDue?.lateFee || 0,
    balanceAfter: Math.max(0, (payment.rentDue?.amount || 0) - (payment.rentDue?.paidAmount || 0)),
    receivedBy: payment.verifiedBy?.name || null,
  }
}
