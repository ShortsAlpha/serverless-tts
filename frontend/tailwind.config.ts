import type { Config } from "tailwindcss";
const colors = require("tailwindcss/colors");

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            colors: {
                // Explicitly adding colors to Ensure they exist
                zinc: colors.zinc,
                indigo: colors.indigo,
                teal: colors.teal,
                orange: colors.orange,
                rose: colors.rose,

                background: "#09090b", // zinc-950
                foreground: "#fafafa", // zinc-50
            },
            animation: {
                // We rely on tailwind-animate or native classes, but can add custom here if needed
            }
        },
    },
    plugins: [],
};
export default config;
