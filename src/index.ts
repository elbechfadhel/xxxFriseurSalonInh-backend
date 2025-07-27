import express from 'express';
import cors from 'cors';
import path from 'path';
import reservationRoutes from './routes/reservationRoutes';
import employeeRoutes from './routes/employeeRoutes';
import verifyEmailRoutes from './routes/verifyEmailRoutes';
import authRoutes from './routes/authRoutes';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/reservations', reservationRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/verify-email', verifyEmailRoutes);
app.use('/api/admin', authRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
