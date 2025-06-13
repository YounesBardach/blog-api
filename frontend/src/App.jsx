import { Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Header from "./components/Header";
import api from "./config/axios";
import "./App.css";

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
    <div className="app">
      <Header />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default App;
