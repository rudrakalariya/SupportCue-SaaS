const config = require('../config/env');
const fetch = require('node-fetch');

const DEFAULT_SYSTEM_PROMPT = 'You are a helpful AI customer support agent. Be concise, polite, and professional. Confirm understanding and ask clarifying questions if needed. If you are not sure about something, offer to escalate to a human agent.';

class GeminiService {
  constructor() {
    this.apiKey = config.GEMINI_API_KEY;
    this.baseUrl = config.GEMINI_BASE_URL;
    this.rateLimitMap = new Map(); // Track last call per chat
    this.cooldownMs = 300;
  }

  // Check if we can make a call (rate limiting)
  canMakeCall(chatId) {
    const lastCall = this.rateLimitMap.get(chatId);
    if (!lastCall) return true;
    const timeSinceLastCall = Date.now() - lastCall;
    return timeSinceLastCall >= this.cooldownMs;
  }

  /**
   * Build the contents array for Gemini API.
   * When ragContext is provided, it is injected into the system turn.
   *
   * @param {Array}       messages            - Chat message history
   * @param {string|null} ragContext          - Retrieved document context (optional)
   * @param {string|null} companySystemPrompt - Company-specific AI persona prompt (optional)
   */
  buildContentsArray(messages, ragContext = null, companySystemPrompt = null) {
    const basePrompt = companySystemPrompt || DEFAULT_SYSTEM_PROMPT;

    // Build the system instruction text
    let systemText = basePrompt;

    if (ragContext) {
      systemText += `\n\n${ragContext}\n\nIMPORTANT: Base your answer on the provided document context above when it is relevant. If the answer is not found in the documents, say so honestly and offer to escalate to a human agent. Do not make up information.`;
    }

    const contents = [
      {
        role: 'user',
        parts: [{ text: systemText }]
      }
    ];

    // Add conversation history (last 15 messages)
    const recentMessages = messages.slice(-15);
    recentMessages.forEach(msg => {
      const role = msg.senderRole === 'ai' ? 'model' : 'user';
      contents.push({
        role,
        parts: [{ text: msg.text }]
      });
    });

    return contents;
  }

  /**
   * Get an AI reply from Gemini, optionally grounded in RAG context.
   *
   * @param {string}      chatId              - Chat room ID (used for rate limiting)
   * @param {Array}       messages            - Full chat history
   * @param {string|null} ragContext          - Optional retrieved document context
   * @param {string|null} companySystemPrompt - Optional company-specific system prompt
   */
  async getGeminiReply(chatId, messages, ragContext = null, companySystemPrompt = null) {
    try {
      // Check rate limiting
      if (!this.canMakeCall(chatId)) {
        console.log(`Rate limit hit for chat ${chatId}, using fallback`);
        return this.getFallbackReply();
      }

      // Check if API key is available
      if (!this.apiKey) {
        console.log('No Gemini API key found, using fallback');
        return this.getFallbackReply();
      }

      const contents = this.buildContentsArray(messages, ragContext, companySystemPrompt);

      // Add timeout to prevent long waits
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: ragContext ? 400 : 150, // More tokens for RAG answers
            topP: 0.8,
            topK: 40
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();

      // Update rate limit tracking
      this.rateLimitMap.set(chatId, Date.now());

      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
      } else {
        throw new Error('Invalid response format from Gemini');
      }

    } catch (error) {
      console.error('Gemini API error:', error.message);
      if (error.name === 'AbortError') {
        console.log('Request timed out, using fallback');
      }
      return this.getFallbackReply();
    }
  }

  // Fallback reply when Gemini is unavailable
  getFallbackReply() {
    const fallbacks = [
      'I understand your concern. Let me help you with that.',
      'Thank you for reaching out. I\'m here to assist you.',
      'I appreciate you contacting us. How can I help you today?',
      'I\'m here to support you. What would you like to know?',
      'Thank you for your patience. Let me address your question.'
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  // Alternative method that takes messages array directly
  async getGeminiReplyFromMessages(messagesArray) {
    return this.getGeminiReply('fallback', messagesArray);
  }
}

module.exports = new GeminiService();
