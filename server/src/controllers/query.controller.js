import { Query } from '../models/query.model.js'
import { analyzeQuery, batchAnalyzeQueries, generateResponseSuggestion } from '../services/aiServiceMock.js'


// @desc    Create new query with AI analysis
// @route   POST /api/queries
// @access  Public (customers can submit) / Private (agents can create)
const createQuery = async (req, res) => {
  try {
    const {
      subject,
      message,
      channel,
      customerName,
      customerEmail,
      customerPhone
    } = req.body;

    // Basic validation
    if (!subject || !message || !channel || !customerName || !customerEmail) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // STEP 1: Analyze query using AI
    console.log('🤖 Analyzing query with AI...');
    const aiAnalysis = await analyzeQuery(subject, message, customerName);

    // STEP 2: Create query with AI-generated insights
    const query = await Query.create({
      subject,
      message,
      channel,
      customerName,
      customerEmail,
      customerPhone,
      status: 'new',
      // AI-generated fields
      category: aiAnalysis.data.category,
      priority: aiAnalysis.data.priority,
      sentiment: aiAnalysis.data.sentiment,
      tags: aiAnalysis.data.tags,
      aiSummary: aiAnalysis.data.summary,
      suggestedResponse: aiAnalysis.data.suggestedResponse
    });

    console.log('✅ Query created with AI insights:', {
      category: query.category,
      priority: query.priority,
      sentiment: query.sentiment
    });

    // STEP 3: Emit socket event for real-time update
    const io = req.app.get('io');
    io.emit('newQuery', query);

    res.status(201).json({
      success: true,
      message: 'Query created and analyzed successfully',
      data: query,
      aiAnalysis: aiAnalysis.success ? {
        reasoning: aiAnalysis.data.reasoning
      } : null
    });
  } catch (error) {
    console.error('Create Query Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating query',
      error: error.message
    });
  }
};

// @desc    Get all queries with filters
// @route   GET /api/queries
// @access  Private
const getQueries = async (req, res) => {
  try {
    const {
      status,
      priority,
      category,
      channel,
      assignedTo,
      search,
      page = 1,
      limit = 20,
      sortBy = '-createdAt'
    } = req.query;

    // Build query filters
    const filters = {};

    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (category) filters.category = category;
    if (channel) filters.channel = channel;
    if (assignedTo) filters.assignedTo = assignedTo;

    // Search across subject, message, customer name/email
    if (search) {
      filters.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } }
      ];
    }

    // If user is an agent, show only their assigned queries
    if (req.user.role === 'agent' && !assignedTo) {
      filters.assignedTo = req.user.id;
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Execute query
    const queries = await Query.find(filters)
      .populate('assignedTo', 'name email department')
      .populate('assignedBy', 'name email')
      .sort(sortBy)
      .limit(parseInt(limit))
      .skip(skip);

    // Get total count for pagination
    const total = await Query.countDocuments(filters);

    res.status(200).json({
      success: true,
      data: queries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get Queries Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching queries',
      error: error.message
    });
  }
};

// @desc    Get single query by ID
// @route   GET /api/queries/:id
// @access  Private
const getQueryById = async (req, res) => {
  try {
    const query = await Query.findById(req.params.id)
      .populate('assignedTo', 'name email department role')
      .populate('assignedBy', 'name email')
      .populate('internalNotes.addedBy', 'name email')
      .populate('responses.respondedBy', 'name email');

    if (!query) {
      return res.status(404).json({
        success: false,
        message: 'Query not found'
      });
    }

    // Check if agent can access this query
    if (req.user.role === 'agent' &&
      query.assignedTo &&
      query.assignedTo._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this query'
      });
    }

    res.status(200).json({
      success: true,
      data: query
    });
  } catch (error) {
    console.error('Get Query Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching query',
      error: error.message
    });
  }
};

// @desc    Update query
// @route   PUT /api/queries/:id
// @access  Private
const updateQuery = async (req, res) => {
  try {
    const {
      status,
      priority,
      category,
      tags,
      sentiment,
      isEscalated
    } = req.body;

    const query = await Query.findById(req.params.id);

    if (!query) {
      return res.status(404).json({
        success: false,
        message: 'Query not found'
      });
    }

    // Update fields
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    if (tags) query.tags = tags;
    if (sentiment) query.sentiment = sentiment;
    if (typeof isEscalated !== 'undefined') query.isEscalated = isEscalated;

    // Track status changes
    if (status === 'resolved' && !query.resolvedAt) {
      query.resolvedAt = new Date();
    }
    if (status === 'closed' && !query.closedAt) {
      query.closedAt = new Date();
    }

    await query.save();

    // Emit socket event
    const io = req.app.get('io');
    io.emit('queryUpdated', query);

    res.status(200).json({
      success: true,
      message: 'Query updated successfully',
      data: query
    });
  } catch (error) {
    console.error('Update Query Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating query',
      error: error.message
    });
  }
};

// @desc    Assign query to user
// @route   PUT /api/queries/:id/assign
// @access  Private (Manager/Admin only)
const assignQuery = async (req, res) => {
  try {
    const { assignedTo } = req.body;

    const query = await Query.findById(req.params.id);

    if (!query) {
      return res.status(404).json({
        success: false,
        message: 'Query not found'
      });
    }

    query.assignedTo = assignedTo;
    query.assignedBy = req.user.id;
    query.assignedAt = new Date();

    if (query.status === 'new') {
      query.status = 'assigned';
    }

    await query.save();

    // Populate assigned user info
    await query.populate('assignedTo', 'name email department');

    // Emit socket event
    const io = req.app.get('io');
    io.emit('queryAssigned', query);

    res.status(200).json({
      success: true,
      message: 'Query assigned successfully',
      data: query
    });
  } catch (error) {
    console.error('Assign Query Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning query',
      error: error.message
    });
  }
};

// @desc    Add response to query
// @route   POST /api/queries/:id/response
// @access  Private
const addResponse = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Response message is required'
      });
    }

    const query = await Query.findById(req.params.id);

    if (!query) {
      return res.status(404).json({
        success: false,
        message: 'Query not found'
      });
    }

    // Add response
    query.responses.push({
      message,
      respondedBy: req.user.id,
      respondedAt: new Date()
    });

    // Set first response time if this is the first response
    if (!query.firstResponseAt) {
      query.firstResponseAt = new Date();
    }

    // Update status to in-progress if it's new or assigned
    if (query.status === 'new' || query.status === 'assigned') {
      query.status = 'in-progress';
    }

    await query.save();
    await query.populate('responses.respondedBy', 'name email');

    // Emit socket event
    const io = req.app.get('io');
    io.emit('queryResponse', { queryId: query._id, response: query.responses[query.responses.length - 1] });

    res.status(200).json({
      success: true,
      message: 'Response added successfully',
      data: query
    });
  } catch (error) {
    console.error('Add Response Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding response',
      error: error.message
    });
  }
};

// @desc    Add internal note
// @route   POST /api/queries/:id/note
// @access  Private
const addInternalNote = async (req, res) => {
  try {
    const { note } = req.body;

    if (!note) {
      return res.status(400).json({
        success: false,
        message: 'Note is required'
      });
    }

    const query = await Query.findById(req.params.id);

    if (!query) {
      return res.status(404).json({
        success: false,
        message: 'Query not found'
      });
    }

    query.internalNotes.push({
      note,
      addedBy: req.user.id,
      addedAt: new Date()
    });

    await query.save();
    await query.populate('internalNotes.addedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Note added successfully',
      data: query
    });
  } catch (error) {
    console.error('Add Note Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding note',
      error: error.message
    });
  }
};

// @desc    Delete query
// @route   DELETE /api/queries/:id
// @access  Private (Admin only)
const deleteQuery = async (req, res) => {
  try {
    const query = await Query.findById(req.params.id);

    if (!query) {
      return res.status(404).json({
        success: false,
        message: 'Query not found'
      });
    }

    await query.deleteOne();

    // Emit socket event
    const io = req.app.get('io');
    io.emit('queryDeleted', { queryId: req.params.id });

    res.status(200).json({
      success: true,
      message: 'Query deleted successfully'
    });
  } catch (error) {
    console.error('Delete Query Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting query',
      error: error.message
    });
  }
};

// @desc    Get queries dashboard stats
// @route   GET /api/queries/stats/dashboard
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const stats = {};

    // Total queries
    stats.total = await Query.countDocuments();

    // By status
    stats.byStatus = await Query.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // By priority
    stats.byPriority = await Query.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    // By category
    stats.byCategory = await Query.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    // By channel
    stats.byChannel = await Query.aggregate([
      { $group: { _id: '$channel', count: { $sum: 1 } } }
    ]);

    // Average response time
    const avgResponse = await Query.aggregate([
      { $match: { responseTime: { $ne: null } } },
      { $group: { _id: null, avgTime: { $avg: '$responseTime' } } }
    ]);
    stats.avgResponseTime = avgResponse.length > 0 ? Math.round(avgResponse[0].avgTime) : 0;

    // Average resolution time
    const avgResolution = await Query.aggregate([
      { $match: { resolutionTime: { $ne: null } } },
      { $group: { _id: null, avgTime: { $avg: '$resolutionTime' } } }
    ]);
    stats.avgResolutionTime = avgResolution.length > 0 ? Math.round(avgResolution[0].avgTime) : 0;

    // Recent queries (last 7 days trend)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    stats.recentTrend = await Query.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stats',
      error: error.message
    });
  }
};

// @desc    Re-analyze query with AI
// @route   POST /api/queries/:id/analyze
// @access  Private
const reanalyzeQuery = async (req, res) => {
  try {
    const query = await Query.findById(req.params.id);

    if (!query) {
      return res.status(404).json({
        success: false,
        message: 'Query not found'
      });
    }

    console.log('🤖 Re-analyzing query with AI...');

    // Run AI analysis
    const aiAnalysis = await analyzeQuery(
      query.subject,
      query.message,
      query.customerName
    );

    // Update query with new AI insights
    query.category = aiAnalysis.data.category;
    query.priority = aiAnalysis.data.priority;
    query.sentiment = aiAnalysis.data.sentiment;
    query.tags = aiAnalysis.data.tags;
    query.aiSummary = aiAnalysis.data.summary;
    query.suggestedResponse = aiAnalysis.data.suggestedResponse;

    await query.save();

    console.log('✅ Query re-analyzed successfully');

    // Emit socket event
    const io = req.app.get('io');
    io.emit('queryUpdated', query);

    res.status(200).json({
      success: true,
      message: 'Query re-analyzed successfully',
      data: query,
      aiAnalysis: aiAnalysis.success ? {
        reasoning: aiAnalysis.data.reasoning
      } : null
    });
  } catch (error) {
    console.error('Reanalyze Query Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error re-analyzing query',
      error: error.message
    });
  }
};

// @desc    Generate AI response suggestion
// @route   POST /api/queries/:id/suggest-response
// @access  Private
const suggestResponse = async (req, res) => {
  try {
    const query = await Query.findById(req.params.id);

    if (!query) {
      return res.status(404).json({
        success: false,
        message: 'Query not found'
      });
    }

    console.log('🤖 Generating AI response suggestion...');

    const suggestion = await generateResponseSuggestion(query);

    res.status(200).json({
      success: true,
      data: {
        suggestedResponse: suggestion.data
      }
    });
  } catch (error) {
    console.error('Suggest Response Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating response suggestion',
      error: error.message
    });
  }
};


export {
  createQuery,
  getQueries,
  getQueryById,
  updateQuery,
  assignQuery,
  addResponse,
  addInternalNote,
  deleteQuery,
  getDashboardStats,
  reanalyzeQuery,
  suggestResponse
}