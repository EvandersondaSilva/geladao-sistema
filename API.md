# API Endpoints

> Prioridade atual: PDV (venda no balcão + estoque). Delivery está pausado, mas mantido no schema para depois.
> Tags: `[feito]` já implementado · `[a fazer]` ainda não existe no código

## PDV — Caixa

- `POST /caixa/abrir` — abre um caixa (`valorAbertura`); bloqueia se já existir caixa ABERTO `[a fazer]`
- `GET /caixa/atual` — retorna o caixa ABERTO no momento, se houver `[a fazer]`
- `PATCH /caixa/:id/fechar` — fecha o caixa (`valorFechamentoInformado`); calcula na hora (não persiste) `valorEsperado`, `faturamentoTotal` e `diferenca` `[a fazer]`

## PDV — Venda

- `POST /vendas` — registra venda no balcão (itens + `formaPagamento`); exige caixa ABERTO; dentro de `prisma.$transaction` decrementa `Product.estoqueAtual` e cria `MovimentoEstoque` (SAIDA/VENDA) por item `[a fazer]`
- `GET /vendas` — lista vendas (filtro por `caixaId` e/ou data) `[a fazer]`
- `GET /vendas/:id` — detalhe de uma venda com itens `[a fazer]`

## Categorias

- `GET /categorias` — lista categorias `[feito]`
- `POST /categorias` — cria (admin) `[feito]`
- `PATCH /categorias/:id` — edita (admin) `[feito]`

## Produtos

- `GET /produtos` — lista catálogo (filtro opcional por `categoryId`, retorna `estoqueAtual`/`estoqueMinimo`) `[feito]`
- `POST /produtos` — cria (admin) `[a fazer]`
- `PATCH /produtos/:id` — edita (admin) `[a fazer]`
- `PATCH /produtos/:id/disponibilidade` — ativa/desativa (`available`) sem apagar histórico `[a fazer — decidir se é essa rota ou soft delete via DELETE]`

## Estoque

- `GET /estoque/movimentos` — histórico/auditoria de `MovimentoEstoque` (filtro por produto/data/motivo) `[a fazer]`
- `GET /estoque/alertas` — produtos com `estoqueAtual < estoqueMinimo` `[a fazer]`
- `POST /estoque/movimento` — entrada manual/ajuste (admin), motivo `REPOSICAO` ou `AJUSTE_MANUAL` `[a fazer]`

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

- PDV: sem login individual do operador no caixa — PIN/senha compartilhada (`Settings.operadorPin`), decisão consciente do cliente
- PDV: `Venda` não existe sem `Caixa` ABERTO
- PDV: fechamento de caixa não persiste `valorEsperado`/`faturamentoTotal`/`diferenca` — sempre recalculado na hora
- Checkout de delivery sem cadastro/login de cliente — dados avulsos por pedido
- Pagamento (PDV e delivery): dinheiro, cartão, ou Pix — enum `FormaPagamento`
- Combo com grupos de escolha (`ComboGroup`), permite repetir produto dentro do grupo
- Toda baixa/entrada de estoque (PDV ou delivery) passa por `MovimentoEstoque` (auditoria) — nunca decrementa `estoqueAtual` direto
