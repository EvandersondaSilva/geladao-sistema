import { z } from "zod";

export const listDebtsSchema = z.object({
  query: z.object({
    status: z.enum(["OPEN", "PAID"], { message: "status precisa ser OPEN ou PAID" }).optional(),
    customerId: z.string().min(1).optional(),
  }),
});

export const getDebtSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: "Id da dívida é obrigatório" }),
  }),
});

export const payDebtSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: "Id da dívida é obrigatório" }),
  }),
  body: z.object({
    amount: z
      .number({ message: "amount precisa ser um número" })
      .int({ message: "amount precisa ser um número inteiro (centavos)" })
      .min(1, { message: "amount precisa ser maior que zero" }),
    paymentMethod: z.enum(["CASH", "CARD", "PIX"], {
      message: "paymentMethod precisa ser CASH, CARD ou PIX",
    }),
    cashRegisterId: z
      .string({ message: "cashRegisterId precisa ser um texto" })
      .min(1, { message: "cashRegisterId é obrigatório" }),
  }),
});
