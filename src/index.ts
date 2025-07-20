import express from 'express';
import cors from 'cors';
import reservationRoutes from './routes/reservationRoutes';
import employeeRoutes from "./routes/employeeRoutes";
import verifyEmailRoutes from "./routes/verifyEmailRoutes";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api/reservations', reservationRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/verify-email', verifyEmailRoutes);


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
