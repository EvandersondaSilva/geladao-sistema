import { Router } from "express";
import { validateSchema } from "./middlewares/validateSchema";
import { createCategorySchema, updateCategorySchema } from "./schemas/categorySchema";
import { CreateCategoryController } from "./controllers/category/createCategoryController";
import { ListCategoryController } from "./controllers/category/listCategoryController";
import { UpdateCategoryController } from "./controllers/category/updateCategoryController";
import { listProductsSchema } from "./schemas/productSchema";
import { ListProductController } from "./controllers/product/listProductController";

const routes = Router();

// criando categoria
routes.post("/categorias", validateSchema(createCategorySchema), new CreateCategoryController().handle);

// listar categorias
routes.get("/categorias", new ListCategoryController().handle);

// editar categoria
routes.patch("/categorias/:id", validateSchema(updateCategorySchema), new UpdateCategoryController().handle);

// listar catálogo de produtos (público, com filtro opcional por categoria)
routes.get("/produtos", validateSchema(listProductsSchema), new ListProductController().handle);

export default routes;
