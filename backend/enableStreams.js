
import { DynamoDBClient, UpdateTableCommand } from '@aws-sdk/client-dynamodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const enableStreams = async () => {
    const tableName = process.env.DYNAMODB_TABLE_NAME || 'n8n_table_state_users';
    console.log(`Enabling streams for table: ${tableName}`);

    try {
        const command = new UpdateTableCommand({
            TableName: tableName,
            StreamSpecification: {
                StreamEnabled: true,
                StreamViewType: 'NEW_AND_OLD_IMAGES'
            }
        });

        const response = await client.send(command);
        console.log('Success! Streams are being enabled.');
        console.log('StreamArn:', response.TableDescription.LatestStreamArn);
        console.log('Status:', response.TableDescription.TableStatus);
    } catch (error) {
        if (error.name === 'ResourceInUseException') {
            console.log('Streams might already be enabling or table is in use.');
        } else {
            console.error('Error enabling streams:', error);
        }
    }
};

enableStreams();
