import { z } from "zod";

export const listCustomersSchema = z.object({
  query: z.object({
    search: z.string().min(1).optional(),
  }),
});

export const getCustomerSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: "Id do cliente é obrigatório" }),
  }),
});

export const createCustomerSchema = z.object({
  body: z.object({
    name: z
      .string({ message: "name precisa ser um texto" })
      .min(1, { message: "name é obrigatório" }),
    phone: z.string().min(1).optional(),
    notes: z.string().min(1).optional(),
  }),
});

export const updateCustomerSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: "Id do cliente é obrigatório" }),
  }),
  body: z
    .object({
      name: z.string().min(1, { message: "name não pode ser vazio" }).optional(),
      phone: z.string().min(1).nullable().optional(),
      notes: z.string().min(1).nullable().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "Informe ao menos um campo para atualizar",
    }),
});
