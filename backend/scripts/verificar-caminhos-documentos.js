/**
 * Script para verificar e corrigir caminhos de documentos na base de dados.
 *
 * O formato esperado é: /uploads/nome-do-ficheiro.ext
 * Ficheiros físicos devem estar em backend/uploads/
 *
 * Uso:
 *   node scripts/verificar-caminhos-documentos.js        # só verifica
 *   node scripts/verificar-caminhos-documentos.js --fix  # corrige caminhos incorretos
 */

const path = require("path");
const fs = require("fs");
const db = require("../src/config/database");

const UPLOADS_DIR = path.join(__dirname, "../uploads");
const PREFIXO_CORRETO = "/uploads/";

function extrairNomeFicheiro(caminho) {
  if (!caminho || typeof caminho !== "string") return null;
  // Remove barras finais e pega a última parte
  const partes = caminho.replace(/\\/g, "/").split("/").filter(Boolean);
  return partes[partes.length - 1] || null;
}

function caminhoCorreto(caminho) {
  if (!caminho || typeof caminho !== "string") return false;
  const normalizado = caminho.replace(/\\/g, "/");
  return normalizado.startsWith(PREFIXO_CORRETO) && normalizado.length > PREFIXO_CORRETO.length;
}

async function run() {
  const fix = process.argv.includes("--fix");

  try {
    const result = await db.query(
      `SELECT id, pessoa_id, nome_arquivo, caminho_arquivo FROM documentos ORDER BY id`
    );

    if (result.rows.length === 0) {
      console.log("Nenhum documento na base de dados.");
      db.pool.end();
      return;
    }

    console.log(`\n📋 Documentos na base de dados: ${result.rows.length}\n`);

    const problemas = [];
    const corrigidos = [];

    for (const row of result.rows) {
      const { id, pessoa_id, nome_arquivo, caminho_arquivo } = row;
      const nomeFicheiro = extrairNomeFicheiro(caminho_arquivo);
      const caminhoFisico = nomeFicheiro ? path.join(UPLOADS_DIR, nomeFicheiro) : null;
      const ficheiroExiste = caminhoFisico && fs.existsSync(caminhoFisico);
      const formatoOk = caminhoCorreto(caminho_arquivo);

      const status = [];
      if (!formatoOk) status.push("formato incorreto");
      if (!ficheiroExiste) status.push("ficheiro não encontrado");

      if (status.length > 0) {
        problemas.push({
          id,
          pessoa_id,
          nome_arquivo,
          caminho_arquivo,
          status: status.join(", "),
          nomeExtraido: nomeFicheiro,
          ficheiroExiste
        });
      }

      // Corrigir: se o formato está errado mas conseguimos extrair o nome e o ficheiro existe
      if (fix && !formatoOk && nomeFicheiro && ficheiroExiste) {
        const novoCaminho = `${PREFIXO_CORRETO}${nomeFicheiro}`;
        await db.query(
          `UPDATE documentos SET caminho_arquivo = $1 WHERE id = $2`,
          [novoCaminho, id]
        );
        corrigidos.push({ id, de: caminho_arquivo, para: novoCaminho });
      }
    }

    // Resumo
    console.log("─".repeat(80));
    for (const row of result.rows) {
      const nomeFicheiro = extrairNomeFicheiro(row.caminho_arquivo);
      const caminhoFisico = nomeFicheiro ? path.join(UPLOADS_DIR, nomeFicheiro) : null;
      const ficheiroExiste = caminhoFisico && fs.existsSync(caminhoFisico);
      const formatoOk = caminhoCorreto(row.caminho_arquivo);
      const icon = formatoOk && ficheiroExiste ? "✅" : "⚠️";
      console.log(`${icon} id=${row.id} | ${row.caminho_arquivo} | ficheiro: ${ficheiroExiste ? "OK" : "NÃO ENCONTRADO"}`);
    }
    console.log("─".repeat(80));

    if (problemas.length > 0) {
      console.log(`\n⚠️  Problemas encontrados: ${problemas.length}`);
      problemas.forEach((p) => {
        console.log(`   id=${p.id}: ${p.caminho_arquivo}`);
        console.log(`      → ${p.status}`);
      });

      if (!fix) {
        console.log("\n💡 Execute com --fix para corrigir caminhos no formato /uploads/nome.ext");
        console.log("   (só corrige se o ficheiro existir em uploads/)");
      }
    } else {
      console.log("\n✅ Todos os caminhos estão corretos e os ficheiros existem.");
    }

    if (corrigidos.length > 0) {
      console.log(`\n✅ Corrigidos ${corrigidos.length} registos:`);
      corrigidos.forEach((c) => console.log(`   id=${c.id}: ${c.de} → ${c.para}`));
    }
  } catch (error) {
    console.error("Erro:", error.message);
  } finally {
    db.pool.end();
  }
}

run();
