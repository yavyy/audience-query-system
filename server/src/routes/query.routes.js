import { Router } from "express";

const router = Router();

import {
  addInternalNote,
  addResponse,
  assignQuery,
  createQuery,
  deleteQuery,
  getDashboardStats,
  getQueries,
  getQueryById,
  reanalyzeQuery,
  suggestResponse,
  updateQuery
} from '../controllers/query.controller.js'

import { verifyJWT, grantAccess } from '../middleware/auth.middleware.js'

//Public routes
router.route('/submit').post(createQuery);

//Protected routes
router.use(verifyJWT)

//Dashboard stats
router.route('/stats/dashboard').get(getDashboardStats)

// CRUD operations
router.route('/')
  .get(getQueries)
  .post(createQuery)

router.route('/:id')
  .get(getQueryById)
  .put(updateQuery)
  .delete(grantAccess('admin'), deleteQuery)

//Assignment (Manager/Admin only)
router.route('/:id/assign').put(grantAccess('manager', 'admin'), assignQuery)

//Response and notes
router.route('/:id/response').post(addResponse)
router.route('/:id/note').post(addInternalNote);

// AI-powered features
router.route('/:id/analyze').post(reanalyzeQuery);
router.route('/:id/suggest-response').post(suggestResponse);

export default router