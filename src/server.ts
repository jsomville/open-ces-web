import express from 'express';
import { Request, Response } from 'express';
import path from 'path';
import cors from 'cors'

import api_route from './api_route';
import LCES_UI_route from './LCES/route';
//import Z_UI_route from './Z/route';

//Import Middleware
import logger from './middleware/logger';
import errorHanlder from './middleware/error';
import notFoundHandler from './middleware/notFound';
import requestDuration from './middleware/requestDuration'

const app = express();

//Use cors
const corsOptions = {
  origin: '*',
  methods: ['GET', 'PUT', 'POST', 'DELETE'],
}
app.use(cors(corsOptions));

//Hardening
app.disable('x-powered-by');
app.set('trust proxy', true);


//Add middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false })); //url encoder
app.use(express.static('public'));
app.use(logger); //Logger Middleware
app.use(requestDuration); // add X-response-Time

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', [
    path.join(__dirname, '../views'),
    path.join(__dirname, '../views/LCES'),
    //path.join(__dirname, '../views/Z')
]);

// Default route renders welcome.ejs
app.get('/', (req: Request, res: Response) => {
  res.render('welcome', { name: 'World' });
});

//Use API Routes
app.use('/api', api_route);

//Currency Specifi UI Routes
app.use('/LCES', LCES_UI_route);
//app.use('/Z', Z_UI_route);

//Add after routes middleware
app.use(notFoundHandler);
app.use(errorHanlder);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
