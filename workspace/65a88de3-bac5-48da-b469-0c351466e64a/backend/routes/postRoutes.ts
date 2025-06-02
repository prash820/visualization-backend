import express from 'express';
import * as postController from '../controllers/postController';

const router = express.Router();

router.post('/', postController.createPost);

export default router;