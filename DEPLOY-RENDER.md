# Deploy da API Casa do Brasil no Render

Guia para colocar a **API + interface** no Render, ligada ao MySQL do WePanel.

---

## 1. O que precisa

- Conta no **GitHub** (gratuita)
- Conta no **Render** (gratuita): https://render.com
- Base MySQL no WePanel já criada
- **MySQL remoto** ativo no WePanel

---

## 2. Colocar o código no GitHub

1. Crie uma conta em https://github.com (se ainda não tiver)
2. Crie um repositório novo (ex.: `casa-brasil`)
3. No seu PC, na pasta do projeto (a que contém a pasta `backend`), execute:

```powershell
cd "C:\Users\mjuly\OneDrive\Ambiente de Trabalho\casa-brasil\casa-brasil"
git init
git add .
git commit -m "Casa do Brasil - deploy inicial"
git branch -M main
git remote add origin https://github.com/SEU_UTILIZADOR/casa-brasil.git
git push -u origin main
```

Substitua `SEU_UTILIZADOR` pelo seu nome de utilizador no GitHub.

**Importante:** O projeto já tem um `.gitignore` que evita enviar `node_modules` e `.env` para o GitHub.

---

## 3. Criar conta e deploy no Render

1. Aceda a **https://render.com**
2. Clique em **Get Started for Free**
3. Registe-se (pode usar conta GitHub para login)
4. No Dashboard, clique em **New +** → **Web Service**
5. Ligue o repositório GitHub (autorize o Render se pedir)
6. Selecione o repositório `casa-brasil`

---

## 4. Configurar o Web Service

| Campo | Valor |
|-------|-------|
| **Name** | casa-brasil (ou outro nome) |
| **Region** | Frankfurt (ou o mais próximo) |
| **Branch** | main |
| **Root Directory** | `backend` |
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | Free |

---

## 5. Variáveis de ambiente (Environment Variables)

No Render, vá a **Environment** e adicione:

| Key | Value |
|-----|-------|
| `DB_TYPE` | mysql |
| `DB_HOST` | lhwp3020.webapps.net |
| `DB_PORT` | 3306 |
| `DB_NAME` | id3l1bg1_casa_brasil_lisboa |
| `DB_USER` | id3l1bg1_casa |
| `DB_PASSWORD` | CdBLisboa1992@ |
| `NODE_ENV` | production |
| `JWT_SECRET` | (crie uma chave longa e aleatória) |
| `JWT_EXPIRES_IN` | 24h |
| `ADMIN_EMAIL` | cdblisboa@gmail.com |
| `APP_BASE_URL` | https://SEU-SERVICO.onrender.com |

Substitua `SEU-SERVICO` pelo nome que deu ao serviço no Render.

---

## 6. MySQL Remoto – IPs do Render

O WePanel só aceita conexões de IPs autorizados. O Render usa IPs específicos.

1. Depois de criar o serviço no Render, vá ao **Dashboard**
2. Clique no seu serviço **casa-brasil**
3. Clique no menu **Connect** (canto superior direito)
4. Vá ao separador **Outbound**
5. Copie os **IP ranges** (ex.: `216.24.60.0/24`)

No WePanel → **MySQL Remoto**:
- Se aceitar **ranges (CIDR)**: adicione cada range (ex.: `216.24.60.0/24`)
- Se só aceitar **IPs únicos**: adicione o carácter `%` para permitir qualquer IP *(menos seguro, mas funciona)*

---

## 7. Executar o setup do admin (antes do primeiro deploy)

Antes de aceder à aplicação, o utilizador admin precisa de estar na base. Execute no seu PC (com o MySQL remoto a aceitar o seu IP):

```powershell
cd casa-brasil\backend
node scripts/setup-mysql.js
```

Isto insere o admin: **cdblisboa@gmail.com** / **admin123**

---

## 8. Deploy

1. Clique em **Create Web Service** no Render
2. O Render vai fazer o build e iniciar a aplicação
3. Quando terminar, terá um URL como: `https://casa-brasil-xxxx.onrender.com`

---

## 9. Atualizar APP_BASE_URL

Depois do primeiro deploy, volte a **Environment** no Render e atualize:

```
APP_BASE_URL=https://casa-brasil-xxxx.onrender.com
```

(Use o URL real que o Render atribuiu)

---

## Resumo

| Componente | Onde |
|------------|------|
| Código | GitHub |
| API + Interface | Render |
| MySQL | WePanel |
| Acesso | Browser → URL do Render |

---

## Problemas comuns

**"Cannot connect to MySQL"**
- Verifique se adicionou os IPs do Render no WePanel → MySQL Remoto
- Confirme as variáveis de ambiente (DB_HOST, DB_USER, DB_PASSWORD)

**"Login não funciona" / "Credenciais inválidas"**
1. Aceda a `https://SEU-SERVICO.onrender.com/health` – verá `dbConnected` e `funcionariosCount`
2. Se `dbConnected: false` → adicione os IPs do Render no WePanel → MySQL Remoto
3. Se `funcionariosCount: 0` → execute o SQL em `scripts/inserir-admin-phpmyadmin.sql` no phpMyAdmin
4. Alternativa: use o separador **Registrar** na página de login para criar um novo admin

**"Cold start" (demora ~1 min no primeiro acesso)**
- Normal no plano gratuito. A aplicação "adormece" após 15 min sem uso.

**Alterar código**
- Faça `git push` para o GitHub → o Render faz redeploy automático (se ativou Auto-Deploy)
