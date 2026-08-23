# Project: [Nome do Delivery — Geladão]

## Tech Stack
- Node.js + Express + TypeScript
- Prisma ORM + PostgreSQL
- CORS configurado para o frontend (Next.js)
- Zod (validação de payloads)

## Commands
- `npm run dev` — servidor local (ts-node-dev)
- `npm run build` — compila TS para JS (dist/)
- `npx prisma migrate dev` — cria/aplica migration
- `npx prisma studio` — interface visual do banco

## Architecture
Segue a mesma convenção do projeto irmão `espetinho-delivery` (`sistema-espeto/espetinho-delivery`) — mantenha as duas APIs consistentes.

- `src/routes.ts` — arquivo ÚNICO com todas as rotas (sem pasta `routes/`), monta `validateSchema(schema)` + `new XController().handle` inline
- `src/controllers/<entidade>/` — uma classe por ação (`createCategoryController.ts`, `listCategoryController.ts`...), sempre `class XController { async handle(req, res) {...} }`
- `src/services/<entidade>/` — uma classe por ação (`createCategoryService.ts`...), sempre `class XService { async execute(...) {...} }`, acessa Prisma e lança `AppError` em caso de falha
- `src/schemas/<entidade>Schema.ts` — UM arquivo por entidade com todos os schemas Zod dela, sempre no formato `z.object({ body, params, query })`
- `src/middlewares/validateSchema.ts` — middleware genérico que roda o schema Zod e devolve 400 com `details` em caso de erro
- `src/errors/AppError.ts` — erro de negócio com `statusCode`, lançado dentro dos services, capturado pelo error handler global em `server.ts`
- `src/prisma/index.ts` — client Prisma singleton, `export default`. Como o projeto está no Prisma 7, exige `PrismaPg` (driver adapter) no construtor — diferente do Espetinho (Prisma 5, sem adapter)
- `src/server.ts` — cria o app Express, aplica CORS/JSON, monta `routes`, registra o error handler (`AppError`) e faz `listen`. NÃO existe `app.ts` separado
- Controllers NUNCA acessam Prisma direto — sempre passam por service

## Domain Rules (crítico)
- Combo tem `ComboGrupo` (ex: "Escolha 2 refrigerantes") com `quantidadeEscolha`
- Cliente pode repetir produto dentro do grupo — soma de `ItemPedidoComboEscolha.quantidade` por grupo DEVE ser exatamente igual a `ComboGrupo.quantidadeEscolha`
- Toda baixa de estoque (produto avulso ou item de combo) gera registro em `MovimentoEstoque` — nunca decrementa `Produto.estoqueAtual` sem esse registro
- Validação de pedido com combo, antes de gerar `MovimentoEstoque`:
  1. Todo `ComboGrupo` obrigatório tem escolha registrada
  2. Soma de quantidade por grupo bate com `quantidadeEscolha`
  3. Todo `produtoEscolhidoId` pertence às `ComboGrupoOpcao` daquele grupo

## Code Style
- NEVER use `any` explícito — usar `unknown` + type guard
- Imports: ES modules (import/export), sem require()
- Nomes de arquivo: camelCase igual a classe que exportam (`createCategoryController.ts` → `CreateCategoryController`). Classes/Types: PascalCase
- Toda mutação de estoque roda dentro de `prisma.$transaction` (evita race condition)

## Environment Variables
- `.env` — `DATABASE_URL`, `PORT`, `CORS_ORIGIN`
- Nunca commitar `.env` — confirmar `.gitignore`
- Copiar `.env.example` ao clonar

## Workflow
- ALWAYS rodar `npm run type-check && npm run lint` após uma série de mudanças (se scripts existirem)
- Rodar migration (`npx prisma migrate dev`) antes de testar endpoint que mexe em schema novo
- Branch naming: `feat/`, `fix/`, `chore/` + descrição em kebab-case (Gitflow)
- Commits em inglês, imperativo: "add combo group validation"

## Common Gotchas
- CORS: origin deve ser a URL exata do frontend (`http://localhost:3000` em dev) — nunca `*` em produção
- `prisma generate` precisa rodar de novo após qualquer mudança em `schema.prisma`
- Baixa de estoque de combo referencia sempre `produtoEscolhidoId` (o que o cliente escolheu), nunca um "produto padrão" do combo — combo não tem produto padrão, só opções
- `precoUnitario` em `ItemPedido` é snapshot no momento da compra — nunca recalcular puxando preço atual do produto