import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import WSServer from './websocketServer.js';
import StreamPoller from './streamPoller.js';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import { requireAuth, requireRole } from './middleware/auth.js';
import { validate, validateQuery } from './middleware/validate.js';
import { forgotPasswordSchema, requestAccessSchema, emailQuerySchema } from './schemas/auth.js';
import { mapDynamoItemToExecution } from './utils/mappers.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Configure CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Demasiados intentos. Intente de nuevo en 15 minutos.' }
});

const publicLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Demasiadas solicitudes. Intente más tarde.' }
});

app.use('/api/login', authLimiter);
app.use('/api/forgot-password', publicLimiter);
app.use('/api/request-access', publicLimiter);

app.use('/api', authRoutes);

// Initialize DynamoDB Client
const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

// Create Document Client for simplified operations
const docClient = DynamoDBDocumentClient.from(client);

// API Endpoint: Get running executions
app.get('/api/monitor', requireAuth, requireRole('ADMIN'), async (req, res) => {
    try {
        const tableName = process.env.DYNAMODB_TABLE_NAME || 'n8n_monitoring';
        // Use Scan to get all users since we want to see the state of everyone
        // (GSI is on email, so we can't query by status without a status index)
        const command = new ScanCommand({
            TableName: tableName
        });

        const response = await docClient.send(command);

        // Format the response to adapt to the frontend dashboard
        const executions = response.Items.map(mapDynamoItemToExecution);

        res.json({
            success: true,
            count: executions.length,
            executions
        });

    } catch (error) {
        console.error('Error scanning DynamoDB:', error);

        res.status(500).json({
            success: false,
            error: 'Failed to fetch monitoring data',
            message: error.message
        });
    }
});

// API Endpoint: Get user by email (excluding status field)
app.get('/api/users-by-email', requireAuth, requireRole('ADMIN'), validateQuery(emailQuerySchema), async (req, res) => {
    try {
        const { email } = req.query;

        const tableName = process.env.DYNAMODB_TABLE_NAME || 'n8n_table_state_users';
        const gsiName = process.env.DYNAMODB_GSI_NAME || 'email'; // GSI name

        // Query using email GSI
        const command = new QueryCommand({
            TableName: tableName,
            IndexName: gsiName,
            KeyConditionExpression: 'email = :emailValue',
            ExpressionAttributeValues: {
                ':emailValue': email
            },
            // Specify all fields including 'status'
            ProjectionExpression: 'nombre_y_apellido, email, edad, puesto, #st',
            ExpressionAttributeNames: {
                '#st': 'status'
            }
        });

        const response = await docClient.send(command);

        const safeUsers = response.Items.map(user => ({
            email: user.email,
            nombre_y_apellido: user.nombre_y_apellido,
            puesto: user.puesto,
            status: user.status,
            edad: user.edad
        }));

        res.json({
            success: true,
            count: safeUsers.length,
            users: safeUsers
        });

    } catch (error) {
        console.error('Error querying DynamoDB:', error);

        res.status(500).json({
            success: false,
            error: 'Failed to fetch user data',
            message: error.message
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

app.post('/api/forgot-password', validate(forgotPasswordSchema), (req, res) => {
    res.json({ success: true, message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña' });
});

app.post('/api/request-access', validate(requestAccessSchema), (req, res) => {
    res.json({ success: true, message: 'Solicitud enviada correctamente. Te contactaremos a la brevedad.' });
});

// Start server
const server = app.listen(PORT, async () => {
    console.log(`🚀 n8n Monitor Backend running on port ${PORT}`);
    console.log(`📊 DynamoDB Table: ${process.env.DYNAMODB_TABLE_NAME || 'n8n_table_state_users'}`);
    console.log(`🔍 GSI Name: ${process.env.DYNAMODB_GSI_NAME || 'email'}`);
    console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);

    // Initialize WebSocket Server
    let wsServer;
    try {
        wsServer = new WSServer(server);
        console.log('📡 WebSocket Server initialized.');
    } catch (e) {
        console.error('⚠️ Failed to initialize WebSocket Server:', e.message);
    }

    // Initialize Stream Poller
    let streamPollerInstance = null;
    if (wsServer) {
        try {
            const tableName = process.env.DYNAMODB_TABLE_NAME || 'n8n_table_state_users';
            const region = process.env.AWS_REGION || 'us-east-1';
            const credentials = {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            };

            const streamPoller = new StreamPoller(tableName, region, credentials, (data) => {
                wsServer.broadcast(data);
            });
            streamPollerInstance = streamPoller;

            await streamPoller.start();
            console.log('🌊 DynamoDB Stream Poller initialized and started.');
        } catch (e) {
            console.error('⚠️ Failed to initialize DynamoDB Stream Poller:', e.message);
        }
    } else {
        console.warn('⚠️ WebSocket Server not initialized, skipping Stream Poller initialization.');
    }

    // Graceful Shutdown
    const gracefulShutdown = () => {
        console.log('🛑 Shutting down gracefully...');
        if (streamPollerInstance) {
            streamPollerInstance.stop();
        }
        server.close(() => {
            console.log('HTTP server closed.');
            process.exit(0);
        });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
});
