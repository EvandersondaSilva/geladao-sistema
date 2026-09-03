import { Request, Response } from "express";
import { ListCustomerService } from "../../services/customer/listCustomerService";

class ListCustomerController {
  async handle(req: Request, res: Response) {
    const search = req.query.search as string | undefined;

    const listCustomerService = new ListCustomerService();

    const customers = await listCustomerService.execute(search);

    res.status(200).json(customers);
  }
}

export { ListCustomerController };
