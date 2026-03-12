# Schema da Base de Dados – Conformidade para Auditorias

**Casa do Brasil – CLAIM Bairro Alto**  
**Projeto FAMI – Fundo Asilo, Migração e Integração**

---

## 1. Tabelas Principais

### 1.1 PESSOAS (beneficiários)

Dados da ficha de atendimento. Filhos/cônjuge via tabela **parentescos** e **familias** (agregado familiar).

| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| id | SERIAL | Sim (PK) | Identificador único |
| nome_completo | VARCHAR(200) | Sim | Nome completo |
| data_nascimento | DATE | Sim | Data de nascimento |
| naturalidade | VARCHAR(100) | Sim | Local de nascimento |
| nacionalidade | VARCHAR(100) | Sim | Nacionalidade |
| email | VARCHAR(100) | Sim | E-mail de contacto |
| telefone | VARCHAR(30) | Sim | Telefone principal |
| morada | TEXT | Sim | Morada em Portugal |
| genero | VARCHAR(20) | Não | Género |
| estado_civil | VARCHAR(50) | Não | Estado civil |
| profissao | VARCHAR(100) | Não | Profissão |
| habilitacoes_literarias | VARCHAR(120) | Não | Habilitações literárias |
| idioma_origem | VARCHAR(100) | Não | Idioma de origem |
| telefone_alternativo | VARCHAR(30) | Não | Telefone alternativo |
| codigo_postal | VARCHAR(20) | Não | Código postal |
| distrito | VARCHAR(100) | Não | Distrito |
| concelho | VARCHAR(100) | Não | Concelho |
| freguesia | VARCHAR(100) | Não | Freguesia |
| tipo_documento | VARCHAR(50) | Não | Tipo de documento de identificação |
| numero_documento | VARCHAR(50) | Não | Número do documento |
| documento_emissao | DATE | Não | Data de emissão |
| documento_validade | DATE | Não | Data de validade |
| tipo_visto | VARCHAR(80) | Não | Tipo de visto |
| tipo_ar | VARCHAR(80) | Não | Tipo de autorização de residência |
| situacao_regular | VARCHAR(50) | Não | Situação de regularização |
| familia_id | INTEGER | Não | Referência à família (agregado familiar) |
| status | VARCHAR(20) | Não | Status do registo |
| observacoes | TEXT | Não | Observações |
| criado_em | TIMESTAMP | Não | Data de criação |
| atualizado_em | TIMESTAMP | Não | Data de atualização |
| criado_por | INTEGER | Não | Utilizador que criou (FK) |

### 1.2 ATENDIMENTOS

| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| id | SERIAL | Sim (PK) | Identificador único |
| beneficiario_id | INTEGER | Sim | Referência à pessoa (FK) |
| modalidade_atendimento | VARCHAR(30) | Sim | Presencial/Telefónico/Email |
| tipo_atendimento | VARCHAR(100) | Sim | Tipo de atendimento |
| data_atendimento | DATE | Sim | Data do atendimento |
| funcionario_id | INTEGER | Não | Funcionário que atendeu (FK) |
| declaracao_data | DATE | Não | Data da declaração RGPD |
| declaracao_local | VARCHAR(150) | Não | Local da declaração RGPD |
| declaracao_assinatura | VARCHAR(150) | Não | Assinatura na declaração |
| descricao | TEXT | Não | Descrição do atendimento |
| observacoes | TEXT | Não | Observações |
| itens_entregues | TEXT | Não | Itens entregues |
| elegivel_npt | BOOLEAN | Não | Elegível NPT |
| orientacao_profissional | BOOLEAN | Não | Recebeu orientação profissional individual |
| avaliou | VARCHAR(20) | Não | Avaliou o serviço |
| servico_util | VARCHAR(20) | Não | Serviço foi útil |
| criado_em | TIMESTAMP | Não | Data de criação |

### 1.3 DOCUMENTOS

| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| id | SERIAL | Sim (PK) | Identificador único |
| pessoa_id | INTEGER | Não | Referência à pessoa (FK) |
| atendimento_id | INTEGER | Não | Referência ao atendimento (FK) |
| tipo_documento | VARCHAR(50) | Sim | Tipo (Declaração RGPD, Identificação, etc.) |
| nome_arquivo | VARCHAR(255) | Sim | Nome original do ficheiro |
| caminho_arquivo | VARCHAR(500) | Sim | Caminho no servidor |
| tamanho_bytes | BIGINT | Não | Tamanho em bytes |
| mimetype | VARCHAR(100) | Não | Tipo MIME |
| criado_em | TIMESTAMP | Não | Data de criação |

---

## 2. Conformidade RGPD

- **Declaração RGPD**: obrigatória apenas no 1.º atendimento de cada pessoa.
- **Documentos**: armazenados com `pessoa_id` e/ou `atendimento_id`.
- **Renovação**: prevista em 2027.

---

## 3. Conformidade FAMI

- **Relatórios**: dados pessoais e morada refletem as alterações mais recentes da ficha.
- **Resumo**: Novos registos | Atend. pessoas já registradas | Total atendimentos.
- **Documentos**: incluídos nos relatórios (identificação e RGPD).

---

## 4. Tabelas e Views Ativas

**Tabelas:** pessoas, atendimentos, documentos, familias, parentescos, funcionarios, usuarios, paises, password_reset_tokens

**Nota sobre `paises`:** É uma tabela de referência (lookup) – não tem FK com outras tabelas. Usada para popular o dropdown de nacionalidade em `pessoas`. O campo `pessoas.nacionalidade` armazena o texto (ex.: "Brasil"), não um `pais_id`.

**Views:** relatorio_atendimentos_base, relatorio_atendimentos_diario, relatorio_atendimentos_semanal, relatorio_atendimentos_quinzenal, relatorio_atendimentos_mensal

**Removidas (não utilizadas):** acompanhamentos_sociais, agendamentos, auditoria_alteracoes, cursos_formacoes, familia_membros, grupos_familiares, indicadores_fami, logs_acesso, parentesco, registros_indicadores, tipos_atendimento, vw_*

## 5. Scripts de Manutenção

| Script | Uso |
|--------|-----|
| `node scripts/setup.js` | Instalação inicial (nova base) |
| `node scripts/migrate-existing-db.js` | Migração de base existente |
| `node scripts/audit-and-sync-db.js` | Auditoria e sincronização (conformidade) |
| `node scripts/drop-unused-tables.js` | Remover tabelas/views desnecessárias |

---

## 6. Índices Recomendados

- `idx_atendimentos_beneficiario`
- `idx_atendimentos_data`
- `idx_atendimentos_funcionario`
- `idx_pessoas_genero`
- `idx_pessoas_data_nascimento`
- `idx_pessoas_numero_documento`
- `idx_documentos_pessoa`
- `idx_documentos_atendimento`
