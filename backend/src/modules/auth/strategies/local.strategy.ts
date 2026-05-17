import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { User } from '../../users/user.entity';

import { Request } from 'express';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly auth: AuthService) {
    // passport-local expects 'username' by default; we rename to 'identifier'.
    super({ usernameField: 'identifier', passReqToCallback: true });
  }

  async validate(req: Request, identifier: string, password: string): Promise<User> {
    const tenantSlug = req.body.tenantSlug;
    const user = await this.auth.validateUser(identifier, password, tenantSlug);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials or tenant not found.');
    }
    return user;
  }
}
