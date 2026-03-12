const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
require("dotenv").config();
const { autenticar } = require("./middleware/auth");

const app = express();

// Configuração de segurança
app.use(helmet());
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5000",
  process.env.FRONTEND_URL,
  process.env.APP_BASE_URL
].filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o.replace(/\/$/, "")))) return callback(null, true);
    callback(null, true);
  },
  credentials: true
}));

// Logs
app.use(morgan("combined"));

// Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// UTF-8 para respostas JSON da API
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return originalJson(body);
  };
  next();
});

// Servir arquivos estáticos (documentos)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Biblioteca XLSX para exportação Excel (sem depender de CDN)
app.get("/vendor/xlsx.full.min.js", (req, res) => {
  res.sendFile(path.join(__dirname, "../node_modules/xlsx-js-style/dist/xlsx.min.js"));
});

// Servir interface de atendimento
const fs = require("fs");
const publicDir = path.join(__dirname, "../public");
const logosDir = path.join(publicDir, "logos");
const logoCasaPaths = [
  path.join(logosDir, "logo-casa.png"),
  path.join(logosDir, "cbllogo.png.png"),
  path.join(logosDir, "cbl-logo.png"),
  path.join(logosDir, "casa-brasil.png"),
  path.join(publicDir, "cbllogo.png.png"),
  path.join(publicDir, "cbllogo.png")
];
app.get(["/cbllogo.png.png", "/cbllogo.png"], (req, res) => {
  for (const p of logoCasaPaths) {
    if (fs.existsSync(p)) {
      return res.sendFile(path.resolve(p));
    }
  }
  res.status(404).send("Logo não encontrado");
});
// Servir logos diretamente (ex: /logos/cbllogo.png.png)
app.use("/logos", express.static(logosDir));
app.use(express.static(publicDir));

app.get("/atendimento", (req, res) => {
  res.type("text/html; charset=utf-8");
  res.sendFile(path.join(__dirname, "../public/atendimento.html"));
});

app.get("/login", (req, res) => {
  res.type("text/html; charset=utf-8");
  res.sendFile(path.join(__dirname, "../public/login.html"));
});

// Login por form POST (fallback quando o JavaScript não carrega)
app.post("/login-submit", async (req, res, next) => {
  const authController = require("./controllers/authController");
  const _json = res.json.bind(res);
  const _status = res.status.bind(res);
  res.json = function (data) {
    if (data && data.token && data.success) {
      res.type("text/html; charset=utf-8");
      return res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
        <script>localStorage.setItem("auth_token","${data.token}");window.location.href="/dashboard";</script>
        <p>Login efetuado. A redirecionar...</p></body></html>`);
    }
    return res.redirect("/login?msg=" + encodeURIComponent((data && data.error) || "Erro no login"));
  };
  res.status = function (code) {
    const st = _status(code);
    st.json = (data) => res.redirect("/login?msg=" + encodeURIComponent((data && data.error) || "Erro no login"));
    return st;
  };
  try {
    await authController.login(req, res);
  } catch (e) {
    next(e);
  }
});

app.get("/cliente", (req, res) => {
  res.type("text/html; charset=utf-8");
  res.sendFile(path.join(__dirname, "../public/cliente.html"));
});

app.get("/redefinir-senha", (req, res) => {
  res.type("text/html; charset=utf-8");
  res.sendFile(path.join(__dirname, "../public/reset.html"));
});

app.get("/dashboard", (req, res) => {
  res.type("text/html; charset=utf-8");
  res.sendFile(path.join(__dirname, "../public/dashboard.html"));
});

app.get("/relatorios", (req, res) => {
  res.type("text/html; charset=utf-8");
  res.sendFile(path.join(__dirname, "../public/relatorios.html"));
});

// Rota de saúde (testa conexão à base)
app.get("/health", async (req, res) => {
  const db = require("./config/database");
  let dbOk = false;
  let funcionariosCount = 0;
  let dbError = null;
  try {
    const r = await db.query("SELECT COUNT(*) AS total FROM funcionarios");
    funcionariosCount = Number(r.rows[0]?.total || 0);
    dbOk = true;
  } catch (err) {
    dbError = err.message;
  }
  res.json({
    status: dbOk ? "OK" : "DB_ERROR",
    timestamp: new Date().toISOString(),
    service: "Casa Brasil API",
    version: "1.0.0",
    database: process.env.DB_TYPE === "mysql" ? "MySQL" : "PostgreSQL",
    dbConnected: dbOk,
    funcionariosCount,
    dbError: dbError || undefined
  });
});

// Rota raiz
app.get("/", (req, res) => {
  res.json({
    message: "API Casa do Brasil Lisboa",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      pessoas: "/api/pessoas",
      atendimentos: "/api/atendimentos",
      relatorios: "/api/relatorios",
      documentos: "/api/documentos"
    }
  });
});

// ========== IMPORTAR ROTAS ==========
const authRoutes = require("./routes/authRoutes");
const pessoaRoutes = require("./routes/pessoaRoutes");
const atendimentoRoutes = require("./routes/atendimentoRoutes");
const relatorioRoutes = require("./routes/relatorioRoutes");
const { exportFamiExcel } = require("./controllers/relatorioController");
const documentoRoutes = require("./routes/documentoRoutes");
const paisRoutes = require("./routes/paisRoutes");

// ========== USAR ROTAS ==========
app.use("/api/auth", authRoutes);
app.use("/api/pessoas", autenticar, pessoaRoutes);
app.use("/api/atendimentos", autenticar, atendimentoRoutes);
app.post("/api/relatorios/export-excel", autenticar, exportFamiExcel);
app.use("/api/relatorios", autenticar, relatorioRoutes);
app.use("/api/documentos", autenticar, documentoRoutes);
app.use("/api/paises", autenticar, paisRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || "Erro interno do servidor",
    path: req.path
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Endpoint não encontrado",
    path: req.originalUrl
  });
});

// Iniciar servidor (0.0.0.0 = acessível de fora em deploy)
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0";
app.listen(PORT, HOST, () => {
  console.log("========================================");
  console.log("🚀 API Casa do Brasil Lisboa");
  console.log(`📍 Porta: ${PORT}`);
  console.log(`🌐 Ambiente: ${process.env.NODE_ENV}`);
  console.log(`🕐 Iniciado: ${new Date().toLocaleString("pt-PT")}`);
  console.log("========================================");
});
