// src/routes/index.js
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.status(200).send({ message: 'Welcome to the Files Manager API' });
});

export default router;
