import { Module } from '@nestjs/common';

import { AppModule } from '../app.module.js';
import { DevTokenController } from './dev-token.controller.js';
import { LocalDevTokenService } from './dev-token.service.js';

@Module({
  controllers: [DevTokenController],
  imports: [AppModule],
  providers: [LocalDevTokenService],
})
export class LocalAppModule {}
