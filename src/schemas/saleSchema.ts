import { z } from "zod";

export const createSaleSchema = z.object({
  body: z.object({
    cashRegisterId: z
      .string({ message: "cashRegisterId precisa ser um texto" })
      .min(1, { message: "cashRegisterId é obrigatório" }),
    paymentMethod: z.enum(["CASH", "CARD", "PIX"], {
      message: "paymentMethod precisa ser CASH, CARD ou PIX",
    }),
    items: z
      .array(
        z.object({
          productId: z
            .string({ message: "productId precisa ser um texto" })
            .min(1, { message: "productId é obrigatório" }),
          quantity: z
            .number({ message: "quantity precisa ser um número" })
            .int({ message: "quantity precisa ser um número inteiro" })
            .min(1, { message: "quantity precisa ser maior que zero" }),
        })
      )
      .min(1, { message: "Informe ao menos um item na venda" }),
  }),
});
