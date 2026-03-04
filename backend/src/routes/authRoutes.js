const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { autenticar, verificarTipo } = require("../middleware/auth");

// Login (pública)
router.post("/login", authController.login);

// Status (pública)
router.get("/status", authController.status);

// Criar primeiro admin (pública quando não existe admin)
router.post("/primeiro-admin", authController.criarPrimeiroAdmin);

// Recuperar palavra-passe (pública)
router.post("/recuperar", authController.solicitarRecuperacao);

// Redefinir palavra-passe com token (pública)
router.post("/redefinir", authController.redefinirComToken);

// Logout
router.post("/logout", autenticar, authController.logout);

// Perfil do usuário logado
router.get("/me", autenticar, authController.me);

// Alterar senha
router.put("/alterar-senha", autenticar, authController.alterarSenha);

// Resetar senha (admin)
router.post("/reset-senha", autenticar, verificarTipo("admin"), authController.resetSenha);

// Registrar usuário (pública)
router.post("/registrar", authController.registrar);

module.exports = router;
