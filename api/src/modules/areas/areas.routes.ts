import { Router } from 'express';
import { handleListAreas, handleGetArea } from './areas.controller';

export const areasRouter = Router();

// Public endpoints
areasRouter.get('/', handleListAreas);
areasRouter.get('/:id', handleGetArea);
