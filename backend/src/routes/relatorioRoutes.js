const express = require("express");
const {
  listarRelatorio,
  listarRelatorioFami,
  listarTiposAtendimento,
  relatorioFamiDesagregacao
} = require("../controllers/relatorioController");

const router = express.Router();

router.get("/fami", listarRelatorioFami);
router.get("/fami-desagregacao", relatorioFamiDesagregacao);
router.get("/tipos-atendimento", listarTiposAtendimento);
router.get("/:periodo", listarRelatorio);

module.exports = router;
