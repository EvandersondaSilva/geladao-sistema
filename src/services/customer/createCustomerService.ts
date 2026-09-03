import prismaClient from "../../prisma";
import { AppError } from "../../errors/AppError";
import { customerSelect } from "../../prisma/selects";

interface CreateCustomerRequest {
  name: string;
  phone?: string;
  notes?: string;
}

class CreateCustomerService {
  async execute({ name, phone, notes }: CreateCustomerRequest) {
    try {
      const customer = await prismaClient.customer.create({
        data: { name, phone, notes },
        select: customerSelect,
      });

      return customer;
    } catch (error) {
      throw new AppError("Falha ao cadastrar cliente", 500);
    }
  }
}

export { CreateCustomerService };
