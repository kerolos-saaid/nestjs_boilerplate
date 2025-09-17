import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { SigninDto } from './dto/signin.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(signupDto: SignupDto) {
    const hashedPassword = await bcrypt.hash(signupDto.password, 10);
    const user = await this.prisma.client.user.create({
      data: {
        ...signupDto,
        password: hashedPassword,
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  async validateUser(signinDto: SigninDto) {
    const user = await this.prisma.client.user.findUnique({
      where: { email: signinDto.email },
    });

    if (user && user.password && (await bcrypt.compare(signinDto.password, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async signin(user: any) {
    const payload = { username: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async validateOAuthLogin(email: string, provider: string): Promise<any> {
    try {
      const user = await this.prisma.client.user.findFirst({
        where: { email },
      });

      if (user) {
        return user;
      }

      const newUser = await this.prisma.client.user.create({
        data: {
          email,
          name: email.split('@')[0],
          [provider === 'google' ? 'googleId' : 'appleId']: email,
        },
      });

      return newUser;
    } catch (err) {
      throw new UnauthorizedException();
    }
  }
}
