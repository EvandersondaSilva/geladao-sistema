import { z } from "zod";

export const listStockMovementsSchema = z.object({
  query: z.object({
    productId: z.string().min(1).optional(),
    reason: z
      .enum(["SALE", "CANCELLATION_REVERSAL", "RESTOCK", "MANUAL_ADJUSTMENT"], {
        message: "reason precisa ser SALE, CANCELLATION_REVERSAL, RESTOCK ou MANUAL_ADJUSTMENT",
      })
      .optional(),
    dateFrom: z
      .string()
      .refine((value) => !Number.isNaN(Date.parse(value)), {
        message: "dateFrom precisa ser uma data válida",
      })
      .optional(),
    dateTo: z
      .string()
      .refine((value) => !Number.isNaN(Date.parse(value)), {
        message: "dateTo precisa ser uma data válida",
      })
      .optional(),
  }),
});
