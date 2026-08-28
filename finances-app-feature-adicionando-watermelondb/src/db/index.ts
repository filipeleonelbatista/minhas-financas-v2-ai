import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

export const expoDb = SQLite.openDatabaseSync("financas.db");
export const db = drizzle(expoDb, { schema });
