import { Request, Response } from "express";
import { DeleteProductService } from "../../services/product/deleteProductService";

class DeleteProductController {
  async handle(req: Request, res: Response) {
    const productId = req.params.id as string;

    const deleteProductService = new DeleteProductService();

    await deleteProductService.execute({ id: productId });

    res.status(204).send();
  }
}

export { DeleteProductController };
