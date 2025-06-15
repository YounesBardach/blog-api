import { Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import Header from "./components/Header";
import api from "./config/axios";

function App() {
  // Use React Query to fetch CSRF token
  useQuery({
    queryKey: ["csrf"],
    queryFn: () => api.get("/", { baseURL: "http://localhost:5000" }),
    staleTime: Infinity, // CSRF token doesn't expire
    cacheTime: Infinity, // Keep it in cache forever
    retry: false, // Don't retry on errors
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#363636",
            color: "#fff",
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: "#4ade80",
              secondary: "#fff",
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
        }}
      />
    </div>
  );
}

export default App;
