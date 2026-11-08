# ZeroLockAWS

Versión de ZeroLock (gestor de contraseñas con cifrado del lado del cliente) adaptada para desplegarse en AWS: CloudFront + S3 para el frontend, Application Load Balancer + EC2 Auto Scaling para el backend, Amazon DocumentDB como base de datos y AWS Secrets Manager para las credenciales.

## Estructura

- `Backend/`: API en Node.js + Express. Todas las rutas están bajo `/api`; `GET /health` es el health check del ALB.
- `Frontend/`: archivos estáticos que se suben al bucket `zerolockcloud-frontend`.
- `deploy/user-data.sh`: script de arranque de las EC2 (se pega en el Launch Template).
- `deploy/upload-frontend.sh`: sube el frontend al bucket y limpia la caché de CloudFront.

## Variables de entorno del backend

En AWS las genera `deploy/user-data.sh` a partir del secreto `zerolockcloud/app`.

- `DOCDB_USER`, `DOCDB_PASSWORD`, `DOCDB_HOST`: credenciales y endpoint del clúster de DocumentDB.
- `JWT_SECRET`: llave para firmar los tokens de sesión.
- `S3_BUCKET`: bucket de imágenes (`zerolockcloud-images`). Si no se define, se usa la carpeta `Backend/local-storage`.
- `AWS_REGION`: región (por defecto `us-east-2`).
- `DOCDB_CA_FILE`: certificado de AWS para TLS (por defecto `/opt/zerolock/global-bundle.pem`).
- `PORT`: puerto de Express (por defecto 3000).

## Desarrollo local

Con una MongoDB local (por ejemplo `docker run -d -p 27017:27017 mongo:7`):

```bash
cd Backend
npm install
MONGO_URI="mongodb://localhost:27017/ZeroLock" JWT_SECRET="cualquier-valor" npm start
```

Después abrir http://localhost:3000/Login.html
