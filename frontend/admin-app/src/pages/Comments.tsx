export const Comments = () => {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Moderate Comments</h2>
        <div className="space-x-2">
          <button className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">
            Filter
          </button>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
            Export
          </button>
        </div>
      </div>
      <div className="space-y-4">
        <div className="border-b pb-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-900">This is a sample comment that needs moderation.</p>
              <p className="mt-1 text-sm text-gray-500">Posted by: user@example.com</p>
              <p className="text-sm text-gray-500">Post: Sample Blog Post</p>
            </div>
            <div className="space-x-2">
              <button className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700">
                Approve
              </button>
              <button className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700">
                Reject
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 