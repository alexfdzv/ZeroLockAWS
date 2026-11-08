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

// Cadena de conexión a la base de datos.
// - Desarrollo local: se define MONGO_URI (por ejemplo, una MongoDB en Docker).
// - AWS: se arma con las llaves del secreto para Amazon DocumentDB, con TLS.
function buildMongoUri() {
    if (process.env.MONGO_URI) {
        return process.env.MONGO_URI;
    }

    const user = encodeURIComponent(required('DOCDB_USER'));
    const password = encodeURIComponent(required('DOCDB_PASSWORD'));
    const host = required('DOCDB_HOST');
    const port = process.env.DOCDB_PORT || '27017';
    const dbName = process.env.DOCDB_NAME || 'ZeroLock';
    const caFile = process.env.DOCDB_CA_FILE || '/opt/zerolock/global-bundle.pem';

    // Parámetros que pide DocumentDB:
    // - tls + tlsCAFile: conexión cifrada validando el certificado de AWS
    // - replicaSet=rs0: el driver detecta la primaria y la réplica, y sigue
    //   funcionando si DocumentDB hace failover
    // - retryWrites=false: DocumentDB no soporta escrituras reintentables
    const params = new URLSearchParams({
        tls: 'true',
        tlsCAFile: caFile,
        replicaSet: 'rs0',
        retryWrites: 'false',
    });

    return `mongodb://${user}:${password}@${host}:${port}/${dbName}?${params.toString()}`;
}

module.exports = {
    port: Number(process.env.PORT) || 3000,
    mongoUri: buildMongoUri(),
    jwtSecret: required('JWT_SECRET'),
};
