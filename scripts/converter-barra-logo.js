/**
 * Converte barra-logo.png para o mesmo formato do logo CBL:
 * PNG 8-bit RGBA, dimensões proporcionais (altura ~100px para banner)
 *
 * Executar: node scripts/converter-barra-logo.js
 */
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const LOGOS_DIR = path.join(__dirname, "../public/logos");
const BARRA_IN = path.join(LOGOS_DIR, "barra-logo.png");
const BARRA_OUT = path.join(LOGOS_DIR, "barra-logo.png");
const CBL_REF = path.join(LOGOS_DIR, "cbllogo.png.png");

async function main() {
  if (!fs.existsSync(BARRA_IN)) {
    console.error("❌ Ficheiro não encontrado:", BARRA_IN);
    process.exit(1);
  }

  const backupPath = path.join(LOGOS_DIR, "barra-logo-backup.png");
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(BARRA_IN, backupPath);
    console.log("📁 Cópia de segurança guardada em barra-logo-backup.png");
  }

  const cblMeta = await sharp(CBL_REF).metadata();
  console.log("Logo CBL (referência):", cblMeta.width, "x", cblMeta.height, cblMeta.format);

  const barraMeta = await sharp(BARRA_IN).metadata();
  console.log("Barra (antes):", barraMeta.width, "x", barraMeta.height, barraMeta.format);

  // Redimensionar: altura 60px (banner para Excel), largura proporcional
  const novaAltura = 60;
  const novaLargura = Math.round(barraMeta.width * (novaAltura / barraMeta.height));

  await sharp(BARRA_IN)
    .resize(novaLargura, novaAltura, { fit: "fill" })
    .png({ compressionLevel: 9, palette: false })
    .toFile(BARRA_OUT + ".tmp");

  fs.renameSync(BARRA_OUT + ".tmp", BARRA_OUT);

  const novoMeta = await sharp(BARRA_OUT).metadata();
  const stats = fs.statSync(BARRA_OUT);
  console.log("Barra (depois):", novoMeta.width, "x", novoMeta.height, "|", (stats.size / 1024).toFixed(1), "KB");
  console.log("✅ barra-logo.png convertido com sucesso.");
}

main().catch((err) => {
  console.error("❌ Erro:", err.message);
  process.exit(1);
});
