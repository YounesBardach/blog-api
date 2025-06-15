import { useAuth } from "./useAuth";

export const usePermissions = () => {
  const { user } = useAuth();

  const canManageComment = (comment) => {
    if (!user) return false;
    // Users can edit/delete their own comments, ADMINs can edit/delete any comment
    return user.role === "ADMIN" || comment.authorId === user.id;
  };

  const isAdmin = () => {
    return user?.role === "ADMIN";
  };

  return {
    canManageComment,
    isAdmin,
  };
};
