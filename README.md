# Houston III Portfolio (Local-First)

Versão de portfólio de uma plataforma de gestão de escalas médicas, com setup local reproduzível em 1 comando.

## Sobre o projeto

O Houston III é uma aplicação para operação de plantões e escalas de equipes médicas.  
Nesta versão de portfólio, o foco é demonstrar o fluxo de produto ponta a ponta em ambiente local:

- gestão de grades (templates de escala)
- geração e acompanhamento de plantões
- atribuição de médicos (pré-cadastro) em vagas
- navegação por múltiplos hospitais

Todos os dados do demo são fictícios e sanitizados.

## Stack

- Next.js 15
- React 18
- Supabase (Postgres/Auth/Storage via Supabase CLI)
- Docker

## Demo online

- URL: https://houston-demo.vercel.app/
- Login demo: `demo@houston.local` / `demo123456`

## Pré-requisitos

- Node.js **22+**
- Docker Desktop em execução
- Supabase CLI (ex.: `brew install supabase/tap/supabase`)
- npm

## Quick Start (1 comando)

```bash
npm run dev:demo
```

Esse comando:

1. valida Node/Docker/Supabase CLI
2. instala dependências (quando necessário)
3. sobe o Supabase local
4. executa `supabase db reset` (migrations + seed demo)
5. gera/atualiza `.env.local` automaticamente
6. inicia o Next.js em `http://localhost:3000`

## Credenciais Demo

- Email: `demo@houston.local`
- Senha: `demo123456`

## O que explorar no demo

- Dashboard e navegação principal autenticada
- Grades:
  - `Grade Clínica Geral - Semana Demo` (sem médicos atribuídos)
  - grades mensais com plantões preenchidos
  - grades por hospital (Central, Norte e Sul)
- Plantões de janeiro, fevereiro e março de 2026
- Cenário multi-hospital com médicos fictícios sem conflito de horário no mesmo dia

## Comandos úteis

```bash
npm run setup:demo      # prepara ambiente local sem iniciar o Next
npm run dev:demo        # setup completo + next dev
npm run supabase:reset  # reseta banco local (migrations + seed)
npm run stop:demo       # para Supabase local e limpa volumes + imagens do stack
npm run stop:demo:aggressive # limpeza agressiva: remove também imagens supabase/* globais
```

## Encerrar e limpar ambiente local

Para remover tudo que foi provisionado para o demo local (containers, volumes de banco e imagens do stack), rode:

```bash
npm run stop:demo
```

Esse comando:

1. executa `supabase stop --no-backup` para encerrar o stack local
2. remove os volumes de dados locais do Supabase
3. tenta remover as imagens Docker usadas pelo stack deste projeto

Importante:

- É uma limpeza destrutiva do ambiente local de demo.
- Na próxima execução de `npm run dev:demo`, as imagens podem ser baixadas novamente e o banco será recriado do zero.
- Se alguma imagem estiver em uso por outro projeto, ela não será removida (o script segue normalmente).
- Para forçar uma limpeza maior, use `npm run stop:demo:aggressive`.

## Estrutura de dados demo

O seed contempla:

- 3 hospitais fictícios
- 1 usuário demo com role `gestor`
- usuários mock de `coordenador` e `escalista` (somente para representação de dados)
- médicos fictícios em `medicos_precadastro`
- corpo clínico populado no grupo demo
- grades e vagas com candidaturas aprovadas para simular operação real

## Integrações opcionais

### Google Maps

`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` é opcional.

- sem chave: a aplicação continua funcional com fallback textual
- com chave: autocomplete/mapa são habilitados

Essa integração **não é obrigatória** para o fluxo principal do demo.
Mas, habilita a criação de novos hospitais na execução da aplicação local.

## Troubleshooting

### Docker não está rodando

Abra o Docker Desktop e rode:

```bash
npm run setup:demo
```

### Supabase CLI ausente

Instale e rode novamente:

```bash
brew install supabase/tap/supabase
```

### Portas em uso (54321/54322/3000)

Pare serviços conflitantes ou ajuste portas no `supabase/config.toml` e no start do Next.

### Ambiente inconsistente após alterações de seed

Rode reset completo:

```bash
npm run supabase:reset
```

## Observações

- `.env.local` é gerado automaticamente pelo bootstrap.
- Este repositório é uma edição de portfólio, separada do ambiente de produção.
