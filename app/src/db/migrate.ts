import { expoDb } from './index';
import '../polyfills/buffer';

/**
 * Crítico 1: Runner de migrations offline-first para expo-sqlite + drizzle
 * Executa SQL das 3 migrations em ordem, usando PRAGMA user_version para idempotência.
 * Mantém fallback jornal: se db null (jest), no-op.
 * Spec ROADMAP 1.2: Script de migração one-shot na primeira abertura.
 * Metro bundling: usa inline SQL strings para evitar dynamic require de arquivos SQL
 * que quebra bundling. Alternativa ?raw (import sql as raw)
 * só se metro.config.js tiver asset support; fallback inline garante compat.
 */

// Inline SQL — fallback when ?raw not supported by Metro/babel
// import m0000 from './migrations/0000_large_clint_barton.sql?raw' // preferred if supported
const m0000 = `CREATE TABLE \`config\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`colorModeState\` text,
	\`isAiEnabled\` integer,
	\`apiKey\` text,
	\`isShowLabelOnNavigation\` integer,
	\`isEnableTitheCard\` integer,
	\`isEnableTotalHistoryCard\` integer,
	\`willAddFuelToTransactionList\` integer,
	\`willUsePrefixToRemoveTihteSum\` integer,
	\`simpleFinancesItem\` integer,
	\`marketSimplifiedItems\` integer,
	\`prefixTithe\` text,
	\`veicleName\` text,
	\`veicleBrand\` text,
	\`veicleYear\` text,
	\`veicleColor\` text,
	\`veiclePlate\` text,
	\`veicleAutonomy\` real,
	\`selectedFolderToSave\` text
);
--> statement-breakpoint
CREATE TABLE \`finances\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`description\` text NOT NULL,
	\`amount\` real NOT NULL,
	\`category\` text NOT NULL,
	\`date\` integer NOT NULL,
	\`paymentDate\` integer,
	\`paymentStatus\` integer NOT NULL,
	\`isEnabled\` integer NOT NULL,
	\`isFavorited\` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`goals\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`description\` text NOT NULL,
	\`amount\` real NOT NULL,
	\`currentAmount\` real NOT NULL,
	\`date\` integer NOT NULL,
	\`icon\` text DEFAULT 'target',
	\`category\` text DEFAULT 'outros'
);
--> statement-breakpoint
CREATE TABLE \`items\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`list_id\` text NOT NULL,
	\`description\` text NOT NULL,
	\`category\` text NOT NULL,
	\`amount\` real NOT NULL,
	\`quantity\` integer NOT NULL,
	\`quantityDesired\` integer NOT NULL,
	\`location\` text,
	\`date\` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`lists\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`description\` text NOT NULL,
	\`location\` text,
	\`quantity\` integer NOT NULL,
	\`amount\` real NOT NULL,
	\`date\` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`runs\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`currentDistance\` real NOT NULL,
	\`unityAmount\` real NOT NULL,
	\`amount\` real NOT NULL,
	\`type\` text NOT NULL,
	\`date\` integer NOT NULL,
	\`location\` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`stock\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`description\` text NOT NULL,
	\`category\` text NOT NULL,
	\`amount\` real NOT NULL,
	\`quantity\` integer NOT NULL,
	\`quantityDesired\` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`tithe_payments\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`amount\` real NOT NULL,
	\`date\` integer NOT NULL,
	\`month\` integer,
	\`year\` integer,
	\`createdAt\` integer
);`;

const m0001 = `ALTER TABLE \`config\` ADD \`isBiometricEnabled\` integer;`;

const m0002 = `ALTER TABLE \`config\` ADD \`tithePercent\` real;
--> statement-breakpoint
ALTER TABLE \`config\` ADD \`titheCategories\` text;
--> statement-breakpoint
ALTER TABLE \`config\` ADD \`isTitheMenuEnabled\` integer;`;

const MIGRATIONS = [
  { version: 1, sql: m0000 },
  { version: 2, sql: m0001 },
  { version: 3, sql: m0002 },
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
      const raw = m.sql;
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
