import {
  createAnnouncement as createAnnouncementService,
  getAnnouncements as getAnnouncementsService,
  getAnnouncementById as getAnnouncementByIdService,
  updateAnnouncement as updateAnnouncementService,
  deleteAnnouncement as deleteAnnouncementService,
  publishAnnouncement as publishAnnouncementService,
  cancelAnnouncement as cancelAnnouncementService,
} from '../services/announcementService.js'

// --------------------------------------------------
// CREATE
// --------------------------------------------------

export const createAnnouncement =
  async (req, res, next) => {
    try {
      const announcement =
        await createAnnouncementService({
          user: req.user,
          data: req.body,
        })

      return res.status(201).json({
        success: true,
        message:
          'Announcement created successfully.',
        announcement,
      })
    } catch (error) {
      next(error)
    }
  }

// --------------------------------------------------
// LIST
// --------------------------------------------------

export const getAnnouncements =
  async (req, res, next) => {
    try {
      const announcements =
        await getAnnouncementsService({
          user: req.user,
          query: req.query,
        })

      return res.status(200).json({
        success: true,
        count: announcements.length,
        announcements,
      })
    } catch (error) {
      next(error)
    }
  }

// --------------------------------------------------
// GET ONE
// --------------------------------------------------

export const getAnnouncementById =
  async (req, res, next) => {
    try {
      const announcement =
        await getAnnouncementByIdService({
          user: req.user,
          announcementId:
            req.params.announcementId,
        })

      return res.status(200).json({
        success: true,
        announcement,
      })
    } catch (error) {
      next(error)
    }
  }

// --------------------------------------------------
// UPDATE
// --------------------------------------------------

export const updateAnnouncement =
  async (req, res, next) => {
    try {
      const announcement =
        await updateAnnouncementService({
          user: req.user,
          announcementId:
            req.params.announcementId,
          data: req.body,
        })

      return res.status(200).json({
        success: true,
        message:
          'Announcement updated successfully.',
        announcement,
      })
    } catch (error) {
      next(error)
    }
  }

// --------------------------------------------------
// DELETE
// --------------------------------------------------

export const deleteAnnouncement =
  async (req, res, next) => {
    try {
      await deleteAnnouncementService({
        user: req.user,
        announcementId:
          req.params.announcementId,
      })

      return res.status(200).json({
        success: true,
        message:
          'Announcement deleted successfully.',
      })
    } catch (error) {
      next(error)
    }
  }

// --------------------------------------------------
// PUBLISH
// --------------------------------------------------

export const publishAnnouncement =
  async (req, res, next) => {
    try {
      const announcement =
        await publishAnnouncementService({
          user: req.user,
          announcementId:
            req.params.announcementId,
          expiresAt:
            req.body.expiresAt,
        })

      return res.status(200).json({
        success: true,
        message:
          'Announcement published successfully.',
        announcement,
      })
    } catch (error) {
      next(error)
    }
  }

// --------------------------------------------------
// CANCEL
// --------------------------------------------------

export const cancelAnnouncement =
  async (req, res, next) => {
    try {
      const announcement =
        await cancelAnnouncementService({
          user: req.user,
          announcementId:
            req.params.announcementId,
        })

      return res.status(200).json({
        success: true,
        message:
          'Announcement cancelled successfully.',
        announcement,
      })
    } catch (error) {
      next(error)
    }
  }