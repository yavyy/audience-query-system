import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../config/api';
import {
  ArrowLeft,
  Send,
  UserPlus,
  RefreshCw,
  Sparkles,
  Clock,
  Mail,
  Phone,
  MessageSquare,
  Edit,
  Save,
  X
} from 'lucide-react';

const QueryDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [query, setQuery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [responseText, setResponseText] = useState('');
  const [noteText, setNoteText] = useState('');
  const [agents, setAgents] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [editingStatus, setEditingStatus] = useState(false);
  const [editingPriority, setEditingPriority] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  useEffect(() => {
    fetchQueryDetail();
    fetchAgents();

    if (socket) {
      socket.on('queryUpdated', handleQueryUpdate);
      socket.on('queryResponse', handleNewResponse);
    }

    return () => {
      if (socket) {
        socket.off('queryUpdated', handleQueryUpdate);
        socket.off('queryResponse', handleNewResponse);
      }
    };
  }, [id, socket]);

  const fetchQueryDetail = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/queries/${id}`);
      setQuery(response.data.data);
      setNewStatus(response.data.data.status);
      setNewPriority(response.data.data.priority);
    } catch (error) {
      console.error('Error fetching query:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await api.get('/users/agents/available');
      setAgents(response.data.data);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const handleQueryUpdate = (updatedQuery) => {
    if (updatedQuery._id === id) {
      setQuery(updatedQuery);
    }
  };

  const handleNewResponse = ({ queryId, response }) => {
    if (queryId === id) {
      setQuery(prev => ({
        ...prev,
        responses: [...prev.responses, response]
      }));
    }
  };

  const handleAddResponse = async (e) => {
    e.preventDefault();
    if (!responseText.trim()) return;

    try {
      const response = await api.post(`/queries/${id}/response`, {
        message: responseText
      });
      setQuery(response.data.data);
      setResponseText('');
    } catch (error) {
      console.error('Error adding response:', error);
      alert('Failed to add response');
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    try {
      const response = await api.post(`/queries/${id}/note`, {
        note: noteText
      });
      setQuery(response.data.data);
      setNoteText('');
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Failed to add note');
    }
  };

  const handleAssignQuery = async () => {
    if (!selectedAgent) return;

    try {
      const response = await api.put(`/queries/${id}/assign`, {
        assignedTo: selectedAgent
      });
      setQuery(response.data.data);
      setShowAssignModal(false);
      setSelectedAgent('');
    } catch (error) {
      console.error('Error assigning query:', error);
      alert('Failed to assign query');
    }
  };

  const handleUpdateStatus = async () => {
    try {
      const response = await api.put(`/queries/${id}`, {
        status: newStatus
      });
      setQuery(response.data.data);
      setEditingStatus(false);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleUpdatePriority = async () => {
    try {
      const response = await api.put(`/queries/${id}`, {
        priority: newPriority
      });
      setQuery(response.data.data);
      setEditingPriority(false);
    } catch (error) {
      console.error('Error updating priority:', error);
      alert('Failed to update priority');
    }
  };

  const handleGetSuggestion = async () => {
    try {
      setLoadingSuggestion(true);
      const response = await api.post(`/queries/${id}/suggest-response`);
      setResponseText(response.data.data.suggestedResponse);
    } catch (error) {
      console.error('Error getting suggestion:', error);
      alert('Failed to get AI suggestion');
    } finally {
      setLoadingSuggestion(false);
    }
  };

  const handleReanalyze = async () => {
    try {
      const response = await api.post(`/queries/${id}/analyze`);
      setQuery(response.data.data);
      alert('Query re-analyzed successfully!');
    } catch (error) {
      console.error('Error re-analyzing:', error);
      alert('Failed to re-analyze query');
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!query) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Query not found</h2>
          <button
            onClick={() => navigate('/queries')}
            className="text-blue-600 hover:text-blue-700"
          >
            Back to queries
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/queries')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Query Details</h1>
                <p className="text-sm text-gray-600">ID: {query._id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReanalyze}
                className="flex items-center gap-2 px-4 py-2 text-purple-600 border border-purple-600 rounded-lg hover:bg-purple-50"
              >
                <Sparkles size={18} />
                Re-analyze with AI
              </button>
              {(user.role === 'manager' || user.role === 'admin') && (
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <UserPlus size={18} />
                  Assign
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Query Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Query Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{query.subject}</h2>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(query.status)}`}>
                  {query.status}
                </span>
              </div>

              <div className="prose max-w-none mb-6">
                <p className="text-gray-700">{query.message}</p>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Customer:</span>
                    <p className="font-medium text-gray-900">{query.customerName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <p className="font-medium text-gray-900">{query.customerEmail}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Channel:</span>
                    <p className="font-medium text-gray-900 capitalize">{query.channel}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Created:</span>
                    <p className="font-medium text-gray-900">
                      {new Date(query.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Analysis */}
            {query.aiSummary && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="text-purple-600" size={20} />
                  <h3 className="text-lg font-semibold text-gray-900">AI Analysis</h3>
                </div>
                <p className="text-gray-700 mb-4">{query.aiSummary}</p>
                
                {query.suggestedResponse && (
                  <div className="bg-white rounded p-4">
                    <p className="text-sm text-gray-600 mb-2">Suggested Response:</p>
                    <p className="text-gray-700 text-sm whitespace-pre-line">
                      {query.suggestedResponse}
                    </p>
                    <button
                      onClick={() => setResponseText(query.suggestedResponse)}
                      className="mt-3 text-sm text-purple-600 hover:text-purple-700"
                    >
                      Use this response
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Responses */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Responses</h3>
              
              {query.responses && query.responses.length > 0 ? (
                <div className="space-y-4 mb-6">
                  {query.responses.map((response, idx) => (
                    <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">
                          {response.respondedBy?.name || 'Unknown'}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(response.respondedAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-700 whitespace-pre-line">{response.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 mb-6">No responses yet</p>
              )}

              {/* Add Response Form */}
              <form onSubmit={handleAddResponse}>
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">Add Response</label>
                    <button
                      type="button"
                      onClick={handleGetSuggestion}
                      disabled={loadingSuggestion}
                      className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                    >
                      <Sparkles size={14} />
                      {loadingSuggestion ? 'Generating...' : 'Get AI Suggestion'}
                    </button>
                  </div>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    rows="4"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Type your response here..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={!responseText.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={18} />
                  Send Response
                </button>
              </form>
            </div>

            {/* Internal Notes */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Internal Notes</h3>
              
              {query.internalNotes && query.internalNotes.length > 0 ? (
                <div className="space-y-3 mb-6">
                  {query.internalNotes.map((note, idx) => (
                    <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {note.addedBy?.name || 'Unknown'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(note.addedAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{note.note}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 mb-6">No internal notes</p>
              )}

              <form onSubmit={handleAddNote}>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
                  placeholder="Add an internal note..."
                />
                <button
                  type="submit"
                  disabled={!noteText.trim()}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Note
                </button>
              </form>
            </div>
          </div>

          {/* Right Column - Metadata */}
          <div className="space-y-6">
            {/* Priority */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Priority</h3>
                {!editingPriority ? (
                  <button onClick={() => setEditingPriority(true)} className="text-blue-600 hover:text-blue-700">
                    <Edit size={16} />
                  </button>
                ) : null}
              </div>
              
              {editingPriority ? (
                <div className="space-y-2">
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                  <div className="flex gap-2">
                    <button onClick={handleUpdatePriority} className="flex-1 px-3 py-1 bg-blue-600 text-white rounded text-sm">
                      <Save size={14} className="inline mr-1" /> Save
                    </button>
                    <button onClick={() => setEditingPriority(false)} className="px-3 py-1 bg-gray-300 rounded text-sm">
                      <X size={14} className="inline" />
                    </button>
                  </div>
                </div>
              ) : (
                <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full border ${getPriorityColor(query.priority)}`}>
                  {query.priority}
                </span>
              )}
            </div>

            {/* Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Status</h3>
                {!editingStatus ? (
                  <button onClick={() => setEditingStatus(true)} className="text-blue-600 hover:text-blue-700">
                    <Edit size={16} />
                  </button>
                ) : null}
              </div>
              
              {editingStatus ? (
                <div className="space-y-2">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  >
                    <option value="new">New</option>
                    <option value="assigned">Assigned</option>
                    <option value="in-progress">In Progress</option>
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  <div className="flex gap-2">
                    <button onClick={handleUpdateStatus} className="flex-1 px-3 py-1 bg-blue-600 text-white rounded text-sm">
                      <Save size={14} className="inline mr-1" /> Save
                    </button>
                    <button onClick={() => setEditingStatus(false)} className="px-3 py-1 bg-gray-300 rounded text-sm">
                      <X size={14} className="inline" />
                    </button>
                  </div>
                </div>
              ) : (
                <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(query.status)}`}>
                  {query.status}
                </span>
              )}
            </div>

            {/* Category & Sentiment */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Classification</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-600">Category:</span>
                  <p className="font-medium text-gray-900 capitalize">{query.category}</p>
                </div>
                <div>
                  <span className="text-gray-600">Sentiment:</span>
                  <p className="font-medium text-gray-900 capitalize">{query.sentiment}</p>
                </div>
                {query.tags && query.tags.length > 0 && (
                  <div>
                    <span className="text-gray-600">Tags:</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {query.tags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Assignment */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Assignment</h3>
              {query.assignedTo ? (
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{query.assignedTo.name}</p>
                  <p className="text-gray-600">{query.assignedTo.email}</p>
                  <p className="text-gray-500 mt-2">
                    Assigned: {new Date(query.assignedAt).toLocaleString()}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Not assigned</p>
              )}
            </div>

            {/* Timing */}
            {(query.responseTime || query.resolutionTime) && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Metrics</h3>
                <div className="space-y-2 text-sm">
                  {query.responseTime && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Response Time:</span>
                      <span className="font-medium text-gray-900">{query.responseTime} min</span>
                    </div>
                  )}
                  {query.resolutionTime && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Resolution Time:</span>
                      <span className="font-medium text-gray-900">{query.resolutionTime} min</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assign Query</h3>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
            >
              <option value="">Select an agent</option>
              {agents.map(agent => (
                <option key={agent._id} value={agent._id}>
                  {agent.name} ({agent.department})
                </option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={handleAssignQuery}
                disabled={!selectedAgent}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Assign
              </button>
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueryDetail;