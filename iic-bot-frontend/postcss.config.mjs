/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {}, // Note the @ symbol here
    autoprefixer: {},
  },
};

export default config;