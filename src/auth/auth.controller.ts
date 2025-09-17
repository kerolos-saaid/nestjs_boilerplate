import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { SigninDto } from './dto/signin.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('signin')
  signin(@Request() req) {
    return this.authService.signin(req.user);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Request() req) {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleAuthRedirect(@Request() req) {
    return this.authService.signin(req.user);
  }

  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  async appleAuth(@Request() req) {}

  @Get('apple/callback')
  @UseGuards(AuthGuard('apple'))
  appleAuthRedirect(@Request() req) {
    return this.authService.signin(req.user);
  }
}
