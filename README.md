# Houston III Portfolio (Local-First)

Versão de portfólio com setup local simplificado em **1 comando**.

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
4. executa `supabase db reset` com migrations + seed demo
5. gera/atualiza `.env.local` automaticamente
6. inicia o Next.js em `http://localhost:3000`

## Credenciais Demo

- Email: `demo@houston.local`
- Senha: `demo123456`

## Comandos úteis

```bash
npm run setup:demo      # prepara ambiente local sem iniciar o Next
npm run dev:demo        # setup completo + next dev
npm run supabase:reset  # reseta banco local (migrations + seed)
```

## Integrações opcionais

### Google Maps

`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` é opcional.

- Sem chave: a aplicação continua funcional e mostra fallback textual nos componentes de mapa/autocomplete.
- Com chave: autocomplete e mapa são habilitados.

### Twilio / Resend / Firebase (Supabase Edge)

Para testes de funcionalidades de SMS/e-mail/push via Edge Functions, configure `supabase/.env` localmente.
Um template está disponível em `supabase/.env.example`.
Essas integrações **não são necessárias** para subir e navegar no demo principal.

## Troubleshooting

### Docker não está rodando

Abra o Docker Desktop e rode novamente:

```bash
npm run setup:demo
```

### Supabase CLI ausente

Instale e tente novamente:

```bash
brew install supabase/tap/supabase
```

### Portas em uso (54321/54322/3000)

Pare serviços conflitantes ou ajuste portas no `supabase/config.toml` e no start do Next.

## Observações

- O seed é sanitizado para demonstração e não utiliza dados de produção.
- `.env.local` é gerado automaticamente pelo script de bootstrap.
