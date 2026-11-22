// In-memory D1 stand-in for Worker tests (docs/specs/cms-data.md R1); runs on node:sqlite, no Wrangler needed.
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const isSelect = (sql) => /^\s*(with|select)\b/i.test(sql);

export function createD1(sqlFile, { afterSelect } = {}) {
  const db = new DatabaseSync(":memory:");
  if (sqlFile) db.exec(readFileSync(sqlFile, "utf8"));
  let selects = 0;

  const execute = (sql, args) => {
    const statement = db.prepare(sql);
    if (isSelect(sql)) return { results: statement.all(...args), meta: { changes: 0 } };
    const { changes } = statement.run(...args);
    return { results: [], meta: { changes: Number(changes) } };
  };

  const prepare = (sql) => {
    let args = [];
    const statement = {
      sql,
      get args() { return args; },
      bind(...values) { args = values; return statement; },
      async first() {
        const row = db.prepare(sql).get(...args) ?? null;
        if (isSelect(sql)) afterSelect?.(sql, ++selects);
        return row;
      },
      async all() {
        const result = execute(sql, args);
        if (isSelect(sql)) afterSelect?.(sql, ++selects);
        return result;
      },
      async run() { return execute(sql, args); },
    };
    return statement;
  };

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
