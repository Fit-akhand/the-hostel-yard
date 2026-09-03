import express from 'express'

import {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaint,
  deleteComplaint,
  assignComplaint,
  changeComplaintStatus,
} from '../controllers/complaintController.js'

import { protect } from '../middlewares/authMiddleware.js'

import {
  validate,
  validateParams,
  validateQuery,
} from '../middlewares/validateMiddleware.js'

import {
  createComplaintSchema,
  updateComplaintSchema,
  complaintIdParamSchema,
  complaintListQuerySchema,
  assignComplaintSchema,
  changeComplaintStatusSchema,
} from '../validators/complaintValidator.js'

const router = express.Router()

/*
|--------------------------------------------------------------------------
| Complaints
|--------------------------------------------------------------------------
*/

// Create
router.post(
  '/',
  protect,
  validate(createComplaintSchema),
  createComplaint
)

// List
router.get(
  '/',
  protect,
  validateQuery(complaintListQuerySchema),
  getComplaints
)

// Get one
router.get(
  '/:complaintId',
  protect,
  validateParams(complaintIdParamSchema),
  getComplaintById
)

// Update
router.patch(
  '/:complaintId',
  protect,
  validateParams(complaintIdParamSchema),
  validate(updateComplaintSchema),
  updateComplaint
)

// Assign
router.post(
  '/:complaintId/assign',
  protect,
  validateParams(complaintIdParamSchema),
  validate(assignComplaintSchema),
  assignComplaint
)

// change status
router.post(
  '/:complaintId/status',
  protect,
  validateParams(complaintIdParamSchema),
  validate(changeComplaintStatusSchema),
  changeComplaintStatus
)

// Delete
router.delete(
  '/:complaintId',
  protect,
  validateParams(complaintIdParamSchema),
  deleteComplaint
)

export default router