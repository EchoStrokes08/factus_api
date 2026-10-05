import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

app.listen(env.port, () => {
  logger.info('server', `Backend escuchando en http://localhost:${env.port} (mockMode=${env.mockMode})`);
});
