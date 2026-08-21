import { Injectable, Logger } from "@nestjs/common";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomBytes } from "crypto";
import { extname } from "path";

@Injectable()
export class R2StorageService{
    private readonly logger = new Logger(R2StorageService.name)
    private client: S3Client
    private readonly accountId = process.env.R2_ACCOUNT_ID
    private readonly accessKeyId = process.env.R2_ACCESS_KEY_ID
    private readonly secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
    private readonly publicUrl = process.env.R2_PUBLIC_URL
    private readonly devUrl = process.env.R2_DEV_URL
    private readonly bucketName = process.env.R2_BUCKET_NAME

    constructor() {
        if (!this.accountId || !this.accessKeyId || !this.secretAccessKey || !this.publicUrl || !this.bucketName) {
         throw new Error('R2 credentials are not configured.');
        }

        this.client = new S3Client({
            region:'auto',
            endpoint:this.devUrl,
            credentials:{
                accessKeyId:this.accessKeyId,
                secretAccessKey:this.secretAccessKey
            }
        })
    }

    async setImage(image:Express.Multer.File, dir:string){
        const randomName = randomBytes(16).toString('hex')
        const fileName = `${randomName}${extname(image.originalname)}`
        const key = `${dir}/${fileName}`
        await this.uploadBuffer(image.buffer, key, image.mimetype)
        return key
    }

    async deleteObject(key:string){
        try {
            await this.client.send(
                new DeleteObjectCommand({
                    Bucket:this.bucketName,
                    Key:key
                })
            )
            this.logger.log(`Deleted ${key} from R2 successfully`)
        } catch (error) {
            this.logger.error(`Failed to delete ${key} from R2`, error)
            throw error
        }
    }

    private async uploadBuffer(buffer: Buffer, key:string, contentType:string): Promise<string> {
        try {
            await this.client.send(
                new PutObjectCommand({
                    Bucket: this.bucketName,
                    Key:key,
                    Body:buffer,
                    ContentType:contentType,
                    CacheControl:'public, max-age=31536000, immutable'
                })
            )
            this.logger.log(`Uploaded ${key} to R2 successfully`)
            return key
        } catch (error) {
            this.logger.log(`Failed to upload ${key} to R2: ${error}`)
            throw error
        }
    }

    getPublicUrl(key: string): string {
        const publicUrl = process.env.R2_PUBLIC_URL!.replace(/\/$/, '');
        return `${publicUrl}/${key}`;
    }
}