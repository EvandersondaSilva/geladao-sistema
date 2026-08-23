import { Request, Response } from "express";
import { ListCategoryService } from "../../services/category/listCategoryService";

class ListCategoryController {
  async handle(_: Request, res: Response) {
    const listCategoryService = new ListCategoryService();

    const categories = await listCategoryService.execute();

    res.status(200).json(categories);
  }
}

export { ListCategoryController };
