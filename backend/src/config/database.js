const { Pool } = require("pg");
require("dotenv").config();

// Railway e outros serviços cloud fornecem DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;

const poolConfig = databaseUrl
  ? {
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    }
  : {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    };

console.log("🔧 Conectando ao PostgreSQL...");
if (databaseUrl) {
  console.log("   Usando DATABASE_URL (Railway/cloud)");
} else {
  console.log(`   Host: ${process.env.DB_HOST}`);
  console.log(`   Banco: ${process.env.DB_NAME}`);
  console.log(`   Usuário: ${process.env.DB_USER}`);
}

const pool = new Pool(poolConfig);

// Função de teste simples
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
  testConnection
};
