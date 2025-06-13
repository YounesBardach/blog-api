import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import api from "../config/axios";
import "./Auth.css";

const RegisterPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
  } = useForm({
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  const password = watch("password");

  const registerMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post("/users/register", {
        name: data.name,
        email: data.email,
        username: data.username,
        password: data.password,
      });
      return response.data;
    },
    onSuccess: () => {
      login();
      navigate("/profile");
    },
    onError: (err) => {
      const status = err.response?.status;
      const errorData = err.response?.data;

      if (status === 403) {
        setError("root", {
          type: "server",
          message: "We couldn't process your request. Please try again.",
        });
      } else if (status === 409) {
        // Handle duplicate entry errors
        if (errorData.type === "/errors/conflict/duplicate-entry") {
          if (errorData.fields) {
            Object.entries(errorData.fields).forEach(([field, message]) => {
              if (message) {
                setError(field, { type: "server", message });
              }
            });
          }
        }
      } else if (status === 400) {
        // Handle validation errors from backend
        if (errorData.invalid_params) {
          errorData.invalid_params.forEach(({ name, reason }) => {
            setError(name, { type: "server", message: reason });
          });
        }
      } else {
        setError("root", {
          type: "server",
          message: "An unexpected error occurred. Please try again.",
        });
      }
    },
  });

  const onSubmit = (data) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1>Register</h1>
        {errors.root && (
          <div className="error-message">{errors.root.message}</div>
        )}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              {...register("name", {
                required: "Name is required",
                minLength: {
                  value: 2,
                  message: "Name must be at least 2 characters",
                },
              })}
              className={errors.name ? "error" : ""}
            />
            {errors.name && (
              <div className="field-error">{errors.name.message}</div>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /\S+@\S+\.\S+/,
                  message: "Please enter a valid email address",
                },
              })}
              className={errors.email ? "error" : ""}
            />
            {errors.email && (
              <div className="field-error">{errors.email.message}</div>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              {...register("username", {
                required: "Username is required",
                minLength: {
                  value: 3,
                  message: "Username must be at least 3 characters",
                },
                pattern: {
                  value: /^[a-z0-9]+$/,
                  message:
                    "Username can only contain lowercase letters and numbers",
                },
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
                minLength: {
                  value: 6,
                  message: "Password must be at least 6 characters",
                },
              })}
              className={errors.password ? "error" : ""}
            />
            {errors.password && (
              <div className="field-error">{errors.password.message}</div>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              {...register("confirmPassword", {
                required: "Please confirm your password",
                validate: (value) =>
                  value === password || "Passwords do not match",
              })}
              className={errors.confirmPassword ? "error" : ""}
            />
            {errors.confirmPassword && (
              <div className="field-error">
                {errors.confirmPassword.message}
              </div>
            )}
          </div>
          <button
            type="submit"
            className="auth-button"
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? "Registering..." : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
