import { Body, Controller, Inject, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  apiErrorEnvelopeSchema,
  localDevTokenRequestSchema,
  localDevTokenResponseSchema,
} from '@local-missions/contracts';

import { validationProblem } from '../api-errors.js';
import { openApiSchema } from '../openapi.js';
import { LocalDevTokenService } from './dev-token.service.js';

@ApiTags('local-only')
@Controller('v1/dev')
export class DevTokenController {
  constructor(@Inject(LocalDevTokenService) private readonly tokens: LocalDevTokenService) {}

  @ApiOperation({ summary: 'Issue a short-lived token for synthetic local identities only' })
  @ApiBody({ schema: openApiSchema(localDevTokenRequestSchema) })
  @ApiCreatedResponse({ schema: openApiSchema(localDevTokenResponseSchema) })
  @ApiBadRequestResponse({ schema: openApiSchema(apiErrorEnvelopeSchema) })
  @Post('token')
  createToken(@Body() input: unknown) {
    const parsed = localDevTokenRequestSchema.safeParse(input);
    if (!parsed.success) throw validationProblem(parsed.error.issues, 'body');
    return this.tokens.issue(parsed.data);
  }
}
