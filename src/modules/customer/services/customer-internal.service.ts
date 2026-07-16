import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { CreateCustomerDTO } from '../dtos/create-customer.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomerEntity } from '../entities/customer.entity';
import { Repository } from 'typeorm';
import { UpdateCustomerDTO } from '../dtos/update-customer.dto';
import { maskEmail } from 'src/utils/mask-email.util';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(CustomerService.name);
  }
  async createCustomer(
    customerDTO: CreateCustomerDTO,
    tenantId: string,
    actor?: { sub?: string; email?: string; tenantId?: string },
  ) {
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

    this.logger.info(
      {
        tenantId,
        customerId: createdUser.id,
        actorSub: actor?.sub,
        actorEmail: actor?.email ? maskEmail(actor.email) : undefined,
      },
      'Created customer',
    );

    return createdUser;
  }

  async getAllCustomers(
    tenantId: string,
    actor?: { sub?: string; email?: string; tenantId?: string },
  ): Promise<CustomerEntity[]> {
    let customers: CustomerEntity[];
    try {
      customers = await this.customerRepository.find({ where: { tenantId } });
    } catch (error) {
      throw new BadRequestException('Error retrieving customers');
    }
    if (!customers || customers.length === 0) {
      throw new NotFoundException('No customers found');
    }
    this.logger.info(
      {
        tenantId,
        count: customers.length,
        actorSub: actor?.sub,
        actorEmail: actor?.email ? maskEmail(actor.email) : undefined,
      },
      'Listed customers',
    );
    return customers;
  }

  async getCustomerById(
    id: string,
    tenantId: string,
    actor?: { sub?: string; email?: string; tenantId?: string },
  ): Promise<CustomerEntity> {
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
    this.logger.info(
      {
        tenantId,
        customerId: id,
        actorSub: actor?.sub,
        actorEmail: actor?.email ? maskEmail(actor.email) : undefined,
      },
      'Retrieved customer',
    );
    return customer;
  }

  async updateCustomer(
    id: string,
    customerDTO: UpdateCustomerDTO,
    tenantId: string,
    actor?: { sub?: string; email?: string; tenantId?: string },
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
    this.logger.info(
      {
        tenantId,
        customerId: id,
        actorSub: actor?.sub,
        actorEmail: actor?.email ? maskEmail(actor.email) : undefined,
      },
      'Updated customer',
    );
    return this.getCustomerById(id, tenantId, actor);
  }

  async searchCustomers(
    tenantId: string,
    names?: string,
    lastNames?: string,
    phone?: string,
    actor?: { sub?: string; email?: string; tenantId?: string },
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

      this.logger.info(
        {
          tenantId,
          count: customers.length,
          hasNamesFilter: Boolean(names && names.trim()),
          hasLastNamesFilter: Boolean(lastNames && lastNames.trim()),
          hasPhoneFilter: Boolean(phone && phone.trim()),
          actorSub: actor?.sub,
          actorEmail: actor?.email ? maskEmail(actor.email) : undefined,
        },
        'Searched customers',
      );
      return customers;
    } catch (error) {
      throw new BadRequestException('Error searching customers');
    }
  }
}
