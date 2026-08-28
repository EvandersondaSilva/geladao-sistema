# API Endpoints

> Prioridade atual: PDV (venda no balcão + estoque). Delivery está pausado, mas mantido no schema para depois.
> Tags: `[feito]` já implementado · `[a fazer]` ainda não existe no código
>
> Nomenclatura: o domínio foi renomeado de português para inglês (migration `rename_pdv_domain_to_english`,
> 2026-08-23) — as rotas abaixo já refletem isso (`cash-registers`, `sales`, `products`...), diferente de
> versões antigas deste documento que ainda citavam `/caixa`, `/vendas` em português.
>
> Valores monetários (`price`, `openingAmount`, `total`...) são sempre inteiros em **centavos**.
> Erro padrão: `{ "error": "mensagem" }`. Erro de validação (Zod): `{ "error": "Erro validação", "details": [{ "campo": "...", "mensagem": "..." }] }`.

## Autenticação (PIN do operador)

Sem login individual de funcionário — decisão consciente do cliente, quem opera o caixa é o próprio admin.
Como proteção mínima do lado da API (o front sozinho não impede alguém de chamar a API direto), toda rota de
escrita (`POST`/`PATCH`/`DELETE`) exige o header `x-operator-pin` com o PIN compartilhado cadastrado em
`Settings.operatorPin`. Rotas de leitura (`GET`) continuam públicas. Se `Settings.operatorPin` ainda não
estiver configurado no banco, toda rota de escrita responde `503`.

**Decisão de UX (front)**: o operador digita o PIN uma vez pra "destravar a tela", não a cada ação. O front
guarda o PIN em `sessionStorage` (sobrevive a refresh da aba, não a fechar o navegador) e anexa ele
automaticamente como `x-operator-pin` em toda chamada de escrita. Um botão de "trancar caixa" limpa o
`sessionStorage` e volta pra tela de PIN. `localStorage` foi descartado de propósito — persistir o PIN
indefinidamente anularia a ideia de tela travada. Fluxo de entrada: `GET /operator-pin/status` decide se a
tela mostra "definir PIN" (`configured: false`) ou "digite o PIN" (`configured: true`).

### `GET /operator-pin/status` `[feito]`

Retorna se o PIN já foi configurado — nunca o valor do PIN.

```json
// 200
{ "configured": true }
```

### `PATCH /operator-pin` `[feito]`

Define o PIN a primeira vez (sem exigir nada) ou troca um já existente (exige `currentPin` correto).
Nunca ecoa o PIN na resposta. Não exige o header `x-operator-pin`.

```json
// request — primeira vez (bootstrap)
{ "newPin": "1234" }

// request — trocando um PIN existente
{ "currentPin": "1234", "newPin": "5678" }

// 200
{ "id": "977cb18b-bf87-43da-bb1b-5c07352abbfd", "updatedAt": "2026-08-26T04:05:54.285Z" }

// 401 — currentPin não bate com o PIN atual
{ "error": "currentPin inválido" }
```

---

## PDV — CashRegister (Caixa)

### `POST /cash-registers` `[feito]`

Abre um caixa. Bloqueia se já existir caixa `OPEN` (transação Serializable). Requer `x-operator-pin`.

```json
// request
{ "openingAmount": 10000 }

// 201
{
  "id": "4c920a93-1931-460b-88a4-6b61365deb97",
  "status": "OPEN",
  "openingAmount": 10000,
  "openedAt": "2026-08-24T03:47:54.685Z"
}

// 409 — já existe um caixa aberto
{ "error": "Já existe um caixa aberto" }
```

### `GET /cash-registers/current` `[feito]`

Caixa `OPEN` no momento, ou `null` se não houver.

```json
// 200 — sem caixa aberto
null

// 200 — com caixa aberto
{
  "id": "4c920a93-1931-460b-88a4-6b61365deb97",
  "status": "OPEN",
  "openingAmount": 10000,
  "reportedClosingAmount": null,
  "openedAt": "2026-08-24T03:47:54.685Z",
  "closedAt": null
}
```

### `GET /cash-registers` `[feito]`

Lista caixas, mais recente primeiro. Filtro opcional `?status=OPEN|CLOSED`.

```json
// 200
[
  {
    "id": "4c920a93-1931-460b-88a4-6b61365deb97",
    "status": "CLOSED",
    "openingAmount": 10000,
    "reportedClosingAmount": 11500,
    "openedAt": "2026-08-24T03:47:54.685Z",
    "closedAt": "2026-08-24T03:48:49.190Z"
  }
]
```

### `GET /cash-registers/:id` `[feito]`

Resumo do turno numa chamada só: o caixa, suas vendas, suas comandas, e o dinheiro **já somado**. Existe
pra tela de resumo não ter que juntar `/cash-registers`, `/sales` e `/tabs` no cliente e refazer a conta —
principalmente o total das comandas, que não é coluna no banco e é regra de negócio.

Funciona com o caixa aberto ou fechado. Com o caixa `OPEN`, `expectedAmount` já diz quanto deveria ter na
gaveta agora; `difference` vem `null`, porque só existe depois que alguém contou e informou o fechamento.

```json
// 200
{
  "id": "ef6409db-d498-4d8f-9386-168edd81059d",
  "status": "OPEN",
  "openingAmount": 10000,
  "reportedClosingAmount": null,
  "openedAt": "2026-08-28T04:50:11.402Z",
  "closedAt": null,
  "expectedAmount": 11000,
  "totalRevenue": 3000,
  "byPaymentMethod": { "CASH": 1000, "CARD": 1500, "PIX": 500 },
  "difference": null,
  "sales": [
    {
      "id": "239b4a5e-ab4d-472c-8552-7cba709cdb1b",
      "total": 500,
      "paymentMethod": "PIX",
      "createdAt": "2026-08-28T04:50:11.680Z",
      "items": [ { "id": "…", "productId": "…", "product": { "name": "Coca-Cola 350ml" }, "quantity": 1, "unitPrice": 500 } ]
    }
  ],
  "tabs": [
    { "id": "…", "customerName": "Bia", "status": "OPEN", "total": 1000, "items": [ … ] },
    { "id": "…", "customerName": "Carlos", "status": "CLOSED", "paymentMethod": "CARD", "total": 1500, "items": [ … ] }
  ]
}

// 404
{ "error": "Caixa não encontrado" }
```

`byPaymentMethod` soma `Sale` + comanda fechada, por forma de pagamento. `expectedAmount` é
`openingAmount + byPaymentMethod.CASH` — só dinheiro fica na gaveta. `tabs` traz todas as comandas do
caixa, incluindo `CANCELLED` (o `status` de cada uma diz qual é qual); comanda cancelada não entra em
nenhum total.

### `POST /cash-registers/:id/close` `[feito]`

Fecha o caixa. Calcula na hora (não persiste) `expectedAmount` (abertura + recebido em `CASH`),
`totalRevenue` (tudo, qualquer forma de pagamento) e `difference`. Requer `x-operator-pin`.

Os dois valores somam **`Sale` + comandas (`Tab`) já fechadas** no mesmo caixa — como `Tab` é entidade
independente (não vira `Sale`), o faturamento de comanda entra por essa soma extra. Comandas ainda `OPEN`
não entram: elas nem deixam o caixa fechar (ver abaixo).

Bloqueia (`409`) se existir comanda `OPEN` **com itens** nesse caixa — é dinheiro que ainda está na mesa.
Comanda aberta e vazia é ignorada de propósito: ela também não pode ser fechada (comanda sem item não
fecha), então bloquear por causa dela travaria o caixa pra sempre.

```json
// request
{ "reportedClosingAmount": 11500 }

// 200
{
  "id": "4c920a93-1931-460b-88a4-6b61365deb97",
  "status": "CLOSED",
  "openingAmount": 10000,
  "reportedClosingAmount": 11500,
  "openedAt": "2026-08-24T03:47:54.685Z",
  "closedAt": "2026-08-24T03:48:49.190Z",
  "expectedAmount": 11500,
  "totalRevenue": 2500,
  "byPaymentMethod": { "CASH": 1500, "CARD": 1000, "PIX": 0 },
  "difference": 0
}

// 409 — comanda aberta pendente
{ "error": "Existem comandas abertas: João, Marcos — feche antes de fechar o caixa" }

// 409 — já fechado, ou 404 — não encontrado
{ "error": "Caixa já está fechado" }
```

---

## PDV — Sale (Venda)

### `POST /sales` `[feito]`

Registra venda no balcão. Exige caixa `OPEN`. Dentro de `prisma.$transaction` decrementa
`Product.currentStock` e cria `StockMovement` (`OUTBOUND`/`SALE`) por item. Requer `x-operator-pin`.

```json
// request
{
  "cashRegisterId": "4c920a93-1931-460b-88a4-6b61365deb97",
  "paymentMethod": "CASH",
  "items": [
    { "productId": "a65b8d90-d220-4674-a4d2-d30779c52c88", "quantity": 3 }
  ]
}

// 201
{
  "id": "239b4a5e-ab4d-472c-8552-7cba709cdb1b",
  "cashRegisterId": "4c920a93-1931-460b-88a4-6b61365deb97",
  "total": 1500,
  "paymentMethod": "CASH",
  "createdAt": "2026-08-24T03:48:03.094Z",
  "items": [
    { "id": "0bd6d3d2-9fb1-414d-be76-945537a76993", "productId": "a65b8d90-d220-4674-a4d2-d30779c52c88", "quantity": 3, "unitPrice": 500 }
  ]
}

// 409 — estoque insuficiente ou caixa não está aberto
{ "error": "Estoque insuficiente para o produto a65b8d90-d220-4674-a4d2-d30779c52c88: disponível 5, solicitado 50" }
```

`paymentMethod`: `"CASH" | "CARD" | "PIX"`.

### `GET /sales` `[feito]`

Lista vendas com itens, mais recente primeiro. Filtro opcional `?cashRegisterId=...`.

```json
// 200
[
  {
    "id": "239b4a5e-ab4d-472c-8552-7cba709cdb1b",
    "cashRegisterId": "4c920a93-1931-460b-88a4-6b61365deb97",
    "total": 1500,
    "paymentMethod": "CASH",
    "createdAt": "2026-08-24T03:48:03.094Z",
    "items": [ { "id": "...", "productId": "...", "quantity": 3, "unitPrice": 500 } ]
  }
]
```

### `GET /sales/:id` `[feito]`

Detalhe de uma venda com itens. `404` se não existir.

```json
// 200
{
  "id": "239b4a5e-ab4d-472c-8552-7cba709cdb1b",
  "cashRegisterId": "4c920a93-1931-460b-88a4-6b61365deb97",
  "total": 1500,
  "paymentMethod": "CASH",
  "createdAt": "2026-08-24T03:48:03.094Z",
  "items": [ { "id": "...", "productId": "...", "quantity": 3, "unitPrice": 500 } ]
}
```

---

## PDV — Tab (Comanda)

Consumo por cliente ao longo do tempo: o funcionário abre a comanda no nome da pessoa (só texto livre, não
existe cadastro de cliente), vai lançando item conforme ela consome, e só fecha — escolhendo a forma de
pagamento — quando ela vai embora.

**Baixa de estoque acontece a cada item lançado, não no fechamento** — o produto já saiu da geladeira
quando o cliente bebe, mesmo sem ter pago ainda. Cada `POST /tabs/:id/items` gera `StockMovement`
(`OUTBOUND`/`SALE`) dentro de `prisma.$transaction`, igual `POST /sales`. Por consequência,
`POST /tabs/:id/close` **não** gera nenhum movimento de estoque — isso seria contar em dobro.

`Tab` é entidade independente: fechar comanda **não** cria uma `Sale`. Motivo: no código toda `Sale` nasce
junto com a baixa de estoque e o `StockMovement{saleId}` na mesma transação — uma `Sale` vinda de comanda
não teria movimento nenhum (a baixa já ocorreu item a item), e passariam a existir dois tipos de `Sale`
indistinguíveis na mesma tabela. Em troca, relatórios de faturamento precisam somar `Sale` + `Tab`
fechada (o fechamento de caixa já faz isso).

`total` nunca é persistido — é sempre recalculado a partir do `unitPrice` (snapshot de quando o item foi
lançado), mesma decisão de `expectedAmount`/`totalRevenue` no caixa.

### `POST /tabs` `[feito]`

Abre uma comanda. Exige caixa `OPEN`. Requer `x-operator-pin`.

```json
// request
{ "customerName": "João", "cashRegisterId": "7361c4c8-8cd1-4675-972c-30a8c9fc6c58" }

// 201
{
  "id": "a19dc612-6b24-447e-b969-16f48d6b50b8",
  "customerName": "João",
  "status": "OPEN",
  "cashRegisterId": "7361c4c8-8cd1-4675-972c-30a8c9fc6c58",
  "paymentMethod": null,
  "openedAt": "2026-08-27T05:10:42.939Z",
  "closedAt": null,
  "items": [],
  "total": 0
}

// 409 — não há caixa aberto
{ "error": "Caixa não está aberto" }
```

### `GET /tabs` `[feito]`

Lista comandas com itens e total, mais recente primeiro. Filtro opcional `?status=OPEN|CLOSED|CANCELLED` —
`?status=OPEN` é a visão "quem está consumindo agora", e é o que a tela principal do PDV deve usar.
Sem filtro vem tudo, inclusive comanda cancelada.

```json
// 200
[
  {
    "id": "a19dc612-6b24-447e-b969-16f48d6b50b8",
    "customerName": "João",
    "status": "OPEN",
    "cashRegisterId": "7361c4c8-8cd1-4675-972c-30a8c9fc6c58",
    "paymentMethod": null,
    "openedAt": "2026-08-27T05:10:42.939Z",
    "closedAt": null,
    "items": [
      { "id": "ae275e08-2b20-4ca8-8c83-1ec14ebd39c9", "productId": "a65b8d90-d220-4674-a4d2-d30779c52c88", "product": { "name": "Coca-Cola 350ml" }, "quantity": 3, "unitPrice": 500, "createdAt": "2026-08-27T05:10:43.056Z" }
    ],
    "total": 1500
  }
]
```

O nome do produto vem junto (`product.name`) — o front **não** deve cruzar `productId` com `GET /products`
pra descobrir isso. Aquela rota só devolve produtos `available: true`, então um produto desativado enquanto a
comanda ainda está aberta (a cerveja acabou, o admin desmarcou) sumiria do catálogo e o item apareceria sem
nome bem na hora em que o funcionário precisa ler a comanda pro cliente.

`unitPrice` continua sendo o snapshot do preço no lançamento; `product.name` é o nome **atual** do produto
(vem por join, não é snapshot). Renomear um produto muda como ele aparece em comandas antigas — aceitável
aqui, já que o nome é rótulo e o que fecha a conta é o `unitPrice`.

### `GET /tabs/:id` `[feito]`

Detalhe da comanda com itens e `total` calculado na hora. `404` se não existir.

### `POST /tabs/:id/items` `[feito]` — requer `x-operator-pin`

Lança um item na comanda aberta. Decrementa `Product.currentStock` e cria o `StockMovement` na mesma
transação. Responde com a comanda inteira já atualizada (inclusive o novo `total`), pra tela do PDV não
precisar de um `GET` logo em seguida.

```json
// request
{ "productId": "a65b8d90-d220-4674-a4d2-d30779c52c88", "quantity": 3 }

// 201 — mesmo shape de GET /tabs/:id, com o item novo e o total recalculado

// 409 — comanda fechada
{ "error": "Comanda já está fechada" }

// 409 — estoque insuficiente
{ "error": "Estoque insuficiente: disponível 48, solicitado 9999" }
```

### `DELETE /tabs/:id/items/:itemId` `[feito]` — requer `x-operator-pin`

Remove item lançado por engano e **estorna o estoque** (`StockMovement` `INBOUND`/`CANCELLATION_REVERSAL`).
Só funciona com a comanda ainda `OPEN`. Resposta `204` sem corpo.

Por baixo é um cancelamento lógico (`TabItem.cancelledAt`), não um `DELETE` de verdade: a linha precisa
continuar existindo pra que tanto a baixa original quanto o estorno sigam apontando pra um `tabItemId`
real na auditoria. Pra quem consome a API não muda nada — o item some da comanda e do `total`.

```json
// 404 — item não é dessa comanda
{ "error": "Item não encontrado nesta comanda" }

// 409 — item já removido antes
{ "error": "Item já foi removido da comanda" }

// 409 — comanda já fechada
{ "error": "Comanda já está fechada" }
```

### `POST /tabs/:id/close` `[feito]` — requer `x-operator-pin`

Fecha a comanda: escolhe `paymentMethod`, seta `status: CLOSED` e `closedAt`. Não mexe em estoque.

```json
// request
{ "paymentMethod": "CASH" }

// 200
{
  "id": "a19dc612-6b24-447e-b969-16f48d6b50b8",
  "customerName": "João",
  "status": "CLOSED",
  "cashRegisterId": "7361c4c8-8cd1-4675-972c-30a8c9fc6c58",
  "paymentMethod": "CASH",
  "openedAt": "2026-08-27T05:10:42.939Z",
  "closedAt": "2026-08-27T05:10:43.677Z",
  "items": [
    { "id": "ae275e08-2b20-4ca8-8c83-1ec14ebd39c9", "productId": "a65b8d90-d220-4674-a4d2-d30779c52c88", "product": { "name": "Coca-Cola 350ml" }, "quantity": 3, "unitPrice": 500, "createdAt": "2026-08-27T05:10:43.056Z" }
  ],
  "total": 1500
}

// 409 — já fechada
{ "error": "Comanda já está fechada" }

// 409 — comanda sem nenhum item
{ "error": "Comanda não possui itens — não é possível fechar" }
```

`paymentMethod`: `"CASH" | "CARD" | "PIX"`.

### `POST /tabs/:id/cancel` `[feito]` — requer `x-operator-pin`

Descarta uma comanda vazia — nome digitado errado, cliente que desistiu antes de consumir, ou comanda que
ficou sem item porque tudo que foi lançado acabou removido. Sem essa rota a comanda ficaria `OPEN` pra
sempre: comanda sem item não fecha (regra 2) e comanda vazia não trava o caixa (de propósito), então nada
a tiraria da tela.

Não apaga nada: vira `status: CANCELLED` e sai da lista de abertas, continuando visível em
`?status=CANCELLED`. Isso é obrigatório e não estético — uma comanda que teve item removido ainda tem o
`TabItem` cancelado no banco com os movimentos de estoque (a baixa e o estorno) apontando pra ele. Um
`DELETE` de verdade cascatearia nesse item e zeraria o `tabItemId` dos dois movimentos, destruindo o elo de
auditoria que o cancelamento lógico de item existe pra proteger.

Duas regras que valem notar:

- **Não exige caixa aberto.** Comanda vazia sobrevive ao caixa em que foi aberta, então exigir caixa `OPEN`
  deixaria presa pra sempre exatamente a comanda que essa rota existe pra limpar.
- **Só cancela comanda sem item ativo.** Tendo item, o funcionário remove item por item primeiro — cada
  remoção gerando seu próprio estorno de estoque. Cancelar nunca mexe em estoque, e assim ninguém anula uma
  comanda real de 10 bebidas num clique.

```json
// 200 — mesmo shape de GET /tabs/:id, com status CANCELLED e closedAt preenchido

// 409 — ainda tem item lançado
{ "error": "Comanda ainda possui itens — remova cada item antes de cancelar" }

// 409 — já cancelada, ou já fechada
{ "error": "Comanda já foi cancelada" }
```

Comanda `CANCELLED` não trava o fechamento do caixa e não entra em `totalRevenue`/`expectedAmount`.

> `closedAt` marca quando a comanda deixou de estar `OPEN` — quando foi paga se `CLOSED`, quando foi
> descartada se `CANCELLED`. Quem for somar faturamento precisa filtrar por `status`, nunca só por `closedAt`.

---

## Categorias

### `GET /categories` `[feito]`

```json
// 200
[ { "id": "7d99018a-17a1-484e-bd06-0e0281e60af7", "name": "Bebidas", "displayOrder": 0, "createdAt": "2026-08-24T03:47:45.736Z" } ]
```

### `POST /categories` `[feito]` — requer `x-operator-pin`

```json
// request
{ "name": "Bebidas", "displayOrder": 0 }

// 201
{ "id": "7d99018a-17a1-484e-bd06-0e0281e60af7", "name": "Bebidas", "displayOrder": 0, "createdAt": "2026-08-24T03:47:45.736Z" }
```

`displayOrder` é opcional (default `0`).

### `PATCH /categories/:id` `[feito]` — requer `x-operator-pin`

```json
// request
{ "name": "Bebidas Geladas", "displayOrder": 1 }
```

---

## Produtos

### `GET /products` `[feito]`

Lista catálogo — **só produtos com `available: true`**. Filtro opcional `?categoryId=...`.

```json
// 200
[
  {
    "id": "a65b8d90-d220-4674-a4d2-d30779c52c88",
    "name": "Coca-Cola 350ml",
    "description": null,
    "price": 500,
    "imageUrl": null,
    "available": true,
    "currentStock": 5,
    "minimumStock": 2,
    "categoryId": "7d99018a-17a1-484e-bd06-0e0281e60af7",
    "createdAt": "2026-08-24T03:47:50.131Z"
  }
]
```

### `POST /products` `[feito]` — requer `x-operator-pin`

```json
// request
{
  "name": "Coca-Cola 350ml",
  "description": "Lata gelada",
  "price": 500,
  "imageUrl": "https://exemplo.com/coca.png",
  "available": true,
  "currentStock": 10,
  "minimumStock": 2,
  "categoryId": "7d99018a-17a1-484e-bd06-0e0281e60af7"
}
```

`description`, `imageUrl`, `available`, `currentStock`, `minimumStock` são opcionais. Se `currentStock` vier
> 0, já gera um `StockMovement` (`INBOUND`/`RESTOCK`) automaticamente.

### `PATCH /products/:id` `[feito]` — requer `x-operator-pin`

Não aceita `currentStock` (use `/products/:id/stock`). Serve também para ativar/desativar via `available`.

```json
// request
{ "available": false }
```

### `DELETE /products/:id` `[feito]` — requer `x-operator-pin`

Bloqueado (`409`) se o produto já tiver venda ou movimento de estoque associado. Resposta `204` sem corpo.

---

## Estoque

### `POST /products/:id/stock` `[feito]` — requer `x-operator-pin`

Entrada/ajuste manual. Cria `StockMovement` dentro de `prisma.$transaction`.

```json
// request
{ "type": "INBOUND", "reason": "RESTOCK", "quantity": 20 }

// 409 — OUTBOUND maior que o estoque atual
{ "error": "Estoque insuficiente: disponível 5, solicitado 50" }
```

`type`: `"INBOUND" | "OUTBOUND"`. `reason`: `"RESTOCK" | "MANUAL_ADJUSTMENT"`.

### `GET /stock-movements` `[feito]`

Auditoria de `StockMovement`, mais recente primeiro. Filtros opcionais: `productId`, `reason`
(`SALE`/`CANCELLATION_REVERSAL`/`RESTOCK`/`MANUAL_ADJUSTMENT`), `dateFrom`/`dateTo` (data ISO).

A origem do movimento vem em `saleId` (venda no balcão), `tabItemId` (item de comanda) ou `orderId`
(delivery, ainda sem rotas) — no máximo um deles é preenchido; ajuste manual vem com os três `null`.

```json
// 200
[
  {
    "id": "69972997-80b7-428c-80d0-9a34013b9cf7",
    "productId": "a65b8d90-d220-4674-a4d2-d30779c52c88",
    "type": "OUTBOUND",
    "reason": "SALE",
    "quantity": 2,
    "saleId": "8e5a4a9f-700c-4018-b830-f18187248b41",
    "orderId": null,
    "tabItemId": null,
    "createdAt": "2026-08-24T03:48:10.950Z"
  },
  {
    "id": "1d0a1c33-4f1e-4c60-9a8e-2b7f0d5a91cc",
    "productId": "a65b8d90-d220-4674-a4d2-d30779c52c88",
    "type": "INBOUND",
    "reason": "CANCELLATION_REVERSAL",
    "quantity": 2,
    "saleId": null,
    "orderId": null,
    "tabItemId": "44dfb1d6-e73b-4ef5-aef6-eaccb2ce7f81",
    "createdAt": "2026-08-27T05:10:43.402Z"
  }
]
```

### `GET /products/low-stock` `[feito]`

Produtos com `currentStock < minimumStock` (mesmo shape de `GET /products`, sem filtro de `available`).

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
- PDV: `Sale` não existe sem `CashRegister` OPEN — `Tab` (comanda) segue a mesma regra
- PDV: fechamento de caixa não persiste `expectedAmount`/`totalRevenue`/`difference` — sempre recalculado na hora
- PDV: comanda (`Tab`) é entidade independente, fechar comanda não cria `Sale` — faturamento soma `Sale` + `Tab` fechada
- PDV: item de comanda baixa estoque na hora do lançamento, não no fechamento — produto já saiu da geladeira
- PDV: remover item de comanda é cancelamento lógico (`TabItem.cancelledAt`), pra auditoria não perder o `tabItemId`
- PDV: comanda aberta com itens trava o fechamento do caixa; comanda aberta vazia não (senão travaria o caixa pra sempre) — e comanda vazia se descarta com `POST /tabs/:id/cancel`, nunca com `DELETE`
- PDV: item de comanda devolve `product.name` por join no servidor — o front não deve cruzar com `GET /products`, que esconde produto desativado
- Checkout de delivery sem cadastro/login de cliente — dados avulsos por pedido
- Pagamento (PDV e delivery): dinheiro, cartão, ou Pix — enum `PaymentMethod`
- Combo com grupos de escolha (`ComboGroup`), permite repetir produto dentro do grupo
- Toda baixa/entrada de estoque (PDV ou delivery) passa por `StockMovement` (auditoria) — nunca decrementa `currentStock` direto
