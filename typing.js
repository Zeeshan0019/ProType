// Simple game variables
let gameTime = 30 * 1000;
let timer = null;
let gameStart = null;
let currentWordIndex = 0;
let currentCharIndex = 0;
let totalTyped = 0;
let errors = 0;
let isGameActive = false;

// DOM elements
let domainSelect, newGameBtn, infoDiv, wordsDiv, gameDiv, focusMessage, resultsDiv;

// Initialize game
document.addEventListener('DOMContentLoaded', function() {
    // Get elements
    domainSelect = document.getElementById("domainSelect");
    newGameBtn = document.getElementById("newGameBtn");
    infoDiv = document.getElementById("info");
    wordsDiv = document.getElementById("words");
    gameDiv = document.getElementById("game");
    focusMessage = document.getElementById("focus-message");
    resultsDiv = document.getElementById("results");
    
    // Event listeners
    newGameBtn.addEventListener("click", () => newGame(domainSelect.value));
    domainSelect.addEventListener("change", (e) => newGame(e.target.value));
    gameDiv.addEventListener("keydown", handleKeyPress);
    gameDiv.addEventListener("click", () => gameDiv.focus());
    gameDiv.addEventListener("blur", () => {
        if (isGameActive) focusMessage.style.display = "block";
    });
    gameDiv.addEventListener("focus", () => focusMessage.style.display = "none");
    
    newGame();
});

// Get text from API
async function getText(domain) {
    try {
        const response = await fetch(`http://localhost:5000/generate?domain=${domain}&t=${Date.now()}`);
        const data = await response.json();
        return data.text || getFallbackText(domain);
    } catch (error) {
        return getFallbackText(domain);
    }
}

// Fallback texts
function getFallbackText(domain) {
    const fallbacks = {
        general: "The quick brown fox jumps over the lazy dog. This pangram contains every letter of the alphabet at least once.",
        story: "Once upon a time, there was a programmer who loved to type fast. Every day, they practiced coding skills.",
        coding: "Programming languages help us communicate with computers. JavaScript is widely used for web development."
    };
    return fallbacks[domain] || fallbacks.general;
}

// Start new game
async function newGame(domain = "general") {
    // Reset game
    clearInterval(timer);
    gameStart = null;
    currentWordIndex = 0;
    currentCharIndex = 0;
    totalTyped = 0;
    errors = 0;
    isGameActive = false;
    
    // Reset UI
    resultsDiv.classList.add('hidden');
    gameDiv.style.opacity = "1";
    gameDiv.style.pointerEvents = "auto";
    infoDiv.textContent = "Loading...";
    wordsDiv.innerHTML = "🤖 Generating content...";
    
    // Get and display text
    const text = await getText(domain);
    const words = text.split(" ").filter(word => word.length > 0);
    
    let html = "";
    words.forEach((word, index) => {
        html += `<div class="word"><span class="letter">${word.split("").join("</span><span class='letter'>")}</span></div>`;
        if (index < words.length - 1) html += " ";
    });
    
    wordsDiv.innerHTML = html;
    document.querySelector('.letter').classList.add('current');
    
    infoDiv.textContent = "30s";
    gameDiv.focus();
    updateCursor();
    
    // Scroll to top for new game
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Handle key presses
function handleKeyPress(e) {
    // Start timer
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
    
    // Block input if game ended
    if (!isGameActive) {
        e.preventDefault();
        return;
    }
    
    e.preventDefault();
    
    // Handle keys
    if (e.key === ' ') {
        handleSpace();
    } else if (e.key === 'Backspace') {
        handleBackspace();
    } else if (e.key.length === 1) {
        handleCharacter(e.key);
    }
}

// Handle character typing
function handleCharacter(char) {
    if (!isGameActive) return;
    
    const words = document.querySelectorAll('.word');
    const currentWord = words[currentWordIndex];
    
    if (!currentWord || currentCharIndex >= currentWord.children.length) return;
    
    const currentLetter = currentWord.children[currentCharIndex];
    const expectedChar = currentLetter.textContent;
    
    currentLetter.classList.remove('current');
    
    if (char === expectedChar) {
        currentLetter.classList.add('correct');
    } else {
        currentLetter.classList.add('incorrect');
        errors++;
    }
    
    currentCharIndex++;
    totalTyped++;
    
    if (currentCharIndex < currentWord.children.length) {
        currentWord.children[currentCharIndex].classList.add('current');
    }
    
    updateCursor();
}

// Handle space
function handleSpace() {
    if (!isGameActive) return;
    
    const words = document.querySelectorAll('.word');
    const currentWord = words[currentWordIndex];
    
    // Mark remaining letters wrong
    for (let i = currentCharIndex; i < currentWord.children.length; i++) {
        if (!currentWord.children[i].classList.contains('correct')) {
            currentWord.children[i].classList.add('incorrect');
            errors++;
        }
    }
    
    // Next word
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
    if (!isGameActive || currentCharIndex === 0) return;
    
    const words = document.querySelectorAll('.word');
    const currentWord = words[currentWordIndex];
    
    if (currentCharIndex < currentWord.children.length) {
        currentWord.children[currentCharIndex].classList.remove('current');
    }
    
    currentCharIndex--;
    const prevLetter = currentWord.children[currentCharIndex];
    
    prevLetter.classList.remove('correct', 'incorrect');
    prevLetter.classList.add('current');
    
    if (totalTyped > 0) totalTyped--;
    updateCursor();
}

// Update cursor
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
    const words = totalTyped / 5;
    return Math.round(words / minutes);
}

// Calculate accuracy
function getAccuracy() {
    if (totalTyped === 0) return 100;
    return Math.round(((totalTyped - errors) / totalTyped) * 100);
}

// Get performance level
function getLevel(wpm, accuracy) {
    if (accuracy < 60) return "🤥 You're Bluffing!";
    
    if (accuracy < 90) {
        if (wpm < 20) return "🌱 Beginner";
        if (wpm < 30) return "⚡ Good";
        if (wpm < 40) return "🚀 Great";
        if (wpm < 50) return "💫 Pro";
        return "🏆 Excellent";
    }
    
    if (wpm < 20) return "🌱 Beginner";
    if (wpm < 30) return "📚 Learning";
    if (wpm < 40) return "⚡ Good";
    if (wpm < 50) return "🚀 Great";
    if (wpm < 60) return "💫 Pro";
    if (wpm < 80) return "🏆 Excellent";
    return "👑 Master";
}

// End game
function endGame() {
    clearInterval(timer);
    isGameActive = false;
    
    // Disable game area
    gameDiv.blur();
    gameDiv.style.opacity = "0.7";
    gameDiv.style.pointerEvents = "none";
    document.getElementById("cursor").style.display = "none";
    
    // Calculate results
    const wpm = getWPM();
    const accuracy = getAccuracy();
    const level = getLevel(wpm, accuracy);
    
    // Update results
    document.getElementById('final-wpm').textContent = `${wpm} WPM`;
    document.getElementById('final-accuracy').textContent = `${accuracy}%`;
    document.getElementById('performance-level').textContent = level;
    
    // Special styling for bluffing
    const performanceElement = document.getElementById('performance-level');
    if (accuracy < 60) {
        performanceElement.style.color = '#ff4444';
        performanceElement.style.fontWeight = 'bold';
        performanceElement.style.animation = 'shake 0.5s ease-in-out 3';
    } else {
        performanceElement.style.color = '';
        performanceElement.style.fontWeight = '';
        performanceElement.style.animation = '';
    }
    
    // Show results with scroll
    setTimeout(() => {
        resultsDiv.classList.remove('hidden');
        resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, accuracy < 60 ? 800 : 300);
}
