import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { AuthService } from '../auth.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    const clientID = configService.get<string>('APPLE_CLIENT_ID');
    const teamID = configService.get<string>('APPLE_TEAM_ID');
    const keyID = configService.get<string>('APPLE_KEY_ID');
    const privateKey = configService.get<string>('APPLE_PRIVATE_KEY');

    if (!clientID || !teamID || !keyID || !privateKey) {
      throw new Error('Apple credentials are not defined');
    }

    super({
      clientID,
      teamID,
      keyID,
      privateKeyString: privateKey,
      callbackURL: '/auth/apple/callback',
      scope: ['name', 'email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (error: any, user?: any, info?: any) => void,
  ): Promise<any> {
    const { email } = profile;
    const validatedUser = await this.authService.validateOAuthLogin(
      email,
      'apple',
    );
    done(null, validatedUser);
  }
}
