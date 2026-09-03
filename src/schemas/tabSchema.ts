import { z } from "zod";

export const listTabsSchema = z.object({
  query: z.object({
    status: z
      .enum(["OPEN", "CLOSED", "CANCELLED"], {
        message: "status precisa ser OPEN, CLOSED ou CANCELLED",
      })
      .optional(),
    staleHours: z.coerce
      .number({ message: "staleHours precisa ser um número" })
      .min(0, { message: "staleHours não pode ser negativo" })
      .optional(),
  }),
});

export const getTabSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: "Id da comanda é obrigatório" }),
  }),
});

export const openTabSchema = z.object({
  body: z.object({
    customerName: z
      .string({ message: "customerName precisa ser um texto" })
      .min(1, { message: "customerName é obrigatório" }),
    cashRegisterId: z
      .string({ message: "cashRegisterId precisa ser um texto" })
      .min(1, { message: "cashRegisterId é obrigatório" }),
  }),
});

export const addTabItemSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: "Id da comanda é obrigatório" }),
  }),
  body: z.object({
    productId: z
      .string({ message: "productId precisa ser um texto" })
      .min(1, { message: "productId é obrigatório" }),
    quantity: z
      .number({ message: "quantity precisa ser um número" })
      .int({ message: "quantity precisa ser um número inteiro" })
      .min(1, { message: "quantity precisa ser maior que zero" }),
  }),
});

export const removeTabItemSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: "Id da comanda é obrigatório" }),
    itemId: z.string().min(1, { message: "Id do item é obrigatório" }),
  }),
});

export const markTabAsFiadoSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: "Id da comanda é obrigatório" }),
  }),
  body: z.object({
    customerId: z
      .string({ message: "customerId precisa ser um texto" })
      .min(1, { message: "customerId é obrigatório — fiado exige cliente cadastrado" }),
  }),
});

export const cancelTabSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: "Id da comanda é obrigatório" }),
  }),
});

export const closeTabSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: "Id da comanda é obrigatório" }),
  }),
  body: z.object({
    paymentMethod: z.enum(["CASH", "CARD", "PIX"], {
      message: "paymentMethod precisa ser CASH, CARD ou PIX",
    }),
  }),
});
