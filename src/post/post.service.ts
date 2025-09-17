import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Post, Prisma } from '@prisma/client';

@Injectable()
export class PostService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.PostCreateInput): Promise<Post> {
    return this.prisma.client.post.create({ data });
  }

  async findAll(): Promise<Post[]> {
    return this.prisma.client.post.findMany();
  }

  async findOne(
    postWhereUniqueInput: Prisma.PostWhereUniqueInput,
  ): Promise<Post | null> {
    return this.prisma.client.post.findUnique({ where: postWhereUniqueInput });
  }

  async update(params: {
    where: Prisma.PostWhereUniqueInput;
    data: Prisma.PostUpdateInput;
  }): Promise<Post> {
    const { where, data } = params;
    return this.prisma.client.post.update({ where, data });
  }

  async remove(where: Prisma.PostWhereUniqueInput): Promise<Post> {
    return this.prisma.client.post.delete({ where });
  }
}
