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

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const AI_TIMEOUT_MS = Number(process.env.AI_SERVICE_TIMEOUT_MS || 5000);

const aiClient = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: AI_TIMEOUT_MS,
});

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getTrendingBetsFromAI = async () => {
  try {
    const response = await aiClient.post("/api/trends/suggestions");
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error("AI service error:", error.message);
    return [];
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
};
