const db = require("../config/database");

async function listarPaises(req, res, next) {
  try {
    const resultado = await db.query(
      `SELECT id,
              COALESCE(NULLIF(TRIM(nome_pt), ''), nome) AS nome_pt,
              codigo_iso
       FROM paises
       WHERE ativo = true
       ORDER BY COALESCE(NULLIF(TRIM(nome_pt), ''), nome)`
    );
    return res.json(resultado.rows);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listarPaises
};
