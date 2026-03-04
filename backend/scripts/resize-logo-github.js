/**
 * Redimensiona o logo da CBL para perfil GitHub (500x500 px)
 * Uso: node scripts/resize-logo-github.js
 */
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

// Coloque o logo original em backend/public/logos/logo-cbl-original.png
const sourcePath = path.join(__dirname, "../public/logos/logo-cbl-original.png");
const outputPath = path.join(__dirname, "../public/logos/cbl-logo-github.png");

const SIZE = 500;

async function resize() {
  if (!fs.existsSync(sourcePath)) {
    console.error("❌ Imagem de origem não encontrada:", sourcePath);
    process.exit(1);
  }

  const logosDir = path.dirname(outputPath);
  if (!fs.existsSync(logosDir)) {
    fs.mkdirSync(logosDir, { recursive: true });
  }

  await sharp(sourcePath)
    .resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 1 } })
    .png()
    .toFile(outputPath);

  console.log("✅ Logo redimensionado para GitHub:");
  console.log("   ", outputPath);
  console.log("   Tamanho:", SIZE, "x", SIZE, "px");
}

resize().catch((err) => {
  console.error("❌ Erro:", err.message);
  process.exit(1);
});
