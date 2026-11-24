import { defineConfig } from '@mikro-orm/mysql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { Resident } from './entities/Resident';
import { Zone } from './entities/Zone';
import { Task } from './entities/Task';
import { TaskLog } from './entities/TaskLog';
import { HouseSettings } from './entities/HouseSettings';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  entities: [Resident, Zone, Task, TaskLog, HouseSettings],
  dbName: process.env.DB_NAME || 'hometasking',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'hometasking',
  password: process.env.DB_PASSWORD || 'hometasking_password',
  metadataProvider: TsMorphMetadataProvider,
  debug: process.env.NODE_ENV !== 'production',
});
