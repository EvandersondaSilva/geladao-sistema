import { z } from "zod";

export const createCategorySchema = z.object({
  body: z.object({
    name: z
      .string({ message: "Categoria precisa ser um texto" })
      .min(3, { message: "Nome da categoria precisa ter 3 caracteres" }),
    displayOrder: z
      .number({ message: "displayOrder precisa ser um número" })
      .int({ message: "displayOrder precisa ser um número inteiro" })
      .min(0, { message: "displayOrder não pode ser negativo" })
      .optional(),
  }),
});

export const updateCategorySchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: "Id da categoria é obrigatório" }),
  }),
  body: z.object({
    name: z
      .string({ message: "Categoria precisa ser um texto" })
      .min(3, { message: "Nome da categoria precisa ter 3 caracteres" }),
    displayOrder: z
      .number({ message: "displayOrder precisa ser um número" })
      .int({ message: "displayOrder precisa ser um número inteiro" })
      .min(0, { message: "displayOrder não pode ser negativo" })
      .optional(),
  }),
});
