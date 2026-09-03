import {
  createBooking as createBookingService,
  getBookings as getBookingsService,
  getBookingById as getBookingByIdService,
  updateBooking as updateBookingService,
  confirmBooking as confirmBookingService,
  cancelBooking as cancelBookingService,
  completeBooking as completeBookingService,
  expirePendingBookings as expirePendingBookingsService,
  deleteBooking as deleteBookingService,
} from '../services/bookingService.js'

import * as bookingService from '../services/bookingService.js'

export const createBooking = async (
  req,
  res,
  next
) => {
  try {
    const booking =
      await createBookingService({
        user: req.user,
        ...req.body,
      })

    res.status(201).json({
      success: true,
      message: 'Booking created successfully.',
      data: booking,
    })
  } catch (error) {
    next(error)
  }
}

export const getBookings = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await getBookingsService({
        user: req.user,
        filters: req.validatedQuery,
      })

    res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export const getBookingById = async (
  req,
  res,
  next
) => {
  try {
    const booking =
      await getBookingByIdService({
        user: req.user,
        bookingId: req.params.id,
      })

    res.status(200).json({
      success: true,
      data: booking,
    })
  } catch (error) {
    next(error)
  }
}

export const updateBooking = async (
  req,
  res,
  next
) => {
  try {
    const booking =
      await updateBookingService({
        user: req.user,
        bookingId: req.params.id,
        ...req.body,
      })

    res.status(200).json({
      success: true,
      message: 'Booking updated successfully.',
      data: booking,
    })
  } catch (error) {
    next(error)
  }
}

export const confirmBooking = async (
  req,
  res,
  next
) => {
  try {
    const booking =
      await confirmBookingService({
        user: req.user,
        bookingId: req.params.id,
      })

    res.status(200).json({
      success: true,
      message: 'Booking confirmed successfully.',
      data: booking,
    })
  } catch (error) {
    next(error)
  }
}

export const cancelBooking = async (
  req,
  res,
  next
) => {
  try {
    const booking =
      await cancelBookingService({
        bookingId: req.params.id,
        user: req.user,
        cancellationReason:
          req.body.cancellationReason,
      })

    res.status(200).json({
      success: true,
      message:
        'Booking cancelled successfully.',
      data: booking,
    })
  } catch (error) {
    next(error)
  }
}

export const completeBooking = async (
  req,
  res,
  next
) => {
  try {
    const booking =
      await completeBookingService({
        user: req.user,
        bookingId: req.params.id,
      })

    res.status(200).json({
      success: true,
      message: 'Booking completed successfully.',
      data: booking,
    })
  } catch (error) {
    next(error)
  }
}

export const expirePendingBookings = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await expirePendingBookingsService({
        user: req.user,
      })

    res.status(200).json({
      success: true,
      message: 'Pending bookings expired successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export const deleteBooking = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await deleteBookingService({
        user: req.user,
        bookingId: req.params.id,
      })

    res.status(200).json({
      success: true,
      message: 'Booking deleted successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}