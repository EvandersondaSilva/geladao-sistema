import { Request, Response } from "express";
import { UpdateCategoryService } from "../../services/category/updateCategoryService";

class UpdateCategoryController {
  async handle(req: Request, res: Response) {
    const categoryId = req.params.id as string;
    const { name, displayOrder } = req.body;

    const updateCategory = new UpdateCategoryService();

    const category = await updateCategory.execute({
      id: categoryId,
      name,
      displayOrder,
    });

    res.status(200).json(category);
  }
}

export { UpdateCategoryController };
