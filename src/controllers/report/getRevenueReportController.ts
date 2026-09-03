import { Request, Response } from "express";
import { GetRevenueReportService } from "../../services/report/getRevenueReportService";

class GetRevenueReportController {
  async handle(req: Request, res: Response) {
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

    const getRevenueReportService = new GetRevenueReportService();

    const report = await getRevenueReportService.execute({ dateFrom, dateTo });

    res.status(200).json(report);
  }
}

export { GetRevenueReportController };
