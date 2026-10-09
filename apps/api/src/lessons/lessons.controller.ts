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
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator.js';
import { LessonsService } from './lessons.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { CreateLessonDto } from './dto/create-lesson.dto.js';
import { UpdateLessonDto } from './dto/update-lesson.dto.js';

@Controller()
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Public()
  @Get('categories')
  listCategories() {
    return this.lessonsService.listCategories(true);
  }

  @Public()
  @Get('categories/:slug')
  getCategory(@Param('slug') slug: string) {
    return this.lessonsService.getCategory(slug, true);
  }

  @Roles(Role.SUPER_ADMIN, Role.MODERATOR, Role.TEACHER)
  @Get('admin/categories')
  adminCategories() {
    return this.lessonsService.listCategories(false);
  }

  @Roles(Role.SUPER_ADMIN, Role.MODERATOR, Role.TEACHER)
  @Post('admin/categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.lessonsService.createCategory(dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.MODERATOR, Role.TEACHER)
  @Patch('admin/categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.lessonsService.updateCategory(id, dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.MODERATOR)
  @Delete('admin/categories/:id')
  removeCategory(@Param('id') id: string) {
    return this.lessonsService.removeCategory(id);
  }

  @Public()
  @Get('lessons')
  listLessons(
    @Query('categoryId') categoryId?: string,
    @Query('q') q?: string,
    @Query('level') level?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.lessonsService.listLessons({
      categoryId,
      q,
      level,
      publishedOnly: true,
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 20,
    });
  }

  @Public()
  @Get('lessons/:slug')
  getLesson(@Param('slug') slug: string) {
    return this.lessonsService.getLesson(slug, true);
  }

  @Roles(Role.SUPER_ADMIN, Role.MODERATOR, Role.TEACHER)
  @Get('admin/lessons')
  adminLessons(
    @Query('categoryId') categoryId?: string,
    @Query('q') q?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.lessonsService.listLessons({
      categoryId,
      q,
      publishedOnly: false,
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 50,
    });
  }

  @Roles(Role.SUPER_ADMIN, Role.MODERATOR, Role.TEACHER)
  @Post('admin/lessons')
  createLesson(@Body() dto: CreateLessonDto, @CurrentUser() user: AuthUser) {
    return this.lessonsService.createLesson(dto, user.id);
  }

  @Roles(Role.SUPER_ADMIN, Role.MODERATOR, Role.TEACHER)
  @Patch('admin/lessons/:id')
  updateLesson(@Param('id') id: string, @Body() dto: UpdateLessonDto) {
    return this.lessonsService.updateLesson(id, dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.MODERATOR)
  @Delete('admin/lessons/:id')
  removeLesson(@Param('id') id: string) {
    return this.lessonsService.removeLesson(id);
  }
}
