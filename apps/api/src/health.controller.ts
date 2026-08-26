import { Controller, Get } from '@nestjs/common';

import { buildHealthStatus } from './health.js';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return buildHealthStatus();
  }
}
