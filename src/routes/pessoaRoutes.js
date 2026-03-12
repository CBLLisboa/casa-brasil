const express = require("express");
const { listarPessoas, obterPessoa, atualizarPessoa } = require("../controllers/pessoaController");

const router = express.Router();

router.get("/", listarPessoas);
router.get("/:id", obterPessoa);
router.patch("/:id", atualizarPessoa);

module.exports = router;
