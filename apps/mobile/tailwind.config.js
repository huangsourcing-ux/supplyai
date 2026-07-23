const sharedPreset = require("@chinasupply/config/tailwind/preset").default;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [sharedPreset, require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: "#0F766E",
        canvas: "#F8FAFC",
        ink: "#0F172A",
      },
    },
  },
  plugins: [],
};
