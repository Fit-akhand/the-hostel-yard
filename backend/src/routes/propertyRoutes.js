import express from 'express'

import {
  createProperty,
  getProperties,
  getPropertyById,
  updateProperty,
  deactivateProperty,
} from '../controllers/propertyController.js'

import {
  createPropertySchema,
  updatePropertySchema,
} from '../validators/propertyValidator.js'

import { protect } from '../middlewares/authMiddleware.js'

import { authorizeRoles } from '../middlewares/roleMiddleware.js'

import { validate } from '../middlewares/validateMiddleware.js'

const router = express.Router()

router.post(
  '/',
  protect,
  authorizeRoles('BUSINESS_OWNER', 'LANDLORD'),
  validate(createPropertySchema),
  createProperty
)

router.get(
  '/',
  protect,
  authorizeRoles(
    'BUSINESS_OWNER',
    'LANDLORD',
    'PROPERTY_MANAGER'
  ),
  getProperties
)

router.get(
  '/:propertyId',
  protect,
  authorizeRoles(
    'BUSINESS_OWNER',
    'LANDLORD',
    'PROPERTY_MANAGER'
  ),
  getPropertyById
)

router.put(
  '/:propertyId',
  protect,
  authorizeRoles(
    'BUSINESS_OWNER',
    'LANDLORD'
  ),
  validate(updatePropertySchema),
  updateProperty
)

router.patch(
  '/:propertyId/deactivate',
  protect,
  authorizeRoles(
    'BUSINESS_OWNER',
    'LANDLORD'
  ),
  deactivateProperty
)

export default router