import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../config/axios";
import "./ProfilePage.css";

const ProfilePage = () => {
  const navigate = useNavigate();

  const {
    data: userData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const response = await api.get("/users/profile");
      return response.data.data.user;
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    cacheTime: 10 * 60 * 1000, // Keep data in cache for 10 minutes
    retry: false, // Don't retry on 401 errors
    onError: (error) => {
      if (error.response?.status === 401) {
        navigate("/login");
      }
    },
  });

  if (isLoading) {
    return <div className="auth-container">Loading profile...</div>;
  }

  if (error) {
    return (
      <div className="auth-container error-message">
        {error.response?.data?.message || "Failed to load profile"}
      </div>
    );
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
