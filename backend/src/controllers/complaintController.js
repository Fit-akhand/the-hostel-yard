import {
  createComplaint as createComplaintService,
  getComplaints as getComplaintsService,
  getComplaintById as getComplaintByIdService,
  updateComplaint as updateComplaintService,
  deleteComplaint as deleteComplaintService,
  assignComplaint as assignComplaintService,
  changeComplaintStatus as changeComplaintStatusService,
} from '../services/complaintService.js'

export const createComplaint = async (
  req,
  res,
  next
) => {
  try {
    const complaint =
      await createComplaintService({
        user: req.user,
        data: req.body,
      })

    res.status(201).json({
      success: true,
      message: 'Complaint created successfully.',
      complaint,
    })
  } catch (error) {
    next(error)
  }
}

export const getComplaints = async (
  req,
  res,
  next
) => {
  try {
    const complaints =
      await getComplaintsService({
        user: req.user,
        filters: req.query,
      })

    res.status(200).json({
      success: true,
      count: complaints.length,
      complaints,
    })
  } catch (error) {
    next(error)
  }
}

export const getComplaintById = async (
  req,
  res,
  next
) => {
  try {
    const complaint =
      await getComplaintByIdService({
        user: req.user,
        complaintId: req.params.complaintId,
      })

    res.status(200).json({
      success: true,
      complaint,
    })
  } catch (error) {
    next(error)
  }
}

export const updateComplaint = async (
  req,
  res,
  next
) => {
  try {
    const complaint =
      await updateComplaintService({
        user: req.user,
        complaintId: req.params.complaintId,
        data: req.body,
      })

    res.status(200).json({
      success: true,
      message: 'Complaint updated successfully.',
      complaint,
    })
  } catch (error) {
    next(error)
  }
}

export const deleteComplaint = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await deleteComplaintService({
        user: req.user,
        complaintId: req.params.complaintId,
      })

    res.status(200).json({
      success: true,
      ...result,
    })
  } catch (error) {
    next(error)
  }
}

export const assignComplaint = async (
  req,
  res,
  next
) => {
  try {
    const complaint =
      await assignComplaintService({
        user: req.user,
        complaintId: req.params.complaintId,
        assignedTo: req.body.assignedTo,
      })

    res.status(200).json({
      success: true,
      message: 'Complaint assigned successfully.',
      complaint,
    })
  } catch (error) {
    next(error)
  }
}

export const changeComplaintStatus = async (
  req,
  res,
  next
) => {
  try {
    const complaint =
      await changeComplaintStatusService({
        user: req.user,
        complaintId: req.params.complaintId,
        status: req.body.status,
        resolutionNotes:
          req.body.resolutionNotes,
      })

    res.status(200).json({
      success: true,
      message: 'Complaint status updated successfully.',
      complaint,
    })
  } catch (error) {
    next(error)
  }
}