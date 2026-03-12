/**
 * Configuração do banco de dados
 * Suporta PostgreSQL (padrão) e MySQL (DB_TYPE=mysql)
 * Para WePanel: use MySQL com phpMyAdmin
 */
require("dotenv").config();

const defaultDb = process.env.NODE_ENV === "production" ? "mysql" : "postgres";
const DB_TYPE = (process.env.DB_TYPE || defaultDb).toLowerCase();
const isMySQL = DB_TYPE === "mysql";

if (isMySQL) {
  const mysql = require("mysql2/promise");

  const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    charset: "utf8mb4"
  });

  // Converte $1, $2, $3... para ? (compatibilidade com PostgreSQL)
  function toMysqlParams(sql) {
    return sql.replace(/\$(\d+)/g, () => "?");
  }

  // Converte funções PostgreSQL para MySQL
  function toMysqlSql(sql) {
    let s = sql;
    s = s.replace(/::int\b/gi, "");
    s = s.replace(/::date\b/gi, "");
    s = s.replace(/::boolean\b/gi, "");
    s = s.replace(/date_part\s*\(\s*['"]year['"]\s*,\s*age\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)\s*\)/gi, "TIMESTAMPDIFF(YEAR, $2, $1)");
    s = s.replace(/\bILIKE\b/gi, "LIKE");
    return s;
  }

  // MySQL não suporta RETURNING em versões antigas - simula com INSERT + SELECT
  function handleReturning(text, params, sql, tableHint) {
    const match = text.match(/RETURNING\s+(.+?)(?:\s*$|;)/is);
    if (!match) return null;
    const returnCols = match[1].trim();
    const sqlSemReturning = toMysqlSql(toMysqlParams(text.replace(/RETURNING\s+.+?(?:\s*$|;)/is, "").trim()));
    return { sqlSemReturning, returnCols };
  }

  const query = async (text, params = []) => {
    let sql = toMysqlSql(toMysqlParams(text));
    const ret = handleReturning(text, params, sql);

    if (ret) {
      const { sqlSemReturning, returnCols } = ret;
      const isInsert = /^\s*INSERT\s+INTO\s+(\w+)/i.test(text);
      const isUpdate = /^\s*UPDATE\s+(\w+)/i.test(text);

      if (isInsert) {
        const [res] = await pool.execute(sqlSemReturning, params);
        const [insertId] = await pool.execute("SELECT LAST_INSERT_ID() AS id");
        const lid = insertId[0]?.id;
        if (lid && returnCols !== "*") {
          const tblMatch = text.match(/INSERT\s+INTO\s+(\w+)/i);
          const tbl = tblMatch ? tblMatch[1] : "familias";
          const [rows] = await pool.execute(
            `SELECT ${returnCols} FROM ${tbl} WHERE id = ?`,
            [lid]
          );
          return { rows: rows || [] };
        }
        if (lid && returnCols === "id") {
          return { rows: [{ id: lid }] };
        }
        if (lid) {
          const tblMatch = text.match(/INSERT\s+INTO\s+(\w+)/i);
          const tbl = tblMatch ? tblMatch[1] : "familias";
          const [rows] = await pool.execute(`SELECT * FROM ${tbl} WHERE id = ?`, [lid]);
          return { rows: rows || [] };
        }
      }

      if (isUpdate && returnCols) {
        await pool.execute(sqlSemReturning, params);
        const tblMatch = text.match(/UPDATE\s+(\w+)/i);
        const tbl = tblMatch ? tblMatch[1] : "pessoas";
        const cols = returnCols === "*" ? "*" : returnCols;
        const idParam = params[params.length - 1];
        const [rows] = await pool.execute(
          `SELECT ${cols} FROM ${tbl} WHERE id = ?`,
          [idParam]
        );
        return { rows: Array.isArray(rows) ? rows : [] };
      }
    }

    const [rows] = await pool.execute(sql, params);
    return { rows: Array.isArray(rows) ? rows : [] };
  };

  const testConnection = async () => {
    try {
      const [r] = await pool.execute("SELECT 1");
      console.log("✅ Conectado ao MySQL com sucesso!");
      return true;
    } catch (error) {
      console.error("❌ ERRO AO CONECTAR:", error.message);
      console.log("\n📌 VERIFIQUE SEU ARQUIVO .env:");
      console.log("   DB_TYPE=mysql");
      console.log("   DB_HOST=...");
      console.log("   DB_PORT=3306");
      console.log("   DB_NAME=...");
      console.log("   DB_USER=...");
      console.log("   DB_PASSWORD=...");
      return false;
    }
  };

  console.log("🔧 Conectando ao MySQL...");
  console.log(`   Host: ${process.env.DB_HOST}`);
  console.log(`   Banco: ${process.env.DB_NAME}`);

  module.exports = {
    query,
    pool,
    testConnection,
    isMySQL
  };
} else {
  const { Pool } = require("pg");

  console.log("🔧 Conectando ao PostgreSQL...");
  console.log(`   Host: ${process.env.DB_HOST}`);
  console.log(`   Banco: ${process.env.DB_NAME}`);
  console.log(`   Usuário: ${process.env.DB_USER}`);

  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  });

  const testConnection = async () => {
    try {
      const client = await pool.connect();
      console.log("✅ Conectado ao PostgreSQL com sucesso!");
      client.release();
      return true;
    } catch (error) {
      console.error("❌ ERRO AO CONECTAR:", error.message);
      console.log("\n📌 VERIFIQUE SEU ARQUIVO .env:");
      console.log("   DB_HOST=localhost");
      console.log("   DB_PORT=5432");
      console.log("   DB_NAME=nome_do_seu_banco");
      console.log("   DB_USER=seu_usuario_postgres");
      console.log("   DB_PASSWORD=sua_senha_postgres");
      return false;
    }
  };

  module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
    testConnection,
    isMySQL: false
  };
}
