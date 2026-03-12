# Deploy da Aplicação no Servidor WePanel

Guia para colocar a **interface + API** do Casa do Brasil no servidor WePanel (https://lhwp3020.webapps.net:2443/).

---

## O que precisa

- Base de dados MySQL já criada no WePanel ✅
- Acesso ao servidor: **FTP**, **SSH** ou **Gestor de ficheiros** do WePanel
- Node.js no servidor (verificar se o WePanel suporta)

---

## Opção 1: WePanel tem suporte a Node.js

Se no painel existir **"Aplicações Node.js"**, **"Node.js"** ou **"Deploy"**:

1. Crie uma nova aplicação Node.js
2. Indique a pasta do projeto (ex.: `casa-brasil`)
3. Defina o comando de arranque: `node src/server.js` ou `npm start`
4. Configure as variáveis de ambiente (ver secção abaixo)
5. Faça o upload dos ficheiros e inicie a aplicação

---

## Opção 2: Upload por FTP / Gestor de ficheiros

### Passo 1: Preparar os ficheiros no PC

1. Na pasta `backend`, execute:
   ```
   npm install --production
   ```
2. Crie o ficheiro `.env` com (ajuste aos seus dados):

```
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=nome_da_sua_base
DB_USER=seu_utilizador
DB_PASSWORD=sua_palavra_passe
PORT=5000
NODE_ENV=production
JWT_SECRET=uma_chave_secreta_longa_e_aleatoria
```

3. **Não** envie a pasta `node_modules` se o servidor tiver Node.js (pode instalar lá com `npm install`).

### Passo 2: Enviar para o servidor

1. Conecte por **FTP** ou use o **Gestor de ficheiros** do WePanel
2. Envie toda a pasta `backend` para:
   - `public_html/casa-brasil/` ou
   - `htdocs/casa-brasil/` ou
   - O caminho indicado no painel para aplicações Node.js

### Passo 3: Instalar dependências e iniciar (se tiver SSH)

```bash
cd casa-brasil
npm install --production
node src/server.js
```

Para manter a aplicação em execução: use **PM2** ou o gestor de processos do WePanel.

---

## Opção 3: WePanel não suporta Node.js

Se o WePanel só tiver PHP (sem Node.js):

- A API pode ficar num serviço externo (ex.: **Render**, **Railway**, **Fly.io**)
- A base de dados continua no WePanel
- Ative **MySQL remoto** no WePanel
- No `.env` da API, use o host MySQL remoto do WePanel

---

## Variáveis de ambiente (.env)

| Variável | Valor | Descrição |
|----------|-------|-----------|
| DB_TYPE | mysql | |
| DB_HOST | localhost | Se a API estiver no mesmo servidor que o MySQL |
| DB_PORT | 3306 | |
| DB_NAME | nome da base | |
| DB_USER | utilizador | |
| DB_PASSWORD | palavra-passe | |
| PORT | 5000 | Porta da API (ou a que o WePanel indicar) |
| NODE_ENV | production | |
| JWT_SECRET | texto aleatório longo | Para segurança dos tokens |

---

## Estrutura de ficheiros a enviar

```
backend/
├── src/
├── public/
├── scripts/
├── uploads/          (criar pasta vazia se não existir)
├── package.json
├── .env
└── (sem node_modules - instalar no servidor)
```

---

## Verificar no WePanel

1. **Gestor de ficheiros** – para upload
2. **SSH** – para comandos no servidor
3. **Node.js** – se existe alguma aplicação ou gestor
4. **Domínios / subdomínios** – para configurar o URL da aplicação

---

## URL da aplicação

Depois do deploy, a aplicação deve aceder em algo como:

- `https://lhwp3020.webapps.net:2443/` (se o WePanel encaminhar para a aplicação)
- Ou um subdomínio: `https://casabrasil.lhwp3020.webapps.net`
- Ou com porta: `https://lhwp3020.webapps.net:2443:5000`

O URL exato depende da configuração do WePanel.

---

## Resumo

1. Verificar se o WePanel suporta Node.js
2. Se sim: upload dos ficheiros + configurar .env + iniciar a aplicação
3. Se não: hospedar a API no Render/Railway e manter o MySQL no WePanel
