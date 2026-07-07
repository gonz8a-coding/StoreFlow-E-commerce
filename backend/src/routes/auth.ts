import { Router } from 'express';
import { loginStore, registerStore, verifyEmail } from '../controllers/auth.controller';

const authRouter = Router();
authRouter.post('/register', registerStore);
authRouter.post('/login', loginStore);
authRouter.get('/verify-email', verifyEmail);

export { authRouter };
