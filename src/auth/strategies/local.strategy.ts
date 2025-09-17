import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { SigninDto } from '../dto/signin.dto';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, pass: string): Promise<any> {
    const signinDto = new SigninDto();
    signinDto.email = email;
    signinDto.password = pass;
    const user = await this.authService.validateUser(signinDto);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
