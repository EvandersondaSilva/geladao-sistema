import { Request, Response } from "express";
import { UpdateCustomerService } from "../../services/customer/updateCustomerService";

class UpdateCustomerController {
  async handle(req: Request, res: Response) {
    const customerId = req.params.id as string;
    const { name, phone, notes } = req.body;

    const updateCustomerService = new UpdateCustomerService();

    const customer = await updateCustomerService.execute({ id: customerId, name, phone, notes });

    res.status(200).json(customer);
  }
}

export { UpdateCustomerController };
