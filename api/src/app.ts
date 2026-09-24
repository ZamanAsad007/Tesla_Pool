import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoints
app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, status: 'healthy' });
});

app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({ ok: true, status: 'healthy' });
});

export default app;
