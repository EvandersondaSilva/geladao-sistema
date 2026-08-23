import { Request, Response } from "express";
import { CreateCategoryService } from "../../services/category/createCategoryService";

class CreateCategoryController {
  async handle(req: Request, res: Response) {
    const { name, displayOrder } = req.body;

    const createCategory = new CreateCategoryService();

    const category = await createCategory.execute({ name, displayOrder });

    res.status(201).json(category);
  }
}

export { CreateCategoryController };
