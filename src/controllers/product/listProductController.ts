import { Request, Response } from "express";
import { ListProductService } from "../../services/product/listProductService";

class ListProductController {
  async handle(req: Request, res: Response) {
    const categoryId = req.query.categoryId as string | undefined;

    const listProductService = new ListProductService();

    const products = await listProductService.execute(categoryId);

    res.status(200).json(products);
  }
}

export { ListProductController };
