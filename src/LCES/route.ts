import express from 'express';
import path from 'path';

const app = express();

const router = express.Router();

router.get('/', (req, res) => {
    res.render('LCES_register');
})

router.get('/register', (req, res) => {
    res.render('LCES_register');
})

router.get('/confirm', (req, res) => {
    res.render('LCES_confirm');
})

router.get('/topoff/:account', (req, res) => {
    const account = req.params.account;
    res.render('LCES_topoff', { account: account });
})

export default router;