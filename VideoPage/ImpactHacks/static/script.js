document.addEventListener("DOMContentLoaded", () => {
  const quotes = [
    "The only way to do great work is to love what you do. – Steve Jobs",
    "Success is not final, failure is not fatal: It is the courage to continue that counts. – Winston Churchill",
    "Believe you can and you're halfway there. – Theodore Roosevelt",
    "You are never too old to set another goal or to dream a new dream. – C.S. Lewis",
    "Act as if what you do makes a difference. It does. – William James",
    "Your limitation—it's only your imagination.",
  ];
  document.getElementById("quote").textContent =
    quotes[Math.floor(Math.random() * quotes.length)];
  
  // DOM Elements
  const searchForm = document.getElementById("search-form");
  const queryInput = document.getElementById("query");
  const videoTitle = document.getElementById("video-title");
  const videoContainer = document.getElementById("video-container");
  const transcriptControls = document.getElementById("transcript-controls");
  const subtitleControls = document.getElementById("subtitle-controls");
  const transcriptBtn = document.getElementById("transcript-btn");
  const downloadSrtBtn = document.getElementById("download-srt");
  const overlaySubtitlesBtn = document.getElementById("overlay-subtitles");
  const languageSelector = document.getElementById("language-selector");
  const transcriptSection = document.getElementById("transcript");
  const downloadNotesBtn = document.getElementById("download-notes");
  const notesTextarea = document.getElementById("notes");
  
  // Global variables
  let currentVideoId = null;
  let currentVideoTitle = null;
  let subtitlesData = null;
  let subtitleOverlayActive = false;
  let currentSubtitleIndex = 0;
  let subtitleInterval = null;
  let infoMessageTimeout = null;
  
  // Parse SRT format to object array
  function parseSRT(srtText) {
    const subtitles = [];
    const srtParts = srtText.trim().split('\n\n');
    
    for (const part of srtParts) {
      const lines = part.split('\n');
      if (lines.length < 3) continue;
      
      const index = parseInt(lines[0]);
      const timeMatch = lines[1].match(/(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/);
      
      if (!timeMatch) continue;
      
      const startTime = (
        parseInt(timeMatch[1]) * 3600 + 
        parseInt(timeMatch[2]) * 60 + 
        parseInt(timeMatch[3]) +
        parseInt(timeMatch[4]) / 1000
      );
      
      const endTime = (
        parseInt(timeMatch[5]) * 3600 + 
        parseInt(timeMatch[6]) * 60 + 
        parseInt(timeMatch[7]) +
        parseInt(timeMatch[8]) / 1000
      );
      
      const text = lines.slice(2).join(' ');
      
      subtitles.push({
        index,
        startTime,
        endTime,
        text
      });
    }
    
    return subtitles;
  }
  
  // Search Video
  searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = queryInput.value.trim();
    if (!query) {
      alert("Please enter a search query.");
      return;
    }
    
    videoContainer.innerHTML = "<p class='loading'>🔍 Searching...</p>";
    transcriptControls.style.display = "none";
    subtitleControls.style.display = "none";
    videoTitle.textContent = "Loading...";
    
    try {
      const response = await fetch("/search", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `query=${encodeURIComponent(query)}`,
      });
      const data = await response.json();
      
      if (data.error) {
        videoContainer.innerHTML = `<p class='error'>❌ ${data.error}</p>`;
        videoTitle.textContent = "Error";
      } else {
        currentVideoId = data.id;
        currentVideoTitle = data.title;
        videoTitle.textContent = data.title;
        
        // Create YouTube player
        videoContainer.innerHTML = `
          <div class="video-wrapper">
            <iframe 
              id="youtube-player" 
              src="https://www.youtube.com/embed/${data.id}?enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}" 
              frameborder="0" 
              allowfullscreen
            ></iframe>
            <div id="subtitles-display" class="subtitles-overlay" style="display: none;"></div>
          </div>
        `;
        
        transcriptControls.style.display = "flex";
        transcriptBtn.dataset.videoId = data.id;
      }
    } catch (error) {
      videoContainer.innerHTML = "<p class='error'>❌ Failed to fetch videos. Try again.</p>";
      videoTitle.textContent = "Error";
    }
  });
  
  // Generate Transcript
  transcriptBtn.addEventListener("click", async () => {
    const videoId = transcriptBtn.dataset.videoId;
    if (!videoId) return;
    
    const selectedLanguage = languageSelector.value;
    transcriptSection.innerHTML = "<p class='loading'>📜 Fetching transcript...</p>";
    
    try {
      const response = await fetch("/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `video_id=${encodeURIComponent(videoId)}&language=${encodeURIComponent(selectedLanguage)}`,
      });
      const data = await response.json();
      
      if (data.transcript) {
        transcriptSection.innerHTML = `<pre>${data.transcript}</pre>`;
        subtitlesData = parseSRT(data.transcript);
        subtitleControls.style.display = "flex"; // Show subtitle controls
      } else {
        transcriptSection.innerHTML = `<p class='error'>❌ No transcript available.</p>`;
        subtitleControls.style.display = "none";
      }
    } catch {
      transcriptSection.innerHTML = "<p class='error'>❌ Error fetching transcript.</p>";
      subtitleControls.style.display = "none";
    }
  });
  
  // Download SRT
  downloadSrtBtn.addEventListener("click", () => {
    if (!subtitlesData) {
      alert("Please generate a transcript first.");
      return;
    }
    
    const srtText = document.getElementById("transcript").innerText;
    const blob = new Blob([srtText], { type: "text/srt" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentVideoTitle || 'transcript'}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
  
  // Handle messages from YouTube iframe
  function handleYouTubeMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      // Handle player state updates (1 = playing, 2 = paused)
      if (data.event === "infoDelivery" && data.info && data.info.playerState !== undefined) {
        const playerState = data.info.playerState;
        const isPaused = playerState !== 1; // 1 = playing
        
        // Only update subtitles if video is playing
        if (isPaused) {
          // Video is paused, stop updating subtitles
          return;
        }
      }
      
      // Handle time updates
      if (data.event === "infoDelivery" && data.info && data.info.currentTime !== undefined) {
        updateSubtitleDisplay(data.info.currentTime);
      }
    } catch (e) {
      // Not a JSON message or other error
      // console.log("Error parsing YouTube player message:", e);
    }
  }
  
  // Set up YouTube player for better integration
  function setupYouTubePlayer() {
    const youtubePlayer = document.getElementById("youtube-player");
    if (!youtubePlayer) return;
    
    // Get the current src
    const currentSrc = youtubePlayer.src;
    
    // If we need to modify the embed to enable API and handle fullscreen better
    if (!currentSrc.includes('enablejsapi=1') || !currentSrc.includes('origin=')) {
      // Add or update parameters for better API interaction
      const updatedSrc = currentSrc.includes('?') 
        ? `${currentSrc}&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`
        : `${currentSrc}?enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
      
      youtubePlayer.src = updatedSrc;
    }
    
    // Create the subtitle display with text and info elements
    const subtitlesDisplay = document.getElementById("subtitles-display");
    subtitlesDisplay.innerHTML = `
      <div class="subtitle-text"></div>
      <div class="subtitle-info">Note: Subtitles won't appear in fullscreen mode</div>
    `;
    
    // Style the subtitle elements
    const infoStyle = document.createElement('style');
    infoStyle.textContent = `
      .subtitle-text { font-size: 18px; margin-bottom: 5px; }
      .subtitle-info { font-size: 14px; opacity: 0.8; }
    `;
    document.head.appendChild(infoStyle);
    
    // Set timeout to hide the info message after 2 seconds
    if (infoMessageTimeout) {
      clearTimeout(infoMessageTimeout);
    }
    
    infoMessageTimeout = setTimeout(() => {
      const infoElement = subtitlesDisplay.querySelector('.subtitle-info');
      if (infoElement) {
        infoElement.style.display = 'none';
      }
    }, 2000);
  }
  
  // Overlay Subtitles - Improved Version
  overlaySubtitlesBtn.addEventListener("click", () => {
    if (!subtitlesData || subtitlesData.length === 0) {
      alert("Please generate a transcript first.");
      return;
    }
    
    const subtitlesDisplay = document.getElementById("subtitles-display");
    
    // Toggle subtitles overlay
    if (subtitleOverlayActive) {
      // Turn off subtitles
      subtitlesDisplay.style.display = "none";
      clearInterval(subtitleInterval);
      overlaySubtitlesBtn.textContent = "Overlay Subtitles";
      subtitleOverlayActive = false;
      
      // Clear the info message timeout
      if (infoMessageTimeout) {
        clearTimeout(infoMessageTimeout);
        infoMessageTimeout = null;
      }
      
      // Remove message listener when turning off subtitles
      window.removeEventListener('message', handleYouTubeMessage);
    } else {
      // Turn on subtitles
      subtitlesDisplay.style.display = "block";
      overlaySubtitlesBtn.textContent = "Hide Subtitles";
      subtitleOverlayActive = true;
      
      // Get YouTube player iframe
      const youtubePlayer = document.getElementById("youtube-player");
      if (!youtubePlayer) {
        alert("YouTube player not found.");
        return;
      }
      
      // Initialize the YouTube iframe API if not already done
      if (!window.YT) {
        // Add YouTube iframe API script
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        
        // Set up global callback for when API is ready
        window.onYouTubeIframeAPIReady = function() {
          setupYouTubePlayer();
        };
      } else {
        setupYouTubePlayer();
      }
      
      // Set up message listener to handle player state and time updates
      window.addEventListener('message', handleYouTubeMessage);
      
      // Poll for player state and time
      subtitleInterval = setInterval(() => {
        if (youtubePlayer && youtubePlayer.contentWindow) {
          youtubePlayer.contentWindow.postMessage(JSON.stringify({
            event: "listening",
            id: youtubePlayer.id
          }), "*");
          
          youtubePlayer.contentWindow.postMessage(JSON.stringify({
            event: "command",
            func: "getPlayerState",
            args: []
          }), "*");
          
          youtubePlayer.contentWindow.postMessage(JSON.stringify({
            event: "command",
            func: "getCurrentTime",
            args: []
          }), "*");
        }
      }, 500);
    }
  });
  
  // Update subtitle display based on current video time
  function updateSubtitleDisplay(currentTime) {
    if (!subtitlesData || !subtitleOverlayActive) return;
    
    const subtitlesDisplay = document.getElementById("subtitles-display");
    if (!subtitlesDisplay) return;
    
    const subtitleTextElement = subtitlesDisplay.querySelector('.subtitle-text');
    if (!subtitleTextElement) return;
    
    let foundSubtitle = false;
    
    // Find the subtitle that should be displayed at the current time
    for (const subtitle of subtitlesData) {
      if (currentTime >= subtitle.startTime && currentTime <= subtitle.endTime) {
        subtitleTextElement.textContent = subtitle.text;
        foundSubtitle = true;
        break;
      }
    }
    
    // No subtitle at current time
    if (!foundSubtitle) {
      subtitleTextElement.textContent = "";
    }
  }
  
  // Download Notes
  downloadNotesBtn.addEventListener("click", () => {
    const notes = notesTextarea.value;
    if (!notes) {
      alert("Please write some notes before downloading.");
      return;
    }
    
    const blob = new Blob([notes], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "study_notes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
});