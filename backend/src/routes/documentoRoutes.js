const express = require("express");
const upload = require("../config/upload");
const {
  listarDocumentosPorPessoa,
  uploadDocumentosPessoa
} = require("../controllers/documentoController");

const router = express.Router();

router.get("/pessoa/:pessoaId", listarDocumentosPorPessoa);
router.post("/pessoa/:pessoaId", upload.array("documentos", 10), uploadDocumentosPessoa);

module.exports = router;
