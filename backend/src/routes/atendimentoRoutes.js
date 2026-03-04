const express = require("express");
const upload = require("../config/upload");
const {
  registrarAtendimento,
  listarAtendimentosHoje,
  contarAtendimentosHoje,
  atendimentosPorTecnico,
  atendimentosPorPessoa,
  listarFuncionarios,
  obterAtendimento,
  atualizarAtendimento
} = require("../controllers/atendimentoController");

const router = express.Router();

router.get("/funcionarios", listarFuncionarios);
router.post("/registrar", upload.array("documentos", 10), registrarAtendimento);
router.get("/hoje", listarAtendimentosHoje);
router.get("/contador-hoje", contarAtendimentosHoje);
router.get("/por-tecnico", atendimentosPorTecnico);
router.get("/pessoa/:id", atendimentosPorPessoa);
router.get("/:id", obterAtendimento);
router.patch("/:id", atualizarAtendimento);

module.exports = router;
