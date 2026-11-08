// Configuración de ZeroLock leída desde variables de entorno.
// En AWS, el script de arranque de la EC2 obtiene estos valores del secreto
// "zerolockcloud/app" de Secrets Manager (usando el rol IAM de la instancia).
// En local se pueden definir en la terminal o en un archivo .env (no se sube a Git).

function required(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Falta la variable de entorno ${name}`);
    }
    return value;
}

module.exports = {
    port: Number(process.env.PORT) || 3000,
    mongoUri: required('MONGO_URI'),
    jwtSecret: required('JWT_SECRET'),
};
