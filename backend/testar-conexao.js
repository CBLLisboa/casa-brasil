// testar-conexao-sem-senha.js
const { Client } = require("pg");

async function testar() {
  console.log("🔍 Testando conexão SEM senha...");
  
  const client = new Client({
    host: "localhost",
    port: 5432,
    database: "postgres",
    user: "postgres",
    password: ""  // SENHA VAZIA
  });
  
  try {
    await client.connect();
    console.log("✅ CONEXÃO BEM-SUCEDIDA SEM SENHA!");
    console.log("   Isso significa: PostgreSQL configurado como 'trust'");
    
    // Listar bancos
    const result = await client.query("SELECT datname FROM pg_database;");
    console.log("\n📊 Bancos disponíveis:");
    result.rows.forEach(db => console.log(`   • ${db.datname}`));
    
    await client.end();
    
    // Atualizar .env
    const fs = require("fs");
    let env = fs.readFileSync(".env", "utf8");
    env = env.replace(/DB_PASSWORD=.*/, "DB_PASSWORD=");
    fs.writeFileSync(".env", env, "utf8");
    
    console.log("\n📁 .env atualizado: DB_PASSWORD=(vazio)");
    
  } catch (error) {
    console.log("❌ Não conectou sem senha:", error.message);
    console.log("\n📌 A senha deve estar salva no pgAdmin.");
  }
}

testar();
