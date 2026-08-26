import { z } from "zod";

export const updateOperatorPinSchema = z.object({
  body: z.object({
    currentPin: z
      .string({ message: "currentPin precisa ser um texto" })
      .min(4, { message: "currentPin precisa ter no mínimo 4 caracteres" })
      .optional(),
    newPin: z
      .string({ message: "newPin precisa ser um texto" })
      .min(4, { message: "newPin precisa ter no mínimo 4 caracteres" }),
  }),
});
