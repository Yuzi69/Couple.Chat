/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        base: {
          950: '#05060a',
          900: '#0a0c14',
          800: '#12141f',
          700: '#1b1e2b',
        },
        accent: {
          pink: '#ff5ea3',
          purple: '#8b5cf6',
          blue: '#5b8cff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(139, 92, 246, 0.45)',
      },
      backgroundImage: {
        aurora:
          'radial-gradient(circle at 20% 20%, rgba(255,94,163,0.25), transparent 40%), radial-gradient(circle at 80% 0%, rgba(139,92,246,0.3), transparent 45%), radial-gradient(circle at 50% 100%, rgba(91,140,255,0.25), transparent 45%)',
      },
      keyframes: {
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-18px)' },
        },
      },
      animation: {
        floatSlow: 'floatSlow 7s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
