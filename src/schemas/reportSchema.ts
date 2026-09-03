import { z } from "zod";

export const getRevenueReportSchema = z.object({
  query: z.object({
    dateFrom: z.coerce.date({ message: "dateFrom precisa ser uma data ISO" }).optional(),
    dateTo: z.coerce.date({ message: "dateTo precisa ser uma data ISO" }).optional(),
  }),
});

export const getProductSalesReportSchema = z.object({
  query: z.object({
    dateFrom: z.coerce.date({ message: "dateFrom precisa ser uma data ISO" }).optional(),
    dateTo: z.coerce.date({ message: "dateTo precisa ser uma data ISO" }).optional(),
    limit: z.coerce
      .number({ message: "limit precisa ser um número" })
      .int({ message: "limit precisa ser um número inteiro" })
      .min(1, { message: "limit precisa ser maior que zero" })
      .optional(),
  }),
});
