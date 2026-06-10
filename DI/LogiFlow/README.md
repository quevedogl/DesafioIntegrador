# LogiFlow — Sistema de Gestão Comercial com Analytics Preditivo

## Overview da Aplicação

O **LogiFlow** é uma plataforma web full-stack de gestão comercial que integra controle operacional (clientes, produtos, pedidos) com análise estratégica baseada em Machine Learning. O sistema oferece relatórios gerenciais e previsão de churn de clientes, permitindo que gestores tomem decisões proativas de retenção e expansão.

### Arquitetura

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   Frontend          │────▶│   Backend API        │────▶│   Banco de Dados    │
│   Next.js 16        │     │   NestJS 11          │     │   SQLite            │
│   :3000             │     │   :3001              │     │   logiflow.db       │
└────────┬────────────┘     └─────────────────────┘     └─────────────────────┘
         │
         ▼
┌─────────────────────┐
│   Serviço ML        │
│   FastAPI/Python    │
│   :8000             │
└─────────────────────┘
```

### Módulos do Sistema

| Módulo | Descrição |
|--------|-----------|
| **Clientes** | Cadastro, edição e busca de clientes com dados de localização |
| **Produtos** | Gestão de catálogo com preço, estoque e categorias |
| **Pedidos** | Criação e acompanhamento de pedidos multi-item |
| **Dashboard** | Visão geral em tempo real do desempenho operacional |
| **Relatórios** | 4 relatórios analíticos com exportação PDF via impressão |
| **Estratégia** | Análise de churn e scoring de compra via modelo ML |

---

## Requerimentos de Instalação

### Pré-requisitos

| Ferramenta | Versão Mínima | Verificação |
|------------|---------------|-------------|
| Node.js | 18.x | `node --version` |
| npm | 9.x | `npm --version` |
| Python | 3.11+ | `python --version` |
| pip | 23.x | `pip --version` |

### Dependências do Backend (NestJS)

```bash
cd backend
npm install
```

Pacotes principais instalados:
- `@nestjs/core`, `@nestjs/common` — Framework NestJS
- `@nestjs/typeorm`, `typeorm` — ORM
- `better-sqlite3` — Driver SQLite
- `class-validator`, `class-transformer` — Validação de DTOs

### Dependências do Frontend (Next.js)

```bash
cd frontend
npm install
```

Pacotes principais instalados:
- `next` 16.2.6 — Framework React SSR
- `react` 19.2, `react-dom` 19.2 — Biblioteca de UI
- `recharts` 3.8.x — Gráficos e visualizações
- `tailwindcss` 4.x — Estilização

### Dependências do Serviço ML (Python/FastAPI)

```bash
cd python-service
pip install -r requirements.txt
```

Pacotes instalados:
- `fastapi==0.115.5` — Framework web assíncrono
- `uvicorn[standard]==0.32.1` — Servidor ASGI
- `scikit-learn>=1.3.0` — Machine Learning
- `pandas>=2.0.0` — Manipulação de dados
- `numpy>=1.24.0` — Computação numérica
- `pydantic==2.10.3` — Validação de dados
- `httpx==0.28.0` — Cliente HTTP assíncrono

---

## Instruções de Execução

> Todos os três serviços devem estar em execução simultaneamente para o sistema funcionar completamente.

### 1. Backend (NestJS)

```bash
cd DesafioIntegrador/DI/LogiFlow/backend
npm run start:dev
```

Aguarde a mensagem: `Application is running on: http://localhost:3001`

### 2. Frontend (Next.js)

Em um novo terminal:

```bash
cd DesafioIntegrador/DI/LogiFlow/frontend
npm run dev
```

Aguarde a mensagem: `Ready - started server on 0.0.0.0:3000`

### 3. Serviço ML (FastAPI)

Em um novo terminal:

```bash
cd DesafioIntegrador/DI/LogiFlow/python-service
python run.py
```

Ou usando uvicorn diretamente:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Acesso à Aplicação

Abra o navegador em: **http://localhost:3000**

### Variáveis de Ambiente (opcionais)

| Variável | Padrão | Serviço |
|----------|--------|---------|
| `PORT` | `3001` | Backend |
| `APP_HOST` | `0.0.0.0` | ML Service |
| `APP_PORT` | `8000` | ML Service |
| `DB_PATH` | auto-detectado | ML Service |

---

## Estrutura de Diretórios

```
LogiFlow/
├── backend/                  # API REST NestJS
│   ├── src/
│   │   ├── clientes/         # CRUD de clientes
│   │   ├── produtos/         # CRUD de produtos
│   │   ├── pedidos/          # CRUD de pedidos e itens
│   │   ├── relatorios/       # Endpoints de relatórios
│   │   ├── dashboard/        # Métricas do dashboard
│   │   └── app.module.ts     # Módulo raiz + config DB
│   └── logiflow.db           # Banco de dados SQLite
├── frontend/                 # Aplicação Next.js
│   ├── src/
│   │   ├── app/              # Páginas (App Router)
│   │   ├── components/       # Componentes por módulo
│   │   ├── lib/api.ts        # Cliente HTTP tipado
│   │   └── types/            # Interfaces TypeScript
└── python-service/           # Serviço de ML
    ├── app/
    │   ├── routers/          # Endpoints FastAPI
    │   └── services/
    │       └── churn_service.py  # Modelo RandomForest
    ├── requirements.txt
    └── run.py
```

---

## Exportação de Relatórios em PDF

O sistema utiliza a API nativa do navegador (`window.print()`) para exportação de relatórios. Para salvar como PDF:

1. Acesse a aba **Relatórios** no menu
2. Selecione o relatório desejado (Vendas, Estoque, Retenção, Oportunidades)
3. Clique em **"Imprimir / Exportar PDF"** no canto superior direito
4. Na janela do navegador, selecione **"Salvar como PDF"** no campo de destino
5. Clique em **Salvar**

> Os elementos de navegação são ocultados automaticamente na impressão via classes CSS Tailwind `print:hidden`.
