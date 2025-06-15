import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  // The global pending state in AuthProvider handles the initial loading.
  // By the time this component renders, we have a definitive auth state.
  if (!isAuthenticated) {
    // Redirect to the login page, but save the location they were
    // trying to go to so we can send them there after they log in.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
