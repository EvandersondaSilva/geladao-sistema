import { z } from "zod";

export const listCashRegistersSchema = z.object({
  query: z.object({
    status: z.enum(["OPEN", "CLOSED"], { message: "status precisa ser OPEN ou CLOSED" }).optional(),
  }),
});

export const getCashRegisterSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: "Id do caixa é obrigatório" }),
  }),
});

export const openCashRegisterSchema = z.object({
  body: z.object({
    openingAmount: z
      .number({ message: "openingAmount precisa ser um número" })
      .int({ message: "openingAmount precisa ser um número inteiro (centavos)" })
      .min(0, { message: "openingAmount não pode ser negativo" }),
  }),
});

export const closeCashRegisterSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: "Id do caixa é obrigatório" }),
  }),
  body: z.object({
    reportedClosingAmount: z
      .number({ message: "reportedClosingAmount precisa ser um número" })
      .int({ message: "reportedClosingAmount precisa ser um número inteiro (centavos)" })
      .min(0, { message: "reportedClosingAmount não pode ser negativo" }),
  }),
});
