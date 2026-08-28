import { Body, Controller, HttpCode, Inject, Post, Req } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  apiErrorEnvelopeSchema,
  sessionBootstrapRequestSchema,
  sessionBootstrapResponseSchema,
  sessionRefreshRequestSchema,
} from '@local-missions/contracts';

import { validationProblem } from './api-errors.js';
import type { ContextualRequest } from './api-context.js';
import { DomainApiService } from './domain-api.service.js';
import { openApiSchema } from './openapi.js';

@ApiTags('session-v1')
@ApiBearerAuth('entra-bearer')
@ApiUnauthorizedResponse({ schema: openApiSchema(apiErrorEnvelopeSchema) })
@ApiForbiddenResponse({ schema: openApiSchema(apiErrorEnvelopeSchema) })
@Controller('v1/session')
export class SessionController {
  constructor(@Inject(DomainApiService) private readonly domain: DomainApiService) {}

  @ApiOperation({ summary: 'Create or idempotently reuse an identity-bound app session' })
  @ApiBody({ schema: openApiSchema(sessionBootstrapRequestSchema) })
  @ApiOkResponse({ schema: openApiSchema(sessionBootstrapResponseSchema) })
  @ApiBadRequestResponse({ schema: openApiSchema(apiErrorEnvelopeSchema) })
  @ApiConflictResponse({ schema: openApiSchema(apiErrorEnvelopeSchema) })
  @HttpCode(200)
  @Post('bootstrap')
  async bootstrap(@Body() input: unknown, @Req() request: ContextualRequest) {
    const body = sessionBootstrapRequestSchema.safeParse(input);
    if (!body.success) throw validationProblem(body.error.issues, 'body');
    return this.domain.bootstrapExternalSession(
      request,
      body.data.sessionPublicId,
      request.apiContext?.correlationId ?? 'request_context_unavailable',
    );
  }

  @ApiOperation({ summary: 'Revalidate an active identity-bound app session and current roles' })
  @ApiBody({ schema: openApiSchema(sessionRefreshRequestSchema) })
  @ApiOkResponse({ schema: openApiSchema(sessionBootstrapResponseSchema) })
  @ApiBadRequestResponse({ schema: openApiSchema(apiErrorEnvelopeSchema) })
  @HttpCode(200)
  @Post('refresh')
  async refresh(@Body() input: unknown, @Req() request: ContextualRequest) {
    const body = sessionRefreshRequestSchema.safeParse(input);
    if (!body.success) throw validationProblem(body.error.issues, 'body');
    return this.domain.refreshExternalSession(request, body.data.sessionPublicId);
  }
}
