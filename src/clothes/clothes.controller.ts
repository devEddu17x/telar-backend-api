import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClothesService } from './services/clothes.service';
import {
  ApiDocCreateClothes,
  ApiDocCreateDraftClothes,
  ApiDocGetAllClothes,
  ApiDocSearchAndFilterClothes,
  ApiDocGetClothesById,
  ApiDocUpdateClothes,
  ApiDocAddVariant,
  ApiDocUpdateVariant,
  ApiDocDeleteVariant,
  ApiDocAddImages,
  ApiDocDeleteImage,
  ApiDocDeleteClothes,
} from './docs/clothes.doc';
import { CreateClothesDTO } from './dto/create-clothes.dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { ROLES } from 'src/auth/constants/roles';
import { CreatedClothes } from './interfaces/created-clothes.interface';
import { StorageService } from 'src/storage/storage.service';
import { PresignedPut } from 'src/storage/interfaces/presigned-url.interface';
import { UpdateClothesDTO } from './dto/update-clothes.dto';
import { Variant } from './dto/variants.dto';
import { UpdateVariantDTO } from './dto/update-variant.dto';
import { AddImagesToClothesDTO } from './dto/add-images.dto';
import { DeleteImageDTO } from './dto/delete-image.dto';
import { ClothesVariantsService } from './services/clothes-variants.service';
import { ClothesImagesService } from './services/clothes-images.service';
import { CreateDraftClothesDTO } from './dto/create-draft-clothes.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RequireTenantGuard } from 'src/auth/guards/require-tenant.guard';
@Roles(ROLES.ADMIN, ROLES.SELLER)
@UseGuards(JwtAuthGuard, RequireTenantGuard, RolesGuard)
@Controller('clothes')
export class ClothesController {
  constructor(
    private readonly clothesService: ClothesService,
    private readonly clothesVariantService: ClothesVariantsService,
    private readonly clothesImagesService: ClothesImagesService,
    private readonly storageService: StorageService,
  ) {}

  @UseGuards(RolesGuard)
  @Post()
  @ApiDocCreateClothes()
  async createClothes(
    @Body() clothesDto: CreateClothesDTO,
    @CurrentUser() user: any,
  ): Promise<CreatedClothes & { preSignedPuts: PresignedPut[] }> {
    const createdClothes: CreatedClothes =
      await this.clothesService.createClothe(clothesDto, user.tenantId);
    const preSignedPuts: PresignedPut[] | [] =
      await this.storageService.createPresignedPuts(
        createdClothes.id,
        clothesDto.images,
        user.tenantId,
        { ttlSeconds: 3600, cacheControl: 'no-cache' },
      );

    const keys = preSignedPuts.map((put) => put.key);
    const imageUrls = this.storageService.getImagesUrl(keys);
    const savedImages = await this.clothesImagesService.addImagesToClothes(
      createdClothes.id,
      imageUrls,
      user.tenantId,
    );
    if (!savedImages || savedImages.length === 0) {
      throw new Error('Failed to save image URLs to the database');
    }
    return { ...createdClothes, preSignedPuts };
  }

  @UseGuards(RolesGuard)
  @Post('quick-create')
  @ApiDocCreateDraftClothes()
  async createDraftClothes(
    @Body() draftClothesDto: CreateDraftClothesDTO,
    @CurrentUser() user: any,
  ): Promise<CreatedClothes & { preSignedPuts: PresignedPut[] }> {
    const createdClothes: CreatedClothes =
      await this.clothesService.createDraftClothe(
        draftClothesDto,
        user.tenantId,
      );

    const preSignedPuts: PresignedPut[] | [] =
      await this.storageService.createPresignedPuts(
        createdClothes.id,
        draftClothesDto.images,
        user.tenantId,
        { ttlSeconds: 3600, cacheControl: 'no-cache' },
      );

    const keys = preSignedPuts.map((put) => put.key);
    const imageUrls = this.storageService.getImagesUrl(keys);
    const savedImages = await this.clothesImagesService.addImagesToClothes(
      createdClothes.id,
      imageUrls,
      user.tenantId,
    );
    if (!savedImages || savedImages.length === 0) {
      throw new Error('Failed to save image URLs to the database');
    }
    return { ...createdClothes, preSignedPuts };
  }

  @Get()
  @ApiDocGetAllClothes()
  async getAllClothes(@CurrentUser() user: any): Promise<any> {
    // this method should return different data based on the user's role:
    // - if the user is an admin, return all clothes with all details
    // - if the user is a seller, return only clothes that are not drafts (actually this should be discussed, maybe sellers should also see their own drafts?)
    return this.clothesService.getAllClothes(user.tenantId);
  }

  @Get('search')
  @ApiDocSearchAndFilterClothes()
  async searchAndFilterClothes(
    @CurrentUser() user: any,
    @Query('name') name?: string,
    @Query('description') description?: string,
    @Query('size') size?: string,
    @Query('gender') gender?: string,
  ): Promise<any> {
    return this.clothesService.searchAndFilterClothes(
      user.tenantId,
      name,
      description,
      size,
      gender,
    );
  }

  @Get(':id')
  @ApiDocGetClothesById()
  async getClothesById(
    @Param('id', ParseUUIDPipe) clothesId: string,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.clothesService.getClothesById(clothesId, user.tenantId);
  }

  @Patch(':id')
  @ApiDocUpdateClothes()
  async updateClothes(
    @Param('id', ParseUUIDPipe) clothesId: string,
    @Body() updateClothesDto: UpdateClothesDTO,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.clothesService.updateClothes(
      clothesId,
      updateClothesDto,
      user.tenantId,
    );
  }

  @Post(':id/variants')
  @ApiDocAddVariant()
  async addVariant(
    @Param('id', ParseUUIDPipe) clothesId: string,
    @Body() variantDto: Variant,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.clothesVariantService.addVariantToClothes(
      clothesId,
      variantDto,
      user.tenantId,
    );
  }

  @Patch(':id/variants/:variantId')
  @ApiDocUpdateVariant()
  async updateVariant(
    @Param('id', ParseUUIDPipe) clothesId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() updateVariantDto: UpdateVariantDTO,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.clothesVariantService.updateVariant(
      clothesId,
      variantId,
      updateVariantDto,
      user.tenantId,
    );
  }

  @Delete(':id/variants/:variantId')
  @ApiDocDeleteVariant()
  async deleteVariant(
    @Param('id', ParseUUIDPipe) clothesId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.clothesVariantService.deleteVariant(
      clothesId,
      variantId,
      user.tenantId,
    );
  }

  @Post(':id/images')
  @ApiDocAddImages()
  async addImages(
    @Param('id', ParseUUIDPipe) clothesId: string,
    @Body() addImagesDto: AddImagesToClothesDTO,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.clothesImagesService.addNewImagesToClothes(
      clothesId,
      addImagesDto.images,
      user.tenantId,
    );
  }

  @Delete(':id/images')
  @ApiDocDeleteImage()
  async deleteImage(
    @Param('id', ParseUUIDPipe) clothesId: string,
    @Body() deleteImageDto: DeleteImageDTO,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.clothesImagesService.deleteImageFromClothes(
      clothesId,
      deleteImageDto.url,
      user.tenantId,
    );
  }

  @Roles(ROLES.ADMIN)
  @UseGuards(RolesGuard)
  @Delete(':id')
  @ApiDocDeleteClothes()
  async deleteClothes(
    @Param('id', ParseUUIDPipe) clothesId: string,
    @CurrentUser() user: any,
  ): Promise<{ message: string }> {
    return this.clothesService.deleteClothes(clothesId, user.tenantId);
  }
}
