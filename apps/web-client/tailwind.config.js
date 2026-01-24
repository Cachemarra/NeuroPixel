/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                primary: '#3c83f6',
                'background-light': '#f5f7f8',
                'background-dark': '#09090b', // Zinc-950
                'surface-dark': '#18181b', // Zinc-900
                'panel-dark': '#27272a', // Zinc-800
                'border-dark': '#3f3f46', // Zinc-700
                'text-secondary': '#a1a1aa', // Zinc-400
                'canvas-bg': '#09090b', // Zinc-950
                'node-bg': '#18181b', // Zinc-900
                'node-header': '#27272a', // Zinc-800
            },
            fontFamily: {
                display: ['Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            borderRadius: {
                DEFAULT: '0.125rem',
                sm: '0.125rem',
                md: '0.25rem',
                lg: '0.375rem',
                xl: '0.5rem',
                full: '9999px',
            },
        },
    },
    plugins: [],
}
