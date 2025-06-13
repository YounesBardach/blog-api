import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./components/Header";
import axios from "axios";

const App = () => {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Fetch CSRF token when app initializes
    axios
      .get("http://localhost:5000/", {
        withCredentials: true,
      })
      .then(() => {
        console.log("Backend connected and CSRF token received");
        setIsInitialized(true);
      })
      .catch((error) => {
        console.error("Error connecting to backend:", error);
        // Still set initialized to true to show error UI
        setIsInitialized(true);
      });
  }, []);

  if (!isInitialized) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Header />
      <main className="container">
        <Outlet />
      </main>
    </>
  );
};

export default App;
