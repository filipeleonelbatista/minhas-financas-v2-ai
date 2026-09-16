import { expoDb } from './index';

/**
 * Crítico 1: Runner de migrations offline-first para expo-sqlite + drizzle
 * Executa SQL das 3 migrations em ordem, usando PRAGMA user_version para idempotência.
 * Mantém fallback jornal: se db null (jest), no-op.
 * Spec ROADMAP 1.2: Script de migração one-shot na primeira abertura.
 */
const MIGRATIONS = [
  { version: 1, sql: require('./migrations/0000_large_clint_barton.sql') },
  { version: 2, sql: require('./migrations/0001_add_biometric.sql') },
  { version: 3, sql: require('./migrations/0002_add_tithe.sql') },
];

function splitStatements(sql: string): string[] {
  if (!sql || typeof sql !== 'string') return [];
  // drizzle-kit usa "--> statement-breakpoint" como separador
  return sql
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export async function runMigrations(): Promise<void> {
  const db: any = expoDb;
  if (!db) return; // jest / node fallback

  try {
    // Garante que expoDb tem métodos sync/async modernos
    // expo-sqlite openDatabaseSync retorna DB com execAsync / getAllAsync etc (SDK 57)
    const getVersion = async (): Promise<number> => {
      try {
        if (typeof db.getAllAsync === 'function') {
          const rows: any = await db.getAllAsync('PRAGMA user_version');
          return rows?.[0]?.user_version ?? 0;
        }
        if (typeof db.execAsync === 'function') {
          // fallback sync
          const rows = await db.getAllAsync?.('PRAGMA user_version');
          return rows?.[0]?.user_version ?? 0;
        }
        // sync API
        if (typeof db.getAllSync === 'function') {
          const rows: any = db.getAllSync('PRAGMA user_version');
          return rows?.[0]?.user_version ?? 0;
        }
        return 0;
      } catch {
        return 0;
      }
    };

    const setVersion = async (v: number) => {
      try {
        if (typeof db.execAsync === 'function') {
          await db.execAsync(`PRAGMA user_version = ${v}`);
        } else if (typeof db.execSync === 'function') {
          db.execSync(`PRAGMA user_version = ${v}`);
        }
      } catch {}
    };

    const execSql = async (sql: string) => {
      try {
        if (typeof db.execAsync === 'function') {
          await db.execAsync(sql);
        } else if (typeof db.execSync === 'function') {
          db.execSync(sql);
        } else if (typeof db.exec === 'function') {
          await db.exec(sql);
        }
      } catch (e: any) {
        // Ignora "already exists" / "duplicate column" para idempotência
        const msg = String(e?.message ?? e).toLowerCase();
        if (msg.includes('already exists') || msg.includes('duplicate column')) return;
        throw e;
      }
    };

    const currentVersion = await getVersion();

    for (const m of MIGRATIONS) {
      if (m.version <= currentVersion) continue;
      const raw = typeof m.sql === 'string' ? m.sql : (m.sql?.default ?? m.sql);
      const statements = splitStatements(raw);
      for (const stmt of statements) {
        // drizzle gera CREATE TABLE etc já com ; - exec individual
        await execSql(stmt);
      }
      await setVersion(m.version);
    }
  } catch (e) {
    // Nunca quebrar boot por falha de migration em produção - loga
    console.warn('[migrate] falha ao rodar migrations', e);
  }
}

// Hook compatível com drizzle-orm expo migrator (opcional)
export async function migrateIfNeeded(): Promise<void> {
  return runMigrations();
}
