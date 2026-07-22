import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

let ai = null;
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("⚠️ WARNING: GEMINI_API_KEY is not defined in environment variables. Running in local fallback mode (Regex/Keywords classification).");
} else {
  try {
    ai = new GoogleGenAI({ apiKey });
    console.log("🚀 Google GenAI SDK initialized successfully.");
  } catch (error) {
    console.error("❌ Failed to initialize GoogleGenAI client:", error.message);
  }
}

/**
 * Fallback parser using regex and keywords when Gemini API is unavailable
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
    // Try to guess organizer or title
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
    // Try to parse simple company name
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
 * Parses raw Telegram message text using Gemini to classify and extract structured details.
 * Determines if it's a job, hackathon, or other message, and returns structured data.
 * 
 * @param {string} rawTelegramText - Raw message text from Telegram
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

  if (!ai || forceLocal) {
    return localFallbackParse(rawTelegramText);
  }

  const prompt = `
    You are an expert academic and placement cell operations assistant. 
    Analyze the following raw notification text and extract the details.
    
    1. First, classify the notification:
       - 'job': If it is a job recruitment post, off-campus drive, career hiring link, or internship hiring drive.
       - 'hackathon': If it is a coding competition, hackathon contest, programming challenge, capture the flag (CTF), or ideathon.
       - 'other': If it is a general notice, selection results list, greetings, or unrelated academic notices.
       
    2. Extract fields according to the class type. Set fields to null if they are not relevant or not present in the text.
    
    Raw Text:
    "${rawTelegramText}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            type: { 
              type: 'STRING', 
              description: 'Classification: "job", "hackathon", or "other"' 
            },
            companyName: { 
              type: 'STRING',
              description: 'For jobs: The exact name of the hiring company. Otherwise: null.' 
            },
            title: { 
              type: 'STRING',
              description: 'For hackathons: The title or theme of the hackathon event. Otherwise: null.' 
            },
            jobRole: { 
              type: 'STRING',
              description: 'For jobs: The job designation/title (e.g. Software Engineer, Intern). Otherwise: null.' 
            },
            deadline: { 
              type: 'STRING',
              description: 'The deadline or registration closing date/time (e.g., "July 10, 2026" or null)' 
            },
            applyLink: { 
              type: 'STRING',
              description: 'The exact application URL or registration link found in the text' 
            },
            eligibility: { 
              type: 'STRING',
              description: 'Brief summary of branches/degrees/criteria' 
            },
            experience: { 
              type: 'STRING',
              description: 'For jobs: Required experience level (e.g. "Freshers", "1+ Years", "2026 Batch only"). Otherwise: null.' 
            },
            targetBatch: { 
              type: 'STRING',
              description: 'For jobs: Target graduation batches (e.g. "2026 passout", "2027 Batch", "Any Batch"). Otherwise: null.' 
            },
            organizer: { 
              type: 'STRING',
              description: 'For hackathons: Host, organizer or platform. Otherwise: null.' 
            },
            prizePool: { 
              type: 'STRING',
              description: 'For hackathons: Total prize money or rewards detail. Otherwise: null.' 
            }
          },
          required: ['type']
        }
      }
    });

    const jsonString = response.text?.trim();
    if (!jsonString) {
      console.warn("⚠️ Received empty response from Gemini API");
      return localFallbackParse(rawTelegramText);
    }

    const cleanData = JSON.parse(jsonString);
    
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

  } catch (error) {
    console.error("❌ AI Parsing Error:", error.message);
    return localFallbackParse(rawTelegramText);
  }
}
