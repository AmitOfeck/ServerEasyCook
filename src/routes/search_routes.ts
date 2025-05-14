import { Router } from 'express';
import { authMiddleware } from '../middleware/verifyToken';
import { searchDishes, getSearchOptions } from '../controllers/search_controller';

const router = Router();

router.post('/', authMiddleware, searchDishes);
router.get('/options', getSearchOptions);

export default router;
