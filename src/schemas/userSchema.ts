import { z } from "zod";

export const listUsersSchema = z.object({
  query: z.object({}),
});

export const createUserSchema = z.object({
  body: z.object({
    name: z
      .string({ message: "name precisa ser um texto" })
      .min(1, { message: "name é obrigatório" }),
    email: z
      .string({ message: "email precisa ser um texto" })
      .email({ message: "email inválido" }),
    password: z
      .string({ message: "password precisa ser um texto" })
      .min(6, { message: "password precisa ter no mínimo 6 caracteres" }),
    // optional — bootstrap (first ever user) is always ADMIN regardless of what
    // is sent, and an ADMIN creating a teammate normally means a counter OPERATOR
    role: z.enum(["ADMIN", "OPERATOR"], { message: "role precisa ser ADMIN ou OPERATOR" }).optional(),
  }),
});

export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: "Id do usuário é obrigatório" }),
  }),
  body: z
    .object({
      name: z.string().min(1, { message: "name não pode ser vazio" }).optional(),
      role: z.enum(["ADMIN", "OPERATOR"], { message: "role precisa ser ADMIN ou OPERATOR" }).optional(),
      active: z.boolean({ message: "active precisa ser um booleano" }).optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "Informe ao menos um campo para atualizar",
    }),
});
