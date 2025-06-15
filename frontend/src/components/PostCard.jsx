import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import api from "../config/axios";
import { usePermissions } from "../hooks/usePermissions";
import { useAuth } from "../hooks/useAuth";
import { showSuccessToast, showErrorToast } from "../utils/errorHelpers";

const PostCard = ({ post }) => {
  const { isAdmin } = usePermissions();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const deletePostMutation = useMutation({
    mutationFn: (postId) => api.delete(`/posts/${postId}`),
    onSuccess: () => {
      showSuccessToast("Post deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setShowDeleteConfirm(false);
    },
    onError: (error) => {
      showErrorToast(error);
    },
  });

  const handleDelete = () => {
    deletePostMutation.mutate(post.id);
  };

  return (
    <article className="flex flex-col rounded-lg shadow-lg overflow-hidden bg-white hover:bg-gray-100 hover:border-blue-300 border border-transparent transition-all duration-200">
      <Link
        to={`/posts/${post.id}`}
        className="flex-1 transition-colors duration-200 no-underline"
      >
        <div className="p-6 flex flex-col justify-between h-full">
          <div className="flex-1">
            <div className="mt-2">
              <p className="text-xl font-semibold text-gray-900">
                {post.title}
              </p>
              <p className="mt-3 text-base text-gray-500">
                {post.content.substring(0, 150)}...
              </p>
            </div>
          </div>

          <div className="mt-6">
            {/* Author info */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="sr-only">{post.author.name}</span>
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-lg font-medium text-blue-600">
                    {post.author.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {post.author.name}
                </p>
                <div className="flex space-x-1 text-sm text-gray-500">
                  <time dateTime={post.createdAt}>
                    {new Date(post.createdAt).toLocaleDateString()}
                  </time>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Action buttons */}
      {isAuthenticated && isAdmin() && (
        <div className="px-6 pb-4">
          <div className="flex space-x-2">
            <Link
              to={`/posts/${post.id}/edit`}
              className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            >
              Edit
            </Link>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              className="inline-flex items-center px-3 py-1 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900">Delete Post</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete this post? This action cannot
                  be undone.
                </p>
              </div>
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deletePostMutation.isPending}
                  className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50"
                >
                  {deletePostMutation.isPending ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
};

export default PostCard;
