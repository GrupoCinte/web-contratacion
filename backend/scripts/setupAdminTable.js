import { DynamoDBClient, CreateTableCommand, DescribeTableCommand, waitUntilTableExists } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const TABLE_NAME = process.env.ADMIN_TABLE_NAME || 'app_users';

const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const docClient = DynamoDBDocumentClient.from(client);

function ask(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(question, answer => { rl.close(); resolve(answer.trim()); }));
}

async function tableExists() {
    try {
        await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
        return true;
    } catch (e) {
        if (e.name === 'ResourceNotFoundException') return false;
        throw e;
    }
}

async function createTable() {
    console.log(`\nCreando tabla "${TABLE_NAME}" en DynamoDB...`);

    await client.send(new CreateTableCommand({
        TableName: TABLE_NAME,
        KeySchema: [
            { AttributeName: 'email', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'email', AttributeType: 'S' }
        ],
        BillingMode: 'PAY_PER_REQUEST'
    }));

    await waitUntilTableExists({ client, maxWaitTime: 60 }, { TableName: TABLE_NAME });
    console.log(`Tabla "${TABLE_NAME}" creada exitosamente.`);
}

async function seedAdmin(email, password, nombre) {
    const hashedPassword = await bcrypt.hash(password, 12);

    await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: {
            email,
            password: hashedPassword,
            nombre,
            role: 'ADMIN',
            createdAt: new Date().toISOString()
        },
        ConditionExpression: 'attribute_not_exists(email)'
    }));

    console.log(`Admin "${nombre}" (${email}) creado con rol ADMIN.`);
}

async function main() {
    console.log('===========================================');
    console.log('  Setup de tabla de administradores');
    console.log('===========================================\n');

    const exists = await tableExists();
    if (exists) {
        console.log(`La tabla "${TABLE_NAME}" ya existe.`);
    } else {
        await createTable();
    }

    console.log('\n--- Crear usuario administrador ---\n');
    const email = await ask('Email del admin: ');
    const nombre = await ask('Nombre completo: ');
    const password = await ask('Contraseña (min 8 caracteres): ');

    if (password.length < 8) {
        console.error('Error: La contraseña debe tener al menos 8 caracteres.');
        process.exit(1);
    }

    try {
        await seedAdmin(email, password, nombre);
        console.log('\n--- Setup completado exitosamente ---');
        console.log(`Tabla: ${TABLE_NAME}`);
        console.log(`Admin: ${email} (ADMIN)`);
        console.log('Contraseña almacenada como hash bcrypt.\n');
    } catch (e) {
        if (e.name === 'ConditionalCheckFailedException') {
            console.log(`\nEl usuario "${email}" ya existe en la tabla.`);
        } else {
            throw e;
        }
    }

    process.exit(0);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
