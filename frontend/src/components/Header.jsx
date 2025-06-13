import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "./Header.css";

const Header = () => {
  const { isAuthenticated, logout } = useAuth();

  return (
    <header className="header">
      <div className="container">
        <Link to="/" className="header-logo">
          Blog
        </Link>
        <nav className="header-nav">
          <Link to="/">Home</Link>
          {isAuthenticated ? (
            <>
              <Link to="/profile">Profile</Link>
              <button onClick={logout} className="header-link-button">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
