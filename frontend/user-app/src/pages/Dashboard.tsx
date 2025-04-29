import { useAuth } from '../context/AuthContext';

export const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome, {user?.email}!</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-indigo-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-indigo-900">Recent Posts</h3>
          <p className="mt-2 text-indigo-700">View and interact with the latest blog posts</p>
        </div>
        <div className="bg-green-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-green-900">Your Comments</h3>
          <p className="mt-2 text-green-700">Manage your comments and discussions</p>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-purple-900">Profile Settings</h3>
          <p className="mt-2 text-purple-700">Update your account information</p>
        </div>
      </div>
    </div>
  );
}; 