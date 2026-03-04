const jwt = require("jsonwebtoken");

const autenticar = (req, res, next) => {
  try {
    // Obter token do header
    const authHeader = req.header("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ 
        error: "Acesso negado. Token não fornecido." 
      });
    }
    
    const token = authHeader.replace("Bearer ", "");
    
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Adicionar usuário à requisição
    req.usuario = {
      id: decoded.id,
      email: decoded.email,
      nome: decoded.nome,
      tipo: decoded.tipo
    };
    
    next();
  } catch (error) {
    console.error("Erro de autenticação:", error.message);
    
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Token inválido" });
    }
    
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expirado" });
    }
    
    res.status(401).json({ error: "Falha na autenticação" });
  }
};

// Middleware para verificar tipo de usuário
const verificarTipo = (...tiposPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }
    
    if (!tiposPermitidos.includes(req.usuario.tipo)) {
      return res.status(403).json({ 
        error: "Acesso negado. Permissão insuficiente.",
        tipo_necessario: tiposPermitidos,
        seu_tipo: req.usuario.tipo
      });
    }
    
    next();
  };
};

module.exports = { autenticar, verificarTipo };
