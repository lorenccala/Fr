document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const modeSelect = document.getElementById('mode');
    const chunkSizeInput = document.getElementById('chunkSize');
    const currentChunkSelect = document.getElementById('currentChunk');
    const applyChunkSettingsBtn = document.getElementById('applyChunkSettings');

    const targetSentenceTextEl = document.getElementById('targetSentenceText');
    const englishSentenceTextEl = document.getElementById('englishSentenceText');
    const albanianSentenceTextEl = document.getElementById('albanianSentenceText');
    const verbTextEl = document.getElementById('verbText');
    const verbEnglishTextEl = document.getElementById('verbEnglishText');
    const verbAlbanianTextEl = document.getElementById('verbAlbanianText');
    const revealAnswerBtn = document.getElementById('revealAnswerBtn');

    const sentenceAudio = document.getElementById('sentenceAudio');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const prevSentenceBtn = document.getElementById('prevSentenceBtn');
    const nextSentenceBtn = document.getElementById('nextSentenceBtn');
    const loopBtn = document.getElementById('loopBtn');
    const playbackSpeedSelect = document.getElementById('playbackSpeed');

    const currentSentenceNumEl = document.getElementById('currentSentenceNum');
    const totalSentencesInChunkEl = document.getElementById('totalSentencesInChunk');
    const totalSentencesEl = document.getElementById('totalSentences');

    const playAllChunkAudioBtn = document.getElementById('playAllChunkAudioBtn');
    Number.prototype.pad = function(size) {
      var s = String(this);
      while (s.length < (size || 2)) {s = "0" + s;}
      return s;
    }
    const stopAllAudioBtn = document.getElementById('stopAllAudioBtn');
    const continuousPlayStatusEl = document.getElementById('continuousPlayStatus');

    const easyPracticeTimeInput = document.getElementById('easyPracticeTime');
    const startEasyPracticeTimerBtn = document.getElementById('startEasyPracticeTimerBtn');
    const timerDisplayEl = document.getElementById('timerDisplay');
    const switchToNativeBtn = document.getElementById('switchToNativeBtn');

    // --- App State ---
    let allSentences = [];
    let currentChunkSentences = [];
    let currentSentenceIndex = 0;
    let currentMode = 'readListen';
    let isLooping = false;
    let isContinuousPlaying = false;
    let continuousPlayCurrentIndex = 0;
    let nativeSwitchTimerInterval;
    let isAudioPlaying = false;

    // --- Core Functions ---
    async function loadSentenceData() {
        try {
            const response = await fetch('data/data.json');
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            allSentences = await response.json();
            if (totalSentencesEl) totalSentencesEl.textContent = allSentences.length;

            if (allSentences.length > 0) {
                populateChunkSelector();
                applyChunkSettings();
            } else {
                displayError("No sentences found in data.json.");
                disableControls();
            }
        } catch (error) {
            console.error('Error loading sentence data:', error);
            displayError(`Error: ${error.message}. Make sure 'data/data.json' exists and is accessible.`);
            disableControls();
        }
    }

    function populateChunkSelector() {
        if (!chunkSizeInput || !currentChunkSelect) return;
        let chunkSize = parseInt(chunkSizeInput.value, 10);
        if (isNaN(chunkSize) || chunkSize <= 0) {
            chunkSize = 10;
            chunkSizeInput.value = "10";
        }
        currentChunkSelect.innerHTML = '';
        if (allSentences.length === 0) return;
        const numChunks = Math.ceil(allSentences.length / chunkSize);
        for (let i = 0; i < numChunks; i++) {
            const option = document.createElement('option');
            option.value = i;
            const startNum = i * chunkSize + 1;
            const endNum = Math.min((i + 1) * chunkSize, allSentences.length);
            option.textContent = `Chunk ${i + 1} (Sentences ${startNum} - ${endNum})`;
            currentChunkSelect.appendChild(option);
        }
    }

    function applyChunkSettings() {
        if (!chunkSizeInput || !currentChunkSelect) return;
        let chunkSize = parseInt(chunkSizeInput.value, 10);
        if (isNaN(chunkSize) || chunkSize <= 0) {
            chunkSize = 10;
            chunkSizeInput.value = "10";
        }
        const selectedChunkIndex = parseInt(currentChunkSelect.value, 10) || 0;
        const startIndex = selectedChunkIndex * chunkSize;
        const endIndex = Math.min(startIndex + chunkSize, allSentences.length);
        currentChunkSentences = allSentences.slice(startIndex, endIndex);
        currentSentenceIndex = 0;
        stopContinuousPlay();
        if (currentChunkSentences.length > 0) {
            displaySentence();
        } else {
            clearSentenceDisplay();
            if (targetSentenceTextEl) targetSentenceTextEl.textContent = "No sentences in this chunk.";
            updateSentenceCounter();
        }
    }

    function displaySentence() {
        if (!targetSentenceTextEl || !englishSentenceTextEl || !albanianSentenceTextEl ||
            !verbTextEl || !verbEnglishTextEl || !verbAlbanianTextEl || !revealAnswerBtn || !sentenceAudio) return;

        if (currentChunkSentences.length === 0 || currentSentenceIndex < 0 || currentSentenceIndex >= currentChunkSentences.length) {
            clearSentenceDisplay();
            targetSentenceTextEl.textContent = "No more sentences in this chunk.";
            if (isContinuousPlaying) {
                stopContinuousPlay();
                if (continuousPlayStatusEl) continuousPlayStatusEl.textContent = "Finished playing all sentences in chunk.";
            }
            updateSentenceCounter();
            return;
        }

        const sentence = currentChunkSentences[currentSentenceIndex];
        updateSentenceCounter();

        if (currentMode === 'readListen') {
            targetSentenceTextEl.textContent = sentence.targetSentence;
            englishSentenceTextEl.textContent = sentence.englishSentence;
            albanianSentenceTextEl.textContent = sentence.albanianSentence;
            verbTextEl.textContent = sentence.verb ? `Verb: ${sentence.verb}` : "";
            verbEnglishTextEl.textContent = sentence.verbEnglish ? `English Verb: ${sentence.verbEnglish}` : "";
            verbAlbanianTextEl.textContent = sentence.verbAlbanian ? `Albanian Verb: ${sentence.verbAlbanian}` : "";
            revealAnswerBtn.classList.add('hidden');
            targetSentenceTextEl.classList.remove('hidden');
            englishSentenceTextEl.classList.remove('hidden');
            albanianSentenceTextEl.classList.remove('hidden');
            verbTextEl.classList.remove('hidden');
            verbEnglishTextEl.classList.remove('hidden');
            verbAlbanianTextEl.classList.remove('hidden');
        } else {
            targetSentenceTextEl.textContent = "";
            englishSentenceTextEl.textContent = sentence.englishSentence;
            albanianSentenceTextEl.textContent = "";
            verbTextEl.textContent = "";
            verbEnglishTextEl.textContent = "";
            verbAlbanianTextEl.textContent = "";
            revealAnswerBtn.classList.remove('hidden');
            targetSentenceTextEl.classList.add('hidden');
            englishSentenceTextEl.classList.remove('hidden');
            albanianSentenceTextEl.classList.add('hidden');
            verbTextEl.classList.add('hidden');
            verbEnglishTextEl.classList.add('hidden');
            verbAlbanianTextEl.classList.add('hidden');
        }
        sentenceAudio.pause();
        sentenceAudio.src = "";
        sentenceAudio.currentTime = 0;
        updatePlayPauseButton(false);
    }

    function clearSentenceDisplay() {
        if (targetSentenceTextEl) targetSentenceTextEl.textContent = "";
        if (englishSentenceTextEl) englishSentenceTextEl.textContent = "";
        if (albanianSentenceTextEl) albanianSentenceTextEl.textContent = "";
        if (verbTextEl) verbTextEl.textContent = "";
        if (verbEnglishTextEl) verbEnglishTextEl.textContent = "";
        if (verbAlbanianTextEl) verbAlbanianTextEl.textContent = "";
        if (sentenceAudio) {
            sentenceAudio.pause();
            sentenceAudio.src = "";
        }
    }

    function updateSentenceCounter() {
        if (!currentSentenceNumEl || !totalSentencesInChunkEl) return;
        currentSentenceNumEl.textContent = currentChunkSentences.length > 0 ? currentSentenceIndex + 1 : 0;
        totalSentencesInChunkEl.textContent = currentChunkSentences.length;
    }

    function displayError(message) {
        clearSentenceDisplay();
        if (targetSentenceTextEl) {
            targetSentenceTextEl.textContent = message;
            targetSentenceTextEl.style.color = 'red';
        }
    }

    function disableControls() {
        if (modeSelect) modeSelect.disabled = true;
        if (chunkSizeInput) chunkSizeInput.disabled = true;
        if (currentChunkSelect) currentChunkSelect.disabled = true;
        if (applyChunkSettingsBtn) applyChunkSettingsBtn.disabled = true;
        if (prevSentenceBtn) prevSentenceBtn.disabled = true;
        if (playPauseBtn) playPauseBtn.disabled = true;
        if (nextSentenceBtn) nextSentenceBtn.disabled = true;
        if (playAllChunkAudioBtn) playAllChunkAudioBtn.disabled = true;
        if (stopAllAudioBtn) stopAllAudioBtn.disabled = true;
    }

    // --- Audio Controls ---
    async function togglePlayPause() {
        if (!sentenceAudio || !playPauseBtn) return;
        const currentSentence = currentChunkSentences[currentSentenceIndex];

        if (isAudioPlaying) {
            console.log(`togglePlayPause: Pausing audio`);
            sentenceAudio.pause();
            sentenceAudio.currentTime = 0;
            sentenceAudio.src = "";
            updatePlayPauseButton(false);
            isAudioPlaying = false;
            return;
        }

        console.log(`togglePlayPause: Attempting to play. Current sentence ID: ${currentSentence?.id || 'unknown'}, audioSrcFr: "${currentSentence?.audioSrcFr || 'none'}", audioSrcEn: "${currentSentence?.audioSrcEn || 'none'}"`);

        if (!currentSentence || !currentSentence.audioSrcFr || !currentSentence.audioSrcEn ||
            typeof currentSentence.audioSrcFr !== 'string' || currentSentence.audioSrcFr.trim() === '' ||
            typeof currentSentence.audioSrcEn !== 'string' || currentSentence.audioSrcEn.trim() === '') {
            console.warn(`togglePlayPause: Invalid audio sources for sentence ID: ${currentSentence?.id || 'unknown'}`);
            if (continuousPlayStatusEl) continuousPlayStatusEl.textContent = "No audio available for this sentence. Check data.json.";
            updatePlayPauseButton(false);
            isAudioPlaying = false;
            return;
        }

        let frenchAudioUrl, englishAudioUrl;
        try {
            frenchAudioUrl = new URL(currentSentence.audioSrcFr, window.location.origin).href;
            englishAudioUrl = new URL(currentSentence.audioSrcEn, window.location.origin).href;
        } catch (error) {
            console.error(`togglePlayPause: Invalid audio URLs - audioSrcFr: "${currentSentence.audioSrcFr}", audioSrcEn: "${currentSentence.audioSrcEn}"`, error);
            if (continuousPlayStatusEl) continuousPlayStatusEl.textContent = `Error: Invalid audio URLs for sentence ${currentSentence.id}.`;
            updatePlayPauseButton(false);
            isAudioPlaying = false;
            return;
        }

        isAudioPlaying = true;
        updatePlayPauseButton(true);

        const selectedSpeed = parseFloat(playbackSpeedSelect.value); // Get current speed

        try {
            console.log(`togglePlayPause: Setting audio src to French: "${frenchAudioUrl}"`);
            sentenceAudio.src = frenchAudioUrl;
            sentenceAudio.load();
            sentenceAudio.playbackRate = selectedSpeed; // APPLY SPEED for French audio
            await sentenceAudio.play();
            console.log(`togglePlayPause: French audio playback started for "${frenchAudioUrl}" at ${selectedSpeed}x`);

            await new Promise((resolve, reject) => {
                sentenceAudio.onended = resolve;
                sentenceAudio.onerror = (e) => {
                    console.error(`Error playing French audio: ${frenchAudioUrl}`, e);
                    reject(new Error("French audio playback error"));
                };
            });

            await new Promise(resolve => setTimeout(resolve, 1000));

            console.log(`togglePlayPause: Setting audio src to English: "${englishAudioUrl}"`);
            sentenceAudio.src = englishAudioUrl;
            sentenceAudio.load();
            sentenceAudio.playbackRate = selectedSpeed; // APPLY SPEED for English audio
            await sentenceAudio.play();
            console.log(`togglePlayPause: English audio playback started for "${englishAudioUrl}" at ${selectedSpeed}x`);

            await new Promise((resolve, reject) => {
                sentenceAudio.onended = resolve;
                sentenceAudio.onerror = (e) => {
                    console.error(`Error playing English audio: ${englishAudioUrl}`, e);
                    reject(new Error("English audio playback error"));
                };
            });

            if (isContinuousPlaying) {
                continuousPlayCurrentIndex++;
                if (continuousPlayCurrentIndex < currentChunkSentences.length) {
                    currentSentenceIndex = continuousPlayCurrentIndex;
                    displaySentence();
                    isAudioPlaying = false;
                    togglePlayPause();
                } else {
                    stopContinuousPlay();
                    if (continuousPlayStatusEl) continuousPlayStatusEl.textContent = "Finished playing all sentences in chunk.";
                }
            } else if (isLooping) {
                console.log(`togglePlayPause: Looping audio sequence for sentence ${currentSentence.id}`);
                isAudioPlaying = false;
                togglePlayPause();
            } else {
                updatePlayPauseButton(false);
                isAudioPlaying = false;
            }

        } catch (error) {
            console.error(`togglePlayPause: Error during audio playback sequence for sentence ${currentSentence?.id}:`, error);
            if (continuousPlayStatusEl && (isContinuousPlaying || isLooping)) {
                continuousPlayStatusEl.textContent = `Error playing audio for sentence ${currentSentence?.id}. Sequence stopped.`;
            }
            updatePlayPauseButton(false);
            isAudioPlaying = false;
            if (isContinuousPlaying) stopContinuousPlay();
        }
    }

    function updatePlayPauseButton(shouldShowPause) {
        if (!playPauseBtn) return;
        playPauseBtn.textContent = shouldShowPause ? 'Pause' : 'Play';
        playPauseBtn.classList.toggle('playing', shouldShowPause);
    }

    // --- Event Listeners ---
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', togglePlayPause);
    }

    if (sentenceAudio) {
        sentenceAudio.addEventListener('error', (e) => {
            console.error(`sentenceAudio HTML element error: "${sentenceAudio.src}". Code: ${e.target.error?.code}, Msg: ${e.target.error?.message}`);
            if (isAudioPlaying) {
                 if (continuousPlayStatusEl) {
                    continuousPlayStatusEl.textContent = `Audio load error. Ensure file "${sentenceAudio.src}" is accessible.`;
                }
                updatePlayPauseButton(false);
                isAudioPlaying = false;
                if (isContinuousPlaying) stopContinuousPlay();
            }
        });
    }

    if (loopBtn) {
        loopBtn.addEventListener('click', () => {
            isLooping = !isLooping;
            loopBtn.textContent = `Loop: ${isLooping ? 'On' : 'Off'}`;
            loopBtn.classList.toggle('active', isLooping);
            console.log(`Looping is now: ${isLooping}`);
        });
    }

    if (playbackSpeedSelect && sentenceAudio) {
        playbackSpeedSelect.addEventListener('change', () => {
            const newSpeed = parseFloat(playbackSpeedSelect.value);
            sentenceAudio.playbackRate = newSpeed; // Apply to current audio element if one is loaded/playing
            console.log(`Playback speed changed via select to: ${newSpeed}x. Applied to current audio element state.`);
            // The togglePlayPause function will pick up this new speed when it loads the next audio src.
        });
    }

    function stopCurrentlyPlayingAudioAndResetFlags() {
        if (isAudioPlaying) {
            sentenceAudio.pause();
            sentenceAudio.src = "";
            updatePlayPauseButton(false);
            isAudioPlaying = false;
        }
        if (isContinuousPlaying) {
            stopContinuousPlay();
        }
    }

    if (prevSentenceBtn) {
        prevSentenceBtn.addEventListener('click', () => {
            if (currentSentenceIndex > 0) {
                stopCurrentlyPlayingAudioAndResetFlags();
                currentSentenceIndex--;
                displaySentence();
            }
        });
    }

    if (nextSentenceBtn) {
        nextSentenceBtn.addEventListener('click', () => {
            if (currentSentenceIndex < currentChunkSentences.length - 1) {
                stopCurrentlyPlayingAudioAndResetFlags();
                currentSentenceIndex++;
                displaySentence();
            }
        });
    }

    if (modeSelect) {
        modeSelect.addEventListener('change', (e) => {
            stopCurrentlyPlayingAudioAndResetFlags();
            currentMode = e.target.value;
            displaySentence();
        });
    }

    if (revealAnswerBtn) {
        revealAnswerBtn.addEventListener('click', () => {
            if (currentChunkSentences.length > 0 && currentChunkSentences[currentSentenceIndex]) {
                const sentence = currentChunkSentences[currentSentenceIndex];
                targetSentenceTextEl.textContent = sentence.targetSentence;
                albanianSentenceTextEl.textContent = sentence.albanianSentence;
                verbTextEl.textContent = sentence.verb ? `Verb: ${sentence.verb}` : "";
                verbEnglishTextEl.textContent = sentence.verbEnglish ? `English Verb: ${sentence.verbEnglish}` : "";
                verbAlbanianTextEl.textContent = sentence.verbAlbanian ? `Albanian Verb: ${sentence.verbAlbanian}` : "";

                targetSentenceTextEl.classList.remove('hidden');
                albanianSentenceTextEl.classList.remove('hidden');
                verbTextEl.classList.remove('hidden');
                verbEnglishTextEl.classList.remove('hidden');
                verbAlbanianTextEl.classList.remove('hidden');
                revealAnswerBtn.classList.add('hidden');

                if (!isAudioPlaying) {
                    togglePlayPause();
                }
            }
        });
    }

    if (playAllChunkAudioBtn) {
        playAllChunkAudioBtn.addEventListener('click', () => {
            if (currentChunkSentences.length > 0) {
                stopCurrentlyPlayingAudioAndResetFlags();
                isContinuousPlaying = true;
                continuousPlayCurrentIndex = 0;
                currentSentenceIndex = continuousPlayCurrentIndex;

                playAllChunkAudioBtn.disabled = true;
                if (stopAllAudioBtn) stopAllAudioBtn.disabled = false;
                if (prevSentenceBtn) prevSentenceBtn.disabled = true;
                if (nextSentenceBtn) nextSentenceBtn.disabled = true;

                if (continuousPlayStatusEl) continuousPlayStatusEl.textContent = `Playing all sentences in chunk...`;

                displaySentence();
                isAudioPlaying = false;
                togglePlayPause();
            } else {
                if (continuousPlayStatusEl) continuousPlayStatusEl.textContent = "No sentences in chunk to play.";
            }
        });
    }

    function stopContinuousPlay() {
        isContinuousPlaying = false;
        if (sentenceAudio.src) {
            sentenceAudio.pause();
            sentenceAudio.src = "";
        }
        isAudioPlaying = false;
        updatePlayPauseButton(false);

        if (continuousPlayStatusEl) continuousPlayStatusEl.textContent = "Continuous play stopped.";
        if (playAllChunkAudioBtn) playAllChunkAudioBtn.disabled = false;
        if (stopAllAudioBtn) stopAllAudioBtn.disabled = true;
        if (prevSentenceBtn) prevSentenceBtn.disabled = false;
        if (nextSentenceBtn) nextSentenceBtn.disabled = false;
    }

    if (stopAllAudioBtn) {
        stopAllAudioBtn.addEventListener('click', stopContinuousPlay);
    }

    if (startEasyPracticeTimerBtn && easyPracticeTimeInput && timerDisplayEl && switchToNativeBtn) {
        startEasyPracticeTimerBtn.addEventListener('click', () => {
            const minutes = parseInt(easyPracticeTimeInput.value, 10);
            if (isNaN(minutes) || minutes <= 0) {
                timerDisplayEl.textContent = "Please enter a valid time (minutes).";
                return;
            }
            let secondsRemaining = minutes * 60;
            switchToNativeBtn.classList.add('hidden');
            timerDisplayEl.textContent = `Time remaining: ${formatTime(secondsRemaining)}`;
            startEasyPracticeTimerBtn.disabled = true;
            if (nativeSwitchTimerInterval) clearInterval(nativeSwitchTimerInterval);
            nativeSwitchTimerInterval = setInterval(() => {
                secondsRemaining--;
                timerDisplayEl.textContent = `Time remaining: ${formatTime(secondsRemaining)}`;
                if (secondsRemaining < 0) {
                    clearInterval(nativeSwitchTimerInterval);
                    timerDisplayEl.textContent = "Time's up!";
                    switchToNativeBtn.classList.remove('hidden');
                    startEasyPracticeTimerBtn.disabled = false;
                }
            }, 1000);
        });
    }

    function formatTime(totalSeconds) {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    if (applyChunkSettingsBtn) {
        applyChunkSettingsBtn.addEventListener('click', () => {
            stopCurrentlyPlayingAudioAndResetFlags();
            applyChunkSettings();
        });
    }
    if (chunkSizeInput) {
        chunkSizeInput.addEventListener('change', () => {
            stopCurrentlyPlayingAudioAndResetFlags();
            populateChunkSelector();
            applyChunkSettings();
        });
    }
    if (currentChunkSelect) {
        currentChunkSelect.addEventListener('change', () => {
            stopCurrentlyPlayingAudioAndResetFlags();
            applyChunkSettings();
        });
    }

    // --- Initial Load ---
    loadSentenceData();
});