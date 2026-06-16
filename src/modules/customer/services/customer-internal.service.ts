import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCustomerDTO } from '../dtos/create-customer.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomerEntity } from '../entities/customer.entity';
import { Repository } from 'typeorm';
import { UpdateCustomerDTO } from '../dtos/update-customer.dto';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
  ) {}
  async createCustomer(customerDTO: CreateCustomerDTO, tenantId: string) {
    const newCustomer = this.customerRepository.create({
      ...customerDTO,
      tenantId,
    });
    const createdUser = await this.customerRepository.save(newCustomer);
    if (!createdUser) {
      throw new BadRequestException(
        'Error creating user or user already exists',
      );
    }

    return createdUser;
  }

  async getAllCustomers(tenantId: string): Promise<CustomerEntity[]> {
    let customers: CustomerEntity[];
    try {
      customers = await this.customerRepository.find({ where: { tenantId } });
    } catch (error) {
      throw new BadRequestException('Error retrieving customers');
    }
    if (!customers || customers.length === 0) {
      throw new NotFoundException('No customers found');
    }
    return customers;
  }

  async getCustomerById(id: string, tenantId: string): Promise<CustomerEntity> {
    let customer: CustomerEntity;
    try {
      customer = await this.customerRepository.findOne({
        where: { id, tenantId },
      });
    } catch (error) {
      throw new BadRequestException('Error retrieving customer');
    }
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    return customer;
  }

  async updateCustomer(
    id: string,
    customerDTO: UpdateCustomerDTO,
    tenantId: string,
  ) {
    const result = await this.customerRepository.update(
      { id, tenantId },
      customerDTO,
    );
    if (result.affected === 0) {
      throw new NotFoundException(
        'Customer not found or you do not have permission',
      );
    }
    return this.getCustomerById(id, tenantId);
  }

  async searchCustomers(
    tenantId: string,
    names?: string,
    lastNames?: string,
    phone?: string,
  ): Promise<CustomerEntity[]> {
    if (!names && !lastNames && !phone) {
      return [];
    }

    try {
      let query = this.customerRepository
        .createQueryBuilder('customer')
        .where('customer.tenantId = :tenantId', { tenantId });

      if (names && names.trim() !== '') {
        query = query.andWhere('customer.names ILIKE :names', {
          names: `%${names.trim()}%`,
        });
      }

      if (lastNames && lastNames.trim() !== '') {
        query = query.andWhere('customer.lastNames ILIKE :lastNames', {
          lastNames: `%${lastNames.trim()}%`,
        });
      }

      if (phone && phone.trim() !== '') {
        query = query.andWhere('customer.phone ILIKE :phone', {
          phone: `%${phone.trim()}%`,
        });
      }

      const customers = await query.getMany();
      return customers;
    } catch (error) {
      throw new BadRequestException('Error searching customers');
    }
  }
}
