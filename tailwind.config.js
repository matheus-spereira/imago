/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Conectando o Tailwind às variáveis do seu CSS global
        primary: {
          50: 'var(--primary-50)',
          100: 'var(--primary-100)',
          500: 'var(--primary-500)',
          600: 'var(--primary-600)',
          900: 'var(--primary-900)',
          DEFAULT: 'var(--primary-500)', // Permite usar apenas bg-primary
        },
        accent: {
          500: 'var(--accent-500)',
          600: 'var(--accent-600)',
        },
        // Mapeando as cores de fundo
        bg: {
          start: 'var(--bg-start)',
          end: 'var(--bg-end)',
        },
      },
    },
  },
  plugins: [],
};