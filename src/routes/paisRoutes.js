const express = require("express");
const { listarPaises } = require("../controllers/paisController");

const router = express.Router();

router.get("/", listarPaises);

module.exports = router;
