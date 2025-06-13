import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../config/axios";
import "./Auth.css";

const ProfilePage = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await api.get("/users/profile");
        setUserData(response.data.data.user);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load profile");
        // If unauthorized, redirect to login
        if (err.response?.status === 401) {
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  if (loading) {
    return <div className="auth-container">Loading profile...</div>;
  }

  if (error) {
    return <div className="auth-container error-message">{error}</div>;
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1>Profile</h1>
        {userData && (
          <div className="profile-info">
            <div className="form-group">
              <label>Email</label>
              <p>{userData.email}</p>
            </div>
            <div className="form-group">
              <label>Username</label>
              <p>{userData.username}</p>
            </div>
            <div className="form-group">
              <label>Member Since</label>
              <p>{new Date(userData.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
