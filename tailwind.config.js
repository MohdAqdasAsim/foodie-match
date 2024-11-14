/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FFFFFF', // Base white
          light: '#F9F9F9',   // Light shade
          dark: '#E2E2E2',    // Darker shade for subtle elements
        },
        secondary: {
          DEFAULT: '#00b378', // Base vibrant green
          light: '#33b894',   // Lighter shade for hover effects
          dark: '#008f5a',    // Darker shade for active states
        },
        accent: {
          DEFAULT: '#A8E6CF', // Base soft green
          light: '#f99900',   // Lighter accent shade
          dark: '#7FB8A2',    // Darker accent shade
        },
        darkAccent: {
          DEFAULT: '#007A5E', // Base dark green
          light: '#f99900',   // Lighter dark green for hover effects
          dark: '#f99900',    // Darker dark green for emphasis
        },
        text: {
          DEFAULT: '#333333', // Base dark gray for text
          light: '#555555',    // Lighter text shade for less emphasis
          dark: '#111111',     // Darker text shade for headers or important text
        },
      },
      backgroundImage: {
        'bg-pattern': "url('/src/assets/bg.webp')",
      }
    },
  },
  plugins: [],
}
