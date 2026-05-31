from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
import os

# Import services
from services.trends import (
    get_mock_sports_trends,
    get_mock_finance_trends,
    get_mock_politics_trends,
    get_mock_entertainment_trends,
    combine_trends,
    generate_bet_suggestions,
)

load_dotenv()

app = FastAPI(
    title="Lets Bet AI Service",
    description="AI-powered trending bet suggestions",
    version="1.0.0",
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models
class TrendResponse(BaseModel):
    title: str
    category: str
    trend_score: float
    url: Optional[str] = None


class BetSuggestion(BaseModel):
    topic: str
    outcome_a: str
    outcome_b: str
    category: str
    confidence_score: float
    trend_reason: str


class PersonalizedRequest(BaseModel):
    user_id: str
    user_history: Optional[List[dict]] = None


class HomeResponse(BaseModel):
    message: str
    version: str
    endpoints: List[str]


@app.get("/", response_model=HomeResponse)
async def root():
    return HomeResponse(
        message="Lets Bet AI Service is running",
        version="1.0.0",
        endpoints=[
            "/api/trends/global",
            "/api/trends/sports",
            "/api/trends/finance",
            "/api/trends/suggestions",
            "/api/trends/personalized",
        ],
    )


@app.get("/api/trends/global", response_model=List[TrendResponse])
async def get_global_trends():
    """Get all trending topics from all categories"""
    trends = combine_trends()
    return trends


@app.get("/api/trends/sports", response_model=List[TrendResponse])
async def get_sports_trends():
    """Get trending sports topics"""
    return get_mock_sports_trends()


@app.get("/api/trends/finance", response_model=List[TrendResponse])
async def get_finance_trends():
    """Get trending finance topics"""
    return get_mock_finance_trends()


@app.get("/api/trends/politics", response_model=List[TrendResponse])
async def get_politics_trends():
    """Get trending politics topics"""
    return get_mock_politics_trends()


@app.get("/api/trends/entertainment", response_model=List[TrendResponse])
async def get_entertainment_trends():
    """Get trending entertainment topics"""
    return get_mock_entertainment_trends()


@app.post("/api/trends/suggestions", response_model=List[BetSuggestion])
async def get_bet_suggestions():
    """Get AI-powered bet suggestions"""
    trends = combine_trends()
    suggestions = generate_bet_suggestions(trends)
    return suggestions[:10]


@app.post("/api/trends/personalized", response_model=List[BetSuggestion])
async def get_personalized_suggestions(request: PersonalizedRequest):
    """Get personalized bet suggestions for user"""
    # For now, return generic suggestions.
    # Will implement personalization based on user_history later.
    trends = combine_trends()
    suggestions = generate_bet_suggestions(trends)

    # Future: Filter based on user's preferred categories.
    if request.user_history:
        preferred_categories = set()
        for bet in request.user_history:
            if "category" in bet:
                preferred_categories.add(bet["category"])

        if preferred_categories:
            suggestions = [
                suggestion
                for suggestion in suggestions
                if suggestion["category"] in preferred_categories
            ]

    return suggestions[:10]


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
