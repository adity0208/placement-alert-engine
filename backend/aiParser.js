import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Gemini Client
let geminiClient = null;
const geminiKey = process.env.GEMINI_API_KEY;

if (geminiKey) {
  try {
    geminiClient = new GoogleGenAI({ apiKey: geminiKey });
    console.log("🚀 Google GenAI SDK (Gemini) initialized successfully.");
  } catch (error) {
    console.error("❌ Failed to initialize GoogleGenAI client:", error.message);
  }
} else {
  console.warn("⚠️ GEMINI_API_KEY is not defined.");
}

// Initialize Groq Client
let groqClient = null;
const groqKey = process.env.GROQ_API_KEY;

if (groqKey) {
  try {
    groqClient = new Groq({ apiKey: groqKey });
    console.log("⚡ Groq SDK initialized successfully.");
  } catch (error) {
    console.error("❌ Failed to initialize Groq client:", error.message);
  }
} else {
  console.warn("⚠️ GROQ_API_KEY is not defined.");
}

if (!geminiClient && !groqClient) {
  console.warn("⚠️ Running in local fallback mode (Regex/Keywords classification).");
}

/**
 * Fallback parser using regex and keywords when AI APIs are unavailable
 * @param {string} text - Raw message text
 * @returns {Object} Structured data
 */
function localFallbackParse(text) {
  const textLower = text.toLowerCase();
  
  // Rejection keywords filter (e.g. results, congrats)
  const REJECT_KEYWORDS = ['selected', 'shortlisted', 'congratulations', 'congrats', 'rejected', 'not selected'];
  const isRejected = REJECT_KEYWORDS.some(k => textLower.includes(k));
  if (isRejected) {
    return { type: 'other' };
  }

  // Extract application/registration URL
  const urlRegex = /https?:\/\/[^\s<>"]+/g;
  const match = text.match(urlRegex);
  const applyLink = match ? match[0] : null;

  // Hackathon keyword classification
  const HACKATHON_KEYWORDS = ['hackathon', 'coding contest', 'codeathon', 'challenge', 'ctf', 'prize', 'ideathon', 'contest', 'hackathon drive'];
  const isHackathon = HACKATHON_KEYWORDS.some(k => textLower.includes(k));

  if (isHackathon) {
    let organizer = 'Contest Host';
    const hostMatch = text.match(/(?:by|at|on)\s+([A-Za-z0-9&.,'\- ]+?)[\s,.\n]/i);
    if (hostMatch) {
      organizer = hostMatch[1].trim();
    }

    return {
      type: 'hackathon',
      companyName: null,
      title: 'Coding Challenge',
      jobRole: null,
      deadline: null,
      applyLink: applyLink,
      eligibility: 'All Batches',
      experience: null,
      targetBatch: null,
      organizer: organizer,
      prizePool: 'Prizes & Swag'
    };
  }

  // Job keyword classification
  const JOB_KEYWORDS = ['apply', 'portal', 'deadline', 'drive', 'registration', 'hiring', 'opportunity', 'vacancy', 'job', 'internship', 'hiring at'];
  const isJob = JOB_KEYWORDS.some(k => textLower.includes(k)) || applyLink;

  if (isJob) {
    let companyName = 'Placement Opportunity';
    const hiringAtMatch = text.match(/(?:hiring|opening|drive|at)\s+([A-Za-z0-9&.,'\- ]+?)[\s,.\n]/i);
    if (hiringAtMatch) {
      const candidate = hiringAtMatch[1].trim();
      if (candidate.length > 2 && candidate.length < 30) {
        companyName = candidate;
      }
    }

    return {
      type: 'job',
      companyName: companyName,
      title: 'Job Opportunity',
      jobRole: 'Placement Drive',
      deadline: null,
      applyLink: applyLink,
      eligibility: 'Eligible Students',
      experience: 'Students / Freshers',
      targetBatch: 'Any Batch',
      organizer: null,
      prizePool: null
    };
  }

  return { type: 'other' };
}

/**
 * Parse using Gemini 2.0 Flash
 */
async function parseWithGemini(rawTelegramText) {
  const prompt = `
    You are an expert academic and placement cell operations assistant. 
    Analyze the following raw notification text and extract the details in JSON.
    
    1. Classify the notification:
       - 'job': If it is a job recruitment post, off-campus drive, career hiring link, or internship hiring drive.
       - 'hackathon': If it is a coding competition, hackathon contest, programming challenge, capture the flag (CTF), or ideathon.
       - 'other': If it is a general notice, selection results list, greetings, or unrelated academic notices.
       
    2. Extract fields according to the class type. Set fields to null if not present.
    
    Raw Text:
    "${rawTelegramText}"
  `;

  const response = await geminiClient.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING', description: 'Classification: "job", "hackathon", or "other"' },
          companyName: { type: 'STRING', description: 'For jobs: The exact name of the hiring company. Otherwise: null.' },
          title: { type: 'STRING', description: 'For hackathons: Title or theme of event. Otherwise: null.' },
          jobRole: { type: 'STRING', description: 'For jobs: Job designation/title. Otherwise: null.' },
          deadline: { type: 'STRING', description: 'Deadline date/time or null' },
          applyLink: { type: 'STRING', description: 'Exact application or registration URL' },
          eligibility: { type: 'STRING', description: 'Brief summary of branches/criteria' },
          experience: { type: 'STRING', description: 'Required experience level or null' },
          targetBatch: { type: 'STRING', description: 'Target graduation batches or null' },
          organizer: { type: 'STRING', description: 'For hackathons: Host, organizer or platform. Otherwise: null.' },
          prizePool: { type: 'STRING', description: 'For hackathons: Prize money details or null.' }
        },
        required: ['type']
      }
    }
  });

  const jsonString = response.text?.trim();
  if (!jsonString) throw new Error("Empty response from Gemini API");
  return JSON.parse(jsonString);
}

/**
 * Parse using Groq API (llama-3.3-70b-versatile)
 */
async function parseWithGroq(rawTelegramText) {
  const prompt = `
You are an expert placement cell operations assistant. Analyze this notification and return JSON ONLY with no markdown wrapping.

Classification Rules:
- "job": Job post, hiring drive, career link, internship.
- "hackathon": Coding competition, hackathon, challenge, ideathon, CTF.
- "other": Results list, selection greetings, general notices.

Required JSON Structure:
{
  "type": "job" | "hackathon" | "other",
  "companyName": string | null,
  "title": string | null,
  "jobRole": string | null,
  "deadline": string | null,
  "applyLink": string | null,
  "eligibility": string | null,
  "experience": string | null,
  "targetBatch": string | null,
  "organizer": string | null,
  "prizePool": string | null
}

Raw Text:
"${rawTelegramText}"
  `;

  const completion = await groqClient.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
    response_format: { type: 'json_object' }
  });

  const jsonString = completion.choices[0]?.message?.content?.trim();
  if (!jsonString) throw new Error("Empty response from Groq API");
  return JSON.parse(jsonString);
}

/**
 * Parses raw Telegram message text with multi-level AI failover:
 * Gemini API -> Groq API -> Local Regex Fallback
 * 
 * @param {string} rawTelegramText - Raw message text from Telegram
 * @param {boolean} forceLocal - Force local regex mode
 * @returns {Promise<Object>} Structured classification and details object
 */
export async function parseJobMessage(rawTelegramText, forceLocal = false) {
  const fallbackStructure = {
    type: 'other',
    companyName: null,
    title: 'Notification',
    jobRole: null,
    deadline: null,
    applyLink: null,
    eligibility: null,
    experience: null,
    targetBatch: null,
    organizer: null,
    prizePool: null
  };

  if (!rawTelegramText || typeof rawTelegramText !== 'string' || rawTelegramText.trim().length === 0) {
    return fallbackStructure;
  }

  if (forceLocal || (!geminiClient && !groqClient)) {
    return localFallbackParse(rawTelegramText);
  }

  let cleanData = null;

  // Level 1: Try Gemini API
  if (geminiClient) {
    try {
      cleanData = await parseWithGemini(rawTelegramText);
      console.log("🚀 Successfully parsed message using Gemini API.");
    } catch (geminiError) {
      console.warn("⚠️ Gemini API failed/rate-limited:", geminiError.message);
    }
  }

  // Level 2: Failover to Groq API if Gemini failed or is unconfigured
  if (!cleanData && groqClient) {
    try {
      cleanData = await parseWithGroq(rawTelegramText);
      console.log("⚡ Successfully parsed message using Groq API (Failover).");
    } catch (groqError) {
      console.warn("⚠️ Groq API failed:", groqError.message);
    }
  }

  // Level 3: Failover to Local Regex Parser if both AI providers failed
  if (!cleanData) {
    console.warn("⚠️ All AI APIs failed. Using local regex fallback parser.");
    cleanData = localFallbackParse(rawTelegramText);
  }

  return {
    type: cleanData.type || 'other',
    companyName: cleanData.companyName || null,
    title: cleanData.title || (cleanData.type === 'job' ? 'Job Opportunity' : 'Hackathon Event'),
    jobRole: cleanData.jobRole || null,
    deadline: cleanData.deadline || null,
    applyLink: cleanData.applyLink || null,
    eligibility: cleanData.eligibility || null,
    experience: cleanData.experience || null,
    targetBatch: cleanData.targetBatch || null,
    organizer: cleanData.organizer || null,
    prizePool: cleanData.prizePool || null
  };
}
