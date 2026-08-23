import { Request, Response } from "express";
import { CreateProductService } from "../../services/product/createProductService";

class CreateProductController {
  async handle(req: Request, res: Response) {
    const {
      name,
      description,
      price,
      imageUrl,
      available,
      currentStock,
      minimumStock,
      categoryId,
    } = req.body;

    const createProductService = new CreateProductService();

    const product = await createProductService.execute({
      name,
      description,
      price,
      imageUrl,
      available,
      currentStock,
      minimumStock,
      categoryId,
    });

    res.status(201).json(product);
  }
}

export { CreateProductController };
