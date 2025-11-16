import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import api from '../config/api';
import {
  Search,
  Filter,
  RefreshCw,
  Plus,
  ArrowLeft,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { useCallback } from 'react';

const Queries = () => {
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    channel: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  const fetchQueries = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.category && { category: filters.category }),
        ...(filters.channel && { channel: filters.channel }),
        ...(filters.search && { search: filters.search })
      });

      const response = await api.get(`/queries?${params}`);
      setQueries(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching queries:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  const handleNewQuery = useCallback((query) => {
    if (pagination.page === 1) {
      setQueries(prev => [query, ...prev.slice(0, pagination.limit - 1)]);
    }
    setPagination(prev => ({ ...prev, total: prev.total + 1 }));
  }, [pagination.page, pagination.limit]);

  const handleQueryUpdate = useCallback((updatedQuery) => {
    setQueries(prev =>
      prev.map(q => q._id === updatedQuery._id ? updatedQuery : q)
    );
  }, []);

  const handleQueryDelete = useCallback(({ queryId }) => {
    setQueries(prev => prev.filter(q => q._id !== queryId));
    setPagination(prev => ({ ...prev, total: prev.total - 1 }));
  }, []);

  useEffect(() => {
    fetchQueries();

    if (socket) {
      socket.on('newQuery', handleNewQuery);
      socket.on('queryUpdated', handleQueryUpdate);
      socket.on('queryDeleted', handleQueryDelete);
    }

    return () => {
      if (socket) {
        socket.off('newQuery', handleNewQuery);
        socket.off('queryUpdated', handleQueryUpdate);
        socket.off('queryDeleted', handleQueryDelete);
      }
    };
  }, [socket, fetchQueries, handleNewQuery, handleQueryUpdate, handleQueryDelete]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchQueries();
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      priority: '',
      category: '',
      channel: '',
      search: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-green-100 text-green-800 border-green-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300',
      critical: 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[priority] || colors.medium;
  };

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800 border-blue-300',
      assigned: 'bg-purple-100 text-purple-800 border-purple-300',
      'in-progress': 'bg-indigo-100 text-indigo-800 border-indigo-300',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      resolved: 'bg-green-100 text-green-800 border-green-300',
      closed: 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return colors[status] || colors.new;
  };

  const getSentimentEmoji = (sentiment) => {
    const emojis = {
      positive: '😊',
      neutral: '😐',
      negative: '😟'
    };
    return emojis[sentiment] || '😐';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">All Queries</h1>
                <p className="text-sm text-gray-600">
                  Showing {queries.length} of {pagination.total} queries
                </p>
              </div>
            </div>
            <button
              onClick={fetchQueries}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              <RefreshCw size={18} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            {/* Search */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by subject, customer name, or email..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Search
              </button>
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="new">New</option>
                <option value="assigned">Assigned</option>
                <option value="in-progress">In Progress</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>

              <select
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>

              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                <option value="question">Question</option>
                <option value="request">Request</option>
                <option value="complaint">Complaint</option>
                <option value="feedback">Feedback</option>
                <option value="technical">Technical</option>
                <option value="billing">Billing</option>
                <option value="other">Other</option>
              </select>

              <select
                value={filters.channel}
                onChange={(e) => handleFilterChange('channel', e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Channels</option>
                <option value="email">Email</option>
                <option value="chat">Chat</option>
                <option value="phone">Phone</option>
                <option value="twitter">Twitter</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="website">Website</option>
              </select>
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Clear all filters
            </button>
          </form>
        </div>

        {/* Queries List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : queries.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No queries found</h3>
            <p className="text-gray-600">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          <div className="space-y-4">
            {queries.map((query) => (
              <div
                key={query._id}
                onClick={() => navigate(`/queries/${query._id}`)}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {query.subject}
                      </h3>
                      {query.aiSummary && (
                        <Sparkles size={16} className="text-purple-500" title="AI Analyzed" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {query.message}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="font-medium">{query.customerName}</span>
                      <span>•</span>
                      <span>{query.customerEmail}</span>
                      <span>•</span>
                      <span className="capitalize">{query.channel}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(query.priority)}`}>
                      {query.priority}
                    </span>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(query.status)}`}>
                      {query.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="capitalize text-gray-600">
                      📁 {query.category}
                    </span>
                    <span className="text-gray-600">
                      {getSentimentEmoji(query.sentiment)} {query.sentiment}
                    </span>
                    {query.tags && query.tags.length > 0 && (
                      <div className="flex gap-2">
                        {query.tags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(query.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-gray-700">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.pages}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Queries;