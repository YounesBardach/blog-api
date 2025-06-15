import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import api from "../config/axios";
import { usePermissions } from "../hooks/usePermissions";
import { useAuth } from "../hooks/useAuth";
import Comment from "../components/Comment";
import { showSuccessToast, showErrorToast } from "../utils/errorHelpers";

const PostDetailPage = () => {
  const { id } = useParams();
  const { isAdmin } = usePermissions();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      content: "",
    },
  });

  const {
    data: post,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["post", id],
    queryFn: async () => {
      const response = await api.get(`/posts/${id}`);
      return response.data.data.post;
    },
  });

  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ["comments", id],
    queryFn: async () => {
      const response = await api.get(`/comments/post/${id}`);
      return response.data.data.comments;
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: (data) => api.post(`/comments/post/${id}`, data),
    onSuccess: () => {
      showSuccessToast("Comment added successfully!");
      queryClient.invalidateQueries({ queryKey: ["comments", id] });
      reset();
    },
    onError: (error) => {
      showErrorToast(error);
    },
  });

  const handleAddComment = (data) => {
    addCommentMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    showErrorToast(error);
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-4rem)]">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Failed to load post. Please try again.
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-4rem)]">
        <div className="text-gray-500">Post not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Back button */}
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          ← Back to Home
        </Link>
      </div>

      {/* Post content */}
      <article className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-lg font-medium text-blue-600">
                  {post.author.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">
                  {post.author.name}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(post.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            {isAuthenticated && isAdmin() && (
              <div className="flex space-x-2">
                <Link
                  to={`/posts/${post.id}/edit`}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Edit Post
                </Link>
              </div>
            )}
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {post.title}
          </h1>
          <div className="prose max-w-none">
            <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">
              {post.content}
            </p>
          </div>
        </div>
      </article>

      {/* Comments section */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Comments ({comments?.length || 0})
          </h2>

          {/* Add comment form - only for authenticated users */}
          {isAuthenticated && (
            <div className="mb-8">
              <form
                onSubmit={handleSubmit(handleAddComment)}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="content" className="sr-only">
                    Add a comment
                  </label>
                  <textarea
                    id="content"
                    {...register("content", {
                      required: "Comment is required",
                      validate: (value) =>
                        value.trim() !== "" ||
                        "Comment content cannot be empty",
                    })}
                    rows={4}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Add a comment..."
                  />
                  {errors.content && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.content.message}
                    </p>
                  )}
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={addCommentMutation.isPending}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {addCommentMutation.isPending ? "Adding..." : "Add Comment"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Comments list */}
          {commentsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : comments && comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment) => (
                <Comment key={comment.id} comment={comment} postId={id} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No comments yet.{" "}
                {isAuthenticated
                  ? "Be the first to comment!"
                  : "Login to add a comment."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostDetailPage;
