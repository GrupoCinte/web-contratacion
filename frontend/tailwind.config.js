/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            colors: {
                cinte: {
                    primary: '#004D87',      // Azul Corporativo
                    red: '#D21B30',          // Rojo CINTE
                    purple: '#494294',       // Morado tecnológico
                    green: '#4F8831',        // Verde innovación
                    support: '#2f7bb8',      // Azul soporte
                    cyan: '#08bdc6',         // Turquesa
                    dark: '#0A1929',         // Fondo oscuro (derivado del azul)
                    card: '#0F2942',         // Cards (derivado del azul)
                    warning: '#F59E0B',      // Alerta / Analizando (Amber)
                }
            },
            animation: {
                'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
            },
            keyframes: {
                ping: {
                    '75%, 100%': {
                        transform: 'scale(2)',
                        opacity: '0',
                    },
                },
            },
        },
    },
    plugins: [],
}
