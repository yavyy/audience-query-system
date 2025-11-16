/**
 * AI Service for Query Analysis using Hugging Face
 * 
 * Uses Hugging Face's Inference API with open-source models
 */

// Analyze query using Hugging Face
const analyzeQuery = async (subject, message, customerName) => {
  try {
    // Check if API key exists
    if (!process.env.HUGGINGFACE_API_KEY) {
      console.warn('⚠️ HUGGINGFACE_API_KEY not found, using fallback analysis');
      return getFallbackAnalysis(subject, message, customerName);
    }

    console.log('🤖 Analyzing query with Hugging Face AI...');

    // Construct the analysis prompt
    const prompt = `Analyze this customer support query and respond ONLY with valid JSON (no markdown, no explanation):

Customer: ${customerName}
Subject: ${subject}
Message: ${message}

Respond with this exact JSON structure:
{
  "category": "one of: question, request, complaint, feedback, technical, billing, other",
  "priority": "one of: low, medium, high, critical",
  "sentiment": "one of: positive, neutral, negative",
  "tags": ["key", "topics"],
  "summary": "1-2 sentence summary",
  "suggestedResponse": "professional response draft",
  "reasoning": "why this priority and category"
}

Guidelines:
- CRITICAL: outage, security, payment blocked, account locked, data loss
- HIGH: cannot complete task, billing dispute, urgent deadline
- MEDIUM: feature not working, general inquiry with urgency
- LOW: general questions, feature requests, positive feedback

Categories:
- question: asking for information
- request: wants something done
- complaint: expressing dissatisfaction
- feedback: suggestions or praise
- technical: technical issue or bug
- billing: payment/subscription related
- other: doesn't fit above

Sentiment:
- positive: happy, satisfied, thankful
- neutral: factual, no strong emotion
- negative: frustrated, angry, disappointed`;

/* Using Meta's Llama model (good for JSON output) */
    const response = await fetch(
      'https://router.huggingface.co/models/meta-llama/Llama-3.2-3B-Instruct',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 300,
            temperature: 0.0,
            top_p: 0.95,
            return_full_text: false
          },
          options: {
            wait_for_model: true,
            use_cache: false
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Hugging Face API Error:', response.status, errorText);
      
      // If model is loading, wait and retry once
      if (response.status === 503) {
        console.log('⏳ Model is loading, waiting 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const retryResponse = await fetch(
          'https://router.huggingface.co/models/meta-llama/Llama-3.2-3B-Instruct',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              inputs: prompt,
              parameters: {
                max_new_tokens: 300,
                temperature: 0.0,
                return_full_text: false
              },
              options: {
                wait_for_model: true
              }
            })
          }
        );
        
        if (!retryResponse.ok) {
          throw new Error(`Retry failed: ${retryResponse.status}`);
        }
        
        return await parseHuggingFaceResponse(retryResponse, subject, message, customerName);
      }
      
      throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
    }

    return await parseHuggingFaceResponse(response, subject, message, customerName);

  } catch (error) {
    console.error('AI Analysis Error:', error.message);
    // Return fallback analysis
    return getFallbackAnalysis(subject, message, customerName);
  }
};

// Helper function to parse Hugging Face response
async function parseHuggingFaceResponse(response, subject, message, customerName) {
  const data = await response.json();
  
  // Extract the generated text
  let generatedText = '';
  if (Array.isArray(data)) {
    generatedText = data[0]?.generated_text || '';
  } else if (data.generated_text) {
    generatedText = data.generated_text;
  } else if (data[0]?.generated_text) {
    generatedText = data[0].generated_text;
  } else {
    console.error('Unexpected response format:', data);
    throw new Error('Unexpected API response format');
  }

  // Clean and parse JSON from response
  let cleanedText = generatedText.trim();
  
  // Remove common prefixes/suffixes
  cleanedText = cleanedText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .replace(/^Answer:\s*/i, '')
    .replace(/^Response:\s*/i, '')
    .replace(/^Here is the analysis:\s*/i, '')
    .trim();

  // Find JSON object in the text
  const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleanedText = jsonMatch[0];
  }

  let analysis;
  try {
    analysis = JSON.parse(cleanedText);
    
    // Validate required fields
    if (!analysis.category || !analysis.priority || !analysis.sentiment) {
      console.warn('Invalid AI response format, using fallback');
      return getFallbackAnalysis(subject, message, customerName);
    }
    
    console.log('✅ AI Analysis successful:', {
      category: analysis.category,
      priority: analysis.priority,
      sentiment: analysis.sentiment
    });

    return {
      success: true,
      data: analysis
    };
    
  } catch (parseError) {
    console.warn('Failed to parse AI response:', cleanedText.substring(0, 200));
    return getFallbackAnalysis(subject, message, customerName);
  }
}

/**
 * Fallback analysis using keyword matching
 * Used when API fails or response is invalid
 */
function getFallbackAnalysis(subject, message, customerName) {
  console.log('⚠️ Using fallback keyword-based analysis');
  
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
      reasoning: `[FALLBACK] Analyzed based on keywords. Sentiment: ${sentiment}, Priority: ${priority}, Category: ${category}`
    }
  };
}

/**
 * Generate a smart response suggestion based on query context
 */
const generateResponseSuggestion = async (query) => {
  try {
    if (!process.env.HUGGINGFACE_API_KEY) {
      throw new Error('HUGGINGFACE_API_KEY not found');
    }

    console.log('🤖 Generating AI response suggestion...');

    const prompt = `You are a professional customer support agent. Write a helpful, empathetic response to this query:

Customer: ${query.customerName}
Subject: ${query.subject}
Message: ${query.message}
Category: ${query.category}
Priority: ${query.priority}

Write a professional response (2-3 paragraphs) that:
1. Acknowledges their concern
2. Shows empathy
3. Provides helpful next steps
4. Maintains a friendly tone

Response:`;

    const response = await fetch(
      'https://api-inference.huggingface.co/models/meta-llama/Llama-3.2-3B-Instruct',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 300,
            temperature: 0.8,
            return_full_text: false
          },
          options: {
            wait_for_model: true
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.status}`);
    }

    const data = await response.json();
    let generatedText = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;

    return {
      success: true,
      data: generatedText?.trim() || `Dear ${query.customerName},\n\nThank you for reaching out. I'm reviewing your ${query.category} and will provide a detailed response shortly.\n\nBest regards,\nSupport Team`
    };

  } catch (error) {
    console.error('Response Generation Error:', error);
    return {
      success: true,
      data: `Dear ${query.customerName},\n\nThank you for contacting us regarding "${query.subject}". I'm looking into this and will get back to you with a detailed response shortly.\n\nBest regards,\nSupport Team`
    };
  }
};

/**
 * Batch analyze multiple queries
 */
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
    
    // Delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
};


export {
  analyzeQuery,
  generateResponseSuggestion,
  batchAnalyzeQueries,
  getFallbackAnalysis,
  parseHuggingFaceResponse
}
