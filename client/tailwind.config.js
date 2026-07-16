export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        ember: "#ec4899",
        mint: "#06b6d4",
        linen: "#f5f7fb",
        aurora: "#7c3aed",
        cyan: "#06b6d4",
        gold: "#f97316",
        night: "#1e1b4b"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(79, 70, 229, 0.12)",
        glow: "0 24px 70px rgba(99, 102, 241, 0.18)",
        lift: "0 14px 35px rgba(15, 23, 42, 0.10)"
      }
    }
  },
  plugins: []
};
