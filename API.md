# API Endpoints

> Prioridade atual: PDV (venda no balcão + estoque). Delivery está pausado, mas mantido no schema para depois.
> Tags: `[feito]` já implementado · `[a fazer]` ainda não existe no código
>
> Nomenclatura: o domínio foi renomeado de português para inglês (migration `rename_pdv_domain_to_english`,
> 2026-08-23) — as rotas abaixo já refletem isso (`cash-registers`, `sales`, `products`...), diferente de
> versões antigas deste documento que ainda citavam `/caixa`, `/vendas` em português.

## Autenticação (PIN do operador)

Sem login individual de funcionário — decisão consciente do cliente, quem opera o caixa é o próprio admin.
Como proteção mínima do lado da API (o front sozinho não impede alguém de chamar a API direto), toda rota de
escrita (`POST`/`PATCH`/`DELETE`) exige o header `x-operator-pin` com o PIN compartilhado cadastrado em
`Settings.operatorPin`. Rotas de leitura (`GET`) continuam públicas. Se `Settings.operatorPin` ainda não
estiver configurado no banco, toda rota de escrita responde `503`.

- `GET /operator-pin/status` — retorna `{ configured: boolean }`, nunca o valor do PIN `[feito]`
- `PATCH /operator-pin` — define o PIN a primeira vez (`newPin`, sem exigir nada) ou troca um já existente
  (exige `currentPin` correto); nunca ecoa o PIN na resposta `[feito]`

## PDV — CashRegister (Caixa)

- `POST /cash-registers` — abre um caixa (`openingAmount`); bloqueia se já existir caixa OPEN (transação Serializable) `[feito]`
- `GET /cash-registers/current` — retorna o caixa OPEN no momento, ou `null` se não houver `[feito]`
- `GET /cash-registers` — lista caixas (filtro opcional `status=OPEN|CLOSED`) `[feito]`
- `POST /cash-registers/:id/close` — fecha o caixa (`reportedClosingAmount`); calcula na hora (não persiste) `expectedAmount`, `totalRevenue` e `difference` `[feito]`

## PDV — Sale (Venda)

- `POST /sales` — registra venda no balcão (itens + `paymentMethod`); exige caixa OPEN; dentro de `prisma.$transaction` decrementa `Product.currentStock` e cria `StockMovement` (OUTBOUND/SALE) por item `[feito]`
- `GET /sales` — lista vendas com itens (filtro opcional `cashRegisterId`) `[feito]`
- `GET /sales/:id` — detalhe de uma venda com itens `[feito]`

## Categorias

- `GET /categories` — lista categorias `[feito]`
- `POST /categories` — cria (admin) `[feito]`
- `PATCH /categories/:id` — edita (admin) `[feito]`

## Produtos

- `GET /products` — lista catálogo (filtro opcional por `categoryId`, retorna `currentStock`/`minimumStock`) `[feito]`
- `POST /products` — cria (admin) `[feito]`
- `PATCH /products/:id` — edita (admin, inclui `available` — cobre o caso de ativar/desativar sem apagar histórico) `[feito]`
- `DELETE /products/:id` — remove produto, bloqueado se já tiver venda/movimento de estoque associado `[feito]`

## Estoque

- `POST /products/:id/stock` — entrada/ajuste manual (admin), motivo `RESTOCK` ou `MANUAL_ADJUSTMENT`; cria `StockMovement` dentro de `prisma.$transaction` `[feito]`
- `GET /stock-movements` — histórico/auditoria de `StockMovement` (filtro opcional por `productId`, `reason`, `dateFrom`/`dateTo`) `[feito]`
- `GET /products/low-stock` — produtos com `currentStock < minimumStock` `[feito]`

---

## Delivery — pausado, mantido para depois

Schema já modelado (`Order`, `OrderItem`, `Combo`, `ComboGroup`...), sem rotas implementadas ainda. Retomar só depois do PDV estar de pé.

- `POST /pedidos` — cria pedido com dados avulsos do cliente (nome, telefone, endereço) + forma de pagamento
- `GET /pedidos/:id` — detalhe/status
- `GET /pedidos` — lista (admin, filtro por status/data)
- `PATCH /pedidos/:id/status` — admin atualiza status (pendente → confirmado → em_entrega → entregue)
- `PATCH /pedidos/:id/cancelar` — cancela pedido
  - Se `pendente`/`confirmado`: estorna estoque automaticamente (`MovimentoEstoque` ENTRADA/ESTORNO_CANCELAMENTO)
  - Se `em_entrega`/`entregue`: cancela sem mexer em estoque
- `GET /combos` / `GET /combos/:id` — catálogo de combos com grupos e opções expandidos
- `POST /combos` / `PATCH /combos/:id` / `DELETE /combos/:id` — CRUD de combos (admin)

## Configuração da loja

- `GET /config` — horário de funcionamento, taxa de entrega, valor mínimo de pedido `[a fazer]`
- `PATCH /config` — admin edita `[a fazer]`
- `GET /config/pagamento` — formas aceitas + chave Pix `[a fazer]`
- `PATCH /config/pagamento` — admin atualiza chave Pix / ativa-desativa formas de pagamento `[a fazer]`

---

## Decisões de escopo (referência)

- PDV: sem login individual do operador no caixa — PIN/senha compartilhada (`Settings.operatorPin`), decisão consciente do cliente
- PDV: `Sale` não existe sem `CashRegister` OPEN
- PDV: fechamento de caixa não persiste `expectedAmount`/`totalRevenue`/`difference` — sempre recalculado na hora
- Checkout de delivery sem cadastro/login de cliente — dados avulsos por pedido
- Pagamento (PDV e delivery): dinheiro, cartão, ou Pix — enum `PaymentMethod`
- Combo com grupos de escolha (`ComboGroup`), permite repetir produto dentro do grupo
- Toda baixa/entrada de estoque (PDV ou delivery) passa por `StockMovement` (auditoria) — nunca decrementa `currentStock` direto
