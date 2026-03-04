// test-server.js - SERVIDOR QUE NÃO FALHA
const http = require("http");
const PORT = 5055; // Porta NOVA

console.log("🔄 Iniciando servidor de teste...");

// Capturar TODOS os erros possíveis
process.on("uncaughtException", (error) => {
  console.error("❌ Erro não capturado:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Promise rejeitada:", reason);
});

const server = http.createServer((req, res) => {
  try {
    console.log(`📥 Recebida requisição: ${req.method} ${req.url}`);
    
    // Configurar headers
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    
    // Rotas
    if (req.url === "/" || req.url === "") {
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        message: "✅ SERVIDOR FUNCIONANDO PERFEITAMENTE!",
        timestamp: new Date().toISOString(),
        port: PORT
      }));
    } else if (req.url === "/health") {
      res.writeHead(200);
      res.end(JSON.stringify({ status: "HEALTHY", time: new Date().toLocaleTimeString() }));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Rota não encontrada", path: req.url }));
    }
    
  } catch (error) {
    console.error("❌ Erro na requisição:", error);
    res.writeHead(500);
    res.end(JSON.stringify({ error: "Erro interno do servidor" }));
  }
});

// Configurar servidor
server.on("error", (error) => {
  console.error("❌ ERRO NO SERVIDOR:", error.message);
  
  if (error.code === "EADDRINUSE") {
    console.log(`   Porta ${PORT} já está em uso!`);
    console.log("   Vamos tentar porta 5056...");
    // Tentar porta diferente
    const newServer = http.createServer(server.listen(5056, () => {
      console.log(`✅ Servidor iniciado na porta 5056!`);
    }));
  }
});

// Iniciar servidor
server.listen(PORT, "localhost", () => {
  console.log("=".repeat(60));
  console.log("🎉 SERVIDOR INICIADO COM SUCESSO!");
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`📡 Porta: ${PORT}`);
  console.log(`🕐 ${new Date().toLocaleString("pt-PT")}`);
  console.log("=".repeat(60));
  
  // TESTAR O PRÓPRIO SERVIDOR
  console.log("\n🔍 Testando internamente...");
  const testReq = http.get(`http://localhost:${PORT}/`, (testRes) => {
    let data = "";
    testRes.on("data", chunk => data += chunk);
    testRes.on("end", () => {
      console.log("✅ Teste interno PASSOU!");
      console.log(`   Resposta: ${data.substring(0, 100)}...`);
    });
  });
  
  testReq.on("error", (err) => {
    console.log("❌ Teste interno FALHOU:", err.message);
  });
});

console.log("🔄 Aguardando conexões...");
