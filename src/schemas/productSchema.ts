import { z } from "zod";

export const listProductsSchema = z.object({
  query: z.object({
    categoryId: z.string().min(1).optional(),
  }),
});

export const createProductSchema = z.object({
  body: z.object({
    name: z
      .string({ message: "Nome do produto precisa ser um texto" })
      .min(3, { message: "Nome do produto precisa ter no mínimo 3 caracteres" }),
    description: z.string({ message: "Descrição precisa ser um texto" }).optional(),
    price: z
      .number({ message: "price precisa ser um número" })
      .int({ message: "price precisa ser um número inteiro (centavos)" })
      .min(0, { message: "price não pode ser negativo" }),
    imageUrl: z.url({ message: "imageUrl precisa ser uma URL válida" }).optional(),
    available: z.boolean({ message: "available precisa ser booleano" }).optional(),
    currentStock: z
      .number({ message: "currentStock precisa ser um número" })
      .int({ message: "currentStock precisa ser um número inteiro" })
      .min(0, { message: "currentStock não pode ser negativo" })
      .optional(),
    minimumStock: z
      .number({ message: "minimumStock precisa ser um número" })
      .int({ message: "minimumStock precisa ser um número inteiro" })
      .min(0, { message: "minimumStock não pode ser negativo" })
      .optional(),
    categoryId: z.string({ message: "categoryId precisa ser um texto" }).min(1, {
      message: "categoryId é obrigatório",
    }),
  }),
});

// currentStock is intentionally left out: every stock change goes through
// POST /products/:id/stock, which records the StockMovement alongside it.
export const updateProductSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: "Id do produto é obrigatório" }),
  }),
  body: z
    .object({
      name: z
        .string({ message: "Nome do produto precisa ser um texto" })
        .min(3, { message: "Nome do produto precisa ter no mínimo 3 caracteres" })
        .optional(),
      description: z.string({ message: "Descrição precisa ser um texto" }).nullable().optional(),
      price: z
        .number({ message: "price precisa ser um número" })
        .int({ message: "price precisa ser um número inteiro (centavos)" })
        .min(0, { message: "price não pode ser negativo" })
        .optional(),
      imageUrl: z
        .url({ message: "imageUrl precisa ser uma URL válida" })
        .nullable()
        .optional(),
      available: z.boolean({ message: "available precisa ser booleano" }).optional(),
      minimumStock: z
        .number({ message: "minimumStock precisa ser um número" })
        .int({ message: "minimumStock precisa ser um número inteiro" })
        .min(0, { message: "minimumStock não pode ser negativo" })
        .optional(),
      categoryId: z
        .string({ message: "categoryId precisa ser um texto" })
        .min(1, { message: "categoryId não pode ser vazio" })
        .optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "Informe ao menos um campo para atualizar",
    }),
});

export const deleteProductSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: "Id do produto é obrigatório" }),
  }),
});

export const adjustProductStockSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: "Id do produto é obrigatório" }),
  }),
  body: z.object({
    type: z.enum(["INBOUND", "OUTBOUND"], {
      message: "type precisa ser INBOUND ou OUTBOUND",
    }),
    reason: z.enum(["RESTOCK", "MANUAL_ADJUSTMENT"], {
      message: "reason precisa ser RESTOCK ou MANUAL_ADJUSTMENT",
    }),
    quantity: z
      .number({ message: "quantity precisa ser um número" })
      .int({ message: "quantity precisa ser um número inteiro" })
      .min(1, { message: "quantity precisa ser maior que zero" }),
  }),
});
