import express from 'express'

import {
  createAnnouncement,
  getAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
  publishAnnouncement,
  cancelAnnouncement,
} from '../controllers/announcementController.js'

import { protect } from '../middlewares/authMiddleware.js'

import {
  validate,
  validateParams,
  validateQuery,
} from '../middlewares/validateMiddleware.js'

import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
  announcementIdParamSchema,
  announcementListQuerySchema,
  publishAnnouncementSchema,
  cancelAnnouncementSchema,
} from '../validators/announcementValidator.js'

const router = express.Router()

// --------------------------------------------------
// LIST
// --------------------------------------------------

router.get(
  '/',
  protect,
  validateQuery(
    announcementListQuerySchema
  ),
  getAnnouncements
)

// --------------------------------------------------
// CREATE
// --------------------------------------------------

router.post(
  '/',
  protect,
  validate(
    createAnnouncementSchema
  ),
  createAnnouncement
)

// --------------------------------------------------
// GET ONE
// --------------------------------------------------

router.get(
  '/:announcementId',
  protect,
  validateParams(
    announcementIdParamSchema
  ),
  getAnnouncementById
)

// --------------------------------------------------
// UPDATE
// --------------------------------------------------

router.patch(
  '/:announcementId',
  protect,
  validateParams(
    announcementIdParamSchema
  ),
  validate(
    updateAnnouncementSchema
  ),
  updateAnnouncement
)

// --------------------------------------------------
// PUBLISH
// --------------------------------------------------

router.post(
  '/:announcementId/publish',
  protect,
  validateParams(
    announcementIdParamSchema
  ),
  validate(
    publishAnnouncementSchema
  ),
  publishAnnouncement
)

// --------------------------------------------------
// CANCEL
// --------------------------------------------------

router.post(
  '/:announcementId/cancel',
  protect,
  validateParams(
    announcementIdParamSchema
  ),
  validate(
    cancelAnnouncementSchema
  ),
  cancelAnnouncement
)

// --------------------------------------------------
// DELETE
// --------------------------------------------------

router.delete(
  '/:announcementId',
  protect,
  validateParams(
    announcementIdParamSchema
  ),
  deleteAnnouncement
)

export default router