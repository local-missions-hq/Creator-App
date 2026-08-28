import { Body, Controller, Inject, Post, Req } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  apiErrorEnvelopeSchema,
  localProviderProofRequestSchema,
  localProviderProofResponseSchema,
} from '@local-missions/contracts';

import { validationProblem } from '../api-errors.js';
import type { ContextualRequest } from '../api-context.js';
import { DomainApiService } from '../domain-api.service.js';
import { openApiSchema } from '../openapi.js';
import { LocalProviderProofService } from './provider-proof.service.js';

@ApiTags('local-only')
@ApiBearerAuth('entra-bearer')
@ApiUnauthorizedResponse({ schema: openApiSchema(apiErrorEnvelopeSchema) })
@Controller('v1/dev')
export class ProviderProofController {
  constructor(
    @Inject(DomainApiService) private readonly domain: DomainApiService,
    @Inject(LocalProviderProofService) private readonly proofs: LocalProviderProofService,
  ) {}

  @ApiOperation({ summary: 'Issue a synthetic local-only provider-control proof' })
  @ApiBody({ schema: openApiSchema(localProviderProofRequestSchema) })
  @ApiCreatedResponse({ schema: openApiSchema(localProviderProofResponseSchema) })
  @ApiBadRequestResponse({ schema: openApiSchema(apiErrorEnvelopeSchema) })
  @Post('provider-proof')
  async createProviderProof(@Body() input: unknown, @Req() request: ContextualRequest) {
    const parsed = localProviderProofRequestSchema.safeParse(input);
    if (!parsed.success) throw validationProblem(parsed.error.issues, 'body');
    const principal = await this.domain.authenticate(request);
    return this.proofs.issue(principal.context.userPublicId, parsed.data.provider);
  }
}
