import { Router } from 'express'

const router = Router();

import { register, login, getMe, refreshAccessToken, logout, updateProfile } from '../controllers/auth.controller.js'
import { verifyJWT } from '../middleware/auth.middleware.js'

//Public routes
router.route('/register').post(register)
router.route('/login').post(login)
router.route('/refresh').post(refreshAccessToken)

//Protected routes
router.route('/logout').post(logout)
router.route('/me').get(verifyJWT, getMe)
router.route('/update-profile').post(verifyJWT, updateProfile)

export default router