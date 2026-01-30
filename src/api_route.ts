import express from 'express';

import LCES_api_route from './LCES/api_route';
import router from './Z/route';

const app = express();

router.use('/LCES', LCES_api_route);

export default router;