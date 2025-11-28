/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#6366f1', // Indigo 500
                secondary: '#a855f7', // Purple 500
                dark: '#0f172a', // Slate 900
                'dark-lighter': '#1e293b', // Slate 800
            }
        },
    },
    plugins: [],
}
