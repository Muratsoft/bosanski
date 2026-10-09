import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { LangVariant } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator.js';
import { DictionaryService } from './dictionary.service.js';
import { CreateDictionaryDto } from './dto/create-dictionary.dto.js';
import { UpdateDictionaryDto } from './dto/update-dictionary.dto.js';

@Controller('dictionary')
export class DictionaryController {
  constructor(private readonly dictionaryService: DictionaryService) {}

  @Public()
  @Get()
  search(
    @Query('q') q?: string,
    @Query('variant') variant?: LangVariant,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.dictionaryService.search({
      q,
      variant,
      publishedOnly: true,
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 30,
    });
  }

  @Public()
  @Get('ai/explain')
  explain(
    @Query('q') q: string,
    @Query('variant') variant?: LangVariant,
  ) {
    return this.dictionaryService.explainWithAi(q, variant);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dictionaryService.findOne(id);
  }

  @Roles(Role.SUPER_ADMIN, Role.MODERATOR, Role.TEACHER)
  @Post()
  create(@Body() dto: CreateDictionaryDto, @CurrentUser() user: AuthUser) {
    return this.dictionaryService.create(dto, user.id);
  }

  @Roles(Role.SUPER_ADMIN, Role.MODERATOR, Role.TEACHER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDictionaryDto) {
    return this.dictionaryService.update(id, dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.MODERATOR)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.dictionaryService.remove(id);
  }
}
