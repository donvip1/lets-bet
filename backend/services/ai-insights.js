'use strict';

/*********************************************************
 Author:                Philip Awazie Donvip
 Year Created:          2026
 Description:           Backend integration service for AI trending bet suggestions.
 Modified By:           Philip Awazie Donvip
 Modified Date:         2026-05-31
 Modification Notes:    Added traceable comments for debugging, handoff, undo, and redo review.
*********************************************************/

// ========================================================
// Imports, dependencies, and module setup
// ========================================================

const axios = require("axios");

const normalizeServiceUrl = (url) => {
  const fallbackUrl = "http://localhost:8000";
  const rawUrl = (url || fallbackUrl).replace(/\/$/, "");

  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl;
  }

  if (/^(localhost|127\.0\.0\.1)(:\d+)?/i.test(rawUrl)) {
    return `http://${rawUrl}`;
  }

  return `https://${rawUrl}`;
};

const AI_SERVICE_URL = normalizeServiceUrl(process.env.AI_SERVICE_URL);
const AI_TIMEOUT_MS = Number(process.env.AI_SERVICE_TIMEOUT_MS || 5000);

const MOCK_TREND_SUGGESTIONS = [
  {
    topic: "Will Nigeria qualify for the next World Cup?",
    outcome_a: "Yes",
    outcome_b: "No",
    category: "sports",
    confidence_score: 94,
    trend_reason: "High discussion volume across football and local sports coverage",
  },
  {
    topic: "Will the Champions League final go to extra time?",
    outcome_a: "Yes",
    outcome_b: "No",
    category: "sports",
    confidence_score: 89,
    trend_reason: "Recurring debate across European football channels",
  },
  {
    topic: "Will Bitcoin close the month above $100K?",
    outcome_a: "Yes",
    outcome_b: "No",
    category: "crypto",
    confidence_score: 92,
    trend_reason: "Crypto price volatility and market headlines are driving attention",
  },
  {
    topic: "Will Ethereum outperform Bitcoin this quarter?",
    outcome_a: "Yes",
    outcome_b: "No",
    category: "crypto",
    confidence_score: 83,
    trend_reason: "Market commentary is comparing major crypto assets",
  },
  {
    topic: "Will the Nigerian naira strengthen this month?",
    outcome_a: "Yes",
    outcome_b: "No",
    category: "finance",
    confidence_score: 87,
    trend_reason: "Local business news is tracking currency movement",
  },
  {
    topic: "Will US inflation fall in the next report?",
    outcome_a: "Yes",
    outcome_b: "No",
    category: "finance",
    confidence_score: 81,
    trend_reason: "Economic headlines are focused on rates and inflation data",
  },
  {
    topic: "Will a major AI company announce a new flagship model this month?",
    outcome_a: "Yes",
    outcome_b: "No",
    category: "technology",
    confidence_score: 86,
    trend_reason: "AI product speculation is active across technology media",
  },
  {
    topic: "Will a top smartphone brand launch a foldable device this quarter?",
    outcome_a: "Yes",
    outcome_b: "No",
    category: "technology",
    confidence_score: 78,
    trend_reason: "Device launch rumors are trending in tech communities",
  },
  {
    topic: "Will a Nigerian artist top the global streaming chart this month?",
    outcome_a: "Yes",
    outcome_b: "No",
    category: "entertainment",
    confidence_score: 90,
    trend_reason: "Afrobeats conversations are strong across social platforms",
  },
  {
    topic: "Will a major movie trailer break YouTube records this week?",
    outcome_a: "Yes",
    outcome_b: "No",
    category: "entertainment",
    confidence_score: 79,
    trend_reason: "Trailer reactions and fan commentary are increasing",
  },
  {
    topic: "Will a major political party announce a surprise candidate?",
    outcome_a: "Yes",
    outcome_b: "No",
    category: "politics",
    confidence_score: 76,
    trend_reason: "Political speculation is active in local and international headlines",
  },
  {
    topic: "Will a new policy announcement trend nationally this week?",
    outcome_a: "Yes",
    outcome_b: "No",
    category: "politics",
    confidence_score: 84,
    trend_reason: "Policy debate is gaining traction in news coverage",
  },
  {
    topic: "Will a TikTok challenge become the top social trend this weekend?",
    outcome_a: "Yes",
    outcome_b: "No",
    category: "social",
    confidence_score: 82,
    trend_reason: "Short-form video discussions are moving quickly",
  },
  {
    topic: "Will a celebrity controversy dominate Instagram trends this week?",
    outcome_a: "Yes",
    outcome_b: "No",
    category: "social",
    confidence_score: 77,
    trend_reason: "Entertainment and social reactions are accelerating",
  },
  {
    topic: "Will a major international headline stay top news for 48 hours?",
    outcome_a: "Yes",
    outcome_b: "No",
    category: "international news",
    confidence_score: 85,
    trend_reason: "Global news outlets are repeatedly covering the story cycle",
  },
  {
    topic: "Will a Nigerian headline dominate local news today?",
    outcome_a: "Yes",
    outcome_b: "No",
    category: "local news",
    confidence_score: 88,
    trend_reason: "Local newspaper and online news attention is high",
  },
];

const aiClient = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: AI_TIMEOUT_MS,
});

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const mergeTrendSuggestions = (primarySuggestions = []) => {
  const mergedSuggestions = new Map();

  [...primarySuggestions, ...MOCK_TREND_SUGGESTIONS].forEach((suggestion) => {
    if (!suggestion?.topic) {
      return;
    }

    const key = suggestion.topic.toLowerCase();
    const existingSuggestion = mergedSuggestions.get(key);

    if (
      !existingSuggestion ||
      toNumber(suggestion.confidence_score) >
        toNumber(existingSuggestion.confidence_score)
    ) {
      mergedSuggestions.set(key, suggestion);
    }
  });

  return Array.from(mergedSuggestions.values()).sort(
    (a, b) => toNumber(b.confidence_score) - toNumber(a.confidence_score)
  );
};

const getTrendingBetsFromAI = async () => {
  try {
    const response = await aiClient.post("/api/trends/suggestions");
    return mergeTrendSuggestions(Array.isArray(response.data) ? response.data : []);
  } catch (error) {
    console.error("AI service error:", error.message);
    return mergeTrendSuggestions();
  }
};

const getSportsTrendsFromAI = async () => {
  try {
    const response = await aiClient.get("/api/trends/sports");
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error("AI sports trends error:", error.message);
    return [];
  }
};

const combineTrendsWithDatabaseBets = async (dbBets = []) => {
  try {
    const aiSuggestions = await getTrendingBetsFromAI();

    const aiBets = aiSuggestions.map((suggestion) => ({
      ...suggestion,
      ai_confidence_score: suggestion.confidence_score,
      source: "ai",
    }));

    const databaseBets = dbBets.map((bet) => ({
      ...bet,
      source: "database",
    }));

    return [...databaseBets, ...aiBets]
      .sort((a, b) => {
        const scoreA =
          a.source === "database"
            ? toNumber(a.total_stakes)
            : toNumber(a.confidence_score);
        const scoreB =
          b.source === "database"
            ? toNumber(b.total_stakes)
            : toNumber(b.confidence_score);

        return scoreB - scoreA;
      })
      .slice(0, 30);
  } catch (error) {
    console.error("Combine AI trends error:", error.message);
    return dbBets.map((bet) => ({ ...bet, source: "database" })).slice(0, 30);
  }
};

module.exports = {
  getTrendingBetsFromAI,
  getSportsTrendsFromAI,
  combineTrendsWithDatabaseBets,
  MOCK_TREND_SUGGESTIONS,
};
