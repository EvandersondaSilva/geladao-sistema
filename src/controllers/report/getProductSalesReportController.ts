import { Request, Response } from "express";
import { GetProductSalesReportService } from "../../services/report/getProductSalesReportService";

class GetProductSalesReportController {
  async handle(req: Request, res: Response) {
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const getProductSalesReportService = new GetProductSalesReportService();

    const report = await getProductSalesReportService.execute({ dateFrom, dateTo, limit });

    res.status(200).json(report);
  }
}

export { GetProductSalesReportController };
