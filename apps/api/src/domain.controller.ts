import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  apiErrorEnvelopeSchema,
  apiPaginationQuerySchema,
  authenticatedContextSchema,
  businessReachOptionsSchema,
  businessCampaignDetailSchema,
  businessCampaignPageSchema,
  createMissionApplicationRequestSchema,
  creatorMissionDetailSchema,
  creatorMissionPageSchema,
  creatorReachOverviewSchema,
  idempotencyKeySchema,
  missionApplicationResponseSchema,
  socialPlatformSchema,
} from '@local-missions/contracts';
import { z } from 'zod';

import { ApiProblem, validationProblem } from './api-errors.js';
import type { ContextualRequest } from './api-context.js';
import { DomainApiService } from './domain-api.service.js';
import { openApiSchema } from './openapi.js';

const publicIdParameterSchema = z.string().regex(/^cmp_[a-z0-9_]{8,100}$/);

@ApiTags('authenticated-v1')
@ApiBearerAuth('entra-bearer')
@ApiUnauthorizedResponse({ schema: openApiSchema(apiErrorEnvelopeSchema) })
@ApiForbiddenResponse({ schema: openApiSchema(apiErrorEnvelopeSchema) })
@Controller('v1')
export class DomainController {
  constructor(@Inject(DomainApiService) private readonly domain: DomainApiService) {}

  @ApiOperation({ summary: 'Resolve the current role and workspace context' })
  @ApiOkResponse({ schema: openApiSchema(authenticatedContextSchema) })
  @Get('me')
  async getMe(@Req() request: ContextualRequest) {
    return (await this.domain.authenticate(request)).context;
  }

  @ApiOperation({ summary: 'Read optional per-platform Reach status for the current Creator' })
  @ApiOkResponse({ schema: openApiSchema(creatorReachOverviewSchema) })
  @Get('creator/reach')
  async getCreatorReach(@Req() request: ContextualRequest) {
    const principal = await this.domain.authenticate(request);
    return this.domain.getCreatorReach(principal);
  }

  @ApiOperation({ summary: 'Grant optional read-only Reach analytics consent for one platform' })
  @ApiParam({ name: 'platform', schema: openApiSchema(socialPlatformSchema) })
  @ApiOkResponse({ schema: openApiSchema(creatorReachOverviewSchema) })
  @ApiConflictResponse({ schema: openApiSchema(apiErrorEnvelopeSchema) })
  @HttpCode(200)
  @Post('creator/reach/:platform/consent')
  async grantCreatorReachConsent(
    @Param('platform') platform: string,
    @Req() request: ContextualRequest,
  ) {
    const principal = await this.domain.authenticate(request);
    return this.domain.grantCreatorReachConsent(
      principal,
      this.parseSocialPlatform(platform),
      request.apiContext?.correlationId ?? 'request_context_unavailable',
    );
  }

  @ApiOperation({ summary: 'Revoke optional Reach analytics consent for one platform' })
  @ApiParam({ name: 'platform', schema: openApiSchema(socialPlatformSchema) })
  @ApiOkResponse({ schema: openApiSchema(creatorReachOverviewSchema) })
  @ApiConflictResponse({ schema: openApiSchema(apiErrorEnvelopeSchema) })
  @Delete('creator/reach/:platform/consent')
  async revokeCreatorReachConsent(
    @Param('platform') platform: string,
    @Req() request: ContextualRequest,
  ) {
    const principal = await this.domain.authenticate(request);
    return this.domain.revokeCreatorReachConsent(
      principal,
      this.parseSocialPlatform(platform),
      request.apiContext?.correlationId ?? 'request_context_unavailable',
    );
  }

  @ApiOperation({ summary: 'List published Community missions with available capacity' })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ maximum: 100, minimum: 1, name: 'limit', required: false, type: Number })
  @ApiOkResponse({ schema: openApiSchema(creatorMissionPageSchema) })
  @ApiBadRequestResponse({ schema: openApiSchema(apiErrorEnvelopeSchema) })
  @Get('creator/missions')
  async listCreatorMissions(@Query() input: unknown, @Req() request: ContextualRequest) {
    const query = apiPaginationQuerySchema.safeParse(input);
    if (!query.success) throw validationProblem(query.error.issues, 'query');
    const principal = await this.domain.authenticate(request);
    return this.domain.listCreatorMissions(principal, query.data.limit, query.data.cursor);
  }

  @ApiOperation({ summary: 'Read an available Community mission contract' })
  @ApiParam({ name: 'campaignPublicId', type: String })
  @ApiOkResponse({ schema: openApiSchema(creatorMissionDetailSchema) })
  @ApiNotFoundResponse({ schema: openApiSchema(apiErrorEnvelopeSchema) })
  @Get('creator/missions/:campaignPublicId')
  async getCreatorMission(
    @Param('campaignPublicId') campaignPublicId: string,
    @Req() request: ContextualRequest,
  ) {
    const parsedId = this.parseCampaignId(campaignPublicId);
    const principal = await this.domain.authenticate(request);
    return this.domain.getCreatorMission(principal, parsedId);
  }

  @ApiOperation({ summary: 'Apply once for an available Community Slot' })
  @ApiBody({ schema: openApiSchema(createMissionApplicationRequestSchema) })
  @ApiHeader({ name: 'idempotency-key', required: true })
  @ApiParam({ name: 'campaignPublicId', type: String })
  @ApiCreatedResponse({ schema: openApiSchema(missionApplicationResponseSchema) })
  @ApiBadRequestResponse({ schema: openApiSchema(apiErrorEnvelopeSchema) })
  @ApiConflictResponse({ schema: openApiSchema(apiErrorEnvelopeSchema) })
  @ApiNotFoundResponse({ schema: openApiSchema(apiErrorEnvelopeSchema) })
  @Post('creator/missions/:campaignPublicId/applications')
  async applyForCreatorMission(
    @Body() input: unknown,
    @Param('campaignPublicId') campaignPublicId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: ContextualRequest,
  ) {
    const body = createMissionApplicationRequestSchema.safeParse(input);
    if (!body.success) throw validationProblem(body.error.issues, 'body');
    const key = idempotencyKeySchema.safeParse(idempotencyKey);
    if (!key.success) {
      throw new ApiProblem(
        'IDEMPOTENCY_KEY_REQUIRED',
        'A valid idempotency key is required.',
        400,
        [{ code: 'INVALID_FORMAT', path: 'header.idempotency-key' }],
      );
    }
    const principal = await this.domain.authenticate(request);
    return this.domain.applyForMission({
      campaignPublicId: this.parseCampaignId(campaignPublicId),
      correlationId: request.apiContext?.correlationId ?? 'request_context_unavailable',
      idempotencyKey: key.data,
      principal,
      publicId: body.data.publicId,
    });
  }

  @ApiOperation({ summary: 'List campaigns in the active Business workspace' })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ maximum: 100, minimum: 1, name: 'limit', required: false, type: Number })
  @ApiOkResponse({ schema: openApiSchema(businessCampaignPageSchema) })
  @ApiBadRequestResponse({ schema: openApiSchema(apiErrorEnvelopeSchema) })
  @Get('business/campaigns')
  async listBusinessCampaigns(@Query() input: unknown, @Req() request: ContextualRequest) {
    const query = apiPaginationQuerySchema.safeParse(input);
    if (!query.success) throw validationProblem(query.error.issues, 'query');
    const principal = await this.domain.authenticate(request);
    return this.domain.listBusinessCampaigns(principal, query.data.limit, query.data.cursor);
  }

  @ApiOperation({ summary: 'Read a campaign in the active Business workspace' })
  @ApiParam({ name: 'campaignPublicId', type: String })
  @ApiOkResponse({ schema: openApiSchema(businessCampaignDetailSchema) })
  @ApiNotFoundResponse({ schema: openApiSchema(apiErrorEnvelopeSchema) })
  @Get('business/campaigns/:campaignPublicId')
  async getBusinessCampaign(
    @Param('campaignPublicId') campaignPublicId: string,
    @Req() request: ContextualRequest,
  ) {
    const principal = await this.domain.authenticate(request);
    return this.domain.getBusinessCampaign(principal, this.parseCampaignId(campaignPublicId));
  }

  @ApiOperation({ summary: 'Read fixed Reach packages and per-platform availability' })
  @ApiOkResponse({ schema: openApiSchema(businessReachOptionsSchema) })
  @Get('business/reach-options')
  async getBusinessReachOptions(@Req() request: ContextualRequest) {
    const principal = await this.domain.authenticate(request);
    return this.domain.getBusinessReachOptions(principal);
  }

  private parseCampaignId(value: string): string {
    const parsed = publicIdParameterSchema.safeParse(value);
    if (!parsed.success) throw validationProblem(parsed.error.issues, 'path.campaignPublicId');
    return parsed.data;
  }

  private parseSocialPlatform(value: string) {
    const parsed = socialPlatformSchema.safeParse(value);
    if (!parsed.success) throw validationProblem(parsed.error.issues, 'path.platform');
    return parsed.data;
  }
}
