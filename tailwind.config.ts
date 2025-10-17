import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF0000', // Red
          light: '#FF3333',
          dark: '#CC0000',
        },
        secondary: {
          DEFAULT: '#000000', // Black
          light: '#333333',
          dark: '#000000',
        },
        orange: {
          DEFAULT: '#FF6600', // Orange
          light: '#FF8533',
          dark: '#CC5200',
        },
        background: '#121212', // Dark background like YouTube
        accent: '#FF6600', // Orange accent
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;