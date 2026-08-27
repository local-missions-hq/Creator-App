import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { OpenApiDocumentStore } from './openapi.js';

@ApiTags('operations')
@Controller()
export class OpenApiController {
  constructor(@Inject(OpenApiDocumentStore) private readonly documents: OpenApiDocumentStore) {}

  @ApiOperation({ summary: 'OpenAPI 3 contract for the running API surface' })
  @ApiOkResponse({ schema: { additionalProperties: true, type: 'object' } })
  @Get('openapi.json')
  getDocument() {
    return this.documents.get();
  }
}
