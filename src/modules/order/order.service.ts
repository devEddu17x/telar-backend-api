import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderEntity } from './entities/order.entity';
import { AddressEntity } from './entities/address.entity';
import { Repository } from 'typeorm/repository/Repository';
import { CreateOrderDTO } from './dtos/create-order.dto';
import { DataSource } from 'typeorm/data-source/DataSource';
import { QuoteService } from 'src/modules/quote/quote.service';
import { QuoteStatus } from 'src/modules/quote/enums/status.enum';
import { OrderSummary } from './interfaces/order-summary.interface';
import { OrderStatus } from './enum/order-status.enum';
import { ClothesService } from 'src/modules/clothes/services/clothes.service';
import { maskEmail } from 'src/utils/mask-email.util';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @InjectRepository(AddressEntity)
    private readonly addressRepository: Repository<AddressEntity>,
    private readonly dataSource: DataSource,
    private readonly quoteService: QuoteService,
    private readonly clothesService: ClothesService,
    private readonly logger: PinoLogger,
  ) {}

  async createOrder(
    dto: CreateOrderDTO,
    tenantId: string,
    actor?: { sub?: string; email?: string; tenantId?: string },
  ): Promise<OrderEntity> {
    const quote = await this.quoteService.getQuoteById(dto.quoteId, tenantId);

    if (quote.status === QuoteStatus.CANCELLED) {
      throw new BadRequestException(
        'Cannot create order from a cancelled quote',
      );
    }
    if (quote.status === QuoteStatus.REJECTED) {
      throw new BadRequestException(
        'Cannot create order from a rejected quote',
      );
    }
    if (quote.status === QuoteStatus.APPROVED) {
      throw new BadRequestException(
        'Cannot create order from a quote that was already approved',
      );
    }
    const clothesIds = [
      ...new Set(
        quote.details.map((detail) => detail.clothesVariant.clothesId),
      ),
    ];

    const draftCheck =
      await this.clothesService.checkIfClothesAreDraft(clothesIds);

    if (draftCheck.hasDrafts) {
      const draftNames = draftCheck.draftClothes
        .map((c) => `"${c.name}"`)
        .join(', ');
      throw new BadRequestException(
        `Cannot create order. The following clothes are still in draft mode and must be completed first: ${draftNames}`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const address = this.addressRepository.create({
        ...dto.address,
        tenantId,
      });
      const savedAddress = await queryRunner.manager.save(address);
      const order = this.orderRepository.create({
        quoteId: dto.quoteId,
        total: quote.total,
        deliveryDate: new Date(dto.deliveryDate),
        address: savedAddress,
        tenantId,
      });
      const savedOrder = await queryRunner.manager.save(order);
      await this.quoteService.updateStatus(
        dto.quoteId,
        QuoteStatus.APPROVED,
        actor,
      );
      await queryRunner.commitTransaction();

      this.logger.info(
        {
          tenantId,
          orderId: savedOrder.id,
          quoteId: dto.quoteId,
          total: savedOrder.total,
          actorSub: actor?.sub,
          actorEmail: actor?.email ? maskEmail(actor.email) : undefined,
        },
        'Created order',
      );

      return savedOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        { err: error, tenantId, quoteId: dto.quoteId, actorSub: actor?.sub },
        'Error creating order',
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getOrders(
    tenantId: string,
    actor?: { sub?: string; email?: string; tenantId?: string },
  ): Promise<OrderSummary[]> {
    const orders = await this.fetchOrders(
      tenantId,
      undefined,
      undefined,
      actor,
    );
    this.logger.info(
      {
        tenantId,
        count: orders.length,
        actorSub: actor?.sub,
        actorEmail: actor?.email ? maskEmail(actor.email) : undefined,
      },
      'Listed orders',
    );
    return orders;
  }

  async getOrderById(id: string, tenantId: string): Promise<OrderEntity> {
    const order = await this.orderRepository.findOne({
      where: { id, tenantId },
      relations: [
        'address',
        'quote',
        'quote.customer',
        'quote.details',
        'quote.details.clothesVariant',
        'quote.details.clothesVariant.clothes',
      ],
    });
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  async updateOrderStatus(
    id: string,
    status: OrderStatus,
    tenantId: string,
    actor?: { sub?: string; email?: string; tenantId?: string },
  ): Promise<any> {
    try {
      const currentOrder = await this.orderRepository.findOne({
        where: { id, tenantId },
      });

      if (!currentOrder) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      if (status === OrderStatus.DONE) {
        if (currentOrder.status !== OrderStatus.IN_PRODUCTION) {
          throw new BadRequestException(
            `Cannot change order status to DONE. Order must be in IN_PRODUCTION status. Current status: ${currentOrder.status}`,
          );
        }
      }

      if (currentOrder.status === OrderStatus.CANCELLED) {
        throw new BadRequestException(
          'Cannot change status of an order that is CANCELLED',
        );
      }

      if (currentOrder.status === OrderStatus.DONE) {
        throw new BadRequestException(
          'Cannot change status of an order that is already DONE',
        );
      }

      const updateResult = await this.orderRepository.update(
        { id, tenantId },
        { status },
      );

      if (updateResult.affected === 0) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      const updatedOrder = await this.orderRepository.findOne({
        where: { id, tenantId },
      });
      this.logger.info(
        {
          id,
          tenantId,
          status,
          actorSub: actor?.sub,
          actorEmail: actor?.email ? maskEmail(actor.email) : undefined,
        },
        'Updated order status',
      );
      return updatedOrder;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error updating order status');
    }
  }

  async cancelOrder(
    id: string,
    reason: string,
    tenantId: string,
    actor?: { sub?: string; email?: string; tenantId?: string },
  ): Promise<OrderEntity> {
    try {
      const existingOrder = await this.orderRepository.findOne({
        where: { id, tenantId },
      });

      if (!existingOrder) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      if (existingOrder.status !== OrderStatus.IN_PRODUCTION) {
        throw new BadRequestException(
          `Only orders in IN_PRODUCTION can be cancelled. Current status: ${existingOrder.status}`,
        );
      }

      const updateResult = await this.orderRepository.update(
        { id, tenantId },
        { status: OrderStatus.CANCELLED, cancellationReason: reason },
      );

      if (updateResult.affected === 0) {
        throw new BadRequestException('Error cancelling order');
      }

      const cancelledOrder = await this.orderRepository.findOne({
        where: { id, tenantId },
      });

      this.logger.info(
        {
          id,
          tenantId,
          actorSub: actor?.sub,
          actorEmail: actor?.email ? maskEmail(actor.email) : undefined,
        },
        'Cancelled order',
      );

      return cancelledOrder;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error cancelling order');
    }
  }

  async getOrdersByStatus(
    status: OrderStatus,
    tenantId: string,
    actor?: { sub?: string; email?: string; tenantId?: string },
  ): Promise<OrderSummary[]> {
    const orders = await this.fetchOrders(tenantId, undefined, status, actor);
    this.logger.info(
      {
        tenantId,
        status,
        count: orders.length,
        actorSub: actor?.sub,
        actorEmail: actor?.email ? maskEmail(actor.email) : undefined,
      },
      'Listed orders by status',
    );
    return orders;
  }

  /**
   * Private method that builds and executes the query to fetch orders with all related data
   * @param tenantId - Filter by tenant ID
   * @param orderId - Optional. Filter by specific order ID
   * @param status - Optional. Filter by specific status
   * @returns Array of orders with summary
   */
  private async fetchOrders(
    tenantId: string,
    orderId?: string,
    status?: OrderStatus,
    actor?: { sub?: string; email?: string; tenantId?: string },
  ): Promise<OrderSummary[]> {
    const queryBuilder = this.buildOrderSummaryQuery();

    queryBuilder.where('order.tenantId = :tenantId', { tenantId });

    // Apply filters if provided
    if (orderId) {
      queryBuilder.andWhere('order.id = :orderId', { orderId });
    }

    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    // Execute query
    const orders = await queryBuilder.getRawAndEntities();

    // Map results
    const result = this.mapToOrderSummary(orders);

    if (!result || result.length === 0) {
      const message = status
        ? `No orders found for status: ${status}`
        : 'No orders found';
      throw new NotFoundException(message);
    }

    this.logger.info(
      {
        tenantId,
        orderId,
        status,
        count: result.length,
        actorSub: actor?.sub,
        actorEmail: actor?.email ? maskEmail(actor.email) : undefined,
      },
      'Fetched order summaries',
    );

    return result;
  }

  /**
   * Builds query builder to get order summary with customer, address, and clothes aggregation
   * @returns Configured QueryBuilder
   */
  private buildOrderSummaryQuery() {
    return (
      this.orderRepository
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.address', 'address')
        .leftJoin('order.quote', 'quote')
        .leftJoinAndSelect('quote.customer', 'customer')
        .leftJoin('quote.details', 'quoteDetail')
        .leftJoin('quoteDetail.clothesVariant', 'variant')
        .select([
          // Order fields
          'order.id',
          'order.total',
          'order.status',
          'order.createdAt',
          'order.deliveryDate',
          'order.quoteId',
          // Address fields
          'address.id',
          'address.department',
          'address.city',
          'address.district',
          'address.street',
          // Customer fields
          'customer.id',
          'customer.names',
          'customer.lastNames',
          'customer.phone',
        ])
        // Total unique base clothes (from quote details)
        .addSelect('COUNT(DISTINCT variant.clothes_id)', 'totalClothes')
        // Total units to produce (sum of quantities from quote details)
        .addSelect(
          'COALESCE(SUM(quoteDetail.quantity), 0)',
          'totalUnitsToProduced',
        )
        .groupBy('order.id')
        .addGroupBy('address.id')
        .addGroupBy('customer.id')
        .orderBy('order.createdAt', 'DESC')
    );
  }

  /**
   * Maps the results of the query to the OrderSummary interface
   * @param orders - Result of getRawAndEntities()
   * @returns Array of OrderSummary
   */
  private mapToOrderSummary(orders: {
    entities: OrderEntity[];
    raw: any[];
  }): OrderSummary[] {
    return orders.entities.map((order, index) => {
      const rawData = orders.raw[index];
      return {
        id: order.id,
        total: order.total,
        status: order.status,
        createdAt: order.createdAt,
        deliveryDate: order.deliveryDate,
        quoteId: order.quoteId,
        customer: {
          id: rawData.customer_id,
          names: rawData.customer_names,
          lastNames: rawData.customer_lastNames,
          phone: rawData.customer_phone,
        },
        address: {
          id: order.address.id,
          department: order.address.department,
          city: order.address.city,
          district: order.address.district,
          street: order.address.street,
        },
        totalClothes: parseInt(rawData.totalClothes) || 0,
        totalUnitsToProduced: parseInt(rawData.totalUnitsToProduced) || 0,
      };
    });
  }

  async deleteOrder(
    id: string,
    tenantId: string,
    actor?: { sub?: string; email?: string; tenantId?: string },
  ): Promise<{ message: string }> {
    try {
      const existingOrder = await this.orderRepository.findOne({
        where: { id, tenantId },
      });

      if (!existingOrder) {
        throw new NotFoundException(`Order with ID ${id} not found.`);
      }

      if (existingOrder.status !== OrderStatus.CANCELLED) {
        throw new BadRequestException(
          'Only CANCELLED orders can be deleted. Please cancel the order first.',
        );
      }

      const deleteResult = await this.orderRepository.softDelete({
        id,
        tenantId,
      });

      if (deleteResult.affected === 0) {
        throw new NotFoundException(
          `Order with ID ${id} not found or already deleted.`,
        );
      }

      return { message: 'Order successfully deleted' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        { err: error, id, tenantId, actorSub: actor?.sub },
        'Error deleting order',
      );
      throw new BadRequestException('Error deleting order');
    }
  }
}
