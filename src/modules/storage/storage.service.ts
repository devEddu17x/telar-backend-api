import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { FilePlan } from './interfaces/file-plan.interface';
import { PresignedPut } from './interfaces/presigned-url.interface';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { maskEmail } from 'src/utils/mask-email.util';

type PresignedPutOptions = { ttlSeconds?: number; cacheControl?: string };
type ActorContext = { sub?: string; email?: string; tenantId?: string };

@Injectable()
export class StorageService {
  private s3: S3Client;
  private bucket: string;
  private url: string;
  constructor(
    private readonly configService: ConfigService,
    private readonly logger?: PinoLogger,
  ) {
    this.logger?.setContext(StorageService.name);
    const storage = this.configService.get('storage');
    this.s3 = new S3Client(storage.config);
    this.bucket = storage.bucket;
    this.url = storage.publicUrl;
  }

  buildTempKey(tenantId: string, prendaId: string, filename: string) {
    const ext = filename.includes('.') ? filename.split('.').pop() : 'bin';
    const uuid = randomUUID();
    return `tenant-id-${tenantId}/clothe-id-${prendaId}/image-id-${uuid}.${ext}`;
  }
  async createPresignedPuts(
    prendaId: string,
    files: FilePlan[],
    tenantId: string,
    arg4?: PresignedPutOptions | ActorContext,
    arg5?: PresignedPutOptions,
  ): Promise<PresignedPut[]> {
    if (!files || files.length === 0) {
      return [];
    }
    const isOptions =
      !!arg4 && ('ttlSeconds' in arg4 || 'cacheControl' in arg4);
    const opts = (isOptions ? arg4 : arg5) ?? {};
    const actor = isOptions ? undefined : (arg4 as ActorContext | undefined);
    const ttl = opts?.ttlSeconds ?? 600; // 10 min
    const cacheControl = opts?.cacheControl ?? 'no-cache';

    const results: PresignedPut[] = [];
    for (const f of files) {
      const key = this.buildTempKey(tenantId, prendaId, f.filename);

      const cmd = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: f.contentType,
        CacheControl: cacheControl,
      });

      const putUrl = await getSignedUrl(this.s3, cmd, { expiresIn: ttl });
      const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

      results.push({
        key,
        putUrl,
        expiresAt,
        requiredHeaders: {
          'Content-Type': f.contentType,
        },
      });
    }

    this.logger?.info(
      {
        tenantId,
        clothesId: prendaId,
        fileCount: results.length,
        actorSub: actor?.sub,
        actorEmail: actor?.email ? maskEmail(actor.email) : undefined,
      },
      'Generated presigned upload URLs for clothes images',
    );

    return results;
  }

  getImagesUrl(keys: string[]): string[] {
    return keys.map((key) => `${this.url}/${key}`);
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.s3.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch {
      return false;
    }
  }

  extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const key = urlObj.pathname.substring(1);
      return key;
    } catch {
      return null;
    }
  }

  async deleteObject(key: string): Promise<boolean> {
    try {
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      this.logger?.info({ key }, 'Deleted object from storage');
      return true;
    } catch (error) {
      this.logger?.error({ err: error, key }, 'Error deleting object from S3');
      return false;
    }
  }
}
