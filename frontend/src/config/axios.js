import axios from "axios";

// Create axios instance with default config
const api = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true, // Important for cookies (both JWT and CSRF)
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Get CSRF token from the XSRF-TOKEN cookie
    const csrfToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("XSRF-TOKEN="))
      ?.split("=")[1];

    // If we have a CSRF token, add it to the headers
    if (csrfToken) {
      config.headers["X-XSRF-TOKEN"] = decodeURIComponent(csrfToken);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
