// Almacenamiento de archivos (imágenes de esteganografía y fotos de perfil).
// - AWS: se guardan en el bucket de S3 indicado en S3_BUCKET. La instancia EC2
//   obtiene permisos con su rol IAM, así que no hay credenciales en el código.
// - Desarrollo local: si no se define S3_BUCKET, se guardan en Backend/local-storage.
const fs = require('fs/promises');
const path = require('path');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const bucket = process.env.S3_BUCKET;
const region = process.env.AWS_REGION || 'us-east-2';
const localDir = path.join(__dirname, 'local-storage');

const s3 = bucket ? new S3Client({ region }) : null;

async function saveFile(key, buffer, contentType) {
    if (s3) {
        await s3.send(new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: contentType || 'application/octet-stream',
        }));
        return;
    }
    const filePath = path.join(localDir, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
}

async function readFile(key) {
    if (s3) {
        const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        const bytes = await result.Body.transformToByteArray();
        return { buffer: Buffer.from(bytes), contentType: result.ContentType };
    }
    const buffer = await fs.readFile(path.join(localDir, key));
    return { buffer, contentType: undefined };
}

async function deleteFile(key) {
    if (s3) {
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
        return;
    }
    await fs.rm(path.join(localDir, key), { force: true });
}

module.exports = { saveFile, readFile, deleteFile };
