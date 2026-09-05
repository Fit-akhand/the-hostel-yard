import mongoose from 'mongoose'
import dotenv from 'dotenv'

import { connectDB } from './config/db.js'
import Payment from './models/Payment.js'
import PropertyManagerAssignment from './models/PropertyManagerAssignment.js'
import User from './models/User.js'
import { createNotifications } from './services/notificationService.js'

dotenv.config()

const sunnyId = new mongoose.Types.ObjectId(
  '6a940ee876c873a09dff4b95'
)

const organizationId = new mongoose.Types.ObjectId(
  '6a91dfae9f412a1dc28492e0'
)

const PAYMENT_ID = '6a99840eb9996cdfc352725e'

const run = async () => {
  try {
    await connectDB()

    // ============================================
    // PAYMENT
    // ============================================

    const payment = await Payment.findById(PAYMENT_ID)

    if (!payment) {
      throw new Error('Payment not found')
    }

    // ============================================
    // PROPERTY MANAGERS
    // ============================================

    const assignments = await PropertyManagerAssignment.find({
      property: payment.property,
    }).select('manager property status')

    console.log(
      'ALL ASSIGNMENTS FOR PROPERTY:',
      assignments
    )

    const activeAssignments = assignments.filter(
      (assignment) => assignment.status === 'ACTIVE'
    )

    console.log(
      'ACTIVE ASSIGNMENTS:',
      activeAssignments
    )

    const managerIds = activeAssignments
      .map((assignment) => assignment.manager)
      .filter(Boolean)

    console.log('MANAGER IDS:', managerIds)

    const managers = await User.find({
      _id: { $in: managerIds },
    }).select(
      '_id name email role organization status'
    )

    console.log('ACTIVE MANAGERS:', managers)

    if (!managers.length) {
      throw new Error(
        'No active property manager found'
      )
    }

    // ============================================
    // CREATE NOTIFICATION
    // ============================================

    const notifications = await createNotifications({
      recipients: managers.map(
        (manager) => manager._id
      ),
      organization: payment.organization,
      property: payment.property,
      type: 'PAYMENT_RECEIVED',
      title: 'New Payment Received',
      message: `A rent payment of ₹${payment.amount} has been submitted for verification.`,
      data: {
        paymentId: payment._id,
        tenantId: payment.tenant,
        rentDueId: payment.rentDue,
        amount: payment.amount,
        method: payment.method,
        transactionReference:
          payment.transactionReference,
        status: payment.status,
      },
      createdBy: payment.recordedBy,
    })

    console.log(
      '✅ Notifications created:',
      notifications
    )
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await mongoose.connection.close()
  }
}

run()