import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().email('Email inválido').max(100, 'Email demasiado largo'),
    password: z.string().min(6, 'Mínimo 6 caracteres').max(64, 'Máximo 64 caracteres')
}).strict();

export const forgotPasswordSchema = z.object({
    email: z.string().email('Email inválido').max(100, 'Email demasiado largo')
}).strict();

export const requestAccessSchema = z.object({
    nombre: z.string().min(2, 'Nombre muy corto').max(100, 'Nombre muy largo').trim(),
    email: z.string().email('Email inválido').max(100, 'Email demasiado largo'),
    empresa: z.string().min(2, 'Empresa muy corta').max(100, 'Empresa muy larga').trim(),
    cargo: z.string().max(100, 'Cargo muy largo').trim().optional().default(''),
    telefono: z.string().max(20, 'Teléfono muy largo').trim().optional().default(''),
    motivo: z.string().max(500, 'Motivo muy largo').trim().optional().default('')
}).strict();

export const emailQuerySchema = z.object({
    email: z.string().email('Email inválido').max(100)
});
