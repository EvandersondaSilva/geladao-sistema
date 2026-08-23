import { Request, Response } from "express";
import { UpdateProductService } from "../../services/product/updateProductService";

class UpdateProductController {
  async handle(req: Request, res: Response) {
    const productId = req.params.id as string;
    const { name, description, price, imageUrl, available, minimumStock, categoryId } = req.body;

    const updateProductService = new UpdateProductService();

    const product = await updateProductService.execute({
      id: productId,
      name,
      description,
      price,
      imageUrl,
      available,
      minimumStock,
      categoryId,
    });

    res.status(200).json(product);
  }
}

export { UpdateProductController };
