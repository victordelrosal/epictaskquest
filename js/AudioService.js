/**
 * Audio Service for Epic Task Quest
 * Manages background audio loops and all sound effects
 */

class AudioService {
    constructor() {
        this.tracks = [];
        this.soundEffects = {}; // Store sound effects separately
        this.isInitialized = false;
        this.isMuted = localStorage.getItem('audioMuted') === 'true';
        this.volume = parseFloat(localStorage.getItem('audioVolume') || 0.3);
        
        // Track definitions with their paths and default settings
        this.trackDefinitions = [
            { 
                id: 'ambient',
                path: './audio/ambient-loop.mp3', 
                volume: this.isMuted ? 0 : this.volume,
                loop: true
            },
            { 
                id: 'melody',
                path: './audio/melody-loop.mp3', 
                volume: this.isMuted ? 0 : this.volume * 0.7, 
                loop: true
            },
            { 
                id: 'rhythm',
                path: './audio/rhythm-loop.mp3', 
                volume: this.isMuted ? 0 : this.volume * 0.6, 
                loop: true
            },
            { 
                id: 'bass',
                path: './audio/bass-loop.mp3', 
                volume: this.isMuted ? 0 : this.volume * 0.8, 
                loop: true
            },
            { 
                id: 'effects',
                path: './audio/effects-loop.mp3', 
                volume: this.isMuted ? 0 : this.volume * 0.5, 
                loop: true
            }
        ];
        
        // Sound effect definitions
        this.soundEffectDefinitions = [
            {
                id: 'complete',
                path: './audio/complete.mp3',
                volume: this.isMuted ? 0 : this.volume * 0.8,
                loop: false
            }
            // Add more sound effects here as needed
        ];
    }

    /**
     * Initialize all audio tracks and sound effects
     * Should be called after user interaction to satisfy autoplay policies
     */
    initialize() {
        if (this.isInitialized) return;

        console.log('Initializing audio service...');
        
        // Create audio elements for each track
        this.trackDefinitions.forEach(track => {
            const audio = new Audio();
            audio.src = track.path;
            audio.id = track.id;
            audio.loop = true; // Always set loop to true regardless of track definition
            audio.volume = track.volume;
            audio.preload = 'auto';
            
            // Double ensure looping works across all browsers
            audio.addEventListener('ended', () => {
                console.log(`Track ${track.id} ended, restarting...`);
                audio.currentTime = 0;
                
                // Use a promise to handle the play attempt
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.warn(`Error restarting track ${track.id}:`, error);
                        // Try again after a short delay
                        setTimeout(() => audio.play().catch(e => console.error(e)), 1000);
                    });
                }
            });
            
            this.tracks.push(audio);
        });
        
        // Initialize sound effects
        this.soundEffectDefinitions.forEach(effect => {
            const audio = new Audio();
            audio.src = effect.path;
            audio.id = effect.id;
            audio.loop = effect.loop || false;
            audio.volume = effect.volume;
            audio.preload = 'auto';
            
            // Store in sound effects object
            this.soundEffects[effect.id] = audio;
        });

        this.isInitialized = true;
    }

    /**
     * Play all background audio tracks
     */
    playAll() {
        if (!this.isInitialized) {
            this.initialize();
        }

        console.log('Playing all audio tracks...');
        
        // Ensure audio context is running (needed for Safari)
        this._resumeAudioContext();
        
        // Play all tracks - this needs to be triggered by user interaction
        this.tracks.forEach(track => {
            console.log(`Starting track: ${track.id}`);
            // Reset the time to ensure tracks are in sync when starting together
            track.currentTime = 0;
            
            // Ensure track is set to loop
            track.loop = true;
            
            // Use a more robust play method
            this._safePlay(track);
        });
    }
    
    /**
     * Play a specific sound effect
     * @param {string} id - The ID of the sound effect to play
     * @returns {Promise} - A promise that resolves when the sound effect starts playing
     */
    playSound(id) {
        if (!this.isInitialized) {
            this.initialize();
        }
        
        const sound = this.soundEffects[id];
        if (!sound) {
            console.warn(`Sound effect "${id}" not found`);
            return Promise.reject(new Error(`Sound effect "${id}" not found`));
        }
        
        // Reset sound to beginning
        sound.currentTime = 0;
        
        // Update volume based on current settings
        sound.volume = this.isMuted ? 0 : (this.volume * 0.8); // Use same volume control as tracks
        
        // Play the sound
        console.log(`Playing sound effect: ${id}`);
        return this._safePlay(sound);
    }

    /**
     * Safely attempt to play an audio track with retry logic
     * @param {HTMLAudioElement} track - The audio element to play
     * @returns {Promise} - The play promise
     */
    _safePlay(track) {
        const playPromise = track.play();
        
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn(`Error playing ${track.id || 'audio'}, retrying:`, error);
                
                // Try again after a short delay
                setTimeout(() => {
                    track.muted = true;  // Temporarily mute to help with autoplay restrictions
                    track.play()
                        .then(() => {
                            // Once playing, restore original volume if not muted globally
                            if (!this.isMuted) {
                                setTimeout(() => {
                                    track.muted = false;
                                    track.volume = parseFloat(track.dataset.volume || this.volume);
                                }, 1000);
                            }
                        })
                        .catch(e => console.error(`Failed to play ${track.id || 'audio'} after retry:`, e));
                }, 500);
            });
        }
        
        return playPromise;
    }
    
    /**
     * Pause all audio tracks (both background music and sound effects)
     */
    pauseAll() {
        this.tracks.forEach(track => {
            track.pause();
        });
        
        Object.values(this.soundEffects).forEach(effect => {
            effect.pause();
        });
        
        console.log('All audio paused');
    }
    
    /**
     * Resume all background audio tracks
     */
    resumeAll() {
        this.tracks.forEach(track => {
            this._safePlay(track);
        });
        
        console.log('All background audio resumed');
    }
    
    /**
     * Attempt to resume the audio context if it exists and is suspended
     * Helps with Safari and mobile browsers
     */
    _resumeAudioContext() {
        // Check if AudioContext is available
        if (window.AudioContext || window.webkitAudioContext) {
            // Create a temporary audio context if one doesn't exist
            if (!this._audioContext) {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                this._audioContext = new AudioContextClass();
            }
            
            // Resume if suspended
            if (this._audioContext.state === 'suspended') {
                this._audioContext.resume().then(() => {
                    console.log('AudioContext resumed successfully');
                }).catch(error => {
                    console.warn('Failed to resume AudioContext:', error);
                });
            }
        }
    }

    /**
     * Stop all audio tracks
     */
    stopAll() {
        this.tracks.forEach(track => {
            track.pause();
            track.currentTime = 0;
        });
        
        Object.values(this.soundEffects).forEach(effect => {
            effect.pause();
            effect.currentTime = 0;
        });
        
        console.log('All audio stopped');
    }

    /**
     * Toggle mute status for all audio (tracks and sound effects)
     * This maintains the play state when muting
     * @param {boolean} muted - True to mute, false to unmute
     */
    toggleMute(muted) {
        this.isMuted = muted !== undefined ? muted : !this.isMuted;
        
        // Update all background tracks
        this.tracks.forEach(track => {
            // Set volume to 0 when muted but don't pause
            track.volume = this.isMuted ? 0 : parseFloat(track.dataset.volume || this.volume);
        });
        
        // Update all sound effects
        Object.values(this.soundEffects).forEach(effect => {
            effect.volume = this.isMuted ? 0 : (this.volume * 0.8);
        });
        
        // Save preference
        localStorage.setItem('audioMuted', this.isMuted);
        
        return this.isMuted;
    }

    /**
     * Set volume for all audio (tracks and sound effects)
     * @param {number} volume - Volume level (0-1)
     */
    setVolume(volume) {
        if (volume < 0) volume = 0;
        if (volume > 1) volume = 1;
        
        this.volume = volume;
        
        // Update volume for all tracks regardless of mute state
        // This ensures volume settings are remembered when unmuted
        this.tracks.forEach((track, index) => {
            const trackDef = this.trackDefinitions[index];
            const adjustedVolume = volume * (trackDef.volumeModifier || 1);
            
            // Store the volume even if muted
            track.dataset.volume = adjustedVolume;
            
            // Only apply volume if not muted
            if (!this.isMuted) {
                track.volume = adjustedVolume;
            }
        });
        
        // Update volume for all sound effects
        Object.values(this.soundEffects).forEach(effect => {
            // Only apply volume if not muted
            if (!this.isMuted) {
                effect.volume = volume * 0.8;
            }
        });
        
        // Save preference
        localStorage.setItem('audioVolume', volume);
    }

    /**
     * Check if audio context is running and not suspended
     * @returns {boolean} True if audio is active
     */
    isAudioActive() {
        return this.tracks.some(track => !track.paused);
    }
}

// Create and export a singleton instance
export const audioService = new AudioService();
