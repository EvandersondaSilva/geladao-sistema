import { z } from "zod";

export const openCashRegisterSchema = z.object({
  body: z.object({
    openingAmount: z
      .number({ message: "openingAmount precisa ser um número" })
      .int({ message: "openingAmount precisa ser um número inteiro (centavos)" })
      .min(0, { message: "openingAmount não pode ser negativo" }),
  }),
});
