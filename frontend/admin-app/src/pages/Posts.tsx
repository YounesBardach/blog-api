export const Posts = () => {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Manage Posts</h2>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
          Create New Post
        </button>
      </div>
      <div className="space-y-4">
        <div className="border-b pb-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Sample Post Title</h3>
              <p className="mt-1 text-gray-500">Posted on January 1, 2024</p>
            </div>
            <div className="space-x-2">
              <button className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Edit
              </button>
              <button className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 