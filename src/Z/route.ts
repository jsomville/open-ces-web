import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
    res.render('Z_register', { name: 'World' });
})


export default router;