function calcularPascoa(ano) {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

function adicionarDias(data, dias) {
  const d = new Date(data);
  d.setDate(d.getDate() + dias);
  return d;
}

function formatarData(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function obterFeriados(ano) {
  const fs = require("fs");
  const path = require("path");
  const fixos = [
    `${ano}-01-01`,
    `${ano}-04-25`,
    `${ano}-05-01`,
    `${ano}-06-10`,
    `${ano}-08-15`,
    `${ano}-10-05`,
    `${ano}-11-01`,
    `${ano}-12-01`,
    `${ano}-12-08`,
    `${ano}-12-25`
  ];

  let configFixos = [];
  let configDatas = [];
  try {
    const filePath = path.join(__dirname, "../config/feriados.json");
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8");
      const json = JSON.parse(raw);
      if (Array.isArray(json.fixos)) {
        configFixos = json.fixos
          .map((item) => `${ano}-${item}`)
          .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item));
      }
      if (Array.isArray(json.datas)) {
        configDatas = json.datas.filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item));
      }
    }
  } catch (error) {
    // ignore
  }

  const pascoa = calcularPascoa(ano);
  const sextaFeiraSanta = adicionarDias(pascoa, -2);
  const carnaval = adicionarDias(pascoa, -47);
  const corpusChristi = adicionarDias(pascoa, 60);

  return new Set([
    ...fixos,
    ...configFixos,
    ...configDatas,
    formatarData(pascoa),
    formatarData(sextaFeiraSanta),
    formatarData(carnaval),
    formatarData(corpusChristi)
  ]);
}

function dentroDoExpediente(data = new Date()) {
  const diaSemana = data.getDay();
  if (diaSemana === 0 || diaSemana === 6) return false;

  const ano = data.getFullYear();
  const feriados = obterFeriados(ano);
  if (feriados.has(formatarData(data))) return false;

  const hora = data.getHours() + data.getMinutes() / 60;
  const manha = hora >= 10 && hora < 13;
  const tarde = hora >= 14 && hora < 19;
  return manha || tarde;
}

function motivoBloqueio(data = new Date()) {
  const diaSemana = data.getDay();
  if (diaSemana === 0 || diaSemana === 6) return "Fim de semana";

  const ano = data.getFullYear();
  const feriados = obterFeriados(ano);
  if (feriados.has(formatarData(data))) return "Feriado";

  return "Fora do horario (10-13, 14-19)";
}

module.exports = {
  dentroDoExpediente,
  motivoBloqueio
};
