import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import { MySqlDriver } from '@mikro-orm/mysql';
import mikroOrmConfig from './mikro-orm.config';
import apiRoutes from './routes/api';
import { seedDatabaseIfEmpty } from './seed';

dotenv.config();

const PORT = Number(process.env.PORT) || 3001;

async function initOrmWithRetry(retries = 15, delayMs = 3000): Promise<MikroORM<MySqlDriver>> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await MikroORM.init<MySqlDriver>(mikroOrmConfig);
    } catch (err: any) {
      console.log(
        `⏳ Esperando a MySQL (intento ${attempt}/${retries}): ${err.message || err}`
      );
      if (attempt === retries) throw err;
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
  throw new Error('No se pudo conectar a MySQL');
}

async function bootstrap() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  const orm = await initOrmWithRetry();

  // Actualizar esquema automáticamente y poblar datos iniciales si está vacío
  const generator = orm.getSchemaGenerator();
  await generator.updateSchema();
  await seedDatabaseIfEmpty(orm.em.fork());

  // Crear un RequestContext de MikroORM por cada petición HTTP
  app.use((_req, _res, next) => {
    RequestContext.create(orm.em, next);
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', app: 'Hometasking API' });
  });

  app.use('/api', apiRoutes);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Hometasking Backend corriendo en http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('❌ Error al iniciar el servidor backend:', err);
  process.exit(1);
});
