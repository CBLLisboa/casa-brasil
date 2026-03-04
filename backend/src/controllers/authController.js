const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const db = require("../config/database");
const { dentroDoExpediente, motivoBloqueio } = require("../utils/expediente");
const fs = require("fs");
const path = require("path");

function validarSenhaForte(senha) {
  if (!senha || senha.length < 8) {
    return "A senha deve ter pelo menos 8 caracteres.";
  }
  if (!/[a-z]/.test(senha)) {
    return "A senha deve ter pelo menos 1 letra minúscula.";
  }
  if (!/[A-Z]/.test(senha)) {
    return "A senha deve ter pelo menos 1 letra maiúscula.";
  }
  if (!/[0-9]/.test(senha)) {
    return "A senha deve ter pelo menos 1 número.";
  }
  if (!/[^A-Za-z0-9]/.test(senha)) {
    return "A senha deve ter pelo menos 1 caractere especial.";
  }
  return null;
}

function criarTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 0);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: {
      user,
      pass
    }
  });
}

async function enviarEmailRecuperacao(email, token, minutos) {
  const transport = criarTransporter();
  if (!transport) {
    throw new Error("Email não configurado. Configure SMTP_* no .env.");
  }

  const baseUrl = process.env.APP_BASE_URL || "http://localhost:5000";
  const link = `${baseUrl}/redefinir-senha?token=${token}`;
  const remetente = process.env.SMTP_FROM || process.env.SMTP_USER;

  await transport.sendMail({
    from: remetente,
    to: email,
    subject: "Recuperação de palavra-passe - Casa do Brasil",
    text:
      "Recebemos um pedido de recuperação de palavra-passe.\n" +
      `Clique no link para redefinir (válido por ${minutos} min): ${link}\n` +
      "Se não foi você, ignore este email.",
    html:
      "<p>Recebemos um pedido de recuperação de palavra-passe.</p>" +
      `<p><a href="${link}">Clique aqui para redefinir</a></p>` +
      `<p>Este link é válido por ${minutos} minutos.</p>` +
      "<p>Se não foi você, ignore este email.</p>"
  });
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function gerarCodigoFuncionario() {
  const prefixo = "FUNC";
  const resultado = await db.query(
    `SELECT COALESCE(
        MAX(NULLIF(regexp_replace(codigo, '\\D', '', 'g'), '')::int),
        0
      ) AS max
     FROM funcionarios`
  );
  const proximo = Number(resultado.rows[0]?.max || 0) + 1;
  return `${prefixo}${String(proximo).padStart(3, "0")}`;
}

function emailNaWhitelist(email) {
  try {
    const filePath = path.join(__dirname, "../config/whitelist.json");
    if (!fs.existsSync(filePath)) return false;
    const raw = fs.readFileSync(filePath, "utf8");
    const json = JSON.parse(raw);
    if (!Array.isArray(json.emails)) return false;
    return json.emails.map((e) => String(e).toLowerCase()).includes(email.toLowerCase());
  } catch {
    return false;
  }
}

const authController = {
  async status(req, res) {
    try {
      const result = await db.query(
        `SELECT COUNT(*)::int AS total
         FROM funcionarios
         WHERE nivel_acesso = 'admin'
           AND (ativo IS NULL OR ativo = true)
           AND (ativo_login IS NULL OR ativo_login = true)`
      );
      return res.json({ admin_existe: result.rows[0].total > 0 });
    } catch (error) {
      console.error("Erro ao verificar status:", error);
      return res.status(500).json({ error: "Erro ao verificar status" });
    }
  },

  async criarPrimeiroAdmin(req, res) {
    try {
      const { nome, email, senha, telefone, codigo } = req.body;

      if (!nome || !email || !senha || !telefone) {
        return res.status(400).json({
          error: "Nome, email, telefone e senha são obrigatórios"
        });
      }

      const senhaErro = validarSenhaForte(senha);
      if (senhaErro) {
        return res.status(400).json({ error: senhaErro });
      }

      const existeAdmin = await db.query(
        `SELECT COUNT(*)::int AS total
         FROM funcionarios
         WHERE nivel_acesso = 'admin'
           AND (ativo IS NULL OR ativo = true)
           AND (ativo_login IS NULL OR ativo_login = true)`
      );
      if (existeAdmin.rows[0].total > 0) {
        return res.status(400).json({ error: "Admin já configurado." });
      }

      const emailExistente = await db.query(
        "SELECT id FROM funcionarios WHERE email = $1",
        [email]
      );
      if (emailExistente.rows.length > 0) {
        return res.status(400).json({ error: "Email já cadastrado." });
      }

      const salt = await bcrypt.genSalt(10);
      const senhaHash = await bcrypt.hash(senha, salt);

      const codigoFinal =
        codigo && codigo.trim() ? codigo.trim() : await gerarCodigoFuncionario();

      const criado = await db.query(
        `INSERT INTO funcionarios (
          codigo,
          nome_completo,
          email,
          telefone,
          cargo,
          nivel_acesso,
          usuario_login,
          senha_hash,
          ativo_login,
          ativo,
          data_cadastro
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, true, NOW())
        RETURNING id, codigo, nome_completo, email, telefone, nivel_acesso`,
        [
          codigoFinal,
          nome.trim(),
          email.trim(),
          telefone.trim(),
          "Administrador",
          "admin",
          email.trim(),
          senhaHash
        ]
      );

      return res.status(201).json({
        success: true,
        usuario: criado.rows[0],
        message: "Admin criado com sucesso."
      });
    } catch (error) {
      console.error("Erro ao criar admin:", error);
      return res.status(500).json({ error: "Erro ao criar admin" });
    }
  },

  async registrar(req, res) {
    try {
      const {
        codigo,
        nome_completo,
        email,
        telefone,
        cargo,
        nivel_acesso,
        usuario_login,
        senha,
        ativo,
        ativo_login
      } = req.body;

      if (
        !nome_completo ||
        !email ||
        !telefone ||
        !cargo ||
        !nivel_acesso ||
        !senha
      ) {
        return res.status(400).json({
          error:
            "Nome, email, telefone, cargo, nível de acesso e senha são obrigatórios"
        });
      }

      if (!["admin", "funcionario"].includes(nivel_acesso)) {
        return res.status(400).json({ error: "Tipo inválido." });
      }

      const senhaErro = validarSenhaForte(senha);
      if (senhaErro) {
        return res.status(400).json({ error: senhaErro });
      }

      const emailExistente = await db.query(
        "SELECT id FROM funcionarios WHERE email = $1",
        [email]
      );
      if (emailExistente.rows.length > 0) {
        return res.status(400).json({ error: "Email já cadastrado." });
      }

      const salt = await bcrypt.genSalt(10);
      const senhaHash = await bcrypt.hash(senha, salt);

      const codigoFinal =
        codigo && codigo.trim() ? codigo.trim() : await gerarCodigoFuncionario();

      const criado = await db.query(
        `INSERT INTO funcionarios (
          codigo,
          nome_completo,
          email,
          telefone,
          cargo,
          nivel_acesso,
          usuario_login,
          senha_hash,
          ativo_login,
          ativo,
          data_cadastro
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        RETURNING id, codigo, nome_completo, email, telefone, nivel_acesso`,
        [
          codigoFinal,
          nome_completo.trim(),
          email.trim(),
          telefone.trim(),
          cargo.trim(),
          nivel_acesso,
          (usuario_login || email).trim(),
          senhaHash,
          ativo_login !== undefined ? Boolean(ativo_login) : true,
          ativo !== undefined ? Boolean(ativo) : true
        ]
      );

      return res.status(201).json({
        success: true,
        usuario: criado.rows[0],
        message: "Usuário registrado com sucesso."
      });
    } catch (error) {
      console.error("Erro ao registrar usuário:", error);
      return res.status(500).json({ error: "Erro ao registrar usuário" });
    }
  },

  async login(req, res) {
    try {
      const { email, senha } = req.body;
      
      // Validar entrada
      if (!email || !senha) {
        return res.status(400).json({ 
          error: "Email e senha são obrigatórios" 
        });
      }
      
      // Buscar usuário
      const result = await db.query(
        `SELECT *
         FROM funcionarios
         WHERE (email = $1 OR usuario_login = $1)
           AND (ativo IS NULL OR ativo = true)
           AND (ativo_login IS NULL OR ativo_login = true)`,
        [email]
      );
      
      if (result.rows.length === 0) {
        return res.status(401).json({ 
          error: "Credenciais inválidas" 
        });
      }
      
      const usuario = result.rows[0];
      
      // Verificar senha
      const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
      
      if (!senhaValida) {
        return res.status(401).json({ 
          error: "Credenciais inválidas" 
        });
      }

      const dentroHorario = dentroDoExpediente();
      const liberadoWhitelist = emailNaWhitelist(usuario.email);
      const tipoAcesso = usuario.nivel_acesso || "funcionario";
      if (!dentroHorario && tipoAcesso !== "admin" && !liberadoWhitelist) {
        return res.status(403).json({
          error: "Login bloqueado fora do expediente.",
          motivo: motivoBloqueio()
        });
      }
      
      // Criar token JWT
      const token = jwt.sign(
        {
          id: usuario.id,
          email: usuario.email,
          nome: usuario.nome_completo,
          tipo: tipoAcesso
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );
      
      // Remover senha_hash da resposta
      const { senha_hash, reset_token, token_validade, ...usuarioSemSenha } = usuario;
      
      res.json({
        success: true,
        message: "Login realizado com sucesso",
        token,
        usuario: usuarioSemSenha,
        expiresIn: process.env.JWT_EXPIRES_IN,
        aviso: dentroHorario ? null : "Login fora do expediente.",
        motivo: dentroHorario ? null : motivoBloqueio(),
        liberado_whitelist: liberadoWhitelist
      });
      
    } catch (error) {
      console.error("Erro no login:", error);
      res.status(500).json({ error: "Erro ao fazer login" });
    }
  },
  
  async me(req, res) {
    try {
      // Usuário já está no req.usuario pelo middleware
      res.json({
        success: true,
        usuario: req.usuario
      });
    } catch (error) {
      console.error("Erro ao buscar perfil:", error);
      res.status(500).json({ error: "Erro ao buscar perfil" });
    }
  },
  
  async alterarSenha(req, res) {
    try {
      const { senha_atual, nova_senha } = req.body;
      const usuarioId = req.usuario.id;
      
      if (!senha_atual || !nova_senha) {
        return res.status(400).json({ 
          error: "Senha atual e nova senha são obrigatórias" 
        });
      }
      
      const senhaErro = validarSenhaForte(nova_senha);
      if (senhaErro) {
        return res.status(400).json({ error: senhaErro });
      }
      
      // Buscar usuário
      const result = await db.query(
        "SELECT senha_hash FROM funcionarios WHERE id = $1",
        [usuarioId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      
      const usuario = result.rows[0];
      
      // Verificar senha atual
      const senhaValida = await bcrypt.compare(senha_atual, usuario.senha_hash);
      
      if (!senhaValida) {
        return res.status(401).json({ 
          error: "Senha atual incorreta" 
        });
      }
      
      // Criptografar nova senha
      const salt = await bcrypt.genSalt(10);
      const novaSenhaHash = await bcrypt.hash(nova_senha, salt);
      
      // Atualizar senha
      await db.query(
        "UPDATE funcionarios SET senha_hash = $1 WHERE id = $2",
        [novaSenhaHash, usuarioId]
      );
      
      res.json({
        success: true,
        message: "Senha alterada com sucesso"
      });
      
    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      res.status(500).json({ error: "Erro ao alterar senha" });
    }
  },

  async resetSenha(req, res) {
    try {
      const { email, nova_senha } = req.body;

      if (!email || !nova_senha) {
        return res.status(400).json({
          error: "Email e nova senha são obrigatórios"
        });
      }

      const senhaErro = validarSenhaForte(nova_senha);
      if (senhaErro) {
        return res.status(400).json({ error: senhaErro });
      }

      const result = await db.query(
        "SELECT id FROM funcionarios WHERE email = $1",
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      const salt = await bcrypt.genSalt(10);
      const novaSenhaHash = await bcrypt.hash(nova_senha, salt);

      await db.query(
        "UPDATE funcionarios SET senha_hash = $1 WHERE email = $2",
        [novaSenhaHash, email]
      );

      return res.json({
        success: true,
        message: "Senha redefinida com sucesso"
      });
    } catch (error) {
      console.error("Erro ao redefinir senha:", error);
      return res.status(500).json({ error: "Erro ao redefinir senha" });
    }
  },

  async solicitarRecuperacao(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email é obrigatório" });
      }

      const resultado = await db.query(
        `SELECT id, email
         FROM funcionarios
         WHERE email = $1
           AND (ativo IS NULL OR ativo = true)
           AND (ativo_login IS NULL OR ativo_login = true)`,
        [email]
      );

      if (resultado.rows.length === 0) {
        return res.json({
          success: true,
          message: "Se o email estiver cadastrado, enviaremos um link."
        });
      }

      const usuario = resultado.rows[0];
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashToken(token);
      const minutos = Number(process.env.RESET_TOKEN_MINUTES || 60);
      const expiraEm = new Date(Date.now() + minutos * 60 * 1000);

      await db.query(
        "UPDATE funcionarios SET reset_token = $1, token_validade = $2 WHERE id = $3",
        [tokenHash, expiraEm, usuario.id]
      );

      await enviarEmailRecuperacao(usuario.email, token, minutos);

      return res.json({
        success: true,
        message: "Se o email estiver cadastrado, enviaremos um link."
      });
    } catch (error) {
      console.error("Erro ao solicitar recuperação:", error);
      return res.status(500).json({
        error: error.message || "Erro ao solicitar recuperação"
      });
    }
  },

  async redefinirComToken(req, res) {
    const client = await db.pool.connect();
    try {
      const { token, nova_senha } = req.body;

      if (!token || !nova_senha) {
        return res.status(400).json({
          error: "Token e nova senha são obrigatórios"
        });
      }

      const senhaErro = validarSenhaForte(nova_senha);
      if (senhaErro) {
        return res.status(400).json({ error: senhaErro });
      }

      const tokenHash = hashToken(token);
      await client.query("BEGIN");

      const resultado = await client.query(
        `SELECT id, reset_token, token_validade
         FROM funcionarios
         WHERE reset_token = $1
         FOR UPDATE`,
        [tokenHash]
      );

      if (resultado.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Token inválido." });
      }

      const registro = resultado.rows[0];
      if (!registro.token_validade || new Date(registro.token_validade) < new Date()) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Token expirado." });
      }

      const salt = await bcrypt.genSalt(10);
      const novaSenhaHash = await bcrypt.hash(nova_senha, salt);

      await client.query(
        "UPDATE funcionarios SET senha_hash = $1, reset_token = NULL, token_validade = NULL WHERE id = $2",
        [novaSenhaHash, registro.id]
      );

      await client.query("COMMIT");

      return res.json({
        success: true,
        message: "Palavra-passe redefinida com sucesso."
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Erro ao redefinir senha:", error);
      return res.status(500).json({ error: "Erro ao redefinir senha" });
    } finally {
      client.release();
    }
  },
  
  async logout(req, res) {
    // Em JWT stateless, o logout é feito no frontend
    res.json({
      success: true,
      message: "Logout realizado com sucesso"
    });
  }
};

module.exports = authController;
