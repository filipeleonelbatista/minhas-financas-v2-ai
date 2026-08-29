import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

// Expo SQLite may not be available in jest/node; handle gracefully
let expoDb: any;
let db: any;
try {
  expoDb = SQLite.openDatabaseSync('financas.db');
  db = drizzle(expoDb, { schema });
} catch {
  // fallback for jest / non-native environment - repositories will use in-memory fallback
  expoDb = null as any;
  db = null as any;
}

export { expoDb, db };
