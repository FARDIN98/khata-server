import { Body, Controller, Get, Post, HttpCode, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';

@ApiTags('auth')
@Throttle({ auth: { limit: 5, ttl: 60_000 } })
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new Grahok or Dokandar',
    description:
      'Creates a new user account. When `role` is `DOKANDAR`, a `dokan` payload is required and the shop is provisioned in the same transaction. Returns a JWT token plus the new user view. Rate-limited to 5 attempts per minute per IP.',
  })
  @ApiResponse({
    status: 201,
    description: 'User (and Dokan, if DOKANDAR) created. Returns `{ token, user }`.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed, or role is DOKANDAR but no `dokan` payload was supplied.',
  })
  @ApiResponse({
    status: 409,
    description: 'A user with this email address already exists.',
  })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Log in with email and password',
    description:
      'Exchanges email + password for a signed JWT. The JWT encodes the user id, email, and role and is required on all protected endpoints as `Authorization: Bearer <token>`. Rate-limited to 5 attempts per minute per IP.',
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication succeeded. Returns `{ token, user }`.',
  })
  @ApiResponse({
    status: 400,
    description: 'Request body failed validation.',
  })
  @ApiResponse({
    status: 401,
    description: 'Email not found or password did not match.',
  })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('me')
  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Get the currently authenticated user',
    description:
      'Returns the user view (id, email, name, role, dokan summary) for the caller of the supplied JWT. Used by the web client on page load to hydrate the session without a second round-trip.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user view.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing, expired, or invalid JWT.',
  })
  me(@CurrentUser() user: User) {
    return this.auth.toUserView(user);
  }
}
