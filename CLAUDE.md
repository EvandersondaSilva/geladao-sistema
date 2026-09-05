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
**Arquitetura em camadas (layered) com um caso de uso por classe.** O fluxo é sempre
`rota → middleware → controller → service → Prisma`, cada camada só conversa com a seguinte.

O nome técnico honesto é esse: *layered architecture* + *service layer*, com uma classe por ação
(cada service é um caso de uso isolado com um único método `execute`). **Não** é Clean Architecture nem
Hexagonal — não existe camada de domínio, nem repository, nem inversão de dependência: os services falam
com o Prisma diretamente e de propósito. Se alguém pedir "Clean Architecture", isso aqui **não** é, e
transformar nisso exigiria entidades de domínio + interfaces de repositório, o que não é o objetivo do
projeto.

A convenção de pastas veio do projeto `espetinho-delivery`, mas só a **estrutura** — as duas APIs são
independentes e NÃO precisam ser mantidas em sincronia. Decisão de domínio aqui não precisa valer lá.

- `src/routes.ts` — arquivo ÚNICO com todas as rotas (sem pasta `routes/`), monta `validateSchema(schema)` + `new XController().handle` inline
- `src/controllers/<entidade>/` — uma classe por ação (`createCategoryController.ts`, `listCategoryController.ts`...), sempre `class XController { async handle(req, res) {...} }`
- `src/services/<entidade>/` — uma classe por ação (`createCategoryService.ts`...), sempre `class XService { async execute(...) {...} }`, acessa Prisma e lança `AppError` em caso de falha
- `src/schemas/<entidade>Schema.ts` — UM arquivo por entidade com todos os schemas Zod dela, sempre no formato `z.object({ body, params, query })`
- `src/middlewares/validateSchema.ts` — middleware genérico que roda o schema Zod e devolve 400 com `details` em caso de erro
- `src/middlewares/requireAuth.ts` — exige JWT válido (`Authorization: Bearer`), confere `User.active` no banco a cada request (não é 100% stateless de propósito) e preenche `req.userId`/`req.userRole`
- `src/middlewares/requireAdmin.ts` — roda depois de `requireAuth`, barra com 403 quem não é `ADMIN`
- `src/middlewares/optionalAuth.ts` — como `requireAuth`, mas nunca rejeita; só usado em `POST /users` pra permitir o bootstrap do primeiro `ADMIN` sem token
- `src/auth/jwt.ts` — `signToken`/`verifyToken`, único lugar que lê `JWT_SECRET`
- `src/errors/AppError.ts` — erro de negócio com `statusCode`, lançado dentro dos services, capturado pelo error handler global em `server.ts`
- `src/prisma/index.ts` — client Prisma singleton, `export default`. Como o projeto está no Prisma 7, exige `PrismaPg` (driver adapter) no construtor
- `src/prisma/selects.ts` — objetos `select` reaproveitados entre services (`productSelect`, `tabSelect`...), pra duas rotas não devolverem shapes diferentes da mesma entidade
- `src/server.ts` — cria o app Express, aplica CORS/JSON, monta `routes`, registra o error handler (`AppError`) e faz `listen`. NÃO existe `app.ts` separado
- Controllers NUNCA acessam Prisma direto — sempre passam por service
- Controller é fino de propósito: lê `req`, chama o service, devolve status + JSON. Zero regra de negócio, zero `if` de domínio
- Conta que mais de um service precisa vira função compartilhada, não código copiado (`calculateTabTotal`, `calculateCashRegisterTotals`) — senão duas telas divergem sobre o mesmo número

## Domain Rules (crítico)

### Autenticação (`User` / `Role`)
- Login individual por funcionário substituiu o PIN único compartilhado — decisão do cliente depois de ver, num concorrente, que login individual sabe dizer *quem* fez cada ação. PIN nunca soube
- Dois papéis: `ADMIN` (dono/gerente — cadastro de categoria/produto, `/reports/*`, `/users/*`) e `OPERATOR` (funcionário de balcão — caixa, venda, comanda, fiado, ajuste de estoque, cadastro de cliente)
- JWT stateless, expira em 12h, mas `requireAuth` consulta o banco em toda request pra conferir `User.active` — desativar um funcionário funciona *na hora*, não só depois do token expirar. Esse é o motivo de existir a feature, então não vale trocar por um JWT puro sem lookup
- Só `ADMIN` cria conta de outro funcionário — exceto o bootstrap do primeiro usuário (tabela `users` vazia), que não exige login, mesmo padrão que o PIN antigo já usava pra se configurar a primeira vez
- Desativar funcionário é *soft* (`User.active = false`), igual `Product.available` — nunca `DELETE`: apagaria o autor de `CashRegister`/`Tab`/`DebtPayment` passados
- Autoria gravada só nas ações de confiança alta — abrir/fechar caixa (`CashRegister.openedById`/`closedById`), fechar comanda de qualquer jeito (`Tab.closedById`, cobre fechamento normal, fiado e cancelamento), receber pagamento de fiado (`DebtPayment.receivedById`). Não em toda escrita (não em cada item de comanda, por exemplo) — accountability onde dinheiro ou crédito muda de mão, sem inchar o schema
- Todos os campos de autoria são `nullable` — dado criado antes do login existir não tem autor, e a API mostra `null` pra esses casos, não erro

### Estoque (vale pra todo o domínio)
- Toda baixa/entrada de estoque (venda no balcão, item de comanda, produto avulso ou item de combo) gera registro em `MovimentoEstoque` — nunca decrementa `Produto.estoqueAtual` sem esse registro

### Comanda (`Tab` / `TabItem`) — consumo por cliente
- Cliente chega, funcionário abre `Tab` no nome dele (`customerName`, texto livre — não existe cadastro de cliente), vai lançando item conforme ele consome, e só fecha (escolhendo `paymentMethod`) quando ele vai embora
- `Tab` exige `CashRegister` com status `OPEN` pra abrir — mesma regra da `Sale`
- **Baixa de estoque é no lançamento do item, não no fechamento** — o produto já saiu da geladeira quando o cliente bebe, mesmo sem ter pago. Cada `TabItem` gera `StockMovement` (`OUTBOUND`/`SALE`, com `tabItemId`) dentro de `prisma.$transaction`
- Por consequência, fechar comanda NÃO gera `StockMovement` — seria contar em dobro
- `Tab` é entidade independente: fechar comanda **não** cria `Sale`. Toda `Sale` do código nasce junto com a baixa de estoque e o `StockMovement{saleId}` na mesma transação; uma `Sale` vinda de comanda não teria movimento nenhum e criaria dois tipos de `Sale` indistinguíveis na mesma tabela. Custo aceito: relatório de faturamento soma `Sale` + `Tab` fechada
- `Tab.total` nunca é persistido — sempre recalculado do `TabItem.unitPrice` (snapshot do preço no lançamento), igual `expectedAmount`/`soldTotal` do caixa
- Remover item lançado por engano é **cancelamento lógico** (`TabItem.cancelledAt`), nunca `DELETE`: a linha precisa sobreviver pra que a baixa original e o estorno (`INBOUND`/`CANCELLATION_REVERSAL`) continuem apontando pra um `tabItemId` real. Item cancelado é filtrado de toda leitura e do total
- Não fecha comanda sem nenhum item ativo; não lança item em comanda `CLOSED`/`CANCELLED`
- Comanda vazia (nome errado, cliente desistiu, ou todo item foi removido) se descarta com `POST /tabs/:id/cancel` → `TabStatus.CANCELLED`. Sem isso ela ficaria `OPEN` pra sempre: não fecha (não tem item) e não trava o caixa (de propósito). NUNCA fazer isso com `DELETE` — `TabItem` tem `onDelete: Cascade` e `StockMovement.tabItemId` é `SetNull`, então apagar a comanda destruiria o elo de auditoria que o cancelamento lógico de item protege
- `cancel` NÃO exige caixa `OPEN` (a comanda vazia sobrevive ao caixa dela — exigir travaria justamente o que a rota limpa) e só aceita comanda sem item ativo (cancelar nunca mexe em estoque; item se remove um a um, cada um com seu estorno)
- `Tab.closedAt` = quando saiu de `OPEN`: pagamento se `CLOSED`, descarte se `CANCELLED`. Somar faturamento filtrando só por `closedAt` conta comanda cancelada — sempre filtrar por `status`
- Fechamento de caixa: `expectedAmount`/`totalRevenue` somam `Sale` + `Tab` fechada do mesmo caixa. `Tab.total` não é coluna, então não dá pra agregar em SQL — soma em JS a partir dos itens
- Essa conta mora em `calculateRevenueTotals` (recebe `tx` ou o client; filtra por caixa OU por período) e é usada pelo fechamento, pelo `GET /cash-registers/:id` e pelos relatórios — nunca duplicar, senão relatório do mês discorda dos turnos que o compõem. `calculateCashRegisterTotals` é só o wrapper que acrescenta `expectedAmount` = abertura + o que entrou em `CASH`
- Comanda entra no faturamento pelo `closedAt`, não pelo `openedAt` — receita se realiza quando a conta é acertada
- Todo retorno de comanda passa por `presentTab` (acrescenta `total` e `openMinutes`). `openMinutes` vem do relógio do SERVIDOR — a máquina do balcão pode estar com a hora errada, e esse número é o que distingue comanda de dívida
- Comanda `OPEN` **com itens** bloqueia o fechamento do caixa (erro lista os nomes). Comanda `OPEN` vazia não bloqueia de propósito — ela também não pode ser fechada, então bloquear por causa dela travaria o caixa pra sempre

### Fiado (`Customer` / `Debt` / `DebtPayment`)
- Fiado **NÃO** é `PaymentMethod`. É ação separada (`POST /tabs/:id/fiado`). Isso é garantia estrutural, não estilo: mantendo `PaymentMethod` só com dinheiro de verdade, TODA soma sobre esse enum é dinheiro que entrou — inclusive `expectedAmount`. Se `FIADO` virasse forma de pagamento, a gaveta passaria a "faltar" o valor do crédito
- Fiado exige `Customer` cadastrado — `Tab.customerName` é texto livre e texto livre não identifica devedor
- Comanda no fiado fica `CLOSED` com `paymentMethod: null` e ganha um `Debt`. Comanda `CLOSED` sem `paymentMethod` é fiado, não bug — quem for filtrar por forma de pagamento tem que contar com esse caso
- `Debt.amount` É persistido (diferente de `Tab.total`): não é total derivado, é o valor combinado quando a mercadoria saiu, e não pode mudar depois. Já o **saldo** nunca é persistido — sempre `amount - soma dos pagamentos`
- Pagamento parcial é permitido; `Debt.status` só vira `PAID` quando o saldo zera
- Dar fiado NÃO exige caixa aberto (não entra dinheiro). **Receber** fiado exige — é o que faz a gaveta bater
- Pagamento entra no caixa do dia em que foi **pago**, não no caixa que deu o fiado
- Os totais do turno são vários de propósito, e vale a identidade `soldTotal = receivedTotal - debtPaymentsTotal + fiadoTotal`. Fiado foi vendido e não recebido; fiado antigo pago hoje foi recebido e não vendido hoje. Somar num número só ou infla o faturamento (mesmo valor contado no dia da venda e no do pagamento) ou fura a gaveta

### Combo (delivery — pausado)
- Combo tem `ComboGrupo` (ex: "Escolha 2 refrigerantes") com `quantidadeEscolha`
- Cliente pode repetir produto dentro do grupo — soma de `ItemPedidoComboEscolha.quantidade` por grupo DEVE ser exatamente igual a `ComboGrupo.quantidadeEscolha`
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
- `.env` — `DATABASE_URL`, `PORT`, `CORS_ORIGIN`, `JWT_SECRET` (assina/verifica o login — string longa e aleatória, nunca reaproveitar o placeholder do `.env.example`)
- Nunca commitar `.env` — confirmar `.gitignore`
- Copiar `.env.example` ao clonar

## Workflow
- ALWAYS rodar `npm run type-check && npm run lint` após uma série de mudanças (se scripts existirem)
- Rodar migration (`npx prisma migrate dev`) antes de testar endpoint que mexe em schema novo
- Branch naming: `feat/`, `fix/`, `chore/` + descrição em kebab-case (Gitflow)
- Commits em inglês, imperativo: "add combo group validation"

## Common Gotchas
- CORS: origin deve ser a URL exata do frontend (`http://localhost:3000` em dev) — nunca `*` em produção
- `prisma generate` precisa rodar de novo após qualquer mudança em `schema.prisma` — `prisma migrate dev` NÃO regenera sozinho de forma confiável (já aconteceu duas vezes: `tsc` acusando `Property 'tab' does not exist on PrismaClient` logo depois de uma migration bem-sucedida)
- Depois de `prisma generate`, o `npm run dev` que já estava rodando continua servindo o client ANTIGO — sintoma: endpoint novo devolve 500 genérico enquanto um script avulso com o mesmo código funciona. Matar e subir de novo o servidor NÃO resolveu; o que destravou foi salvar qualquer arquivo em `src/` pra forçar o ts-node-dev a recompilar. Se um valor de enum recém-criado der erro só pela API, é isso — não é o banco
- Baixa de estoque de combo referencia sempre `produtoEscolhidoId` (o que o cliente escolheu), nunca um "produto padrão" do combo — combo não tem produto padrão, só opções
- `precoUnitario` em `ItemPedido` é snapshot no momento da compra — nunca recalcular puxando preço atual do produto
- `npx prisma migrate dev` recusa rodar num terminal não-interativo (agente de IA, CI) assim que a migration tem qualquer aviso de perda de dado (`ALTER TABLE ... DROP COLUMN` com linha não-nula, por exemplo) — trava com "non-interactive environment... not supported", mesmo com `y\n` no stdin. Contorno: gerar o SQL com `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`, salvar manualmente em `prisma/migrations/<timestamp>_nome/migration.sql`, e aplicar com `npx prisma migrate deploy` (não pede confirmação). Prisma 7 também trocou os flags do `migrate diff` — não é mais `--from-url`, é `--from-config-datasource`/`--to-schema`