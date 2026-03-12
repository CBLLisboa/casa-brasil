/**
 * Extrai os nomes/títulos das células do modelo Excel (apenas primeira coluna de cada linha para evitar duplicados de merge).
 * Uso: node scripts/extrair-modelo-excel.js "caminho/para/modelo.xlsx"
 */
const ExcelJS = require("exceljs");
const path = require("path");

const modelPath = process.argv[2];

async function main() {
  try {
    const fullPath = path.resolve(modelPath);
    console.log("A ler:", fullPath);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(fullPath);
    const ws = workbook.worksheets[0];
    if (!ws) {
      console.log("Nenhuma folha encontrada.");
      return;
    }
    console.log("\n=== Folha:", ws.name, "===\n");
    const seen = new Set();
    ws.eachRow((row, rowNumber) => {
      const cells = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const v = cell.value;
        let text = "";
        if (v && typeof v === "object" && v.richText) {
          text = v.richText.map((r) => r.text).join("");
        } else if (v != null && typeof v !== "object") {
          text = String(v);
        }
        cells.push(text);
      });
      const firstCol = (cells[0] || "").trim();
      if (firstCol && !seen.has(firstCol) && firstCol.length < 120) {
        seen.add(firstCol);
        console.log(`L${rowNumber}: ${firstCol}`);
      }
      if (rowNumber <= 50 || (rowNumber >= 7600 && rowNumber <= 7650)) {
        const full = cells.filter((c) => c && typeof c === "string" && c.trim()).slice(0, 25).join(" | ");
        if (full.length < 500) console.log(`  -> ${full}`);
      }
    });
  } catch (err) {
    console.error("Erro:", err.message);
  }
}

main();
