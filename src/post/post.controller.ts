import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  NotFoundException,
  UseGuards,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PoliciesGuard } from '../auth/guards/policies.guard';
import { CheckPolicies } from '../auth/decorators/check-policies.decorator';
import { Action, CaslAbilityFactory } from '../casl/casl-ability.factory';
import { subject } from '@casl/ability';
import { User } from '@prisma/client';

// This is a temporary solution to simulate an authenticated user.
// In a real application, an authentication guard (e.g., from Passport.js)
// would be responsible for fetching the user and attaching it to the request.
const attachUserToRequest = (req: any) => {
  req.user = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedpassword',
    role: 'USER',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;
};

@Controller('posts')
@UseGuards(PoliciesGuard)
export class PostController {
  constructor(
    private readonly postService: PostService,
    private readonly caslAbilityFactory: CaslAbilityFactory,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can(Action.Create, 'Post'))
  create(@Body() createPostDto: CreatePostDto, @Req() req: any) {
    attachUserToRequest(req); // Simulate user authentication
    const user = req.user;
    return this.postService.create({
      ...createPostDto,
      author: {
        connect: { id: user.id },
      },
    });
  }

  @Get()
  @CheckPolicies((ability) => ability.can(Action.Read, 'Post'))
  findAll() {
    return this.postService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    attachUserToRequest(req); // Simulate user authentication
    const user = req.user;
    const ability = this.caslAbilityFactory.createForUser(user);

    const postToRead = await this.postService.findOne({ id });
    if (!postToRead) {
      throw new NotFoundException(`Post with ID ${id} not found.`);
    }

    if (ability.cannot(Action.Read, subject('Post', postToRead))) {
      throw new ForbiddenException('You do not have permission to read this post.');
    }

    return postToRead;
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePostDto: UpdatePostDto,
    @Req() req: any,
  ) {
    attachUserToRequest(req); // Simulate user authentication
    const user = req.user;
    const ability = this.caslAbilityFactory.createForUser(user);

    const postToUpdate = await this.postService.findOne({ id });
    if (!postToUpdate) {
      throw new NotFoundException(`Post with ID ${id} not found.`);
    }

    if (ability.cannot(Action.Update, subject('Post', postToUpdate))) {
      throw new ForbiddenException('You do not have permission to update this post.');
    }

    return this.postService.update({
      where: { id },
      data: updatePostDto,
    });
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    attachUserToRequest(req); // Simulate user authentication
    const user = req.user;
    const ability = this.caslAbilityFactory.createForUser(user);

    const postToDelete = await this.postService.findOne({ id });
    if (!postToDelete) {
      throw new NotFoundException(`Post with ID ${id} not found.`);
    }

    if (ability.cannot(Action.Delete, subject('Post', postToDelete))) {
      throw new ForbiddenException('You do not have permission to delete this post.');
    }

    return this.postService.remove({ id });
  }
}
