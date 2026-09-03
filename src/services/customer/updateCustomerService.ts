import { Prisma } from "../../generated/prisma/client";
import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";
import { customerSelect } from "../../prisma/selects";

interface UpdateCustomerRequest {
  id: string;
  name?: string;
  phone?: string | null;
  notes?: string | null;
}

class UpdateCustomerService {
  async execute({ id, name, phone, notes }: UpdateCustomerRequest) {
    try {
      const customer = await prismaClient.customer.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(phone !== undefined && { phone }),
          ...(notes !== undefined && { notes }),
        },
        select: customerSelect,
      });

      return customer;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new AppError("Cliente não encontrado", 404);
      }

      throw new AppError("Falha ao atualizar cliente", 500);
    }
  }
}

export { UpdateCustomerService };
