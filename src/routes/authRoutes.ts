// routes/authRoutes.ts
import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

router.post('/admin/login', (req, res) => {
    const { password } = req.body;

    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET!, {
        expiresIn: '1d',
    });

    res.json({ token });
});

export default router;
