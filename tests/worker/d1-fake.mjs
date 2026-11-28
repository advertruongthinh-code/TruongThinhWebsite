// In-memory D1 stand-in for Worker tests (docs/specs/cms-data.md R1); runs on node:sqlite, no Wrangler needed.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

// Every migration in order, like `wrangler d1 migrations apply`.
export const MIGRATIONS = fileURLToPath(new URL("../../src/db/migrations/", import.meta.url));
const schemaSql = (target) => (statSync(target).isDirectory()
  ? readdirSync(target).filter((name) => name.endsWith(".sql")).sort().map((name) => readFileSync(path.join(target, name), "utf8")).join("\n")
  : readFileSync(target, "utf8"));

const isSelect = (sql) => /^\s*(with|select)\b/i.test(sql);
const isReturning = (sql) => /\breturning\b/i.test(sql);
// Real D1 rejects a compound SELECT with more than 5 terms ("too many terms in compound SELECT"); node:sqlite allows 500.
// Counted over the whole statement (stricter than per compound) so a query that only passes here never reaches workerd.
export const D1_MAX_COMPOUND_TERMS = 5;
const compoundTerms = (sql) => (sql.match(/\b(union|intersect|except)\b/gi) ?? []).length + 1;

export function createD1(sqlFile, { afterSelect } = {}) {
  const db = new DatabaseSync(":memory:");
  if (sqlFile) db.exec(schemaSql(sqlFile));
  let selects = 0;

  const plain = (row) => (row ? { ...row } : null);

  const execute = (sql, args) => {
    if (compoundTerms(sql) > D1_MAX_COMPOUND_TERMS) throw new Error(`D1_ERROR: too many terms in compound SELECT: ${sql}`);
    const statement = db.prepare(sql);
    if (isSelect(sql)) return { success: true, results: statement.all(...args).map(plain), meta: { changes: 0 } };
    // A write with RETURNING gives its rows like D1 does.
    if (isReturning(sql)) {
      const results = statement.all(...args).map(plain);
      return { success: true, results, meta: { changes: Number(db.prepare("SELECT changes() AS n").get().n) } };
    }
    const { changes, lastInsertRowid } = statement.run(...args);
    return { success: true, results: [], meta: { changes: Number(changes), last_row_id: Number(lastInsertRowid) } };
  };

  // Like D1, bind() returns a new statement, so one prepared statement can be bound several times.
  const statementOf = (sql, args) => ({
    sql,
    args,
    bind: (...values) => statementOf(sql, values),
    async first(column) {
      const row = execute(sql, args).results[0] ?? null;
      if (isSelect(sql)) afterSelect?.(sql, ++selects);
      return column && row ? row[column] : row;
    },
    async all() {
      const result = execute(sql, args);
      if (isSelect(sql)) afterSelect?.(sql, ++selects);
      return result;
    },
    async run() { return execute(sql, args); },
  });
  const prepare = (sql) => statementOf(sql, []);

  return {
    sqlite: db,
    prepare,
    exec: async (sql) => { db.exec(sql); return { count: 0 }; },
    async batch(statements) {
      // Real D1 rejects BEGIN in user SQL; only this fake uses it to model batch atomicity.
      db.exec("BEGIN");
      try {
        const results = statements.map((statement) => execute(statement.sql, statement.args));
        db.exec("COMMIT");
        return results;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };
}
