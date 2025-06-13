import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useForm } from "react-hook-form";
import api from "../config/axios";
import "./Auth.css";

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setGeneralError("");

    try {
      await api.post("/users/login", data);
      login();
      navigate("/profile");
    } catch (err) {
      const status = err.response?.status;
      const errorData = err.response?.data;

      if (status === 403) {
        setGeneralError("We couldn't process your request. Please try again.");
      } else if (status === 401) {
        setGeneralError("Invalid username or password");
      } else if (status === 400) {
        // Handle validation errors from backend
        if (errorData.invalid_params) {
          errorData.invalid_params.forEach(({ name, reason }) => {
            setError(name, { type: "server", message: reason });
          });
        }
      } else {
        setGeneralError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1>Login</h1>
        {generalError && <div className="error-message">{generalError}</div>}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              {...register("username", {
                required: "Username is required",
              })}
              className={errors.username ? "error" : ""}
            />
            {errors.username && (
              <div className="field-error">{errors.username.message}</div>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              {...register("password", {
                required: "Password is required",
              })}
              className={errors.password ? "error" : ""}
            />
            {errors.password && (
              <div className="field-error">{errors.password.message}</div>
            )}
          </div>
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
