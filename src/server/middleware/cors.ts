import cors from 'cors';

export const corsMiddleware = cors({
  origin: true,
  credentials: true,
  allowedHeaders: ['Authorization', 'Content-Type'],
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
});
