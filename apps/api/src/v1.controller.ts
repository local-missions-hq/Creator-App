import { Controller, Get, Inject, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  apiErrorEnvelopeSchema,
  apiPaginationQuerySchema,
  missionTemplatePageSchema,
  v1IndexSchema,
} from '@local-missions/contracts';

import { ApiProblem, dependencyUnavailable, validationProblem } from './api-errors.js';
import { DatabaseService } from './database.service.js';
import { openApiSchema } from './openapi.js';

@ApiTags('v1')
@Controller('v1')
export class V1Controller {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  @ApiOperation({ summary: 'Discover implemented V1 resources' })
  @ApiOkResponse({ schema: openApiSchema(v1IndexSchema) })
  @Get()
  getIndex() {
    return {
      resources: ['me', 'creator-missions', 'business-campaigns', 'mission-templates'] as const,
      version: 'v1' as const,
    };
  }

  @ApiOperation({ summary: 'List mission template versions with stable cursor pagination' })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ maximum: 100, minimum: 1, name: 'limit', required: false, type: Number })
  @ApiOkResponse({ schema: openApiSchema(missionTemplatePageSchema) })
  @ApiBadRequestResponse({ schema: openApiSchema(apiErrorEnvelopeSchema) })
  @ApiServiceUnavailableResponse({ schema: openApiSchema(apiErrorEnvelopeSchema) })
  @Get('mission-templates')
  async listMissionTemplates(@Query() input: unknown) {
    const parsed = apiPaginationQuerySchema.safeParse(input);
    if (!parsed.success) throw validationProblem(parsed.error.issues, 'query');
    try {
      return await this.database.listMissionTemplates(parsed.data.limit, parsed.data.cursor);
    } catch (error) {
      if (error instanceof ApiProblem) throw error;
      throw dependencyUnavailable();
    }
  }
}
