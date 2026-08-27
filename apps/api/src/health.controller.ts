import { Controller, Get, Inject } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  apiErrorEnvelopeSchema,
  buildInfoSchema,
  healthStatusSchema,
  livenessStatusSchema,
  readinessStatusSchema,
} from '@local-missions/contracts';

import { dependencyUnavailable } from './api-errors.js';
import { DatabaseService } from './database.service.js';
import {
  buildInformation,
  buildLegacyHealthStatus,
  buildLivenessStatus,
  buildReadinessStatus,
} from './health.js';
import { openApiSchema } from './openapi.js';

@ApiTags('operations')
@Controller()
export class HealthController {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  @ApiOperation({ deprecated: true, summary: 'Compatibility health response' })
  @ApiOkResponse({ schema: openApiSchema(healthStatusSchema) })
  @Get('health')
  getLegacyHealth() {
    return buildLegacyHealthStatus();
  }

  @ApiOperation({ summary: 'Process liveness; never checks dependencies' })
  @ApiOkResponse({ schema: openApiSchema(livenessStatusSchema) })
  @Get('health/live')
  getLiveness() {
    return buildLivenessStatus();
  }

  @ApiOperation({ summary: 'Readiness including PostgreSQL connectivity' })
  @ApiOkResponse({ schema: openApiSchema(readinessStatusSchema) })
  @ApiServiceUnavailableResponse({ schema: openApiSchema(apiErrorEnvelopeSchema) })
  @Get('health/ready')
  async getReadiness() {
    if (!(await this.database.isReady())) throw dependencyUnavailable();
    return buildReadinessStatus();
  }

  @ApiOperation({ summary: 'Non-secret build provenance' })
  @ApiOkResponse({ schema: openApiSchema(buildInfoSchema) })
  @Get('build-info')
  getBuildInfo() {
    return buildInformation();
  }
}
