/**
 * Mock AI Service - Use this for testing without API key
 * Provides realistic mock responses based on query content
 */

// Simple keyword-based analysis
const analyzeQuery = async (subject, message, customerName) => {
  try {
    console.log('🤖 Using MOCK AI Analysis (no API key needed)');
    
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay

    const text = `${subject} ${message}`.toLowerCase();
    
    // Determine sentiment FIRST (this affects other categorizations)
    let sentiment = 'neutral';
    const negativeWords = ['angry', 'frustrated', 'disappointed', 'terrible', 'unacceptable', 'bad', 'worst', 'horrible', 'awful', 'losing', 'down', 'broken', 'failed', 'problem', 'issue'];
    const positiveWords = ['thank', 'great', 'excellent', 'love', 'appreciate', 'happy', 'good', 'amazing', 'wonderful', 'fantastic'];
    
    // Check for positive sentiment first
    if (positiveWords.some(word => text.includes(word))) {
      sentiment = 'positive';
    } else if (negativeWords.some(word => text.includes(word)) || text.includes('!!') || text.includes('!')) {
      sentiment = 'negative';
    }
    
    // Determine priority based on keywords
    let priority = 'medium';
    const urgentWords = ['urgent', 'immediately', 'asap', 'critical', 'emergency', 'locked out', 'cannot access', 'blocked', 'down', 'outage', 'losing'];
    const highWords = ['important', 'soon', 'quickly', 'problem', 'issue', 'not working', 'broken', 'failed'];
    
    if (urgentWords.some(word => text.includes(word))) {
      priority = 'critical';
    } else if (highWords.some(word => text.includes(word))) {
      priority = 'high';
    } else if (text.includes('whenever') || text.includes('no rush') || sentiment === 'positive') {
      priority = 'low';
    }

    // Determine category
    let category = 'other';
    
    // Feedback should be detected first for positive messages
    if (sentiment === 'positive' && (text.includes('thank') || text.includes('great') || text.includes('love') || text.includes('appreciate'))) {
      category = 'feedback';
    } 
    // Technical issues - check for various technical keywords
    else if (
      text.includes('login') || 
      text.includes('password') || 
      text.includes('account') || 
      text.includes('access') ||
      text.includes('website') ||
      text.includes('down') ||
      text.includes('outage') ||
      text.includes('not working') ||
      text.includes('broken') ||
      text.includes('error') ||
      text.includes('bug') ||
      text.includes('crash') ||
      text.includes('loading') ||
      text.includes('slow')
    ) {
      category = 'technical';
    } 
    else if (text.includes('payment') || text.includes('billing') || text.includes('invoice') || text.includes('refund') || text.includes('charge')) {
      category = 'billing';
    } 
    else if (text.includes('complaint') || text.includes('unacceptable') || text.includes('disappointed') || text.includes('terrible')) {
      category = 'complaint';
    } 
    else if (text.includes('?') || text.includes('how') || text.includes('what') || text.includes('when') || text.includes('why')) {
      category = 'question';
    } 
    else if (text.includes('request') || text.includes('need') || text.includes('want') || text.includes('could you')) {
      category = 'request';
    } 
    else if (text.includes('feedback') || text.includes('suggest')) {
      category = 'feedback';
    }

    // Extract tags
    const tags = [];
    if (text.includes('account')) tags.push('account');
    if (text.includes('login') || text.includes('password')) tags.push('authentication');
    if (text.includes('payment') || text.includes('billing')) tags.push('billing');
    if (text.includes('bug') || text.includes('error')) tags.push('bug');
    if (text.includes('urgent') || text.includes('asap')) tags.push('urgent');
    if (text.includes('locked')) tags.push('locked-out');
    if (text.includes('thank') || text.includes('praise')) tags.push('praise');
    if (text.includes('support team')) tags.push('customer-service');
    if (text.includes('website') || text.includes('site')) tags.push('website');
    if (text.includes('down') || text.includes('outage')) tags.push('outage');
    if (text.includes('slow') || text.includes('loading')) tags.push('performance');

    // Generate summary based on sentiment and category
    let summary;
    if (sentiment === 'positive') {
      summary = `${customerName} shared positive feedback regarding ${subject.toLowerCase()}.`;
    } else if (sentiment === 'negative') {
      summary = `${customerName} is experiencing ${
        category === 'complaint' ? 'issues and expressing frustration' :
        category === 'technical' ? 'a technical problem' :
        category === 'billing' ? 'a billing concern' :
        'a support request'
      } regarding ${subject.toLowerCase()}.`;
    } else {
      summary = `${customerName} ${
        category === 'question' ? 'is asking about' :
        category === 'request' ? 'is requesting information on' :
        'contacted us regarding'
      } ${subject.toLowerCase()}.`;
    }

    // Generate suggested response based on sentiment
    let suggestedResponse;
    if (sentiment === 'positive') {
      suggestedResponse = `Dear ${customerName},\n\nThank you so much for taking the time to share your wonderful feedback! We're absolutely delighted to hear that you had a great experience with our support team.\n\nYour kind words truly make our day and motivate us to continue providing excellent service. If you ever need anything in the future, please don't hesitate to reach out.\n\nBest regards,\nSupport Team`;
    } else if (sentiment === 'negative') {
      suggestedResponse = `Dear ${customerName},\n\nThank you for reaching out to us. I sincerely apologize for the inconvenience you're experiencing. I understand how frustrating this situation must be${priority === 'critical' ? ', especially given the urgency' : ''}.\n\n${priority === 'critical' ? "I'm escalating your issue to our technical team right away and we'll work to resolve this as quickly as possible. You should expect an update within the next hour." : "I'm looking into this matter and will provide you with a resolution as soon as possible."}\n\nThank you for your patience.\n\nBest regards,\nSupport Team`;
    } else {
      suggestedResponse = `Dear ${customerName},\n\nThank you for contacting us. I've received your ${category === 'question' ? 'question' : 'request'} regarding "${subject}" and I'm here to help.\n\nI'll look into this right away and get back to you with more information shortly.\n\nBest regards,\nSupport Team`;
    }

    return {
      success: true,
      data: {
        category,
        priority,
        sentiment,
        tags,
        summary,
        suggestedResponse,
        reasoning: `[MOCK] Analyzed based on keywords. Sentiment: ${sentiment}, Priority: ${priority}, Category: ${category}`
      }
    };

  } catch (error) {
    console.error('Mock AI Analysis Error:', error);
    return {
      success: false,
      error: error.message,
      data: {
        category: 'other',
        priority: 'medium',
        sentiment: 'neutral',
        tags: [],
        summary: 'Mock analysis unavailable',
        suggestedResponse: 'Thank you for contacting us. We will review your query and get back to you shortly.',
        reasoning: 'Mock service error - using defaults'
      }
    };
  }
};

const generateResponseSuggestion = async (query) => {
  console.log('🤖 Using MOCK Response Generation');
  await new Promise(resolve => setTimeout(resolve, 300));

  return {
    success: true,
    data: `Dear ${query.customerName},\n\nThank you for your ${query.category}. I'm reviewing your request regarding "${query.subject}" and will provide you with a detailed response shortly.\n\nIf this is urgent, please don't hesitate to reach out.\n\nBest regards,\nSupport Team`
  };
};

const batchAnalyzeQueries = async (queries) => {
  const results = [];
  for (const query of queries) {
    const analysis = await analyzeQuery(
      query.subject,
      query.message,
      query.customerName
    );
    results.push({
      queryId: query._id,
      analysis: analysis.data
    });
  }
  return results;
};


export {
  analyzeQuery,
  batchAnalyzeQueries,
  generateResponseSuggestion
}