#!/bin/bash
# Script de arranque (user data) para las instancias EC2 de ZeroLock.
# Se pega en el Launch Template. Cada instancia que crea el Auto Scaling:
#   1. Instala Node.js 24 y Git
#   2. Descarga el código de ZeroLockAWS e instala dependencias
#   3. Descarga el certificado de AWS para conectarse a DocumentDB con TLS
#   4. Crea un servicio de systemd que, al iniciar, lee el secreto de
#      Secrets Manager con el rol IAM de la instancia y arranca la app
set -euxo pipefail

# ===== Configuración =====
REGION="us-east-2"
SECRET_ID="zerolockcloud/app"
IMAGES_BUCKET="zerolockcloud-images"
REPO_URL="https://github.com/alexfdzv/ZeroLockAWS.git"
APP_DIR="/opt/zerolock"

# ===== 1. Paquetes =====
dnf install -y git jq
curl -fsSL https://rpm.nodesource.com/setup_24.x | bash -
dnf install -y nodejs

# ===== 2. Código y dependencias =====
useradd --system --home-dir "$APP_DIR" --shell /sbin/nologin zerolock || true
mkdir -p "$APP_DIR"
git clone --depth 1 "$REPO_URL" "$APP_DIR/app"
cd "$APP_DIR/app/Backend"
npm ci --omit=dev

# ===== 3. Certificado de AWS para DocumentDB (TLS) =====
curl -fsSL -o "$APP_DIR/global-bundle.pem" \
  https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

# ===== 4. Script que lee el secreto y genera las variables de entorno =====
cat > "$APP_DIR/load-secrets.sh" <<EOF
#!/bin/bash
set -euo pipefail
aws secretsmanager get-secret-value \
  --region "$REGION" --secret-id "$SECRET_ID" \
  --query SecretString --output text \
  | jq -r 'to_entries[] | "\(.key)=\(.value)"' > "$APP_DIR/app.env"
cat >> "$APP_DIR/app.env" <<VARS
PORT=3000
AWS_REGION=$REGION
S3_BUCKET=$IMAGES_BUCKET
DOCDB_CA_FILE=$APP_DIR/global-bundle.pem
VARS
chown root:zerolock "$APP_DIR/app.env"
chmod 640 "$APP_DIR/app.env"
EOF
chmod 700 "$APP_DIR/load-secrets.sh"
chown -R zerolock:zerolock "$APP_DIR/app"
chmod 644 "$APP_DIR/global-bundle.pem"

# ===== 5. Servicio de systemd =====
cat > /etc/systemd/system/zerolock.service <<EOF
[Unit]
Description=ZeroLock backend (Node.js)
After=network-online.target
Wants=network-online.target

[Service]
User=zerolock
WorkingDirectory=$APP_DIR/app/Backend
ExecStartPre=+$APP_DIR/load-secrets.sh
EnvironmentFile=$APP_DIR/app.env
ExecStart=/usr/bin/node Server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now zerolock
