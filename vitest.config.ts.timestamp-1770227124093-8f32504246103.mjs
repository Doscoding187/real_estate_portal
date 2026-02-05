// vitest.config.ts
import { defineConfig } from "file:///C:/Users/Edward/Desktop/real_estate_portal/node_modules/.pnpm/vitest@2.1.9_@types+node@24_98b182f832f5a07afa216e0e9a02cc92/node_modules/vitest/dist/config.js";
import path from "path";
import react from "file:///C:/Users/Edward/Desktop/real_estate_portal/node_modules/.pnpm/@vitejs+plugin-react@5.0.4__55bf343ece76530935d9ef6a9ca1397f/node_modules/@vitejs/plugin-react/dist/index.js";
var __vite_injected_original_dirname = "C:\\Users\\Edward\\Desktop\\real_estate_portal";
var vitest_config_default = defineConfig({
  plugins: [react()],
  root: path.resolve(__vite_injected_original_dirname),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./client/src")
    }
  },
  test: {
    environment: "jsdom",
    include: [
      "server/**/*.test.ts",
      "client/src/**/*.test.{ts,tsx}",
      "client/src/**/*.spec.{ts,tsx}"
    ],
    setupFiles: ["./vitest.setup.ts"],
    globals: true
  }
});
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZXN0LmNvbmZpZy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXEVkd2FyZFxcXFxEZXNrdG9wXFxcXHJlYWxfZXN0YXRlX3BvcnRhbFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcRWR3YXJkXFxcXERlc2t0b3BcXFxccmVhbF9lc3RhdGVfcG9ydGFsXFxcXHZpdGVzdC5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL0Vkd2FyZC9EZXNrdG9wL3JlYWxfZXN0YXRlX3BvcnRhbC92aXRlc3QuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZXN0L2NvbmZpZyc7XHJcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbcmVhY3QoKV0sXHJcbiAgcm9vdDogcGF0aC5yZXNvbHZlKGltcG9ydC5tZXRhLmRpcm5hbWUpLFxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiB7XHJcbiAgICAgICdAJzogcGF0aC5yZXNvbHZlKGltcG9ydC5tZXRhLmRpcm5hbWUsICcuL2NsaWVudC9zcmMnKSxcclxuICAgIH0sXHJcbiAgfSxcclxuICB0ZXN0OiB7XHJcbiAgICBlbnZpcm9ubWVudDogJ2pzZG9tJyxcclxuICAgIGluY2x1ZGU6IFtcclxuICAgICAgJ3NlcnZlci8qKi8qLnRlc3QudHMnLFxyXG4gICAgICAnY2xpZW50L3NyYy8qKi8qLnRlc3Que3RzLHRzeH0nLFxyXG4gICAgICAnY2xpZW50L3NyYy8qKi8qLnNwZWMue3RzLHRzeH0nLFxyXG4gICAgXSxcclxuICAgIHNldHVwRmlsZXM6IFsnLi92aXRlc3Quc2V0dXAudHMnXSxcclxuICAgIGdsb2JhbHM6IHRydWUsXHJcbiAgfSxcclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBOFQsU0FBUyxvQkFBb0I7QUFDM1YsT0FBTyxVQUFVO0FBQ2pCLE9BQU8sV0FBVztBQUZsQixJQUFNLG1DQUFtQztBQUl6QyxJQUFPLHdCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsTUFBTSxLQUFLLFFBQVEsZ0NBQW1CO0FBQUEsRUFDdEMsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQXFCLGNBQWM7QUFBQSxJQUN2RDtBQUFBLEVBQ0Y7QUFBQSxFQUNBLE1BQU07QUFBQSxJQUNKLGFBQWE7QUFBQSxJQUNiLFNBQVM7QUFBQSxNQUNQO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNGO0FBQUEsSUFDQSxZQUFZLENBQUMsbUJBQW1CO0FBQUEsSUFDaEMsU0FBUztBQUFBLEVBQ1g7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
