"""
/*********************************************************
 Author:                Philip Awazie Donvip
 Year Created:          2026
 Description:           Mock trend generation and bet suggestion helpers for AI insights.
 Modified By:           Philip Awazie Donvip
 Modified Date:         2026-05-31
 Modification Notes:    Added traceable comments for debugging, handoff, undo, and redo review.
*********************************************************/
"""

# ========================================================
# Imports, dependencies, and module setup
# ========================================================

from typing import List
import random


def get_mock_sports_trends() -> List[dict]:
    """Return mock sports trends"""
    return [
        {
            "title": "Who will win Super Bowl 2026?",
            "category": "sports",
            "trend_score": random.uniform(85, 100),
            "url": None,
        },
        {
            "title": "Will LeBron James become all-time leading scorer?",
            "category": "sports",
            "trend_score": random.uniform(80, 95),
            "url": None,
        },
        {
            "title": "Who will win Champions League 2026?",
            "category": "sports",
            "trend_score": random.uniform(75, 90),
            "url": None,
        },
        {
            "title": "Will Messi win another World Cup?",
            "category": "sports",
            "trend_score": random.uniform(90, 100),
            "url": None,
        },
        {
            "title": "Who will be NFL MVP 2026?",
            "category": "sports",
            "trend_score": random.uniform(70, 85),
            "url": None,
        },
    ]


def get_mock_finance_trends() -> List[dict]:
    """Return mock finance trends"""
    return [
        {
            "title": "Will Bitcoin reach $100K by end of 2026?",
            "category": "finance",
            "trend_score": random.uniform(88, 100),
            "url": None,
        },
        {
            "title": "Will Tesla stock double in 2026?",
            "category": "finance",
            "trend_score": random.uniform(75, 90),
            "url": None,
        },
        {
            "title": "Will US stock market crash in 2026?",
            "category": "finance",
            "trend_score": random.uniform(70, 85),
            "url": None,
        },
        {
            "title": "Will Ethereum reach $10K?",
            "category": "finance",
            "trend_score": random.uniform(82, 95),
            "url": None,
        },
        {
            "title": "Will Nigeria adopt crypto as legal tender?",
            "category": "finance",
            "trend_score": random.uniform(65, 80),
            "url": None,
        },
    ]


def get_mock_politics_trends() -> List[dict]:
    """Return mock politics trends"""
    return [
        {
            "title": "Who will win 2026 US midterm elections?",
            "category": "politics",
            "trend_score": random.uniform(80, 95),
            "url": None,
        },
        {
            "title": "Will Trump win 2028 presidential election?",
            "category": "politics",
            "trend_score": random.uniform(85, 100),
            "url": None,
        },
        {
            "title": "Will Brexit deal change in 2026?",
            "category": "politics",
            "trend_score": random.uniform(60, 75),
            "url": None,
        },
        {
            "title": "Who will be next UK Prime Minister?",
            "category": "politics",
            "trend_score": random.uniform(70, 85),
            "url": None,
        },
        {
            "title": "Will Nigeria win AFCON 2026?",
            "category": "politics",
            "trend_score": random.uniform(75, 90),
            "url": None,
        },
    ]


def get_mock_entertainment_trends() -> List[dict]:
    """Return mock entertainment trends"""
    return [
        {
            "title": "Who will win Oscar 2026 Best Picture?",
            "category": "entertainment",
            "trend_score": random.uniform(75, 90),
            "url": None,
        },
        {
            "title": "Will Taylor Swift release new album in 2026?",
            "category": "entertainment",
            "trend_score": random.uniform(88, 100),
            "url": None,
        },
        {
            "title": "Who will host SNL next?",
            "category": "entertainment",
            "trend_score": random.uniform(65, 80),
            "url": None,
        },
        {
            "title": "Will Game of Thrones prequel succeed?",
            "category": "entertainment",
            "trend_score": random.uniform(70, 85),
            "url": None,
        },
        {
            "title": "Who will win Emmy 2026?",
            "category": "entertainment",
            "trend_score": random.uniform(72, 87),
            "url": None,
        },
    ]


def combine_trends() -> List[dict]:
    """Combine all trends and sort by score"""
    all_trends = []
    all_trends.extend(get_mock_sports_trends())
    all_trends.extend(get_mock_finance_trends())
    all_trends.extend(get_mock_politics_trends())
    all_trends.extend(get_mock_entertainment_trends())

    # Sort by trend_score descending
    all_trends.sort(key=lambda x: x["trend_score"], reverse=True)

    return all_trends[:20]


def generate_bet_suggestions(trends: List[dict]) -> List[dict]:
    """Convert trends to bet suggestions"""
    suggestions = []

    for trend in trends:
        suggestion = {
            "topic": trend["title"],
            "outcome_a": "Yes",
            "outcome_b": "No",
            "category": trend["category"],
            "confidence_score": trend["trend_score"],
            "trend_reason": f"Trending with score {trend['trend_score']:.2f}",
        }
        suggestions.append(suggestion)

    return suggestions
