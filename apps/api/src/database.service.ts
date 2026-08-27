import { Buffer } from 'node:buffer';

import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import {
  missionTemplateCodeSchema,
  type MissionTemplatePage,
  type MissionTemplateSummary,
} from '@local-missions/contracts';
import { Pool } from 'pg';
import { z } from 'zod';

import { validationProblem } from './api-errors.js';

const cursorPayloadSchema = z.object({
  code: missionTemplateCodeSchema,
  version: z.int().positive(),
  v: z.literal(1),
});

type MissionTemplateRow = {
  code: MissionTemplateSummary['code'];
  name: string;
  version: number;
};

function encodeCursor(row: MissionTemplateRow): string {
  return Buffer.from(
    JSON.stringify({ code: row.code, v: 1, version: row.version }),
    'utf8',
  ).toString('base64url');
}

function decodeCursor(value: string | undefined) {
  if (!value) return undefined;
  try {
    return cursorPayloadSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')));
  } catch {
    throw validationProblem(
      [{ code: 'custom', message: 'Invalid cursor.', path: ['cursor'] }],
      'query',
    );
  }
}

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool | undefined;

  constructor() {
    const connectionString = process.env.DATABASE_URL?.trim();
    this.pool = connectionString
      ? new Pool({ connectionString, connectionTimeoutMillis: 1_000, max: 5 })
      : undefined;
  }

  async isReady(): Promise<boolean> {
    if (!this.pool) return false;
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async listMissionTemplates(limit: number, cursorValue?: string): Promise<MissionTemplatePage> {
    if (!this.pool) throw new Error('Database connection is not configured.');
    const cursor = decodeCursor(cursorValue);
    const result = await this.pool.query<MissionTemplateRow>(
      `SELECT code::text AS code, version, name
         FROM mission_templates
        WHERE ($1::text IS NULL)
           OR (code::text > $1::text)
           OR (code::text = $1::text AND version > $2::integer)
        ORDER BY code::text ASC, version ASC
        LIMIT $3`,
      [cursor?.code ?? null, cursor?.version ?? 0, limit + 1],
    );
    const hasMore = result.rows.length > limit;
    const data = result.rows.slice(0, limit).map((row) => ({
      code: missionTemplateCodeSchema.parse(row.code),
      name: row.name,
      version: row.version,
    }));
    const last = data.at(-1);

    return {
      data,
      page: {
        hasMore,
        limit,
        nextCursor: hasMore && last ? encodeCursor(last) : null,
      },
    };
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
  }
}
