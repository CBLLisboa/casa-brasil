# Enviar o projeto para o GitHub

Execute estes comandos na pasta do projeto (`casa-brasil`).

## 1. Inicializar Git (se ainda não fez)

```bash
cd "C:\Users\mjuly\OneDrive\Ambiente de Trabalho\casa-brasil"
git init
```

## 2. Adicionar ficheiros e fazer o primeiro commit

```bash
git add .
git status
```

**Verifique** que o `.env` NÃO aparece na lista. Se aparecer, pare e corrija o `.gitignore`.

```bash
git commit -m "Projeto inicial - Casa do Brasil Lisboa CLAIM Bairro Alto"
```

## 3. Ligar ao repositório no GitHub

Substitua `cbblisboa` e `casa-brasil` pelo nome da organização e do repositório:

```bash
git branch -M main
git remote add origin https://github.com/cbblisboa/casa-brasil.git
```

## 4. Enviar para o GitHub

```bash
git push -u origin main
```

Se pedir login, use o email e a palavra-passe do GitHub (ou um Personal Access Token).

---

## Antes de começar

1. Crie o repositório no GitHub (cbblisboa/casa-brasil)
2. Deixe-o **vazio** (sem README, sem .gitignore)
3. Execute os comandos acima
