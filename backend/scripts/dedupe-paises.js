const db = require("../src/config/database");

async function run() {
  try {
    const before = await db.query("SELECT COUNT(*)::int AS total FROM paises");

    const duplicados = await db.query(
      "SELECT lower(nome_pt) AS nome_key, MIN(id) AS keep_id " +
        "FROM paises " +
        "WHERE nome_pt IS NOT NULL AND trim(nome_pt) <> '' " +
        "GROUP BY lower(nome_pt) " +
        "HAVING COUNT(*) > 1"
    );

    await db.query("BEGIN");
    if (duplicados.rows.length > 0) {
      await db.query(
        "DELETE FROM paises p " +
          "USING (" +
          "  SELECT lower(nome_pt) AS nome_key, MIN(id) AS keep_id " +
          "  FROM paises " +
          "  WHERE nome_pt IS NOT NULL AND trim(nome_pt) <> '' " +
          "  GROUP BY lower(nome_pt) " +
          "  HAVING COUNT(*) > 1" +
          ") d " +
          "WHERE lower(p.nome_pt) = d.nome_key AND p.id <> d.keep_id"
      );
    }
    await db.query("COMMIT");

    const after = await db.query("SELECT COUNT(*)::int AS total FROM paises");
    console.log(`✅ Duplicados removidos: ${before.rows[0].total - after.rows[0].total}`);
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("❌ Erro ao remover duplicados:", error.message);
  } finally {
    db.pool.end();
  }
}

run();
