export const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({
            success: false,
            message: 'Datos de entrada inválidos',
            errors: result.error.issues.map(e => ({
                field: e.path.join('.'),
                message: e.message
            }))
        });
    }
    req.body = result.data;
    next();
};

export const validateQuery = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
        return res.status(400).json({
            success: false,
            message: 'Parámetros de consulta inválidos',
            errors: result.error.issues.map(e => ({
                field: e.path.join('.'),
                message: e.message
            }))
        });
    }
    req.query = result.data;
    next();
};
