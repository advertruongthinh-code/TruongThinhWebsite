// In-memory D1 stand-in for Worker tests (docs/specs/cms-data.md R1); runs on node:sqlite, no Wrangler needed.
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const isSelect = (sql) => /^\s*(with|select)\b/i.test(sql);
const isReturning = (sql) => /\breturning\b/i.test(sql);

export function createD1(sqlFile, { afterSelect } = {}) {
  const db = new DatabaseSync(":memory:");
  if (sqlFile) db.exec(readFileSync(sqlFile, "utf8"));
  let selects = 0;

  const plain = (row) => (row ? { ...row } : null);

  const execute = (sql, args) => {
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
