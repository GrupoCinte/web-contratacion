import jwt from 'jsonwebtoken';

export const requireAuth = (req, res, next) => {
    let token = req.cookies?.token;

    if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token de autenticación requerido'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expirado, inicia sesión nuevamente'
            });
        }
        return res.status(401).json({
            success: false,
            message: 'Token inválido'
        });
    }
};

export const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'No tienes permisos para acceder a este recurso'
        });
    }
    next();
};

export const verifyWsToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return null;
    }
};
