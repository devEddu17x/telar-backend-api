import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const region = configService.get<string>('cognito.region');
    const userPoolId = configService.get<string>('cognito.userPoolId');
    const authority = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${authority}/.well-known/jwks.json`,
      }),

      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      audience: configService.get<string>('cognito.clientId'),
      issuer: authority,
      algorithms: ['RS256'],
    });
  }

  async validate(payload: any) {
    const { sub, email, 'custom:tenant_id': tenantId } = payload;

    if (!sub || !email) {
      throw new UnauthorizedException('Invalid token claims');
    }
    return {
      sub,
      email,
      tenantId: tenantId || null,
    };
  }
}
