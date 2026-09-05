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

## Autenticação (login individual)

Cada funcionário tem sua própria conta (`User`: nome, e-mail, senha, `role`). Substituiu o PIN único
compartilhado que o sistema usava antes — decisão do cliente, depois de ver que o PIN nunca sabia dizer
*quem* fez a ação (por exemplo, quem deu fiado sem autorização).

Dois papéis:
- **`ADMIN`** — dono/gerente. Cadastro (categoria, produto), relatórios (`/reports/*`), cria e gerencia
  conta de funcionário (`/users/*`)
- **`OPERATOR`** — funcionário de balcão. Opera o PDV do dia a dia: caixa, venda, comanda, fiado, ajuste de
  estoque, cadastro de cliente (pra dar fiado). Não mexe em categoria/produto nem vê relatório

Login: `POST /auth/login` devolve um JWT (`Authorization: Bearer <token>`, válido por **12h**). Toda rota
autenticada verifica o token **e** consulta o banco a cada request (confere se o usuário continua `active`)
— não é 100% stateless de propósito: é o que faz desativar um funcionário problemático valer *na hora*, não
só depois do token expirar.

Rotas de leitura internas do PDV (`/cash-registers*`, `/sales*`, `/tabs*`, `/customers*`, `/debts*`,
`/stock-movements`, `/products/low-stock`) agora também exigem login — antes eram públicas por herdar o
modelo do PIN (só a escrita era travada). `GET /products` e `GET /categories` continuam públicas —
alimentam o catálogo do futuro site de delivery.

### `POST /auth/login` `[feito]`

```json
// request
{ "email": "dono@geladao.com", "password": "senha123" }

// 200
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "6c959207…", "name": "Dono", "email": "dono@geladao.com", "role": "ADMIN" }
}

// 401 — e-mail ou senha errados (mesma mensagem pros dois casos, de propósito)
{ "error": "E-mail ou senha inválidos" }
```

### `GET /auth/me` `[feito]` — requer login

Devolve o usuário do token atual — o front usa isso pra restaurar nome/papel depois de um refresh de página.

### `POST /users` `[feito]`

Cria conta de funcionário. Funciona de dois jeitos:
- **Tabela `users` vazia** (instalação nova): cria o primeiro usuário como `ADMIN`, sem exigir login —
  mesmo bootstrap que o PIN antigo já tinha ("sem PIN configurado, não exige prova"). Ignora qualquer
  `role` enviada, o primeiro usuário é sempre `ADMIN`
- **Já existe usuário**: exige login como `ADMIN`; `role` vira `OPERATOR` se não for enviada

```json
// request
{ "name": "Funcionario", "email": "func@geladao.com", "password": "senha123", "role": "OPERATOR" }

// 201 — nunca ecoa a senha
{ "id": "1e034f0c…", "name": "Funcionario", "email": "func@geladao.com", "role": "OPERATOR", "active": true, "createdAt": "…" }

// 401 — tabela não está vazia e não veio token
{ "error": "Login necessário" }

// 403 — logado, mas não é ADMIN
{ "error": "Ação restrita a administradores" }

// 409 — e-mail já cadastrado
{ "error": "E-mail já cadastrado" }
```

`password` exige no mínimo 6 caracteres.

### `GET /users` `[feito]` — requer login ADMIN

Lista funcionários (nunca inclui senha).

### `PATCH /users/:id` `[feito]` — requer login ADMIN

Edita `name`/`role`/`active`. Desativar (`active: false`) é como `Product.available` — nunca `DELETE` um
usuário: apagaria quem abriu/fechou caixas e comandas no passado. Usuário desativado não consegue mais
logar, e qualquer token dele já emitido para de funcionar na próxima request (não espera os 12h expirarem).

```json
// request
{ "active": false }
```

---

## PDV — CashRegister (Caixa)

### `POST /cash-registers` `[feito]`

Abre um caixa. Bloqueia se já existir caixa `OPEN` (transação Serializable). Requer login. Grava quem
abriu (`openedBy`).

```json
// request
{ "openingAmount": 10000 }

// 201
{
  "id": "4c920a93-1931-460b-88a4-6b61365deb97",
  "status": "OPEN",
  "openingAmount": 10000,
  "openedAt": "2026-08-24T03:47:54.685Z",
  "openedBy": { "id": "6c959207…", "name": "Dono" },
  "closedBy": null
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
  "closedAt": null,
  "openedBy": { "id": "6c959207…", "name": "Dono" },
  "closedBy": null
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
    "closedAt": "2026-08-24T03:48:49.190Z",
    "openedBy": { "id": "6c959207…", "name": "Dono" },
    "closedBy": { "id": "1e034f0c…", "name": "Funcionario" }
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
  "soldTotal": 3000,
  "fiadoTotal": 0,
  "debtPaymentsTotal": 0,
  "receivedTotal": 3000,
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
`totalRevenue` (tudo, qualquer forma de pagamento) e `difference`. Requer login. Grava quem fechou
(`closedBy`).

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
  "openedBy": { "id": "6c959207…", "name": "Dono" },
  "closedBy": { "id": "1e034f0c…", "name": "Funcionario" },
  "expectedAmount": 11500,
  "soldTotal": 2500,
  "fiadoTotal": 0,
  "debtPaymentsTotal": 0,
  "receivedTotal": 2500,
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
`Product.currentStock` e cria `StockMovement` (`OUTBOUND`/`SALE`) por item. Requer login.

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
lançado), mesma decisão de `expectedAmount`/`soldTotal` no caixa.

### `POST /tabs` `[feito]`

Abre uma comanda. Exige caixa `OPEN`. Requer login.

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

`?staleHours=N` traz só comandas abertas há mais de N horas — o alerta de comanda esquecida. Combine com
`?status=OPEN&staleHours=12`.

Cada comanda vem com `openMinutes`, há quanto tempo está aberta, **calculado no relógio do servidor** (a
máquina do balcão pode estar com a hora errada). Para comanda já fechada, é quanto tempo ela ficou aberta.

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
    "total": 1500,
    "openMinutes": 73
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

### `POST /tabs/:id/items` `[feito]` — requer login

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

### `DELETE /tabs/:id/items/:itemId` `[feito]` — requer login

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

### `POST /tabs/:id/close` `[feito]` — requer login

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

### `POST /tabs/:id/cancel` `[feito]` — requer login

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

Comanda `CANCELLED` não trava o fechamento do caixa e não entra em nenhum total.

> `closedAt` marca quando a comanda deixou de estar `OPEN` — quando foi paga se `CLOSED`, quando foi
> descartada se `CANCELLED`. Quem for somar faturamento precisa filtrar por `status`, nunca só por `closedAt`.

---

## Fiado — Clientes e Contas a Receber

Cliente leva agora e paga depois. **Fiado NÃO é forma de pagamento** — `PaymentMethod` continua só com
dinheiro de verdade (`CASH`/`CARD`/`PIX`), e é isso que garante que qualquer soma sobre esse enum seja
dinheiro que entrou. Marcar fiado é ação própria (`POST /tabs/:id/fiado`).

**Fiado exige `Customer` cadastrado.** `Tab.customerName` é texto livre e texto livre não serve pra dívida —
você precisa saber que o "João" que deve R$20 é o mesmo João que voltou hoje.

### Os números do turno, e por que são vários

Uma venda no fiado foi **vendida** mas não **recebida**; um fiado antigo pago hoje foi **recebido** mas não
vendido hoje. Juntar isso num número só ou infla o faturamento (os mesmos R$20 contados no dia da venda e
de novo no dia do pagamento) ou deixa a gaveta furada. Por isso:

| Campo | O que é |
|---|---|
| `soldTotal` | o que foi **vendido** no turno, incluindo fiado |
| `fiadoTotal` | quanto do vendido saiu no fiado (não entrou dinheiro) |
| `debtPaymentsTotal` | fiado de **outro** turno recebido neste (não é venda de hoje) |
| `receivedTotal` | dinheiro que efetivamente entrou |
| `byPaymentMethod` | o recebido, por forma de pagamento (inclui recebimento de fiado) |
| `expectedAmount` | abertura + `byPaymentMethod.CASH` — o que tem que estar na gaveta |

Vale a identidade `soldTotal = receivedTotal - debtPaymentsTotal + fiadoTotal`. Se um relatório futuro não
fechar por essa conta, o erro está no relatório.

Exemplo real (testado): comanda de R$20 no fiado na segunda, cliente paga na terça.

```
segunda: soldTotal=2000  fiadoTotal=2000  receivedTotal=0     expectedAmount=10000 (só a abertura)
terça:   soldTotal=0     fiadoTotal=0     receivedTotal=2000  expectedAmount=7000  (5000 + 2000)
                                          debtPaymentsTotal=2000
```

### `POST /tabs/:id/fiado` `[feito]` — requer login

Fecha a comanda no fiado em vez de receber. A comanda vira `CLOSED` com `paymentMethod: null` (não foi paga)
e nasce a dívida. Não mexe em estoque — a baixa já ocorreu item a item, igual no fechamento normal.

```json
// request
{ "customerId": "35b19d1f-7ff0-4893-8dcd-d7732d8d1bb6" }

// 200 — a comanda fechada, com a dívida criada junto
{
  "id": "…", "customerName": "Joao", "status": "CLOSED", "paymentMethod": null, "total": 2000,
  "closedBy": { "id": "1e034f0c…", "name": "Funcionario" },
  "items": [ … ],
  "debt": { "id": "…", "customerId": "35b19d1f…", "amount": 2000, "balance": 2000, "status": "OPEN" }
}

// 409 — comanda vazia, já fechada ou cancelada · 404 — cliente não cadastrado
{ "error": "Comanda não possui itens — não é possível marcar como fiado" }
```

> Uma comanda `CLOSED` com `paymentMethod: null` é uma comanda no fiado, não um bug. Ela tem `debt`.

### `GET /customers` `[feito]`

Lista clientes em ordem alfabética, **cada um com o saldo devedor** — é a tela de "quem tá devendo".
Filtro opcional `?search=` (busca por nome, ignora maiúscula/minúscula).

```json
// 200
[ { "id": "35b19d1f…", "name": "Joao Silva", "phone": "88999998888", "notes": null, "totalOwed": 2000, "createdAt": "…" } ]
```

### `GET /customers/:id` `[feito]`

Extrato do cliente: todas as dívidas, cada uma com seus pagamentos e saldo, mais o `totalOwed`.

```json
// 200
{
  "id": "35b19d1f…", "name": "Joao Silva", "totalOwed": 0,
  "debts": [
    {
      "id": "…", "amount": 2000, "balance": 0, "status": "PAID", "tabId": "…", "paidAt": "…",
      "payments": [
        { "id": "…", "amount": 500, "paymentMethod": "CASH", "cashRegisterId": "…", "receivedBy": { "id": "1e034f0c…", "name": "Funcionario" }, "createdAt": "…" },
        { "id": "…", "amount": 1500, "paymentMethod": "CASH", "cashRegisterId": "…", "receivedBy": { "id": "1e034f0c…", "name": "Funcionario" }, "createdAt": "…" }
      ]
    }
  ]
}
```

### `POST /customers` · `PATCH /customers/:id` `[feito]` — requerem login

```json
// request — só name é obrigatório
{ "name": "Joao Silva", "phone": "88999998888", "notes": "vizinho, paga toda sexta" }
```

### `GET /debts` `[feito]`

Lista de fiados, **mais antigo primeiro** (numa lista de devedores, o que está pendurado há mais tempo é o
que interessa). Filtros opcionais `?status=OPEN|PAID` e `?customerId=`. Traz o nome do cliente junto.

```json
// 200
[
  {
    "id": "…", "customerId": "35b19d1f…",
    "customer": { "id": "35b19d1f…", "name": "Joao Silva", "phone": "88999998888" },
    "amount": 2000, "balance": 2000, "status": "OPEN",
    "tabId": "…", "cashRegisterId": "…", "createdAt": "…", "paidAt": null,
    "payments": []
  }
]
```

`amount` é o valor combinado quando a mercadoria saiu — congelado, não muda mais. `balance` é
`amount - soma dos pagamentos`, calculado na hora (nunca persistido).

### `GET /debts/:id` `[feito]`

Uma dívida com seus pagamentos e saldo. `404` se não existir.

### `POST /debts/:id/payments` `[feito]` — requer login

Recebe (total ou **parcial**) contra uma dívida. **Exige caixa `OPEN`** — diferente de dar fiado, aqui
entra dinheiro de verdade, e é isso que faz a gaveta bater no fechamento. O dinheiro entra no caixa do dia
do **pagamento**, não no caixa que deu o fiado.

```json
// request
{ "amount": 500, "paymentMethod": "CASH", "cashRegisterId": "…" }

// 201 — a dívida atualizada; quita sozinha quando o saldo zera
{ "id": "…", "amount": 2000, "balance": 1500, "status": "OPEN", "payments": [ { "amount": 500, … } ] }

// 409 — valor maior que o saldo
{ "error": "Valor maior que o saldo devedor: saldo 500, informado 999999" }

// 409 — dívida já quitada, ou caixa não está aberto
{ "error": "Fiado já está quitado" }
```

---

## Relatórios

Os dois relatórios usam **a mesma conta** do resumo de turno (`calculateRevenueTotals`), só que filtrada por
período em vez de por caixa. Por isso um relatório do mês nunca pode discordar dos turnos que o compõem.

### `GET /reports/revenue` `[feito]`

Faturamento no período. Filtros opcionais `?dateFrom=` e `?dateTo=` (data ISO); sem filtro, tudo.

```json
// 200
{
  "dateFrom": "2026-09-01T00:00:00.000Z",
  "dateTo": null,
  "soldTotal": 12500,
  "fiadoTotal": 2500,
  "debtPaymentsTotal": 2000,
  "receivedTotal": 12000,
  "byPaymentMethod": { "CASH": 9000, "CARD": 1500, "PIX": 1500 },
  "salesCount": 4,
  "tabsCount": 8,
  "outstandingDebtTotal": 500
}
```

Os campos de dinheiro são os mesmos do resumo de turno (ver a tabela em **Fiado**), e vale a mesma
identidade `soldTotal = receivedTotal - debtPaymentsTotal + fiadoTotal`.

`outstandingDebtTotal` é o fiado **ainda em aberto** — de propósito NÃO é filtrado pelo período: é um saldo
corrente ("quanto tem pendurado agora"), não algo que aconteceu dentro daquelas datas.

Uma comanda entra pelo `closedAt`, não pelo `openedAt` — receita se realiza quando a conta é acertada.

### `GET /reports/products` `[feito]`

Ranking de produtos por quantidade vendida. Filtros opcionais `?dateFrom=`, `?dateTo=`, `?limit=`.

```json
// 200
{
  "dateFrom": null,
  "dateTo": null,
  "products": [
    { "productId": "a65b8d90…", "name": "Coca-Cola 350ml", "quantity": 25, "revenue": 12500 }
  ]
}
```

Soma **venda no balcão + item de comanda** — um ranking que lesse só `sale_items` ignoraria tudo que foi
consumido em comanda, que num bar é a maior parte. Item cancelado não conta, e só comanda já fechada entra,
pra ficar em pé de igualdade com o relatório de faturamento (comanda aberta ainda não foi vendida, embora o
estoque dela já tenha saído).

---

## Categorias

### `GET /categories` `[feito]`

```json
// 200
[ { "id": "7d99018a-17a1-484e-bd06-0e0281e60af7", "name": "Bebidas", "displayOrder": 0, "createdAt": "2026-08-24T03:47:45.736Z" } ]
```

### `POST /categories` `[feito]` — requer login ADMIN

```json
// request
{ "name": "Bebidas", "displayOrder": 0 }

// 201
{ "id": "7d99018a-17a1-484e-bd06-0e0281e60af7", "name": "Bebidas", "displayOrder": 0, "createdAt": "2026-08-24T03:47:45.736Z" }
```

`displayOrder` é opcional (default `0`).

### `PATCH /categories/:id` `[feito]` — requer login ADMIN

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

### `POST /products` `[feito]` — requer login ADMIN

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

### `PATCH /products/:id` `[feito]` — requer login ADMIN

Não aceita `currentStock` (use `/products/:id/stock`). Serve também para ativar/desativar via `available`.

```json
// request
{ "available": false }
```

### `DELETE /products/:id` `[feito]` — requer login ADMIN

Bloqueado (`409`) se o produto já tiver venda ou movimento de estoque associado. Resposta `204` sem corpo.

---

## Estoque

### `POST /products/:id/stock` `[feito]` — requer login

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

- PDV: login individual por funcionário (`User`), dois papéis (`ADMIN`/`OPERATOR`) — substituiu o PIN único compartilhado depois que o cliente visitou um concorrente e viu o valor de saber quem fez cada ação
- PDV: autoria gravada só nas ações de confiança alta (abrir/fechar caixa, fechar comanda, receber fiado) — não em toda escrita
- PDV: `Sale` não existe sem `CashRegister` OPEN — `Tab` (comanda) segue a mesma regra
- PDV: fechamento de caixa não persiste nenhum total (`expectedAmount`, `soldTotal`, `difference`...) — sempre recalculado na hora
- PDV: fiado é ação separada, NÃO é `PaymentMethod` — assim toda soma sobre `PaymentMethod` é dinheiro que entrou de verdade
- PDV: fiado exige `Customer` cadastrado (texto livre não serve pra dívida) e aceita pagamento parcial
- PDV: comanda (`Tab`) é entidade independente, fechar comanda não cria `Sale` — faturamento soma `Sale` + `Tab` fechada
- PDV: item de comanda baixa estoque na hora do lançamento, não no fechamento — produto já saiu da geladeira
- PDV: remover item de comanda é cancelamento lógico (`TabItem.cancelledAt`), pra auditoria não perder o `tabItemId`
- PDV: comanda aberta com itens trava o fechamento do caixa; comanda aberta vazia não (senão travaria o caixa pra sempre) — e comanda vazia se descarta com `POST /tabs/:id/cancel`, nunca com `DELETE`
- PDV: item de comanda devolve `product.name` por join no servidor — o front não deve cruzar com `GET /products`, que esconde produto desativado
- Checkout de delivery sem cadastro/login de cliente — dados avulsos por pedido
- Pagamento (PDV e delivery): dinheiro, cartão, ou Pix — enum `PaymentMethod`
- Combo com grupos de escolha (`ComboGroup`), permite repetir produto dentro do grupo
- Toda baixa/entrada de estoque (PDV ou delivery) passa por `StockMovement` (auditoria) — nunca decrementa `currentStock` direto
