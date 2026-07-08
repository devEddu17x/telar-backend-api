import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { QuoteController } from './quote.controller';
import { QuoteService } from './quote.service';
import { QuoteStatus } from './enums/status.enum';

describe('QuoteController', () => {
  let controller: QuoteController;
  let service: {
    createQuote: jest.Mock;
    getAll: jest.Mock;
    getQuotesByStatus: jest.Mock;
    getQuoteById: jest.Mock;
    updateQuote: jest.Mock;
    cancelQuote: jest.Mock;
    deleteQuote: jest.Mock;
  };

  const user = { tenantId: 'tenant-1' };

  beforeEach(async () => {
    service = {
      createQuote: jest.fn(),
      getAll: jest.fn(),
      getQuotesByStatus: jest.fn(),
      getQuoteById: jest.fn(),
      updateQuote: jest.fn(),
      cancelQuote: jest.fn(),
      deleteQuote: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuoteController],
      providers: [{ provide: QuoteService, useValue: service }],
    }).compile();

    controller = module.get(QuoteController);
  });

  afterEach(() => jest.clearAllMocks());

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('createQuote', () => {
    it('delega en quoteService.createQuote con el tenantId', async () => {
      const dto = { customerId: 'cust-1' } as any;
      service.createQuote.mockResolvedValue({ id: 'quote-1' });

      const result = await controller.createQuote(dto, user);

      expect(service.createQuote).toHaveBeenCalledWith(dto, user.tenantId);
      expect(result).toEqual({ id: 'quote-1' });
    });
  });

  describe('getQuotes', () => {
    it('llama a getAll si no se pasa status', async () => {
      service.getAll.mockResolvedValue([{ id: 'quote-1' }]);

      const result = await controller.getQuotes(user);

      expect(service.getAll).toHaveBeenCalledWith(user.tenantId);
      expect(result).toEqual([{ id: 'quote-1' }]);
    });

    it('lanza BadRequestException si el status no es válido', async () => {
      await expect(
        controller.getQuotes(user, 'estado-invalido' as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('llama a getQuotesByStatus si el status es válido', async () => {
      service.getQuotesByStatus.mockResolvedValue([{ id: 'quote-1' }]);

      const result = await controller.getQuotes(user, QuoteStatus.PENDING);

      expect(service.getQuotesByStatus).toHaveBeenCalledWith(
        QuoteStatus.PENDING,
        user.tenantId,
      );
      expect(result).toEqual([{ id: 'quote-1' }]);
    });
  });

  describe('getQuoteById', () => {
    it('delega en quoteService.getQuoteById', async () => {
      service.getQuoteById.mockResolvedValue({ id: 'quote-1' });

      const result = await controller.getQuoteById('quote-1', user);

      expect(service.getQuoteById).toHaveBeenCalledWith(
        'quote-1',
        user.tenantId,
      );
      expect(result).toEqual({ id: 'quote-1' });
    });
  });

  describe('updateQuote', () => {
    it('delega en quoteService.updateQuote', async () => {
      const dto = { details: [] } as any;
      service.updateQuote.mockResolvedValue({ id: 'quote-1' });

      const result = await controller.updateQuote('quote-1', dto, user);

      expect(service.updateQuote).toHaveBeenCalledWith(
        'quote-1',
        dto,
        user.tenantId,
      );
      expect(result).toEqual({ id: 'quote-1' });
    });
  });

  describe('cancelQuote', () => {
    it('delega en quoteService.cancelQuote', async () => {
      service.cancelQuote.mockResolvedValue({
        id: 'quote-1',
        status: QuoteStatus.CANCELLED,
      });

      const result = await controller.cancelQuote('quote-1', user);

      expect(service.cancelQuote).toHaveBeenCalledWith(
        'quote-1',
        user.tenantId,
      );
      expect(result).toEqual({ id: 'quote-1', status: QuoteStatus.CANCELLED });
    });
  });

  describe('deleteQuote', () => {
    it('delega en quoteService.deleteQuote', async () => {
      service.deleteQuote.mockResolvedValue({ message: 'Quote deleted' });

      const result = await controller.deleteQuote('quote-1', user);

      expect(service.deleteQuote).toHaveBeenCalledWith(
        'quote-1',
        user.tenantId,
      );
      expect(result).toEqual({ message: 'Quote deleted' });
    });
  });
});
