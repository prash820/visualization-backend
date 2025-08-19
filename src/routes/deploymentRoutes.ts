import { Router } from 'express'
import { 
  startDeployment, 
  getDeploymentStatus, 
  getDeploymentHistory, 
  rollbackDeployment,
  saveUserToken,
  getUserToken,
  deleteUserToken,
  cleanupInfrastructure,
  getCleanupStatus
} from '../controllers/deploymentController'
import { authenticateToken, requireUser } from '../middleware/auth'
import asyncHandler from '../utils/asyncHandler'

const router = Router()

// All routes require authentication
router.use(authenticateToken)
router.use(requireUser)

// Deployment routes
router.post('/start', asyncHandler(startDeployment))
router.get('/status/:deploymentId', asyncHandler(getDeploymentStatus))
router.get('/history/:projectId', asyncHandler(getDeploymentHistory))
router.post('/rollback/:deploymentId', asyncHandler(rollbackDeployment))

// Token management routes
router.post('/tokens', asyncHandler(saveUserToken))
router.get('/tokens/:provider', asyncHandler(getUserToken))
router.delete('/tokens/:provider', asyncHandler(deleteUserToken))

// Cleanup routes
router.post('/cleanup', asyncHandler(cleanupInfrastructure))
router.get('/cleanup/status/:infrastructureId', asyncHandler(getCleanupStatus))

export default router 