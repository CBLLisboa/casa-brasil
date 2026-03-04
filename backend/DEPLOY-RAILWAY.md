# Deploy no Railway – Casa do Brasil

Guia para colocar a API e a base de dados no [Railway](https://railway.app).

---

## 1. Pré-requisitos

- Conta no [Railway](https://railway.app) (grátis com GitHub)
- Código no GitHub (repositório do projeto)

---

## 2. Criar projeto no Railway

1. Acede a [railway.app](https://railway.app) e faz login com GitHub.
2. Clica em **"New Project"**.
3. Escolhe **"Deploy from GitHub repo"**.
4. Seleciona o repositório do Casa do Brasil.
5. **Root Directory**: define `backend` (se o backend estiver numa pasta `backend`).
6. O Railway deteta Node.js e faz o deploy.

---

## 3. Adicionar PostgreSQL

1. No projeto, clica em **"+ New"**.
2. Escolhe **"Database"** → **"PostgreSQL"**.
3. O Railway cria a base de dados e define a variável `DATABASE_URL` automaticamente.
4. Liga a base de dados ao serviço da API:
   - Clica no serviço da API → **Variables** → **"+ New Variable"** → **"Add Reference"**.
   - Seleciona `DATABASE_URL` do PostgreSQL.

---

## 4. Variáveis de ambiente

No serviço da API, em **Variables**, define:

| Variável | Valor | Obrigatório |
|----------|-------|-------------|
| `DATABASE_URL` | Referência ao PostgreSQL (já definida) | Sim |
| `JWT_SECRET` | Senha longa e segura (mín. 32 caracteres) | Sim |
| `NODE_ENV` | `production` | Sim |
| `APP_BASE_URL` | URL pública, ex: `https://casa-brasil-xxx.up.railway.app` | Sim |
| `PORT` | Deixar em branco (Railway define automaticamente) | - |

**Email (recuperação de senha):**

| Variável | Valor |
|----------|-------|
| `SMTP_HOST` | smtp.gmail.com |
| `SMTP_PORT` | 587 |
| `SMTP_USER` | seu_email@gmail.com |
| `SMTP_PASS` | Senha de app do Gmail |
| `SMTP_FROM` | Casa do Brasil \<seu_email@gmail.com\> |
| `ADMIN_EMAIL` | admin@casabrasil.pt |

---

## 5. Configurar a base de dados (primeira vez)

Depois do primeiro deploy, é preciso criar as tabelas:

1. No Railway, abre o serviço **PostgreSQL**.
2. Em **"Connect"**, copia a **Connection URL**.
3. No teu computador, com o projeto aberto:

```bash
cd backend
# Define DATABASE_URL temporariamente e executa o setup
set DATABASE_URL=postgresql://user:pass@host:port/railway
node scripts/setup.js
```

Ou usa o Railway CLI:

```bash
railway run node scripts/setup.js
```

---

## 6. Domínio personalizado (opcional)

1. No Railway, clica no serviço da API.
2. Vai a **Settings** → **Networking** → **Generate Domain**.
3. Obténs um URL como `casa-brasil-production.up.railway.app`.
4. Para usar `app.casabrasil.pt`:
   - No Amen (gestão de DNS), cria um registo **CNAME**:
     - Nome: `app` (ou o subdomínio que quiseres)
     - Valor: `casa-brasil-production.up.railway.app`
   - No Railway, em **Settings** → **Custom Domain**, adiciona `app.casabrasil.pt`.

---

## 7. Documentos enviados (uploads)

O Railway usa sistema de ficheiros efémero: os ficheiros em `/uploads` podem ser perdidos em cada novo deploy.

**Opções:**

1. **Railway Volume** (recomendado):
   - No serviço da API → **Volumes** → **Add Volume**.
   - Mount path: `/app/uploads`.
   - Os documentos passam a persistir entre deploys.

2. **Storage externo** (S3, Cloudflare R2, etc.) – exige alterações no código.

---

## 8. Verificar o deploy

1. Abre o URL do serviço (ex: `https://casa-brasil-xxx.up.railway.app`).
2. Deves ver a página de login.
3. Login inicial: `admin@casabrasil.pt` / `admin123` (se o setup foi executado).

**Importante:** Altera a palavra-passe do admin após o primeiro login.

---

## Resumo

| Passo | Ação |
|-------|------|
| 1 | Deploy do repositório no Railway |
| 2 | Adicionar PostgreSQL e ligar à API |
| 3 | Definir variáveis (JWT_SECRET, APP_BASE_URL, etc.) |
| 4 | Executar `node scripts/setup.js` uma vez |
| 5 | (Opcional) Configurar domínio e Volume para uploads |
