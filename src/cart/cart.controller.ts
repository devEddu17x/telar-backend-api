import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotImplementedException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddItemToCartDTO } from './dtos/add-item-to-cart.dto';
import { UpdateCartItemDTO } from './dtos/update-cart-item.dto';

@Controller('cart')
export class CartController {
  constructor(
  ) { }

  @Get()
  async getCart() {
    throw new NotImplementedException('Method not implemented yet');
  }

  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  async addItem(
    @Body() addItemDTO: AddItemToCartDTO,
  ) {
    throw new NotImplementedException('Method not implemented yet');
  }

  @Patch('items/:itemId')
  async updateItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() updateDTO: UpdateCartItemDTO,
  ) {
    throw new NotImplementedException('Method not implemented yet');
  }

  @Delete('items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    throw new NotImplementedException('Method not implemented yet');
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearCart() {
    throw new NotImplementedException('Method not implemented yet');
  }
}
