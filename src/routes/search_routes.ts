import { Router } from 'express';
import { searchDishes, getSearchOptions } from '../controllers/search_controller';

const router = Router();

// For search functionality
router.post('/', searchDishes);

// For options
router.get('/options', getSearchOptions);

export default router;
