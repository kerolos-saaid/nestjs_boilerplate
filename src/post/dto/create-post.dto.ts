import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsBoolean()
  @IsOptional()
  published?: boolean;

  // The authorId will be set from the authenticated user, not the request body
}
