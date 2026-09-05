import { z } from "zod";

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ message: "email precisa ser um texto" })
      .email({ message: "email inválido" }),
    password: z
      .string({ message: "password precisa ser um texto" })
      .min(1, { message: "password é obrigatório" }),
  }),
});
