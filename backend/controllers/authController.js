import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const docClient = DynamoDBDocumentClient.from(client);

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const adminTable = process.env.ADMIN_TABLE_NAME || 'app_users';

        const response = await docClient.send(new GetCommand({
            TableName: adminTable,
            Key: { email }
        }));

        if (!response.Item) {
            return res.status(401).json({
                success: false,
                message: 'Email o contraseña incorrectos'
            });
        }

        const user = response.Item;

        if (!user.password) {
            return res.status(401).json({
                success: false,
                message: 'Email o contraseña incorrectos'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Email o contraseña incorrectos'
            });
        }

        const token = jwt.sign(
            {
                email: user.email,
                nombre: user.nombre,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
        );

        const maxAge = parseExpiry(process.env.JWT_EXPIRES_IN || '8h');

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge,
            path: '/'
        });

        res.json({
            success: true,
            wsToken: token,
            user: {
                email: user.email,
                nombre: user.nombre,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

export const logoutUser = (req, res) => {
    res.clearCookie('token', { httpOnly: true, sameSite: 'strict', path: '/' });
    res.json({ success: true, message: 'Sesión cerrada' });
};

export const verifyToken = async (req, res) => {
    res.json({ success: true, user: req.user });
};

function parseExpiry(str) {
    const match = str.match(/^(\d+)(h|m|d)$/);
    if (!match) return 8 * 60 * 60 * 1000;
    const val = parseInt(match[1]);
    const unit = match[2];
    if (unit === 'h') return val * 60 * 60 * 1000;
    if (unit === 'm') return val * 60 * 1000;
    if (unit === 'd') return val * 24 * 60 * 60 * 1000;
    return 8 * 60 * 60 * 1000;
}
