import { Injectable } from '@nestjs/common';
import {
  CreateThemeParams,
  ThemeRepository,
  UpdateThemeParams,
} from '../../domain/repositories/theme.repository';
import { Theme } from '../../domain/entities/theme';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { ThemeLookup } from '../../../../shared/application/ports/theme-lookup.port';

@Injectable()
export class PrismaThemeRepository implements ThemeRepository, ThemeLookup {
  constructor(private readonly prisma: PrismaService) {}

  async findExistingSlugs(slugs: string[]): Promise<string[]> {
    if (slugs.length === 0) {
      return [];
    }

    const themes = await this.prisma.theme.findMany({
      where: {
        slug: {
          in: slugs,
        },
      },
      select: {
        slug: true,
      },
    });

    return themes.map((theme) => theme.slug);
  }

  async findById(id: string): Promise<Theme | null> {
    return this.prisma.theme.findUnique({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Theme | null> {
    return this.prisma.theme.findUnique({ where: { slug } });
  }

  async list(): Promise<Theme[]> {
    return this.prisma.theme.findMany({ orderBy: { name: 'asc' } });
  }

  async create(params: CreateThemeParams): Promise<Theme> {
    return this.prisma.theme.create({
      data: {
        name: params.name,
        slug: params.slug,
        description: params.description ?? null,
      },
    });
  }

  async update(id: string, params: UpdateThemeParams): Promise<Theme> {
    return this.prisma.theme.update({
      where: { id },
      data: {
        ...(params.name !== undefined ? { name: params.name } : {}),
        ...(params.description !== undefined
          ? { description: params.description }
          : {}),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.theme.delete({ where: { id } });
  }
}
