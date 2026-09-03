import { Request, Response } from "express";
import { CreateCustomerService } from "../../services/customer/createCustomerService";

class CreateCustomerController {
  async handle(req: Request, res: Response) {
    const { name, phone, notes } = req.body;

    const createCustomerService = new CreateCustomerService();

    const customer = await createCustomerService.execute({ name, phone, notes });

    res.status(201).json(customer);
  }
}

export { CreateCustomerController };
