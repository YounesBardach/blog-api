import { useAuth } from '../context/AuthContext';

export const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome, Admin {user?.email}!</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-indigo-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-indigo-900">Manage Posts</h3>
          <p className="mt-2 text-indigo-700">Create, edit, and delete blog posts</p>
        </div>
        <div className="bg-green-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-green-900">User Management</h3>
          <p className="mt-2 text-green-700">Manage user accounts and permissions</p>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-purple-900">Moderate Comments</h3>
          <p className="mt-2 text-purple-700">Review and moderate user comments</p>
        </div>
        <div className="bg-yellow-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-yellow-900">Analytics</h3>
          <p className="mt-2 text-yellow-700">View site statistics and metrics</p>
        </div>
        <div className="bg-red-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-red-900">Comments</h3>
          <p className="mt-2 text-red-700">Manage and moderate user comments</p>
        </div>
        <div className="bg-blue-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-blue-900">Reports</h3>
          <p className="mt-2 text-blue-700">Generate and view system reports</p>
        </div>
      </div>
    </div>
  );
}; 