/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF4400',
          50: '#FFE5D9',
          100: '#FFCCB8',
          200: '#FF9980',
          300: '#FF6647',
          400: '#FF4400',
          500: '#CC3600',
          600: '#992900',
          700: '#661B00',
          800: '#330E00',
          900: '#000000',
        },
      },
      container: {
        center: true,
        padding: '2rem',
      },
    },
  },
  plugins: [],
} 