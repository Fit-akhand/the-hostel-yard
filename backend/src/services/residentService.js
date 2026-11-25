import Allocation from '../models/Allocation.js'
import FinanceSettings from '../models/FinanceSettings.js'
import { withdrawNotice } from './tenantService.js'
import { createError, daysBetween, notifyStaff, startOfDay, tenantForUser } from './access.js'

const noticePeriodFor = async (organization) =>
  (await FinanceSettings.findOne({ organization }).select('noticePeriodDays').lean())?.noticePeriodDays ?? 30

const activeAllocation = (tenantId) =>
  Allocation.findOne({ tenant: tenantId, status: 'ACTIVE' })
    .populate('room', 'roomNumber type floor')
    .populate('bed', 'bedNumber')
    .lean()

// Everything the resident needs to see about their own stay and the move-out rules.
export const getMyTenancy = async (user) => {
  const tenant = await tenantForUser(user)
  const [allocation, noticePeriodDays] = await Promise.all([
    activeAllocation(tenant._id),
    noticePeriodFor(tenant.organization),
  ])

  const earliestMoveOut = new Date(startOfDay())
  earliestMoveOut.setDate(earliestMoveOut.getDate() + noticePeriodDays)

  return {
    tenant: {
      _id: tenant._id,
      name: tenant.name,
      status: tenant.status,
      moveInDate: tenant.moveInDate,
      noticeDate: tenant.noticeDate,
      expectedMoveOutDate: tenant.expectedMoveOutDate,
      actualMoveOutDate: tenant.actualMoveOutDate,
      noticeGivenBy: tenant.noticeGivenBy,
      moveOutReason: tenant.moveOutReason,
      property: tenant.property,
    },
    allocation,
    noticePeriodDays,
    earliestMoveOut,
  }
}

// The resident gives notice. A date sooner than the notice period is allowed (the owner decides what
// that means for the deposit) but the shortfall is recorded and shown to the owner.
export const giveMyNotice = async (user, { expectedMoveOutDate, reason }) => {
  const tenant = await tenantForUser(user)

  if (tenant.status === 'LEFT') throw createError('You have already moved out.', 400)
  if (tenant.status === 'NOTICE_PERIOD') throw createError('You have already given notice. Withdraw it first to change the date.', 400)

  const moveOut = startOfDay(expectedMoveOutDate)
  if (Number.isNaN(moveOut.getTime())) throw createError('Choose a valid move-out date.', 400)
  if (moveOut < startOfDay()) throw createError('The move-out date cannot be in the past.', 400)
  if (moveOut <= startOfDay(tenant.moveInDate)) throw createError('The move-out date must be after your move-in date.', 400)

  const noticePeriodDays = await noticePeriodFor(tenant.organization)
  const shortBy = Math.max(0, noticePeriodDays - daysBetween(new Date(), moveOut))

  tenant.status = 'NOTICE_PERIOD'
  tenant.noticeDate = new Date()
  tenant.expectedMoveOutDate = moveOut
  tenant.noticeGivenBy = 'TENANT'
  tenant.moveOutReason = reason?.trim() || null
  await tenant.save()

  const allocation = await activeAllocation(tenant._id)
  const propertyName = tenant.property?.name || 'the property'
  notifyStaff({
    organization: tenant.organization,
    property: tenant.property?._id || tenant.property,
    type: 'MOVE_OUT_NOTICE',
    title: 'Move-out notice',
    message: `${tenant.name} will move out on ${moveOut.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}${shortBy ? ` (${shortBy} days short of notice)` : ''}.`,
    data: { tenantId: tenant._id },
    vars: { name: tenant.name, property: propertyName, room: allocation?.room?.roomNumber, moveOutDate: moveOut, reason: tenant.moveOutReason, shortBy },
    dedupeKey: `move-out:${tenant._id}:${moveOut.toISOString().slice(0, 10)}`,
  })

  return { tenant, shortBy, noticePeriodDays }
}

export const withdrawMyNotice = async (user) => {
  const tenant = await tenantForUser(user)
  if (tenant.noticeGivenBy && tenant.noticeGivenBy !== 'TENANT') {
    throw createError('Your notice was recorded by the management. Please ask them to change it.', 400)
  }
  await withdrawNotice(tenant)

  notifyStaff({
    organization: tenant.organization,
    property: tenant.property?._id || tenant.property,
    type: 'MOVE_OUT_NOTICE',
    title: 'Notice withdrawn',
    message: `${tenant.name} withdrew their move-out notice and is staying on.`,
    data: { tenantId: tenant._id },
    external: false,
  })

  return tenant
}
