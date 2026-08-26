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

### `POST /cash-registers/:id/close` `[feito]`

Fecha o caixa. Calcula na hora (não persiste) `expectedAmount` (abertura + vendas em `CASH`),
`totalRevenue` (todas as vendas, qualquer forma de pagamento) e `difference`. Requer `x-operator-pin`.

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
  "difference": 0
}

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
    "createdAt": "2026-08-24T03:48:10.950Z"
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
- PDV: `Sale` não existe sem `CashRegister` OPEN
- PDV: fechamento de caixa não persiste `expectedAmount`/`totalRevenue`/`difference` — sempre recalculado na hora
- Checkout de delivery sem cadastro/login de cliente — dados avulsos por pedido
- Pagamento (PDV e delivery): dinheiro, cartão, ou Pix — enum `PaymentMethod`
- Combo com grupos de escolha (`ComboGroup`), permite repetir produto dentro do grupo
- Toda baixa/entrada de estoque (PDV ou delivery) passa por `StockMovement` (auditoria) — nunca decrementa `currentStock` direto
