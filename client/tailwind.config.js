/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#10110e',
          900: '#151612',
          850: '#1b1d18',
          800: '#22241d',
          700: '#303329',
          600: '#44483a',
        },
        brand: {
          violet: '#d9ff72',
          indigo: '#b5d95f',
          cyan: '#c5e981',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(115deg, #d9ff72 0%, #c4ed73 56%, #f0a17c 100%)',
        'gradient-glow': 'radial-gradient(1200px 600px at 50% -10%, rgba(217,255,114,0.12), transparent 60%)',
      },
      boxShadow: {
        glow: '0 0 40px -8px rgba(217,255,114,0.24)',
        card: '0 8px 32px rgba(0,0,0,0.35)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s linear infinite',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
