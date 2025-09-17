// Game variables - simple and clear
let gameTime = 30 * 1000; // 30 seconds in milliseconds
let timer = null;
let gameStart = null;
let currentWordIndex = 0;
let currentCharIndex = 0;
let totalTyped = 0;
let errors = 0;
let isGameActive = false;

// DOM elements
let domainSelect, newGameBtn, infoDiv, wordsDiv, gameDiv, focusMessage, resultsDiv;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('ProType initialized');
    
    // Get DOM elements
    domainSelect = document.getElementById("domainSelect");
    newGameBtn = document.getElementById("newGameBtn");
    infoDiv = document.getElementById("info");
    wordsDiv = document.getElementById("words");
    gameDiv = document.getElementById("game");
    focusMessage = document.getElementById("focus-message");
    resultsDiv = document.getElementById("results");
    
    // Set up event listeners
    setupEventListeners();
    
    // Start first game
    newGame();
});

// Set up all event listeners
function setupEventListeners() {
    // New game button
    newGameBtn.addEventListener("click", () => {
        newGame(domainSelect.value);
    });

    // Domain change
    domainSelect.addEventListener("change", (e) => {
        newGame(e.target.value);
    });

    // Keyboard input
    gameDiv.addEventListener("keydown", handleKeyPress);
    gameDiv.addEventListener("click", () => gameDiv.focus());
    
    // Focus management
    gameDiv.addEventListener("blur", () => {
        if (isGameActive) {
            focusMessage.style.display = "block";
        }
    });
    
    gameDiv.addEventListener("focus", () => {
        focusMessage.style.display = "none";
    });
}

// Format word for display
function formatWord(word) {
    return `<div class="word"><span class="letter">${word.split("").join("</span><span class='letter'>")}</span></div>`;
}

// Get text from API
async function getText(domain) {
    try {
        const response = await fetch(`http://localhost:5000/generate?domain=${domain}&t=${Date.now()}`);
        const data = await response.json();
        
        if (data.text) {
            return data.text;
        } else {
            throw new Error('No text received');
        }
    } catch (error) {
        console.log('Using fallback text');
        
        // Simple fallback texts
        const fallbacks = {
            general: "The quick brown fox jumps over the lazy dog. This pangram contains every letter of the alphabet at least once. It is commonly used for typing practice.",
            story: "Once upon a time, there was a programmer who loved to type fast. Every day, they practiced their skills to become better at coding and writing.",
            coding: "Programming languages help us communicate with computers. JavaScript is widely used for web development. Functions and variables are basic building blocks."
        };
        
        return fallbacks[domain] || fallbacks.general;
    }
}

// Start new game
async function newGame(domain = "general") {
    console.log(`Starting new game: ${domain}`);
    
    // Reset everything
    clearInterval(timer);
    gameStart = null;
    currentWordIndex = 0;
    currentCharIndex = 0;
    totalTyped = 0;
    errors = 0;
    isGameActive = false;
    
    // Hide results
    resultsDiv.classList.add('hidden');
    
    // Show loading
    infoDiv.textContent = "Loading...";
    wordsDiv.innerHTML = "🤖 Generating content...";
    
    // Get text and display it
    const text = await getText(domain);
    const words = text.split(" ").filter(word => word.length > 0);
    
    // Create word elements
    let html = "";
    words.forEach((word, index) => {
        html += formatWord(word);
        if (index < words.length - 1) html += " ";
    });
    
    wordsDiv.innerHTML = html;
    
    // Set first letter as current
    const firstLetter = document.querySelector('.letter');
    if (firstLetter) {
        firstLetter.classList.add('current');
    }
    
    // Reset display
    infoDiv.textContent = "30s";
    gameDiv.focus();
    updateCursor();
    
    console.log(`Game ready with ${words.length} words`);
}

// Handle key presses
function handleKeyPress(e) {
    // Start timer on first key
    if (!gameStart) {
        gameStart = Date.now();
        isGameActive = true;
        
        timer = setInterval(() => {
            const elapsed = Date.now() - gameStart;
            const timeLeft = Math.max(0, Math.round((gameTime - elapsed) / 1000));
            
            if (timeLeft > 0) {
                const wpm = getWPM();
                const accuracy = getAccuracy();
                infoDiv.textContent = `${timeLeft}s | ${wpm} WPM | ${accuracy}%`;
            } else {
                endGame();
            }
        }, 100);
    }
    
    if (!isGameActive) return;
    
    e.preventDefault();
    
    // Handle different keys
    if (e.key === ' ') {
        handleSpace();
    } else if (e.key === 'Backspace') {
        handleBackspace();
    } else if (e.key.length === 1) {
        handleCharacter(e.key);
    }
}

// Handle typing a character
function handleCharacter(char) {
    const words = document.querySelectorAll('.word');
    const currentWord = words[currentWordIndex];
    
    if (!currentWord || currentCharIndex >= currentWord.children.length) return;
    
    const currentLetter = currentWord.children[currentCharIndex];
    const expectedChar = currentLetter.textContent;
    
    // Remove current highlight
    currentLetter.classList.remove('current');
    
    // Check if correct
    if (char === expectedChar) {
        currentLetter.classList.add('correct');
    } else {
        currentLetter.classList.add('incorrect');
        errors++;
    }
    
    currentCharIndex++;
    totalTyped++;
    
    // Move to next letter
    if (currentCharIndex < currentWord.children.length) {
        currentWord.children[currentCharIndex].classList.add('current');
    }
    
    updateCursor();
}

// Handle space key
function handleSpace() {
    const words = document.querySelectorAll('.word');
    const currentWord = words[currentWordIndex];
    
    // Mark remaining letters as wrong
    for (let i = currentCharIndex; i < currentWord.children.length; i++) {
        if (!currentWord.children[i].classList.contains('correct')) {
            currentWord.children[i].classList.add('incorrect');
            errors++;
        }
    }
    
    // Move to next word
    if (currentWordIndex < words.length - 1) {
        currentWordIndex++;
        currentCharIndex = 0;
        words[currentWordIndex].children[0].classList.add('current');
        updateCursor();
    } else {
        endGame();
    }
}

// Handle backspace
function handleBackspace() {
    if (currentCharIndex > 0) {
        const words = document.querySelectorAll('.word');
        const currentWord = words[currentWordIndex];
        
        // Remove current highlight
        if (currentCharIndex < currentWord.children.length) {
            currentWord.children[currentCharIndex].classList.remove('current');
        }
        
        // Go back one character
        currentCharIndex--;
        const prevLetter = currentWord.children[currentCharIndex];
        
        // Reset previous letter
        prevLetter.classList.remove('correct', 'incorrect');
        prevLetter.classList.add('current');
        
        if (totalTyped > 0) totalTyped--;
        updateCursor();
    }
}

// Update cursor position
function updateCursor() {
    const cursor = document.getElementById("cursor");
    const words = document.querySelectorAll('.word');
    const currentWord = words[currentWordIndex];
    
    if (currentWord && currentCharIndex < currentWord.children.length) {
        const currentLetter = currentWord.children[currentCharIndex];
        const gameRect = gameDiv.getBoundingClientRect();
        const letterRect = currentLetter.getBoundingClientRect();
        
        cursor.style.left = (letterRect.left - gameRect.left) + "px";
        cursor.style.top = (letterRect.top - gameRect.top) + "px";
        cursor.style.display = "block";
    }
}

// Calculate WPM
function getWPM() {
    if (!gameStart) return 0;
    const minutes = (Date.now() - gameStart) / 60000;
    const words = totalTyped / 5; // 5 characters = 1 word
    return Math.round(words / minutes);
}

// Calculate accuracy percentage
function getAccuracy() {
    if (totalTyped === 0) return 100;
    return Math.round(((totalTyped - errors) / totalTyped) * 100);
}

// Get performance level
// Enhanced performance level calculation with accuracy penalty
function getLevel(wpm, accuracy) {
    // Critical accuracy threshold - below 50% gets poor ratings
    if (accuracy < 60) {
        return "⚠️ Below Average";
    }
    

    
    // Good accuracy (80%+) - standard performance levels
    if (accuracy < 90) {
        if (wpm < 20) return "🌱 Beginner";
        if (wpm < 30) return "⚡ Improving";
        if (wpm < 40) return "🚀 Good";
        if (wpm < 50) return "💫 Great"; 
        return "🏆 Excellent"; // Cap at excellent for good accuracy
    }
    
    // Excellent accuracy (90%+) - all levels available
    if (wpm < 20) return "🌱 Beginner";
    if (wpm < 30) return "📚 Learning";
    if (wpm < 40) return "⚡ Improving";
    if (wpm < 50) return "🚀 Good";
    if (wpm < 60) return "💫 Great";
    if (wpm < 80) return "🏆 Excellent";
    return "👑 Master";
}


// End game and show results
function endGame() {
    clearInterval(timer);
    isGameActive = false;
    
    const wpm = getWPM();
    const accuracy = getAccuracy();
    const level = getLevel(wpm);
    
    // Update results display
    document.getElementById('final-wpm').textContent = `${wpm} WPM`;
    document.getElementById('final-accuracy').textContent = `${accuracy}%`;
    document.getElementById('performance-level').textContent = level;
    
    // Show results
    resultsDiv.classList.remove('hidden');
    
    // Hide cursor
    document.getElementById("cursor").style.display = "none";
    
    console.log(`Game ended: ${wpm} WPM, ${accuracy}% accuracy`);
}
