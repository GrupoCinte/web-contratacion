import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import WSServer from './websocketServer.js';
import StreamPoller from './streamPoller.js';

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

app.use('/api/auth', authRoutes);

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
app.get('/api/monitor', async (req, res) => {
    try {
        const tableName = process.env.DYNAMODB_TABLE_NAME || 'n8n_monitoring';
        // Use Scan to get all users since we want to see the state of everyone
        // (GSI is on email, so we can't query by status without a status index)
        const command = new ScanCommand({
            TableName: tableName
        });

        const response = await docClient.send(command);

        // Format the response to adapt to the frontend dashboard
        // Log the first item to debug fields
        if (response.Items.length > 0) {
            console.log('Sample format from DynamoDB:', response.Items[0]);
        }

        // Format the response to adapt to the frontend dashboard
        const executions = response.Items.map(item => {
            // Logic to find the best name available
            let displayName = 'Sin Nombre';

            // Check for 'nombre y apellido' (with spaces, as seen in logs) or with underscores
            if (item['nombre y apellido']) {
                displayName = item['nombre y apellido'];
            } else if (item.nombre_y_apellido) {
                displayName = item.nombre_y_apellido;
            } else if (item.nombre && item.apellido) {
                displayName = `${item.nombre} ${item.apellido}`;
            } else if (item.nombre) {
                displayName = item.nombre;
            }

            // Check for status or statuses
            const currentStatus = item.status || item.statuses || 'Desconocido';

            return {
                executionId: item.whatsapp_number,  // Use whatsapp_number as unique ID
                workflowName: displayName, // Map Name to Workflow Name
                currentNodeName: currentStatus, // Map Status to Node Name
                status: 'running', // Keep 'running' to show as active in frontend
                timestamp: Date.now(), // Fallback timestamp 
                // Extra fields for updated frontend
                email: item.email,
                puesto: item.puesto,
                realStatus: currentStatus,
                fullData: item // Include all raw data for the details view
            };
        });

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
app.get('/api/users-by-email', async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email parameter is required'
            });
        }

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
            ProjectionExpression: 'whatsapp_number, nombre_y_apellido, email, cedula, edad, puesto, #db, #st',
            ExpressionAttributeNames: {
                '#db': 'database',
                '#st': 'status'
            }
        });

        const response = await docClient.send(command);

        res.json({
            success: true,
            count: response.Items.length,
            users: response.Items
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

            await streamPoller.start();
            console.log('🌊 DynamoDB Stream Poller initialized and started.');
        } catch (e) {
            console.error('⚠️ Failed to initialize DynamoDB Stream Poller:', e.message);
        }
    } else {
        console.warn('⚠️ WebSocket Server not initialized, skipping Stream Poller initialization.');
    }
});
