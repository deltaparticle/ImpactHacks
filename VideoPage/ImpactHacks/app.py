from flask import Flask, render_template, request, jsonify
import requests
from youtube_transcript_api import YouTubeTranscriptApi
from deep_translator import GoogleTranslator
import re
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# YouTube API details
API_KEY = "AIzaSyCBGZ7YB1iigqU4QbZjH2oQ2Ca0plAGyoQ"
YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
YOUTUBE_VIDEO_STATS_URL = "https://www.googleapis.com/youtube/v3/videos"

# Dictionary of supported Northeast Indian languages
LANGUAGES = {
    "as": "Assamese",
    "mni": "Meiteilon (Manipuri)",
    "lus": "Mizo"
}

def get_top_video(search_query):
    """Fetch top 20 videos and choose the one with the best like-to-view ratio."""
    logger.info(f"Searching for videos with query: {search_query}")
    search_params = {
        "part": "snippet",
        "q": search_query,
        "type": "video",
        "maxResults": 20,
        "key": API_KEY
    }
    response = requests.get(YOUTUBE_SEARCH_URL, params=search_params).json()
    video_list = []
   
    if "items" in response:
        for item in response["items"]:
            video_id = item["id"]["videoId"]
            title = item["snippet"]["title"]
            stats_params = {"part": "statistics", "id": video_id, "key": API_KEY}
            stats_data = requests.get(YOUTUBE_VIDEO_STATS_URL, params=stats_params).json()
            if "items" in stats_data and len(stats_data["items"]) > 0:
                stats = stats_data["items"][0]["statistics"]
                views = int(stats.get("viewCount", 1))
                likes = int(stats.get("likeCount", 1))
                ratio = likes / views if views > 0 else 0
                video_list.append((video_id, title, ratio))
   
    if not video_list:
        logger.warning("No videos found for the query")
        return None
   
    best_video = max(video_list, key=lambda x: x[2])
    logger.info(f"Selected video ID: {best_video[0]}, Title: {best_video[1]}")
    return {"id": best_video[0], "title": best_video[1]}

def fetch_transcript(video_id, target_lang="as"):
    """Fetch transcript, convert it into SRT format, and translate it."""
    logger.info(f"Fetching transcript for video ID: {video_id}, target language: {target_lang}")
    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        logger.info(f"Successfully retrieved transcript with {len(transcript)} entries")
    except Exception as e:
        logger.error(f"Error getting transcript: {str(e)}")
        return "Transcript not available for this video."
    
    def format_time(seconds):
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds % 1) * 1000)
        return f"{hours:02}:{minutes:02}:{secs:02},{millis:03}"
    
    srt_text = ""
    
    # Check if language is supported
    if target_lang not in LANGUAGES:
        logger.warning(f"Unsupported language code: {target_lang}, defaulting to Assamese")
        target_lang = "as"  # Default to Assamese if invalid
    
    for i, entry in enumerate(transcript, 1):
        start_time = format_time(entry['start'])
        end_time = format_time(entry['start'] + entry['duration'])
        
        # Translate each caption line
        try:
            translated_text = GoogleTranslator(source="auto", target=target_lang).translate(entry["text"])
            logger.debug(f"Translated text: {translated_text}")
        except Exception as e:
            logger.error(f"Translation error: {str(e)}")
            # Fallback if translation fails
            translated_text = entry["text"] + " (Translation failed)"
        
        srt_text += f"{i}\n{start_time} --> {end_time}\n{translated_text}\n\n"
   
    return srt_text

# Groq API Configuration
GROQ_API_KEY = "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"  # Replace with your actual API key
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"


# Function to fetch YouTube transcript
def get_transcript(video_id):
    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        transcript_text = " ".join([entry['text'] for entry in transcript])
        return transcript_text
    except Exception as e:
        print("Error fetching transcript:", e)
        return None

# Function to get summary from Groq API
def generate_summary(transcript_text):
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "mixtral-8x7b-32768",
        "messages": [
            {"role": "system", "content": "You are an AI assistant that summarizes an educational YouTube video transcript. Provide a summary using the transcript which can be used by the user for revision such that it goes over all the important concepts."},
            {"role": "user", "content": f"Summarize the following transcript: {transcript_text}"}
        ],
        "max_tokens": 1024
    }

    try:
        response = requests.post(GROQ_API_URL, headers=headers, json=payload)
        response.raise_for_status()
        result = response.json()
        return result["choices"][0]["message"]["content"].strip()
    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err}")
    except Exception as e:
        print("Error calling Groq API:", e)
    return None


def translate_large_text(texts, source_lang="en", target_lang="as"):
    """Translates large text chunks while maintaining SRT format"""
    translator = GoogleTranslator(source=source_lang, target=target_lang)
    translated_text = translator.translate(texts)
    return translated_text

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/search", methods=["POST"])
def search():
    query = request.form.get("query")
    logger.info(f"Search request received with query: {query}")
    top_video = get_top_video(query)
    if not top_video:
        return jsonify({"error": "No videos found."})
    return jsonify(top_video)

@app.route("/transcript", methods=["POST"])
def transcript():
    video_id = request.form.get("video_id")
    language = request.form.get("language", "as")
    logger.info(f"Transcript request received for video ID: {video_id}, language: {language}")
    srt_text = fetch_transcript(video_id, language)
    return jsonify({"transcript": srt_text})

if __name__ == "__main__":
    app.run(debug=True)
    video_id = "7fSHTqM8gHs"  # Replace with the YouTube video ID

    transcript_text = get_transcript(video_id)
    summary = generate_summary(transcript_text)
    if summary:
            translated_texts = translate_large_text(summary, source_lang="en", target_lang="as")
            print(translated_texts)
    else:
            print("Failed to generate summary.")
