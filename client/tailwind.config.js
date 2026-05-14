/** @type {import('tailwindcss').Config} */
const withAlpha = (cssVar) => `hsl(${cssVar} / <alpha-value>)`;

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          void: withAlpha('var(--bg-void-hsl)'),
          primary: withAlpha('var(--bg-primary-hsl)'),
          elevated: withAlpha('var(--bg-elevated-hsl)'),
          hover: withAlpha('var(--bg-hover-hsl)'),
        },
        leaf: {
          900: withAlpha('var(--green-900-hsl)'),
          700: withAlpha('var(--green-700-hsl)'),
          500: withAlpha('var(--green-500-hsl)'),
          400: withAlpha('var(--green-400-hsl)'),
          300: withAlpha('var(--green-300-hsl)'),
          200: withAlpha('var(--green-200-hsl)'),
          100: withAlpha('var(--green-100-hsl)'),
          glow: withAlpha('var(--green-glow-hsl)'),
        },
        text: {
          primary: withAlpha('var(--text-primary-hsl)'),
          secondary: withAlpha('var(--text-secondary-hsl)'),
          tertiary: withAlpha('var(--text-tertiary-hsl)'),
        }
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
      }
    },
  },
  plugins: [],
}
