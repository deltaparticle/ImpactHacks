# Students4Students

An innovative learning platform that leverages AI to provide personalized educational resources, multilingual support, and enhanced learning experiences.

## Overview

This platform aims to revolutionize online learning by:
- Empowering learners with AI-driven recommendations
- Providing automatic transcription and multilingual support
- Enhancing accessibility and engagement
- Improving learning effectiveness through personalized content

## Core Features

### Personalized Topic Recommendations
- **Proficiency-based Learning**: Select your expertise level (Beginner, Intermediate, Advanced)
- **AI-Generated Topics**: Receive relevant topic suggestions based on your proficiency

### Smart YouTube Course Integration
- **Intelligent Video Search**: Automatically finds the most relevant educational videos
- **Advanced Ranking Algorithm**: Selects videos using a weighted scoring system:
  - Likes (15%)
  - Views (15%)
  - Likes-to-View Ratio (30%)
  - Sentiment Score (40%)

### Multilingual Transcript Generation
- **Automatic Transcription**: Generates video transcripts in multiple languages
- **Regional Language Support**: Includes languages like Assamese, Manipuri, and more
- **SRT File Creation**: Enables easy subtitle overlay for better comprehension

### Video Summaries
- **Concise Content Overviews**: AI-generated summaries of video content
- **Language Selection**: View summaries in your preferred language
- **Key Points Extraction**: Focus on the most important concepts

### Study Notes System
- **Integrated Note-Taking**: Type, save, and edit notes while watching videos
- **Persistent Storage**: All notes are saved for future reference
- **Easy Retrieval**: Quick access to your learning materials

### AI Learning Companion
- **Intelligent Chatbot**: Ask questions and receive immediate assistance
- **Learning Guidance**: Get help navigating complex topics

### Motivational Elements
- **Quote Generator**: Receive fresh motivational quotes to boost engagement
- **Learning Encouragement**: Stay motivated throughout your learning journey

## Technical Stack

### Frontend
- HTML, CSS, JavaScript

### Backend
- Python (Flask framework)

### Key Integrations
- YouTube API for video retrieval and metadata
- Sentiment analysis for video ranking
- Groq API for AI chatbot functionality
- SRT generation for subtitles and transcripts

## User Flow

1. Select proficiency level and enter a learning objective
2. Receive AI-generated topic suggestions
3. Get ranked YouTube video recommendations based on your topics
4. Access video transcripts and summaries in your preferred language
5. Take notes while learning
6. Interact with the AI assistant for additional help
7. Stay motivated with inspirational quotes

## API Keys Required

- YouTube Data API
- Groq API (for LLM integration)

## Link for landing page on HuggingFace Spaces
https://huggingface.co/spaces/delta-praticle/ImpactHacks


## License

This project is licensed under the MIT License - see the LICENSE file for details.
