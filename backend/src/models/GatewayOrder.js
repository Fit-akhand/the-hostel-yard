import mongoose from 'mongoose'

// An online payment started by a tenant. The amount is fixed here, on the server, never taken from the browser.
const gatewayOrderSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    rentDue: { type: mongoose.Schema.Types.ObjectId, ref: 'RentDue', required: true },

    provider: { type: String, default: 'razorpay' },
    orderId: { type: String, required: true, unique: true },
    amount: { type: Number, required: true, min: 1 }, // rupees
    status: { type: String, enum: ['CREATED', 'PAID'], default: 'CREATED' },

    paymentId: { type: String, default: null },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
  },
  { timestamps: true }
)

// One gateway payment id can only ever be recorded once.
gatewayOrderSchema.index({ paymentId: 1 }, { unique: true, partialFilterExpression: { paymentId: { $type: 'string' } } })

export default mongoose.model('GatewayOrder', gatewayOrderSchema)
