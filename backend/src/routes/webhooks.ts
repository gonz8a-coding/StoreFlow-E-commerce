import { Router } from 'express';
import { webhookController } from '../controllers/webhookController';

export const webhookRouter = Router();

webhookRouter.post('/', webhookController);
