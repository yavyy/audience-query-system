import { Router } from "express";

const router = Router();

import { deleteUser, getAllUsers, getAvailableAgents, getUsersById, updateUser } from '../controllers/user.controller.js'
import { verifyJWT, grantAccess } from "../middleware/auth.middleware.js";

// All routes require authentication

router.use(verifyJWT)


// Get available agents for assignment
router.route('/agents/available').get(getAvailableAgents)


// CRUD operations
router.route('/').get(grantAccess('admin', 'manager'), getAllUsers)
router.route('/:id').get(grantAccess('admin', 'manager'), getUsersById)
router.route('/:id').put(grantAccess('admin'), updateUser)
router.route('/:id').delete(grantAccess('admin'), deleteUser)

export default router