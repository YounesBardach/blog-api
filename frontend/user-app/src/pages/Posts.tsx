export const Posts = () => {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Blog Posts</h2>
      <div className="space-y-4">
        <div className="border-b pb-4">
          <h3 className="text-lg font-medium text-gray-900">Sample Post Title</h3>
          <p className="mt-1 text-gray-500">Posted on January 1, 2024</p>
          <p className="mt-2 text-gray-700">
            This is a sample blog post. In a real application, this would be fetched from the backend API.
          </p>
        </div>
      </div>
    </div>
  );
}; 