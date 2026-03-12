-- ===========================================
-- Inserir admin diretamente no phpMyAdmin
-- Execute no WePanel → phpMyAdmin → base id3l1bg1_casa_brasil_lisboa
--
-- Credenciais após executar:
--   Email: cdblisboa@gmail.com
--   Senha: admin123
-- ===========================================

INSERT INTO funcionarios (
  codigo, nome_completo, email, telefone, cargo, nivel_acesso,
  usuario_login, senha_hash, ativo_login, ativo, data_cadastro
) VALUES (
  'FUNC001',
  'Administrador',
  'cdblisboa@gmail.com',
  '',
  'Administrador',
  'admin',
  'cdblisboa@gmail.com',
  '$2a$10$TI.gJblxZCWwKWZjzS6FjeOPvjOtoD3i/F7v8vZM3S8x1x5wez3Aq',
  1,
  1,
  NOW()
)
ON DUPLICATE KEY UPDATE
  senha_hash = VALUES(senha_hash),
  nome_completo = VALUES(nome_completo),
  cargo = VALUES(cargo),
  nivel_acesso = VALUES(nivel_acesso);
