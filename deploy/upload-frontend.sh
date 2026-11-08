#!/bin/bash
# Sube el frontend de ZeroLock al bucket de S3 que sirve CloudFront.
# Se ejecuta en AWS CloudShell desde la raíz del repositorio:
#   bash deploy/upload-frontend.sh <ID_DE_LA_DISTRIBUCION_DE_CLOUDFRONT>
# Estructura en el bucket: vistas (.html) en la raíz, y las carpetas
# Assets y Controllers a un lado (igual que en desarrollo local).
set -euo pipefail

BUCKET="zerolockcloud-frontend"
DISTRIBUTION_ID="${1:-}"

aws s3 sync Frontend/Views       "s3://$BUCKET/"            --delete --exclude "Assets/*" --exclude "Controllers/*"
aws s3 sync Frontend/Assets      "s3://$BUCKET/Assets/"      --delete
aws s3 sync Frontend/Controllers "s3://$BUCKET/Controllers/" --delete

# Borra la caché de CloudFront para que se vean los archivos nuevos
if [ -n "$DISTRIBUTION_ID" ]; then
  aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/*"
fi
