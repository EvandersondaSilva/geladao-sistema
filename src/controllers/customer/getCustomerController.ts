import { Request, Response } from "express";
import { GetCustomerService } from "../../services/customer/getCustomerService";

class GetCustomerController {
  async handle(req: Request, res: Response) {
    const customerId = req.params.id as string;

    const getCustomerService = new GetCustomerService();

    const customer = await getCustomerService.execute(customerId);

    res.status(200).json(customer);
  }
}

export { GetCustomerController };
