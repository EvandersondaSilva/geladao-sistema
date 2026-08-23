import { z } from "zod";

export const listProductsSchema = z.object({
  query: z.object({
    categoryId: z.string().min(1).optional(),
  }),
});
