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
import { CreateQuoteDTO } from './dtos/create-quote.dto';
import { QuoteStatus } from './enums/status.enum';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { ROLES } from 'src/auth/constants/roles';
import { QuoteSummary } from './interfaces/clothes-data.interface';
import { CreatedClothes } from './interfaces/created-clothes.interface';
import { UpdateQuoteDTO } from './dtos/update-quote.dto';
import { QuoteEntity } from './entities/quote.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RequireTenantGuard } from 'src/auth/guards/require-tenant.guard';

@Roles(ROLES.SELLER, ROLES.ADMIN)
@UseGuards(JwtAuthGuard, RequireTenantGuard, RolesGuard)
@Controller('quotes')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Post()
  async createQuote(
    @Body() dto: CreateQuoteDTO,
    @CurrentUser() user: any,
  ): Promise<CreatedClothes> {
    return this.quoteService.createQuote(dto, user.tenantId);
  }

  @Get()
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
  async getQuoteById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<QuoteEntity> {
    return this.quoteService.getQuoteById(id, user.tenantId);
  }

  @Put(':id')
  async updateQuote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuoteDTO,
    @CurrentUser() user: any,
  ): Promise<CreatedClothes> {
    return this.quoteService.updateQuote(id, dto, user.tenantId);
  }

  @Patch(':id/cancel')
  async cancelQuote(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<QuoteEntity> {
    return this.quoteService.cancelQuote(id, user.tenantId);
  }

  @Delete(':id')
  async deleteQuote(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<{ message: string }> {
    return this.quoteService.deleteQuote(id, user.tenantId);
  }
}
