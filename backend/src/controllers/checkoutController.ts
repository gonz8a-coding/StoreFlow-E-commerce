import { Request, Response, NextFunction } from 'express';
import { processCheckout } from '../services/checkoutService';

export async function checkoutController(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = req.body;
    const order = await processCheckout(payload);

    res.status(201).json({
      success: true,
      order,
    });
  } catch (error) {
    next(error instanceof Error ? error : new Error('Checkout failed.'));
  }
}
