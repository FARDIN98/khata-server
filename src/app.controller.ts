import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Returns a static greeting string. Use this endpoint as a cheap, dependency-free liveness probe for container orchestrators (Railway, Render, Kubernetes). Does not touch the database.',
  })
  @ApiOkResponse({ description: 'Server is up. Returns a plain greeting string.' })
  getHello(): string {
    return this.appService.getHello();
  }
}
