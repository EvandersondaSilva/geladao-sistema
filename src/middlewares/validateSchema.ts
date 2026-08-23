import { ZodError, ZodType } from "zod";
import { Request, Response, NextFunction } from "express";

const validateSchema = (schema: ZodType) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "Erro validação",
          details: error.issues.map((issue) => ({
            campo: issue.path.slice(1).join(".") || issue.path[0]?.toString() || "body",
            mensagem: issue.message,
          })),
        });
      }
      return res.status(500).json({
        error: "Erro interno do servidor",
      });
    }
  };
};

export { validateSchema };
