import { GoogleGenAI, Type } from "@google/genai";

// Lazy-loaded client to avoid crashing if API key is not loaded yet
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set. Please configure it in AI Studio secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

export interface ReviewAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative' | 'critical';
  sentimentScore: number; // between -1 and 1
  hasComplaints: boolean;
  hasOffensiveLanguage: boolean;
  hasRefundRequest: boolean;
  hasLegalThreat: boolean;
  hasSensitiveCustomerIssue: boolean;
  shouldRouteToManualQueue: boolean;
  reviewSummary: string;
  detectedLanguage: string;
}

export async function analyzeReview(reviewText: string, rating: number): Promise<ReviewAnalysis> {
  try {
    const ai = getGeminiClient();

    const systemPrompt = `You are an advanced AI Customer Liaison and Sentiment Analyst. Your job is to perform deep clinical analysis on a customer business review.
    Analyze carefully and provide a structured JSON response matching the schema.
    Rules:
    - Sentiment score must be a number from -1.0 (extremely negative/hostile) to 1.0 (exceptionally glowing).
    - Classify sentiment into positive (score >= 0.35), neutral (score > -0.15 and < 0.35), negative (score <= -0.15), and critical (score <= -0.6 or containing severe issues).
    - Detect extreme complaints, offensive language, refund requests, legal escalations/threats ("lawyer", "court", "chargeback", "sue"), or highly sensitive medical or financial customer issues.
    - Set shouldRouteToManualQueue to true if rating is 1 or 2 stars, OR contains any negative flags (complaints, refund requests, offensive language, legal threats, sensitive customer issues).
    - Detect the language of the review text. Identify the standard full English name of the language (e.g., 'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Dutch', 'Arabic', 'Hindi', 'Urdu', 'Bengali', 'Turkish', 'Chinese', 'Japanese', 'Korean', 'Thai', 'Indonesian', 'Vietnamese', 'Russian'). If it is not in these, state 'Other'.`;

    const userPrompt = `Review text to analyze:
    Rating: ${rating} Stars
    Text: "${reviewText}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentiment: {
              type: Type.STRING,
              description: "Must be either 'positive', 'neutral', 'negative', or 'critical'."
            },
            sentimentScore: {
              type: Type.NUMBER,
              description: "Numeric score from -1.0 to 1.0"
            },
            hasComplaints: { type: Type.BOOLEAN },
            hasOffensiveLanguage: { type: Type.BOOLEAN },
            hasRefundRequest: { type: Type.BOOLEAN },
            hasLegalThreat: { type: Type.BOOLEAN },
            hasSensitiveCustomerIssue: { type: Type.BOOLEAN },
            shouldRouteToManualQueue: { type: Type.BOOLEAN },
            reviewSummary: { type: Type.STRING, description: "One elegant sentence summarizing the customer feedback." },
            detectedLanguage: { type: Type.STRING, description: "Standard English name of the detected language of the review, e.g. 'Spanish', 'English', etc." }
          },
          required: [
            "sentiment",
            "sentimentScore",
            "hasComplaints",
            "hasOffensiveLanguage",
            "hasRefundRequest",
            "hasLegalThreat",
            "hasSensitiveCustomerIssue",
            "shouldRouteToManualQueue",
            "reviewSummary",
            "detectedLanguage"
          ]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Received empty response from Gemini");
    }

    return JSON.parse(text.trim()) as ReviewAnalysis;
  } catch (error) {
    console.error("Gemini analyzeReview failed:", error);
    // Fallback if AI fails or key is missing
    const isNegative = rating <= 2;
    return {
      sentiment: isNegative ? 'negative' : (rating >= 4 ? 'positive' : 'neutral'),
      sentimentScore: (rating - 3) / 2,
      hasComplaints: isNegative,
      hasOffensiveLanguage: false,
      hasRefundRequest: reviewText.toLowerCase().includes('refund') || reviewText.toLowerCase().includes('money back'),
      hasLegalThreat: reviewText.toLowerCase().includes('legal') || reviewText.toLowerCase().includes('sue') || reviewText.toLowerCase().includes('chargeback'),
      hasSensitiveCustomerIssue: false,
      shouldRouteToManualQueue: isNegative,
      reviewSummary: "Automated analysis fallback due to server environment limit.",
      detectedLanguage: "English"
    };
  }
}

export interface GenerationInput {
  reviewText: string;
  rating: number;
  businessName: string;
  businessType: string;
  brandVoice: string;
  tone: string;
  preferredGreeting: string;
  preferredClosing: string;
  keywordsToInclude: string[];
  keywordsToAvoid: string[];
  customInstructions: string;
  ratingsGuideline: string;
  replyLanguage: string;
}

export async function generateSingleReply(input: GenerationInput): Promise<string> {
  try {
    const ai = getGeminiClient();

    const systemPrompt = `You are a world-class Communications Director and Customer Success AI Writer for ${input.businessName}, a ${input.businessType}.
    Your objective is to generate ONE beautifully composed, tailored response to a google review.
    
    CRITICAL LANGUAGE INSTRUCTION: You MUST write the entire reply in pure, natural, professional ${input.replyLanguage}. No matter what language you are prompted in or what the original settings are, write only in ${input.replyLanguage}. Transcribe greetings and closing styles appropriately to sound native and authentic in ${input.replyLanguage}.

    Guidelines:
    1. Tone Choice: Strictly use "${input.tone}" tone. Examples:
       - Professional: Polite, objective, structured, polite.
       - Friendly: Enthusiastic, warm, approachable, appreciative.
       - Formal: High vocabulary, correct grammar, elegant, highly polite.
       - Casual: Light, conversational, cheerful, neighborly.
       - Luxury Brand: Exquisite, highly polite, premium spacing, elegant, speaks of elite level treatment.
       - Hospitality / Restaurant Style: Food/experience-focused, highly welcoming, generous.
       - Healthcare / Dental Style: Soothing, caring, clinical excellence, confidential, HIPAA-safe (no clinical specifics mentioned).
       - Retail Style: Helpful, customer-centric.
    2. Brand Voice: "${input.brandVoice}".
    3. Mandatory Greeting: Start with a suitable translation of "${input.preferredGreeting} [Author Name]" in ${input.replyLanguage}.
    4. Mandatory Closing: Conclude with a suitable translation of "${input.preferredClosing}" in ${input.replyLanguage}.
    5. Specific Guidance for ${input.rating}-Star Reviews: "${input.ratingsGuideline}".
    6. Include these concept keywords naturally (translate them accurately into ${input.replyLanguage} if needed): ${input.keywordsToInclude.join(', ')}.
    7. Under NO circumstance should you use or refer to these sensitive terms or their translated equivalents: ${input.keywordsToAvoid.join(', ')}.
    8. Custom instruction: "${input.customInstructions}".
    9. Focus on premium flow, no robotic placeholders, no hashtag slop, and keep it under 3 elegant, meaningful sentences. Avoid standard templates.`;

    const userPrompt = `Compose the review reply.
    Customer Review text to reply to: "${input.reviewText}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      }
    });

    return response.text?.trim() || "Thank you for taking the time to share your review. We appreciate your valuable business.";
  } catch (error) {
    console.error("Gemini generateSingleReply failed:", error);
    return `${input.preferredGreeting} valued customer, thank you for your ${input.rating} star review of ${input.businessName}. We value your comments. ${input.preferredClosing}`;
  }
}

export async function generateThreeSuggestedReplies(input: GenerationInput): Promise<string[]> {
  try {
    const ai = getGeminiClient();

    const systemPrompt = `You are a world-class Communications Consultant managing negative reviews for ${input.businessName}, a ${input.businessType}.
    The business owner requires THREE alternative responses to select from for manual approval.
    Generate a JSON response containing an array of EXACTLY 3 custom draft options.
    
    CRITICAL LANGUAGE INSTRUCTION: You MUST write all three draft suggestions in pure, natural, professional ${input.replyLanguage}. No matter what language you are prompted in or what the original settings are, write only in ${input.replyLanguage}. Transcribe greetings and closing styles appropriately to sound native and authentic in ${input.replyLanguage}.

    Guidelines:
    1. Tone Choices:
       - Draft Option 1: Ultra Professional & Direct (apology + invitation to converse privately)
       - Draft Option 2: Warm & Compassionate (focusing on our family hospitality, offering resolutions)
       - Draft Option 3: Elegant Luxury Brand (premium spacing, highly respectful, reassuring)
    2. Star guideline: "${input.ratingsGuideline}".
    3. Preferred Greeting: "${input.preferredGreeting}"
    4. Preferred Closing: "${input.preferredClosing}"
    5. Brand voice: "${input.brandVoice}"
    6. Include keywords naturally (translate appropriately): ${input.keywordsToInclude.join(', ')}
    7. Strictly AVOID these forbidden terms: ${input.keywordsToAvoid.join(', ')}
    8. Custom instruction: "${input.customInstructions}".`;

    const userPrompt = `Generate the 3 drafts.
    Customer Negative Review to address: "${input.reviewText}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          },
          description: "An array of exactly three distinct premium review draft suggestions."
        }
      }
    });

    const text = response.text;
    if (text) {
      const parsedArray = JSON.parse(text.trim()) as string[];
      if (parsedArray.length === 3) {
        return parsedArray;
      }
    }
    throw new Error("Invalid array size returned from Gemini");
  } catch (error) {
    console.error("Gemini generateThreeSuggestedReplies failed, using structured fallbacks:", error);
    // Return high quality manual structured drafts
    return [
      `${input.preferredGreeting} guest, We sincerely apologize for any portion of your visit that fell below our elite standards. We would love the chance to connect directly with you so we can fully rectify this. ${input.preferredClosing}`,
      `${input.preferredGreeting} customer, We take direct pride in serving our clients with premier farm-to-table care. We would like to look closer into your notes. Please connect with our director at operations@${input.businessName.toLowerCase().replace(/\s+/g, '')}.com so we can invite you back. ${input.preferredClosing}`,
      `${input.preferredGreeting} patron, thank you for your candid feedback. Dr. Carter and our dedicated staff strive to provide elite comfort, and we want to assure you your comments are being addressed directly by our team. ${input.preferredClosing}`
    ];
  }
}
