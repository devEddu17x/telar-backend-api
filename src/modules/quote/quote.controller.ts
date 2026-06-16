import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { QuoteService } from './quote.service';
import {
  ApiDocCreateQuote,
  ApiDocGetQuotes,
  ApiDocGetQuoteById,
  ApiDocUpdateQuote,
  ApiDocCancelQuote,
  ApiDocDeleteQuote,
} from './docs/quote.doc';
import { CreateQuoteDTO } from './dtos/create-quote.dto';
import { QuoteStatus } from './enums/status.enum';
import { RolesGuard } from '../../modules/auth/guards/roles.guard';
import { Roles } from '../../modules/auth/decorators/roles.decorator';
import { CurrentUser } from '../../modules/auth/decorators/current-user.decorator';
import { ROLES } from 'src/common/enum/roles';
import { QuoteSummary } from './interfaces/clothes-data.interface';
import { CreatedClothes } from './interfaces/created-clothes.interface';
import { UpdateQuoteDTO } from './dtos/update-quote.dto';
import { QuoteEntity } from './entities/quote.entity';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { RequireTenantGuard } from '../../modules/auth/guards/require-tenant.guard';

@Roles(ROLES.SELLER, ROLES.ADMIN)
@UseGuards(JwtAuthGuard, RequireTenantGuard, RolesGuard)
@Controller('quotes')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Post()
  @ApiDocCreateQuote()
  async createQuote(
    @Body() dto: CreateQuoteDTO,
    @CurrentUser() user: any,
  ): Promise<CreatedClothes> {
    return this.quoteService.createQuote(dto, user.tenantId);
  }

  @Get()
  @ApiDocGetQuotes()
  async getQuotes(
    @CurrentUser() user: any,
    @Query('status') status?: QuoteStatus,
  ): Promise<QuoteSummary[]> {
    if (!status) {
      return this.quoteService.getAll(user.tenantId);
    }
    if (!Object.values(QuoteStatus).includes(status)) {
      throw new BadRequestException(
        `Invalid status. Valid values: ${Object.values(QuoteStatus).join(', ')}`,
      );
    }
    return this.quoteService.getQuotesByStatus(status, user.tenantId);
  }

  @Get(':id')
  @ApiDocGetQuoteById()
  async getQuoteById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<QuoteEntity> {
    return this.quoteService.getQuoteById(id, user.tenantId);
  }

  @Put(':id')
  @ApiDocUpdateQuote()
  async updateQuote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuoteDTO,
    @CurrentUser() user: any,
  ): Promise<CreatedClothes> {
    return this.quoteService.updateQuote(id, dto, user.tenantId);
  }

  @Patch(':id/cancel')
  @ApiDocCancelQuote()
  async cancelQuote(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<QuoteEntity> {
    return this.quoteService.cancelQuote(id, user.tenantId);
  }

  @Delete(':id')
  @ApiDocDeleteQuote()
  async deleteQuote(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<{ message: string }> {
    return this.quoteService.deleteQuote(id, user.tenantId);
  }
}
