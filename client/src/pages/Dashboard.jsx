import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../config/api';
import { 
  BarChart3, 
  Users, 
  MessageSquare, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock,
  LogOut
} from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState(null);
  const [recentQueries, setRecentQueries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    
    // Listen for real-time updates
    if (socket) {
      socket.on('newQuery', handleNewQuery);
      socket.on('queryUpdated', handleQueryUpdate);
    }

    return () => {
      if (socket) {
        socket.off('newQuery', handleNewQuery);
        socket.off('queryUpdated', handleQueryUpdate);
      }
    };
  }, [socket]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch stats
      const statsRes = await api.get('/queries/stats/dashboard');
      setStats(statsRes.data.data);
      
      // Fetch recent queries
      const queriesRes = await api.get('/queries?limit=10&sortBy=-createdAt');
      setRecentQueries(queriesRes.data.data);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewQuery = (query) => {
    setRecentQueries(prev => [query, ...prev.slice(0, 9)]);
    // Update stats
    fetchDashboardData();
  };

  const handleQueryUpdate = (query) => {
    setRecentQueries(prev => 
      prev.map(q => q._id === query._id ? query : q)
    );
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[priority] || colors.medium;
  };

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      assigned: 'bg-purple-100 text-purple-800',
      'in-progress': 'bg-indigo-100 text-indigo-800',
      pending: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || colors.new;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-600">Welcome back, {user?.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/queries')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              View All Queries
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<MessageSquare className="text-blue-600" size={24} />}
            title="Total Queries"
            value={stats?.total || 0}
            bgColor="bg-blue-50"
          />
          <StatCard
            icon={<AlertCircle className="text-orange-600" size={24} />}
            title="Critical Priority"
            value={stats?.byPriority?.find(p => p._id === 'critical')?.count || 0}
            bgColor="bg-orange-50"
          />
          <StatCard
            icon={<Clock className="text-purple-600" size={24} />}
            title="Avg Response Time"
            value={`${stats?.avgResponseTime || 0} min`}
            bgColor="bg-purple-50"
          />
          <StatCard
            icon={<CheckCircle className="text-green-600" size={24} />}
            title="Resolved Today"
            value={stats?.byStatus?.find(s => s._id === 'resolved')?.count || 0}
            bgColor="bg-green-50"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* By Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Queries by Status</h3>
            <div className="space-y-3">
              {stats?.byStatus?.map((item) => (
                <div key={item._id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-gray-600">{item._id}</span>
                    <span className="font-medium text-gray-900">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(item.count / stats.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By Priority */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Queries by Priority</h3>
            <div className="space-y-3">
              {stats?.byPriority?.map((item) => (
                <div key={item._id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-gray-600">{item._id}</span>
                    <span className="font-medium text-gray-900">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        item._id === 'critical' ? 'bg-red-500' :
                        item._id === 'high' ? 'bg-orange-500' :
                        item._id === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${(item.count / stats.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Queries */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Queries</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentQueries.map((query) => (
                  <tr 
                    key={query._id}
                    onClick={() => navigate(`/queries/${query._id}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{query.customerName}</div>
                      <div className="text-sm text-gray-500">{query.customerEmail}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 truncate max-w-xs">{query.subject}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm capitalize text-gray-600">{query.category}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(query.priority)}`}>
                        {query.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(query.status)}`}>
                        {query.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(query.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

const StatCard = ({ icon, title, value, bgColor }) => (
  <div className={`${bgColor} rounded-lg p-6`}>
    <div className="flex items-center justify-between mb-2">
      {icon}
    </div>
    <p className="text-sm text-gray-600 mb-1">{title}</p>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
  </div>
);

export default Dashboard;