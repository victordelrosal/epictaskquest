// scripts.js

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-analytics.js";
import { enableIndexedDbPersistence, getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch, setDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    signInWithPopup, 
    signInWithRedirect, 
    getRedirectResult,
    signOut, 
    setPersistence, 
    browserLocalPersistence,
    GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { AlarmService } from './js/AlarmService.js';
import { initializeHashtagHierarchy, organizeHashtags, shouldBeNested } from './hashtag-hierarchy.js';
import { audioService } from './js/AudioService.js';

// Add Starfield initialization at the beginning of the file
function initStarfield() {
    const container = document.getElementById('starsContainer');
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 1, 2000);
    camera.position.z = 500;

    const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true
    });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Create stars
    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 8000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    const colorPalette = [
        new THREE.Color('#0000B3').multiplyScalar(1.5),
        new THREE.Color('#001489').multiplyScalar(1.5),
        new THREE.Color('#050c91').multiplyScalar(1.5),
        new THREE.Color('#170484').multiplyScalar(1.5),
        new THREE.Color('#02066F').multiplyScalar(1.5),
        new THREE.Color('#000036').multiplyScalar(1.5),
        new THREE.Color('#FFFFFF')
    ];

    for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - 0.5) * 2000;
        positions[i3 + 1] = (Math.random() - 0.5) * 2000;
        positions[i3 + 2] = (Math.random() - 0.5) * 2000;

        const colorIndex = Math.floor(Math.pow(Math.random(), 2) * colorPalette.length);
        const color = colorPalette[colorIndex];
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;

        sizes[i] = Math.random() * 5 + 1;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const starsMaterial = new THREE.PointsMaterial({
        size: 3,
        vertexColors: true,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
    });

    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    // Animation
    function animate() {
        requestAnimationFrame(animate);
        
        const positions = stars.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 2] += 1;
            if (positions[i + 2] > 1000) {
                positions[i + 2] = -1000;
            }
        }
        stars.geometry.attributes.position.needsUpdate = true;
        
        renderer.render(scene, camera);
    }

    animate();

    // Handle resize
    function handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }

    window.addEventListener('resize', handleResize);
}

// Update the audio initialization function
function initAudio() {
    // Initialize the audio service once the user has interacted with the page
    audioService.initialize();
    
    // Add audio controls to the UI
    createAudioControls();
    
    // Add a small delay before starting playback to ensure initialization is complete
    setTimeout(() => {
        // Start audio playback
        audioService.playAll();
        
        // Set up auto-restart mechanism to ensure looping continues
        setInterval(() => {
            audioService.tracks.forEach(track => {
                // Check if track is not playing or has ended
                if (track.paused || track.ended) {
                    console.log(`Track ${track.id} is paused or ended, restarting...`);
                    track.currentTime = 0;
                    track.play().catch(err => console.warn(`Error restarting track: ${err}`));
                }
            });
        }, 5000); // Check every 5 seconds
    }, 500);
    
    // Add event listener for visibility change (tab switching)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            // When tab becomes visible again, check if tracks are playing
            console.log('Tab is now visible, checking audio playback');
            if (!audioService.isAudioActive()) {
                console.log('Audio not active, resuming all tracks');
                audioService.resumeAll();
            }
        }
    });
    
    console.log('Audio system initialized');
}

// Update the audio controls function to handle all audio uniformly
function createAudioControls() {
    // Create audio controls container
    const audioControls = document.createElement('div');
    audioControls.className = 'audio-controls';
    audioControls.innerHTML = `
        <button id="toggleAudio" class="audio-toggle" title="${audioService.isMuted ? 'Unmute' : 'Mute'} Sound">
            ${audioService.isMuted ? '🔇' : '🔊'}
        </button>
        <div class="volume-slider-container">
            <input type="range" id="volumeSlider" min="0" max="100" 
                value="${audioService.volume * 100}" class="volume-slider">
        </div>
    `;
    
    document.body.appendChild(audioControls);
    
    // Add event listeners
    const toggleButton = document.getElementById('toggleAudio');
    const volumeSlider = document.getElementById('volumeSlider');
    
    toggleButton.addEventListener('click', () => {
        const muted = audioService.toggleMute();
        toggleButton.textContent = muted ? '🔇' : '🔊';
        toggleButton.title = muted ? 'Unmute Sound' : 'Mute Sound';
    });
    
    volumeSlider.addEventListener('input', (e) => {
        const volume = parseInt(e.target.value) / 100;
        audioService.setVolume(volume);
        
        // If we're adjusting volume while muted, unmute
        if (audioService.isMuted && volume > 0) {
            audioService.toggleMute(false);
            toggleButton.textContent = '🔊';
            toggleButton.title = 'Mute Sound';
        }
    });
}

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyASqKkvoIp6qvX2Dvze5s6nfKBghQ41axQ",
    authDomain: "epic-task-quest.firebaseapp.com",
    projectId: "epic-task-quest",
    storageBucket: "epic-task-quest",
    messagingSenderId: "421446505180",
    appId: "1:421446505180:web:ac2270f8c0b92d16529a19",
    measurementId: "G-35SX22QFBS",
    redirectDomain: "victordelrosal.github.io"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
enableIndexedDbPersistence(db).catch(e => {
    console.warn("Offline persistence not available", e);
});
let configDocRef; // Initialized after login for user-specific sync
const auth = getAuth(app);

// Initialize AlarmService
const alarmService = new AlarmService();

// Restore alarms when app loads
window.addEventListener('load', () => {
    alarmService.restoreAlarms();
});

// Add debugging code
window.onerror = function (message, source, lineno, colno, error) {
    const debugInfo = `
        <div style="background: rgba(240, 128, 128, 0.9); color: white; padding: 15px; margin: 10px; border-radius: 8px; font-family: monospace; font-size: 14px; word-wrap: break-word; max-width: 100%; position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999;">
            <strong>Error:</strong> ${message}<br>
            <strong>Source:</strong> ${source}<br>
            <strong>Line:</strong> ${lineno}, Column: ${colno}<br>
            <strong>Stack:</strong> ${error?.stack || 'N/A'}<br>
            <strong>User Agent:</strong> ${navigator.userAgent}<br>
            <strong>Platform:</strong> ${navigator.platform}<br>
            <strong>Is Mobile:</strong> ${isMobileDevice()}<br>
            <strong>Time:</strong> ${new Date().toISOString()}
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', debugInfo);
    console.error('Error:', { message, source, lineno, colno, error });
};

// Add detailed console logging
console.log('Initializing app...', {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    isMobile: isMobileDevice(),
    firebaseConfig: {
        authDomain: firebaseConfig.authDomain,
        redirectDomain: firebaseConfig.redirectDomain
    }
});

console.log("Firebase initialized successfully.");

// ===========================
// Authentication Logic
// ===========================

// Mobile browser detection
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// DOM Elements for Login
const loginContainer = document.getElementById('loginContainer');
const appContainer = document.getElementById('appContainer');
const loginError = document.getElementById('loginError');
const googleLoginButton = document.getElementById('googleLoginButton');

// Authorized Email
const authorizedEmail = 'victordelrosal@gmail.com';

// Initialize Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Set Authentication Persistence to Local
setPersistence(auth, browserLocalPersistence)
    .then(() => {
        console.log("Authentication persistence set to LOCAL.");
        // Persistence is now set. You can proceed with other operations.
    })
    .catch((error) => {
        console.error("Error setting authentication persistence:", error);
    });

// Google Login Function
googleLoginButton.addEventListener('click', async () => {
    try {
        console.log('Starting Google sign-in process...');
        // First try popup for all devices
        console.log('Attempting popup sign-in...');
        try {
            const result = await signInWithPopup(auth, googleProvider);
            console.log('Popup sign-in successful:', result);
            handleAuthResult(result);
        } catch (popupError) {
            console.warn('Popup sign-in failed:', popupError);
            console.log('Attempting redirect sign-in...');
            try {
                await signInWithRedirect(auth, googleProvider);
                console.log('Redirect initiated successfully');
            } catch (redirectError) {
                console.error('Both auth methods failed:', {
                    popupError,
                    redirectError,
                    userAgent: navigator.userAgent,
                    isMobile: isMobileDevice()
                });
                handleAuthError(redirectError);
            }
        }
    } catch (error) {
        console.error('Authentication error:', {
            error,
            code: error.code,
            message: error.message,
            stack: error.stack
        });
        handleAuthError(error);
    }
});

// Modify the onAuthStateChanged handler to ensure consistent audio initialization
onAuthStateChanged(auth, async (user) => {
    try {
        // Handle redirect result first
        const result = await getRedirectResult(auth);
        if (result) {
            console.log("Redirect result received:", result);
            handleAuthResult(result);
            return; // Exit early if we handled a redirect
        }

        // Normal auth state changes
        if (user) {
            if (user.email === authorizedEmail) {
                initStarfield(); // Initialize starfield
                
                // Initialize audio via two methods:
                // 1. Try to initialize immediately (might work if autoplay is allowed)
                initAudio();
                
                // 2. Also initialize on first user interaction to satisfy browsers that require it
                const initializeAudioOnInteraction = () => {
                    console.log('User interaction detected, initializing audio');
                    // Initialize audio system if not already done
                    if (!audioService.isInitialized) {
                        initAudio();
                    } else {
                        // If already initialized but not playing, start playback
                        if (!audioService.isAudioActive()) {
                            audioService.playAll();
                        }
                    }
                    
                    // Remove all event listeners after first interaction
                    document.removeEventListener('click', initializeAudioOnInteraction);
                    document.removeEventListener('touchstart', initializeAudioOnInteraction);
                    document.removeEventListener('keydown', initializeAudioOnInteraction);
                };
                
                // Add multiple event listeners for different types of interaction
                document.addEventListener('click', initializeAudioOnInteraction);
                document.addEventListener('touchstart', initializeAudioOnInteraction);
                document.addEventListener('keydown', initializeAudioOnInteraction);
                
                // Set Firestore document reference for this user
                configDocRef = doc(db, 'users', user.uid, 'config', 'hashtagConfig');

                await initConfigPanel();
                loginContainer.style.display = "none";
                appContainer.style.display = "flex";
                loadTasks();
                syncOfflineTasks();
            } else {
                handleUnauthorizedUser(user);
            }
        } else {
            configDocRef = null;
            showLoginScreen();
        }
    } catch (error) {
        console.error("Auth state change error:", error);
        handleAuthError(error);
    }
});

// Add authentication result handler
function handleAuthResult(result) {
    if (!result) return;
    
    const user = result.user;
    if (user.email === authorizedEmail) {
        console.log("Sign-in successful");
        loginError.style.display = "none";
        // Store auth token if needed
        user.getIdToken().then(token => {
            localStorage.setItem('authToken', token);
        });
    } else {
        handleUnauthorizedUser(user);
    }
}

// Update Google Provider configuration
googleProvider.setCustomParameters({
    prompt: 'select_account',
    login_hint: authorizedEmail,
    scope: 'profile email',
    redirect_uri: `https://${firebaseConfig.redirectDomain}/epictaskquest/`
});

// Logout Button
const logoutButton = document.getElementById('logoutButton');

logoutButton.addEventListener('click', () => {
    signOut(auth).then(() => {
        console.log("User signed out.");
        configDocRef = null;
    }).catch((error) => {
        console.error("Error signing out:", error);
    });
});

// Add helper functions for better error handling and user management
function handleUnauthorizedUser(user) {
    console.warn(`User ${user.email} is not authorized`);
    signOut(auth).then(() => {
        loginContainer.innerHTML = `<h2 style="color: var(--error-color);">Unauthorized Access</h2>`;
        loginError.textContent = "Unauthorized email address";
        loginError.style.display = "block";
        configDocRef = null;
    });
}

function handleAuthError(error) {
    console.error("Authentication error:", error);
    let errorMessage = "Sign-in failed. Please try again.";
    
    // Handle specific error codes
    switch (error.code) {
        case 'auth/popup-blocked':
            errorMessage = "Popup was blocked. Please allow popups or try again.";
            break;
        case 'auth/popup-closed-by-user':
            errorMessage = "Sign-in was cancelled. Please try again.";
            break;
        case 'auth/unauthorized-domain':
            errorMessage = "This domain is not authorized for sign-in.";
            break;
        case 'auth/operation-not-supported-in-this-environment':
            errorMessage = "Sign-in not supported in this browser. Please try another browser.";
            break;
    }
    
    loginError.textContent = errorMessage;
    loginError.style.display = "block";
}

function showLoginScreen() {
    loginContainer.style.display = "flex";
    appContainer.style.display = "none";
    loginError.style.display = "none";
}

// ===========================
// Initialize Global Variables
// ===========================
let tasks = [];
let totalPoints = 0;
let level = 1;
let completedTasks = 0;
const pointsToNextLevel = 100;

// Store tasks created while offline
let offlineTasks = JSON.parse(localStorage.getItem('offlineTasks') || '[]');

// Add at the top with other global variables
let openToggles = new Set();

// Add after other global variables
const hashtagToggleConfig = {
    default: {
        fontSize: '20px',
        fontFamily: 'Arial',
        hoverBgColor: 'rgba(255, 255, 255, 0.1)',
        easterEgg: null,
        height: '45px' // Add default height
    },
    // Special configurations for specific hashtags
    customConfig: {
        // Example: '#0buy': { fontSize: '12px', easterEgg: '🛍️' }
        '#0': {
            fontSize: '33px',
            fontFamily: 'IBM Plex Sans',
            hoverBgColor: 'rgba(255, 0, 0, 0.1)', // Semi-transparent red
            easterEgg: '🔥',
            height: '50px' // Custom height for #0
        }
    }
};

// DOM Elements
const taskInput = document.getElementById('taskInput');
const difficultySelect = document.getElementById('difficultySelect');
const customPointsInput = document.getElementById('customPoints');
const addTaskButton = document.getElementById('addTaskButton');
const activeTasksList = document.getElementById('activeTasksList');
const completedTasksList = document.getElementById('completedTasksList');
const completedTasksSpan = document.getElementById('completedTasks');
const totalPointsSpan = document.getElementById('totalPoints');
const levelSpan = document.getElementById('level');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const resetButton = document.getElementById('resetButton');
const confirmModal = document.getElementById('confirmModal');
const confirmYes = document.getElementById('confirmYes');
const confirmNo = document.getElementById('confirmNo');
const confettiContainer = document.getElementById('confettiContainer');
const taskSearchInput = document.getElementById('taskSearchInput');
const wishlistCheckbox = document.getElementById('wishlistCheckbox');
const wishlistFilter = document.getElementById('wishlistFilter');
const successOverlay = document.getElementById('successOverlay');
const successMessage = document.getElementById('successMessage');
let currentFilter = 'all';

// Add achievement image URLs array
const achievementImages = [
    'https://i.postimg.cc/d7qYLggG/1k.png',
    'https://i.postimg.cc/JGkmgNbH/2k.png',
    'https://i.postimg.cc/Fd65Czzx/3k.png',
    'https://i.postimg.cc/T5W8zxWv/4k.png',
    'https://i.postimg.cc/FYbvFhC9/5k.png',
    'https://i.postimg.cc/pygMDmgW/6k.png',
    'https://i.postimg.cc/vD1dgr22/7k.png',
    'https://i.postimg.cc/rD2cLDJn/8k.png',
    'https://i.postimg.cc/LqNMfNMw/9k.png',
    'https://i.postimg.cc/cgCGcwxH/10k.png',
    'https://i.postimg.cc/H8jWC0Rh/11k.png',
    'https://i.postimg.cc/4Ycdd5yC/12k.png',
    'https://i.postimg.cc/sB9gPg5w/13k.png',
    'https://i.postimg.cc/r0VFf2Jc/14k.png',
    'https://i.postimg.cc/r0fybZn4/15k.png',
    'https://i.postimg.cc/3WrdBmSp/16k.png',
    'https://i.postimg.cc/qt8zmLHc/17k.png',
    'https://i.postimg.cc/gnJLY83d/18k.png',
    'https://i.postimg.cc/rd6DCH3F/19k.png',
    'https://i.postimg.cc/Wq4z1cFS/20k.png',
    'https://i.postimg.cc/yJRT1NfX/21k.png',
    'https://i.postimg.cc/YjRzqZxV/22k.png',
    'https://i.postimg.cc/CBVszVXy/23k.png',
    'https://i.postimg.cc/6TthKtCn/24k.png',
    'https://i.postimg.cc/LnsBqDCs/25k.png',
    'https://i.postimg.cc/FkrbVVhD/26k.png',
    'https://i.postimg.cc/4nDT8gw9/27k.png',
    'https://i.postimg.cc/cvZGSBp1/28k.png',
    'https://i.postimg.cc/GHvnV5SS/29k.png',
    'https://i.postimg.cc/5X3dNFJB/30k.png',
    'https://i.postimg.cc/2LNq9Cy6/31k.png',
    'https://i.postimg.cc/dDGZkZNT/32k.png',
    'https://i.postimg.cc/7fVCX8kH/33k.png'
];

// Add these variables after other DOM element declarations
const prevBadgeButton = document.getElementById('prevBadge');
let currentBadgeIndex = 0;

// Add badge navigation functions
function updateBadgeDisplay(index) {
    const achievementContainer = document.getElementById('achievementImage');
    
    // Ensure we don't show badges beyond the current level
    if (index >= level) {
        index = level - 1; // Show the current level's badge
    }
    
    achievementContainer.innerHTML = `<img src="${achievementImages[index]}" alt="Level ${index + 1} Achievement">`;
    achievementContainer.classList.remove('visible');
    // Force reflow
    void achievementContainer.offsetWidth;
    achievementContainer.classList.add('visible');
    
    // Update button states
    currentBadgeIndex = index;
    
    // Show/hide prev button based on current index
    prevBadgeButton.style.display = index > 0 ? 'flex' : 'none';
}

function navigateBadge() {
    let newIndex = currentBadgeIndex - 1;
    if (newIndex >= 0) {
        updateBadgeDisplay(newIndex);
    }
}

// Add event listeners for badge navigation
prevBadgeButton.addEventListener('click', () => navigateBadge());

// ===========================
// Utility Functions
// ===========================

// Get points based on difficulty
function getPoints(difficulty, customPoints) {
    const pointsMap = {
        1: 5,
        2: 10,
        3: 15,
        4: 20,
        5: 25,
        6: 50 // Changed from custom points to fixed 50
    };
    return pointsMap[difficulty] || 5;
}

// Update stats display with animations
function updateStats() {
    const prevTotalPoints = totalPoints;
    const prevLevel = level;
    const prevCompletedTasks = completedTasks;

    // Update stats
    completedTasksSpan.textContent = completedTasks;
    totalPointsSpan.textContent = totalPoints;

    // Calculate new level
    const newLevel = Math.floor(totalPoints / pointsToNextLevel) + 1;
    level = newLevel;
    levelSpan.textContent = level;

    // Update progress bar
    const progress = totalPoints % pointsToNextLevel;
    const progressPercentage = (progress / pointsToNextLevel) * 100;
    progressFill.style.width = `${progressPercentage}%`;
    progressText.textContent = `${progress}/${pointsToNextLevel}`;

    // Trigger Completed Tasks Animation if increased
    if (completedTasks > prevCompletedTasks) {
        animateCompletedTasks(completedTasksSpan);
    }

    // Trigger Points Counting Animation if increased
    if (totalPoints > prevTotalPoints) {
        animatePointsCount(totalPointsSpan, prevTotalPoints, totalPoints);
    }

    // Trigger Level Up Animation if level increased
    if (level > prevLevel) {
        animateLevelUp(levelSpan);
    }

    // Handle achievement image display
    if (level > prevLevel) {
        const imageIndex = ((level - 1) % achievementImages.length);
        currentBadgeIndex = imageIndex; // Update current badge index
        updateBadgeDisplay(imageIndex);
    }
}

// ===========================
// Firestore Operations
// ===========================

// Save a task to localStorage when offline
function storeOfflineTask(task) {
    offlineTasks.push(task);
    localStorage.setItem('offlineTasks', JSON.stringify(offlineTasks));
}

// Sync any offline tasks when back online
async function syncOfflineTasks() {
    if (!offlineTasks.length) return;

    for (const task of [...offlineTasks]) {
        try {
            const { id, offlineId, ...taskData } = task;
            const docRef = await addDoc(collection(db, "tasks"), {
                ...taskData,
                timestamp: serverTimestamp()
            });
            console.log("Offline task synced with ID:", docRef.id);
        } catch (e) {
            console.error("Error syncing offline task", e);
            return; // Exit if sync fails
        }
        offlineTasks.shift();
    }
    localStorage.removeItem('offlineTasks');
}

// Attempt to sync when connectivity is restored
window.addEventListener('online', syncOfflineTasks);

// Load tasks from Firestore
async function loadTasks() {
    try {
        const querySnapshot = await getDocs(collection(db, "tasks"));
        tasks = [];
        completedTasks = 0;
        totalPoints = 0;

        querySnapshot.forEach((docSnap) => {
            const task = { id: docSnap.id, ...docSnap.data() };
            tasks.push(task);
            if (task.completed) {
                completedTasks++;
                totalPoints += getPoints(task.difficulty, task.customPoints);
            }
        });

        // Run migration from #shop to #0buy
        await migrateShopToBuyTags();
        // Run normal sync after migration
        await syncShoppingTags();

        level = Math.floor(totalPoints / pointsToNextLevel) + 1;
        updateStats();
        renderTasks();
        console.log("Tasks loaded successfully from Firestore.");

        // Initialize badge display based on current level
        const imageIndex = ((level - 1) % achievementImages.length);
        currentBadgeIndex = imageIndex;
        updateBadgeDisplay(imageIndex);
        
    } catch (error) {
        console.error("Error loading tasks: ", error);
    }
}

// Modify addTask function to automatically append #0buy tag
async function addTask() {
    saveToggleStates();
    let text = taskInput.value.trim();
    const difficulty = parseInt(difficultySelect.value);
    const customPoints = difficulty === 6 ? 
        (parseInt(document.getElementById('customPoints').value) || 30) : 
        null;
    const isWishlist = wishlistCheckbox.checked;

    if (text === "") {
        alert("Please enter a task.");
        return;
    }

    // Automatically append #0buy tag if wishlist is checked and tag doesn't exist
    if (isWishlist && !text.includes('#0buy')) {
        text = `${text} #0buy`;
    }

    // Get active tasks count
    const activeTasks = tasks.filter(t => !t.completed).length;
    
    // Get custom position from task text if it starts with a number
    let position = null;
    const numberMatch = text.match(/^(\d+)[.:\s-]+(.+)/);
    if (numberMatch) {
        position = parseInt(numberMatch[1]);
        // Adjust text to remove the number prefix
        text = numberMatch[2].trim();
    }

    // If position is greater than current list size + 1, add to end
    if (position > activeTasks + 1) {
        position = activeTasks + 1;
    }

    // Check for alarm pattern and schedule if found
    const alarmDate = alarmService.parseAlarmPattern(text);

    const task = {
        text,
        difficulty,
        customPoints,
        completed: false,
        timestamp: serverTimestamp(),
        isWishlist: isWishlist,
        position: position || activeTasks + 1,
        alarm: alarmDate ? {
            time: alarmDate.getTime(),
            text: text
        } : null
    };

    // Handle offline mode
    if (!navigator.onLine) {
        const offlineTask = { ...task, offlineId: Date.now() };
        storeOfflineTask(offlineTask);
        tasks.unshift(offlineTask);
        renderTasks();
        restoreToggleStates();
        showSuccessNotification();

        // Reset form
        taskInput.value = "";
        difficultySelect.value = "1";
        document.getElementById('customPoints').style.display = 'none';
        document.getElementById('customPoints').value = '';
        wishlistCheckbox.checked = false;
        return;
    }

    try {
        const docRef = await addDoc(collection(db, "tasks"), task);
        console.log("Task added with ID: ", docRef.id);
        task.id = docRef.id;
        
        // Schedule alarm if present
        if (alarmDate) {
            alarmService.scheduleAlarm(docRef.id, text, alarmDate);
        }
        
        // Insert task at the correct position
        if (position) {
            tasks.splice(position - 1, 0, task);
        } else {
            tasks.unshift(task);
        }
        
        renderTasks();
        restoreToggleStates();
        animateTaskAddition(docRef.id);
        showSuccessNotification(); // Add success notification
        
        // Reset form
        taskInput.value = "";
        difficultySelect.value = "1"; // Reset to default difficulty
        document.getElementById('customPoints').style.display = 'none';
        document.getElementById('customPoints').value = '';
        wishlistCheckbox.checked = false;
    } catch (error) {
        console.error("Error adding task: ", error);
        if (!navigator.onLine) {
            const offlineTask = { ...task, offlineId: Date.now() };
            storeOfflineTask(offlineTask);
            tasks.unshift(offlineTask);
            renderTasks();
            restoreToggleStates();
            showSuccessNotification();

            // Reset form
            taskInput.value = "";
            difficultySelect.value = "1";
            document.getElementById('customPoints').style.display = 'none';
            document.getElementById('customPoints').value = '';
            wishlistCheckbox.checked = false;
        }
    }
}

// Toggle task completion
async function toggleTaskCompletion(taskId, completed) {
    saveToggleStates();
    try {
        const taskDoc = doc(db, "tasks", taskId);
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        const task = tasks[taskIndex];

        // Check if task has #repeat tag
        const isRepeatTask = task.text.includes('#repeat');

        if (completed) {
            // Credit points regardless of repeat status
            completedTasks++;
            totalPoints += getPoints(task.difficulty, task.customPoints);
            updateStats();
            triggerConfetti();

            if (isRepeatTask) {
                // For repeat tasks, immediately reset completion status
                await updateDoc(taskDoc, { completed: false });
                tasks[taskIndex].completed = false;
                renderTasks();
            } else {
                // For non-repeat tasks, mark as completed normally
                await updateDoc(taskDoc, { completed: true });
                tasks[taskIndex].completed = true;
                renderTasks();
            }
        } else {
            // Handle unchecking (only possible for non-repeat tasks)
            if (!isRepeatTask) {
                await updateDoc(taskDoc, { completed: false });
                tasks[taskIndex].completed = false;
                completedTasks--;
                totalPoints -= getPoints(task.difficulty, task.customPoints);
                updateStats();
                renderTasks();
            }
        }

        console.log(`Task ${taskId} handled: ${completed ? 'completed' : 'uncompleted'}, Repeat: ${isRepeatTask}`);
        await renderTasks();
        restoreToggleStates();
    } catch (error) {
        console.error("Error updating task: ", error);
    }
}

// Modify editTaskText function to handle #0buy tag
async function editTaskText(taskId, newText) {
    if (newText.trim() === "") {
        alert("Task text cannot be empty.");
        loadTasks();
        return;
    }

    try {
        saveToggleStates();

        const taskDoc = doc(db, "tasks", taskId);
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        const currentTask = tasks[taskIndex];
        
        // Check if #0buy was added
        const hadBuyTag = currentTask.text.includes('#0buy');
        const hasBuyTag = newText.includes('#0buy');
        
        // Update wishlist status if #0buy tag was added or removed
        if (hasBuyTag !== hadBuyTag) {
            await updateDoc(taskDoc, { 
                text: newText,
                isWishlist: hasBuyTag
            });
        } else {
            await updateDoc(taskDoc, { text: newText });
        }

        // Update local task data
        if (taskIndex !== -1) {
            tasks[taskIndex].text = newText;
            tasks[taskIndex].isWishlist = hasBuyTag;
            await renderTasks(tasks);
            restoreToggleStates();
        }

        const oldAlarm = alarmService.alarms.get(taskId);
        if (oldAlarm) {
            alarmService.clearAlarm(taskId);
        }

        const newAlarmDate = alarmService.parseAlarmPattern(newText);
        if (newAlarmDate) {
            alarmService.scheduleAlarm(taskId, newText, newAlarmDate);
        }
    } catch (error) {
        console.error("Error editing task:", error);
    }
}

// Update task difficulty
async function updateTaskDifficulty(taskId, newDifficulty) {
    saveToggleStates();
    try {
        const taskDoc = doc(db, "tasks", taskId);
        await updateDoc(taskDoc, { difficulty: newDifficulty });
        console.log(`Task ${taskId} difficulty updated to ${newDifficulty}.`);
        loadTasks(); // Reload tasks to update UI and trigger animations
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            tasks[taskIndex].difficulty = newDifficulty;
            updateStats();
            await renderTasks();
            restoreToggleStates();
        }
    } catch (error) {
        console.error("Error updating task difficulty: ", error);
    }
}

// Delete a task
async function deleteTask(taskId) {
    saveToggleStates();
    try {
        alarmService.clearAlarm(taskId);
        await deleteDoc(doc(db, "tasks", taskId));
        console.log(`Task ${taskId} deleted.`);
        animateTaskDeletion(taskId);
        loadTasks(); // Reload tasks to update list and stats
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            tasks.splice(taskIndex, 1);
        }
        
        animateTaskDeletion(taskId);
        await renderTasks();
        restoreToggleStates();
    } catch (error) {
        console.error("Error deleting task: ", error);
    }
}

// Reset all progress
async function resetProgress() {
    try {
        const querySnapshot = await getDocs(collection(db, "tasks"));
        const batch = writeBatch(db);

        querySnapshot.forEach((docSnap) => {
            batch.delete(doc(db, "tasks", docSnap.id));
        });

        await batch.commit();
        console.log("All tasks deleted successfully.");
        loadTasks(); // Reload tasks to reflect changes
    } catch (error) {
        console.error("Error resetting progress: ", error);
    }
}

// ===========================
// Firestore Update for Custom Points
// ===========================

// Add function to update custom points
async function updateTaskCustomPoints(taskId, newCustomPoints) {
    try {
        const taskDoc = doc(db, "tasks", taskId);
        const points = parseInt(newCustomPoints) || 30;
        await updateDoc(taskDoc, { 
            customPoints: points,
            difficulty: 6  // Ensure difficulty stays at 6 for custom points
        });
        console.log(`Task ${taskId} custom points updated to ${points}.`);
        loadTasks(); // Reload tasks to update UI and trigger animations
    } catch (error) {
        console.error("Error updating task custom points:", error);
    }
}

// ===========================
// Task Reordering
// ===========================

function getActiveTasksSorted() {
    return tasks
        .filter(t => !t.completed)
        .sort((a, b) => getPoints(b.difficulty, b.customPoints) - getPoints(a.difficulty, a.customPoints));
}

async function swapTaskPoints(taskA, taskB) {
    saveToggleStates();
    try {
        const docA = doc(db, "tasks", taskA.id);
        const docB = doc(db, "tasks", taskB.id);

        await Promise.all([
            updateDoc(docA, { difficulty: taskB.difficulty, customPoints: taskB.customPoints }),
            updateDoc(docB, { difficulty: taskA.difficulty, customPoints: taskA.customPoints })
        ]);

        const tempDiff = taskA.difficulty;
        const tempCustom = taskA.customPoints;
        taskA.difficulty = taskB.difficulty;
        taskA.customPoints = taskB.customPoints;
        taskB.difficulty = tempDiff;
        taskB.customPoints = tempCustom;

        await loadTasks();
        restoreToggleStates();
    } catch (error) {
        console.error('Error swapping task points:', error);
    }
}

async function moveTaskUp(taskId) {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
        const task = tasks[taskIndex];
        let newDifficulty = task.difficulty + 1;
        if (newDifficulty > 6) newDifficulty = 6;

        const updates = { difficulty: newDifficulty };
        if (newDifficulty === 6) {
            updates.customPoints = 50;
        } else {
            updates.customPoints = null;
        }

        const taskDoc = doc(db, "tasks", task.id);
        await updateDoc(taskDoc, updates);
        task.difficulty = newDifficulty;
        task.customPoints = updates.customPoints;

        await loadTasks();
        restoreToggleStates();
    }
}

async function moveTaskDown(taskId) {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
        const task = tasks[taskIndex];
        let newDifficulty = task.difficulty - 1;
        if (newDifficulty < 1) newDifficulty = 1;

        const updates = { difficulty: newDifficulty };
        if (newDifficulty === 6) {
            updates.customPoints = 50;
        } else {
            updates.customPoints = null;
        }

        const taskDoc = doc(db, "tasks", task.id);
        await updateDoc(taskDoc, updates);
        task.difficulty = newDifficulty;
        task.customPoints = updates.customPoints;

        await loadTasks();
        restoreToggleStates();
    }
}

// ===========================
// Render Tasks to the DOM
// ===========================

// Extract hashtags from text
function extractHashtags(text) {
    const hashtagRegex = /#[\w\u0590-\u05ff]+/g;
    return text.match(hashtagRegex) || [];
}

// Group tasks by hashtags
function groupTasksByHashtags(tasks) {
    const groups = new Map();
    const noHashtagGroup = [];

    tasks.forEach(task => {
        const hashtags = extractHashtags(task.text);
        if (hashtags.length === 0) {
            noHashtagGroup.push(task);
        } else {
            // Add task to each of its hashtag groups
            hashtags.forEach(tag => {
                if (!groups.has(tag)) {
                    groups.set(tag, []);
                }
                groups.set(tag, [...groups.get(tag), task]);
            });
        }
    });

    // Sort each group by points
    groups.forEach((tasks, tag) => {
        tasks.sort((a, b) => {
            const pointsA = getPoints(a.difficulty, a.customPoints);
            const pointsB = getPoints(b.difficulty, b.customPoints);
            return pointsB - pointsA;
        });
    });

    // Convert to sorted array of groups
    const sortedGroups = Array.from(groups.entries())
        .sort(([tagA], [tagB]) => tagA.localeCompare(tagB));

    return { sortedGroups, noHashtagGroup };
}

// Modify the renderTasks function to use our hashtag hierarchy
function renderTasks(filteredTasks = tasks) {
    // Save current toggle states before clearing the lists
    saveToggleStates();
    
    // Clear existing tasks
    activeTasksList.innerHTML = `<h3>Active Tasks</h3>`;
    completedTasksList.innerHTML = `<h3>Completed Tasks</h3>`;

    const activeTasks = filteredTasks.filter(task => !task.completed);
    const completedTasksArr = filteredTasks.filter(task => task.completed);

    // Extract all hashtags from all tasks
    const allHashtags = new Set();
    activeTasks.forEach(task => {
        const hashtags = extractHashtags(task.text);
        hashtags.forEach(tag => allHashtags.add(tag));
    });
    
    // Add parent toggle to the set
    allHashtags.add("#non0");
    
    // Organize hashtags using the hierarchy manager
    const { parentTag, nestedTags, excludedTags } = organizeHashtags(Array.from(allHashtags));
    
    // Group tasks by hashtags
    const { sortedGroups, noHashtagGroup } = groupTasksByHashtags(activeTasks);
    
    // First, render the parent toggle
    let parentToggleRendered = false;
    
    // Then render excluded hashtags (those starting with #0 or #_)
    const processedGroups = new Set(); // Keep track of which hashtag groups we've rendered
    
    // First, render excluded hashtags (those starting with #0 or #_)
    sortedGroups.forEach(([tag, tasks]) => {
        if (excludedTags.includes(tag)) {
            renderHashtagGroup(tag, tasks, false);
            processedGroups.add(tag);
        }
    });
    
    // Now render the parent toggle and its nested tags
    if (nestedTags.length > 0) {
        // Create the parent toggle group
        const parentGroupDiv = document.createElement('div');
        parentGroupDiv.classList.add('hashtag-group');
        
        // Create the parent toggle header
        const parentToggleHeader = createToggleHeader(parentTag, nestedTags.length);
        parentGroupDiv.appendChild(parentToggleHeader);
        
        // Create the container for nested content
        const parentContentDiv = document.createElement('div');
        parentContentDiv.classList.add('hashtag-content', 'parent-content');
        
        // Set initial state for parent toggle
        const shouldExpandParent = openToggles.has(parentTag);
        
        if (shouldExpandParent) {
            parentToggleHeader.classList.add('expanded');
            parentToggleHeader.querySelector('.toggle-icon').textContent = '▼';
            parentContentDiv.style.display = 'block';
            parentContentDiv.style.maxHeight = 'none'; // Allow nested content to expand
        } else {
            parentContentDiv.style.display = 'none';
            parentContentDiv.style.maxHeight = '0';
        }
        
        // Add click behavior to parent toggle
        parentToggleHeader.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = parentToggleHeader.classList.contains('expanded');
            
            if (isExpanded) {
                // Collapse
                parentToggleHeader.classList.remove('expanded');
                parentToggleHeader.querySelector('.toggle-icon').textContent = '▶';
                parentContentDiv.style.maxHeight = '0';
                setTimeout(() => {
                    parentContentDiv.style.display = 'none';
                }, 300);
                openToggles.delete(parentTag);
            } else {
                // Expand
                parentToggleHeader.classList.add('expanded');
                parentToggleHeader.querySelector('.toggle-icon').textContent = '▼';
                parentContentDiv.style.display = 'block';
                parentContentDiv.style.maxHeight = 'none';
                openToggles.add(parentTag);
            }
        });
        
        // Now add all nested hashtags under the parent
        nestedTags.forEach(nestedTag => {
            // Find the tasks for this tag
            const nestedGroupData = sortedGroups.find(([tag]) => tag === nestedTag);
            if (nestedGroupData) {
                const [tag, tagTasks] = nestedGroupData;
                
                // Create nested toggle
                const nestedGroupDiv = document.createElement('div');
                nestedGroupDiv.classList.add('hashtag-group', 'nested-group');
                
                // Create toggle header with appropriate styling for nested tag
                const nestedToggleHeader = createToggleHeader(tag, tagTasks.length, true);
                nestedGroupDiv.appendChild(nestedToggleHeader);
                
                // Create content div for this nested toggle
                const nestedContentDiv = document.createElement('div');
                nestedContentDiv.classList.add('hashtag-content', 'nested-content');
                
                // Handle initial state
                const shouldExpandNested = openToggles.has(tag);
                
                if (shouldExpandNested && shouldExpandParent) {
                    nestedToggleHeader.classList.add('expanded');
                    nestedToggleHeader.querySelector('.toggle-icon').textContent = '▼';
                    nestedContentDiv.style.display = 'block';
                    setTimeout(() => {
                        nestedContentDiv.style.maxHeight = `${nestedContentDiv.scrollHeight}px`;
                    }, 0);
                } else {
                    nestedContentDiv.style.display = 'none';
                    nestedContentDiv.style.maxHeight = '0';
                }
                
                // Add click behavior
                nestedToggleHeader.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isExpanded = nestedToggleHeader.classList.contains('expanded');
                    
                    if (isExpanded) {
                        // Collapse
                        nestedToggleHeader.classList.remove('expanded');
                        nestedToggleHeader.querySelector('.toggle-icon').textContent = '▶';
                        nestedContentDiv.style.maxHeight = '0';
                        setTimeout(() => {
                            nestedContentDiv.style.display = 'none';
                        }, 300);
                        openToggles.delete(tag);
                    } else {
                        // Expand
                        nestedToggleHeader.classList.add('expanded');
                        nestedToggleHeader.querySelector('.toggle-icon').textContent = '▼';
                        nestedContentDiv.style.display = 'block';
                        setTimeout(() => {
                            nestedContentDiv.style.maxHeight = `${nestedContentDiv.scrollHeight}px`;
                        }, 0);
                        openToggles.add(tag);
                    }
                });
                
                // Add tasks to content container
                tagTasks.forEach(task => {
                    const taskItem = createTaskElement(task, false);
                    nestedContentDiv.appendChild(taskItem);
                });
                
                nestedGroupDiv.appendChild(nestedContentDiv);
                parentContentDiv.appendChild(nestedGroupDiv);
                
                // Mark this tag as processed
                processedGroups.add(tag);
            }
        });
        
        parentGroupDiv.appendChild(parentContentDiv);
        activeTasksList.appendChild(parentGroupDiv);
        parentToggleRendered = true;
    }
    
    // Helper function to create a toggle header with consistent styling
    function createToggleHeader(tag, taskCount, isNested = false) {
        const toggleHeader = document.createElement('div');
        toggleHeader.classList.add('hashtag-toggle');
        if (isNested) toggleHeader.classList.add('nested-toggle');
        
        // Apply styling
        const config = hashtagToggleConfig.customConfig[tag] || hashtagToggleConfig.default;
        
        toggleHeader.style.fontSize = config.fontSize;
        toggleHeader.style.fontFamily = config.fontFamily;
        toggleHeader.style.height = config.height;
        toggleHeader.style.display = 'flex';
        toggleHeader.style.alignItems = 'center';
        
        if (isNested) {
            toggleHeader.style.marginLeft = '15px';
        }
        
        // Create elements with specific styling
        const toggleIcon = document.createElement('span');
        toggleIcon.className = 'toggle-icon';
        toggleIcon.textContent = '▶';
        toggleIcon.style.fontSize = `calc(${config.fontSize} * 0.8)`;
        toggleIcon.style.marginRight = `calc(${config.fontSize} * 0.5)`;
        
        const label = document.createElement('span');
        label.className = 'hashtag-label';
        label.textContent = tag;
        label.style.fontSize = config.fontSize;
        label.style.lineHeight = config.height;
        
        const count = document.createElement('span');
        count.className = 'task-count';
        count.textContent = taskCount;
        count.style.fontSize = `calc(${config.fontSize} * 0.8)`;
        count.style.padding = `calc(${config.fontSize} * 0.2) calc(${config.fontSize} * 0.4)`;
        
        // Add hover effects
        toggleHeader.addEventListener('mouseenter', () => {
            toggleHeader.style.backgroundColor = config.hoverBgColor;
            if (config.easterEgg) {
                label.dataset.originalText = label.textContent;
                label.textContent = config.easterEgg;
            }
        });
        
        toggleHeader.addEventListener('mouseleave', () => {
            toggleHeader.style.backgroundColor = '';
            if (config.easterEgg) {
                label.textContent = label.dataset.originalText;
            }
        });
        
        // Add the (+) button for adding tasks with this hashtag
        const addButton = document.createElement('button');
        addButton.classList.add('add-task-button');
        addButton.innerHTML = '<i class="fas fa-plus"></i>';
        addButton.title = `Add task with ${tag}`;
        addButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const hashtagWithSpace = ` ${tag}`;
            taskInput.value = hashtagWithSpace;
            taskInput.focus();
            taskInput.setSelectionRange(0, 0);

            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        });
        
        // Assemble the toggle header
        toggleHeader.appendChild(toggleIcon);
        toggleHeader.appendChild(label);
        toggleHeader.appendChild(count);
        toggleHeader.appendChild(addButton);
        
        return toggleHeader;
    }
    
    // Render a hashtag group directly to the active tasks list
    function renderHashtagGroup(tag, tasks, isNested = false) {
        const groupDiv = document.createElement('div');
        groupDiv.classList.add('hashtag-group');
        if (isNested) groupDiv.classList.add('nested-group');
        
        const toggleHeader = createToggleHeader(tag, tasks.length, isNested);
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('hashtag-content');
        
        // Set initial state based on openToggles
        const shouldExpand = openToggles.has(tag);
        
        if (shouldExpand) {
            toggleHeader.classList.add('expanded');
            toggleHeader.querySelector('.toggle-icon').textContent = '▼';
            contentDiv.style.display = 'block';
            setTimeout(() => {
                contentDiv.style.maxHeight = `${contentDiv.scrollHeight}px`;
            }, 0);
        } else {
            contentDiv.style.display = 'none';
            contentDiv.style.maxHeight = '0';
        }
        
        // Toggle behavior
        toggleHeader.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = toggleHeader.classList.contains('expanded');
            
            if (isExpanded) {
                toggleHeader.classList.remove('expanded');
                toggleHeader.querySelector('.toggle-icon').textContent = '▶';
                contentDiv.style.maxHeight = '0';
                setTimeout(() => {
                    contentDiv.style.display = 'none';
                }, 300);
                openToggles.delete(tag);
            } else {
                toggleHeader.classList.add('expanded');
                toggleHeader.querySelector('.toggle-icon').textContent = '▼';
                contentDiv.style.display = 'block';
                setTimeout(() => {
                    contentDiv.style.maxHeight = `${contentDiv.scrollHeight}px`;
                }, 0);
                openToggles.add(tag);
            }
        });
        
        // Add tasks to content container
        tasks.forEach(task => {
            const taskItem = createTaskElement(task, false);
            contentDiv.appendChild(taskItem);
        });
        
        groupDiv.appendChild(toggleHeader);
        groupDiv.appendChild(contentDiv);
        activeTasksList.appendChild(groupDiv);
    }
    
    // Handle tasks without hashtags
    if (noHashtagGroup.length > 0) {
        const groupDiv = document.createElement('div');
        groupDiv.classList.add('hashtag-group');
        
        const toggleHeader = createToggleHeader('Other Tasks', noHashtagGroup.length);
        toggleHeader.querySelector('.hashtag-label').textContent = 'Other Tasks';
        
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('hashtag-content');
        
        // Set initial state
        const shouldExpand = openToggles.has('Other Tasks');
        
        if (shouldExpand) {
            toggleHeader.classList.add('expanded');
            toggleHeader.querySelector('.toggle-icon').textContent = '▼';
            contentDiv.style.display = 'block';
            setTimeout(() => {
                contentDiv.style.maxHeight = `${contentDiv.scrollHeight}px`;
            }, 0);
        } else {
            contentDiv.style.display = 'none';
            contentDiv.style.maxHeight = '0';
        }
        
        // Toggle behavior
        toggleHeader.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = toggleHeader.classList.contains('expanded');
            
            if (isExpanded) {
                toggleHeader.classList.remove('expanded');
                toggleHeader.querySelector('.toggle-icon').textContent = '▶';
                contentDiv.style.maxHeight = '0';
                setTimeout(() => {
                    contentDiv.style.display = 'none';
                }, 300);
                openToggles.delete('Other Tasks');
            } else {
                toggleHeader.classList.add('expanded');
                toggleHeader.querySelector('.toggle-icon').textContent = '▼';
                contentDiv.style.display = 'block';
                setTimeout(() => {
                    contentDiv.style.maxHeight = `${contentDiv.scrollHeight}px`;
                }, 0);
                openToggles.add('Other Tasks');
            }
        });
        
        // Add tasks sorted by points
        noHashtagGroup
            .sort((a, b) => getPoints(b.difficulty, b.customPoints) - getPoints(a.difficulty, a.customPoints))
            .forEach(task => {
                const taskItem = createTaskElement(task, false);
                contentDiv.appendChild(taskItem);
            });
        
        groupDiv.appendChild(toggleHeader);
        groupDiv.appendChild(contentDiv);
        activeTasksList.appendChild(groupDiv);
    }
    
    // Render completed tasks (unchanged)
    completedTasksArr
        .sort((a, b) => getPoints(b.difficulty, b.customPoints) - getPoints(a.difficulty, a.customPoints))
        .forEach(task => {
            const taskItem = createTaskElement(task, true);
            completedTasksList.appendChild(taskItem);
        });
        
    // Restore toggle states at the end
    restoreToggleStates();
}

// Update createTaskElement to remove the task number
function createTaskElement(task, isCompleted) {
    const taskItem = document.createElement('div');
    taskItem.classList.add('task-item');
    taskItem.setAttribute('data-id', task.id);
    taskItem.setAttribute('data-priority', task.priority);

    // Task Details
    const taskDetails = document.createElement('div');
    taskDetails.classList.add('task-details');

    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = isCompleted;
    checkbox.disabled = isCompleted; // Disable checkbox for completed tasks
    checkbox.addEventListener('change', () => {
        const isRepeatTask = task.text.includes('#repeat');
        
        // For repeat tasks, always pass true for completion to trigger points
        // but the toggle function will handle resetting it
        toggleTaskCompletion(task.id, checkbox.checked);
        
        // For repeat tasks, immediately uncheck the checkbox
        if (isRepeatTask && checkbox.checked) {
            setTimeout(() => {
                checkbox.checked = false;
            }, 500); // Small delay to show the check animation
        }
    });

    // Task Text
    const taskText = document.createElement('input');
    taskText.type = 'text';
    taskText.value = task.text;
    taskText.classList.add('task-text');
    if (isCompleted) {
        taskText.classList.add('completed');
    }
    taskText.disabled = isCompleted;

    // Add event listeners for editing
    taskText.addEventListener('blur', () => {
        if (taskText.value !== task.text) {
            editTaskText(task.id, taskText.value);
        }
    });

    // Add keypress listener for Enter key
    taskText.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.keyCode === 13) {
            e.preventDefault();
            taskText.blur(); // Trigger blur event to save changes
        }
    });

    taskDetails.appendChild(checkbox);
    taskDetails.appendChild(taskText);

    // Task Actions
    const taskActions = document.createElement('div');
    taskActions.classList.add('task-actions');

    if (!isCompleted) {  // Only add shopping cart toggle for active tasks
        // Add shopping cart toggle
        const cartToggle = document.createElement('button');
        cartToggle.innerHTML = task.isWishlist ? '🛒' : '☐';
        cartToggle.title = 'Toggle Shopping List';
        cartToggle.classList.add('cart-toggle');
        cartToggle.style.fontSize = '1.3rem';
        if (task.isWishlist) {
            cartToggle.classList.add('active');
        }
        
        cartToggle.addEventListener('click', async () => {
            try {
                const taskDoc = doc(db, "tasks", task.id);
                const newWishlistStatus = !task.isWishlist;
                let newText = task.text;

                // Add or remove #0buy tag based on wishlist status
                if (newWishlistStatus && !task.text.includes('#0buy')) {
                    newText = `${task.text} #0buy`;
                } else if (!newWishlistStatus && task.text.includes('#0buy')) {
                    newText = task.text.replace(/#0buy\b/g, '').trim();
                }

                await updateDoc(taskDoc, { 
                    isWishlist: newWishlistStatus,
                    text: newText
                });

                cartToggle.innerHTML = newWishlistStatus ? '🛒' : '☐';
                cartToggle.classList.toggle('active');
                task.isWishlist = newWishlistStatus;
                task.text = newText;

                // Update the task text display
                const taskText = taskItem.querySelector('.task-text');
                taskText.value = newText;

                // Refresh the task list if we're currently filtering by wishlist
                if (currentFilter === 'wishlist') {
                    filterTasks(taskSearchInput.value);
                } else {
                    renderTasks();
                }
            } catch (error) {
                console.error("Error updating wishlist status:", error);
            }
        });

        taskActions.appendChild(cartToggle);
    }

    // Difficulty Select
    const difficultySelectElement = document.createElement('select');
    [1, 2, 3, 4, 5, 6].forEach(num => {
        const option = document.createElement('option');
        option.value = num;
        option.textContent = `${getPoints(num)}`; // Simply show points for all options
        if (num === task.difficulty) option.selected = true;
        difficultySelectElement.appendChild(option);
    });

    // Remove custom points input element and its related code
    difficultySelectElement.addEventListener('change', () => {
        const difficulty = parseInt(difficultySelectElement.value);
        updateTaskDifficulty(task.id, difficulty);
    });

    // Delete Button
    const deleteButton = document.createElement('button');
    deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
    deleteButton.title = 'Delete Task';
    deleteButton.addEventListener('click', () => {
        deleteTask(task.id);
    });

    // Move Up Button
    const upButton = document.createElement('button');
    upButton.innerHTML = '<i class="fas fa-arrow-up"></i>';
    upButton.title = 'Move Up';
    upButton.addEventListener('click', () => moveTaskUp(task.id));

    // Move Down Button
    const downButton = document.createElement('button');
    downButton.innerHTML = '<i class="fas fa-arrow-down"></i>';
    downButton.title = 'Move Down';
    downButton.addEventListener('click', () => moveTaskDown(task.id));

    // Append actions
    taskActions.appendChild(difficultySelectElement);
    if (!isCompleted) {
        taskActions.appendChild(upButton);
        taskActions.appendChild(downButton);
        taskActions.appendChild(deleteButton);
    }

    // Apply completed styles
    if (isCompleted) {
        taskText.classList.add('completed');
    }

    // Append to task item
    taskItem.appendChild(taskDetails);
    taskItem.appendChild(taskActions);

    return taskItem;
}

// ===========================
// Event Listeners
// ===========================

// Add Task Button Click
addTaskButton.addEventListener('click', addTask);

// Task Search Input Event Listener
taskSearchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    filterTasks(searchTerm);
});

// Add Task Input Event Listeners
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' || e.keyCode === 13) {
        e.preventDefault(); // Prevent default form submission
        addTask();
    }
});

// Reset Button Click
resetButton.addEventListener('click', () => {
    // Show confirmation modal
    confirmModal.style.display = 'block';
});

// Confirm Yes Button
confirmYes.addEventListener('click', () => {
    resetProgress();
    confirmModal.style.display = 'none';
});

// Confirm No Button
confirmNo.addEventListener('click', () => {
    confirmModal.style.display = 'none';
});

// Close Modal when clicking outside the content
window.addEventListener('click', (event) => {
    if (event.target === confirmModal) {
        confirmModal.style.display = 'none';
    }
});

// Wishlist Filter Button Click
wishlistFilter.addEventListener('click', () => {
    currentFilter = currentFilter === 'wishlist' ? 'all' : 'wishlist';
    wishlistFilter.classList.toggle('active', currentFilter === 'wishlist');
    
    // Refresh the task list with current search term
    filterTasks(taskSearchInput.value);
});

// Add after other event listeners
document.getElementById('clearSearch').addEventListener('click', () => {
    const searchInput = document.getElementById('taskSearchInput');
    searchInput.value = '';
    searchInput.focus();
    filterTasks('');
});

// ===========================
// Initialize App
// ===========================

// The loadTasks function is called when the user is authenticated in the onAuthStateChanged listener.

// ===========================
// Animation Functions
// ===========================

// Function to animate Completed Tasks
function animateCompletedTasks(element) {
    element.classList.add('pulse');
    element.addEventListener('animationend', function handleAnimationEnd() {
        element.classList.remove('pulse');
        element.removeEventListener('animationend', handleAnimationEnd);
    });
}

// Function to animate Points Counting
function animatePointsCount(element, from, to) {
    const duration = 1000; // Duration in milliseconds
    let start = null;
    const step = timestamp => {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const current = Math.min(Math.floor(progress / duration * (to - from) + from), to);
        element.textContent = current;
        if (progress < duration) {
            window.requestAnimationFrame(step);
        } else {
            element.textContent = to;
        }
    };
    window.requestAnimationFrame(step);
}

// Function to animate Level Up
function animateLevelUp(element) {
    // Add shine effect
    element.classList.add('shine');
    element.addEventListener('animationend', function handleAnimationEnd() {
        element.classList.remove('shine');
        element.removeEventListener('animationend', handleAnimationEnd);
    });

    // Show Level Up Badge
    showLevelUpBadge(element);
}

// Function to show Level Up Badge
function showLevelUpBadge(element) {
    const badge = document.createElement('div');
    badge.classList.add('level-up-badge');
    badge.textContent = '🎉 Level Up!';
    element.parentElement.appendChild(badge);

    // Remove badge after animation
    badge.addEventListener('animationend', () => {
        badge.remove();
    });
}

// Animate task addition with optional flash
function animateTaskAddition(taskId) {
    const taskElement = document.querySelector(`.task-item[data-id="${taskId}"]`);
    if (taskElement) {
        taskElement.style.transform = 'scale(0.9)';
        taskElement.style.opacity = '0';
        setTimeout(() => {
            taskElement.style.transition = `transform 0.3s ease, opacity 0.3s ease`;
            taskElement.style.transform = 'scale(1)';
            taskElement.style.opacity = '1';
        }, 100);

        // Flash the stats container to highlight the update
        const statsContainer = document.querySelector('.stats');
        statsContainer.classList.add('flash');
        statsContainer.addEventListener('animationend', function handleFlashEnd() {
            statsContainer.classList.remove('flash');
            statsContainer.removeEventListener('animationend', handleFlashEnd);
        });
    }
}

// Animate task deletion
function animateTaskDeletion(taskId) {
    const taskElement = document.querySelector(`.task-item[data-id="${taskId}"]`);
    if (taskElement) {
        taskElement.style.transform = 'scale(0.9)';
        taskElement.style.opacity = '0';
        setTimeout(() => {
            taskElement.remove();
        }, 300);
    }
}

// ===========================
// Confetti Animation
// ===========================

// Modify the triggerConfetti function to use the audioService for the completion sound
function triggerConfetti() {
    // Play task completion sound using the audio service
    audioService.playSound('complete').catch(err => 
        console.warn('Could not play completion sound:', err)
    );
    
    // Original confetti logic
    const confettiColors = ['#FFD700', '#FFC300', '#FFEA00', '#FFF700', '#FFC100', '#FFB700']; 
    const numberOfConfetti = 200;

    for (let i = 0; i < numberOfConfetti; i++) {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');
        confetti.style.backgroundColor = confettiColors[Math.floor(Math.random() * confettiColors.length)];
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.top = `${Math.random() * -100}px`;
        confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
        const size = Math.random() * 8 + 4; // Sizes between 4px and 12px
        confetti.style.width = `${size}px`;
        confetti.style.height = `${size}px`;
        confetti.style.opacity = Math.random() * 0.5 + 0.5; // Opacity between 0.5 and 1
        confettiContainer.appendChild(confetti);

        // Remove confetti after animation
        confetti.addEventListener('animationend', () => {
            confetti.remove();
        });
    }
}

// ===========================
// Responsive Task Form Handling
// ===========================

// Remove the custom points input event listener from the main form
document.getElementById('difficultySelect').addEventListener('change', (e) => {
    // Remove the custom points handling as it's no longer needed
});

// Filter tasks based on search term
function filterTasks(searchTerm = '') {
    let filteredTasks = tasks;
    
    // Apply search filter
    if (searchTerm) {
        filteredTasks = filteredTasks.filter(task => 
            task.text.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    // Apply wishlist filter differently - now just expand relevant sections
    if (currentFilter === 'wishlist') {
        syncShoppingTags(); // Ensure tags are synced
    }
    
    // Always render all tasks, but control expansion state
    renderTasks(filteredTasks);
}

// Add new function to sync shopping tags
async function syncShoppingTags() {
    const updates = [];
    tasks.forEach(task => {
        if (task.isWishlist && !task.text.includes('#0buy')) {
            // Task is in shopping list but missing #0buy tag
            updates.push({
                id: task.id,
                newText: `${task.text} #0buy`
            });
        } else if (!task.isWishlist && task.text.includes('#0buy')) {
            // Task has #0buy tag but not in shopping list
            updates.push({
                id: task.id,
                isWishlist: true
            });
        }
    });

    // Apply updates if needed
    if (updates.length > 0) {
        const batch = writeBatch(db);
        updates.forEach(update => {
            const taskRef = doc(db, "tasks", update.id);
            if (update.newText) {
                batch.update(taskRef, { 
                    text: update.newText
                });
            }
            if (update.isWishlist !== undefined) {
                batch.update(taskRef, { 
                    isWishlist: update.isWishlist
                });
            }
        });

        try {
            await batch.commit();
            console.log("Shopping tags synchronized successfully");
            await loadTasks(); // Reload tasks to reflect changes
        } catch (error) {
            console.error("Error synchronizing shopping tags:", error);
        }
    }
}

// Add new migration function to convert #shop to #0buy
async function migrateShopToBuyTags() {
    const updates = [];
    tasks.forEach(task => {
        const text = task.text;
        // Check for both old and new tags to ensure complete migration
        if (text.includes('#shop') || text.includes('#0buy')) {
            // Replace all variations and clean up
            const newText = text
                .replace(/#shop\b/g, '#0buy')
                .replace(/(#0buy\s*)+/g, '#0buy ') // Remove duplicate #0buy tags
                .trim();
            
            if (newText !== text) {
                updates.push({
                    id: task.id,
                    newText: newText,
                    isWishlist: true // Ensure wishlist status is set for any task with #0buy
                });
            }
        }
    });

    // Apply updates if needed
    if (updates.length > 0) {
        const batch = writeBatch(db);
        updates.forEach(update => {
            const taskRef = doc(db, "tasks", update.id);
            batch.update(taskRef, { 
                text: newText,
                isWishlist: update.isWishlist
            });
        });

        try {
            await batch.commit();
            console.log("Shopping tags migrated successfully");
            await loadTasks(); // Reload tasks to reflect changes
        } catch (error) {
            console.error("Error migrating shopping tags:", error);
        }
    }
}

// Add function to show success notification
function showSuccessNotification() {
    // Create and append success message if it doesn't exist
    let successOverlay = document.getElementById('successOverlay');
    let successMessage = document.getElementById('successMessage');
    
    if (!successOverlay) {
        successOverlay = document.createElement('div');
        successOverlay.id = 'successOverlay';
        document.body.appendChild(successOverlay);
        
        successMessage = document.createElement('button');
        successMessage.id = 'successMessage';
        successMessage.className = 'crystal-button';
        successMessage.textContent = 'Quest Added';
        successOverlay.appendChild(successMessage);
        
        // Add the crystal button styles
        const style = document.createElement('style');
        style.textContent = `
            #successOverlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 21, 255, 0.15);
                display: flex;
                justify-content: center;
                align-items: center;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease-in-out;
                z-index: 1000;
            }
            
            #successOverlay.show {
                opacity: 1;
                visibility: visible;
            }
            
            .crystal-button {
                font-size: 1.5rem;
                font-weight: bold;
                color: white;
                background: linear-gradient(145deg, #0066ff, #0033ff, #001aff, #0000ff);
                background-size: 300% 300%;
                border: none;
                border-radius: 40px;
                box-shadow: 
                    0 0 15px rgba(0, 89, 255, 0.5),
                    0 0 30px rgba(0, 89, 255, 0.3),
                    0 0 45px rgba(0, 89, 255, 0.1),
                    inset 0 0 15px rgba(255, 255, 255, 0.4);
                padding: 8px 32px;
                text-transform: uppercase;
                text-shadow: 0 0 10px rgba(0, 89, 255, 0.8);
                cursor: pointer;
                transition: all 0.3s ease-in-out;
                animation: neonPulse 2s infinite alternate;
                opacity: 0;
                transform: translateY(20px);
            }
            
            .crystal-button.show {
                opacity: 1;
                transform: translateY(0);
            }
            
            @keyframes neonPulse {
                0% {
                    box-shadow: 
                        0 0 15px rgba(0, 89, 255, 0.5),
                        0 0 30px rgba(0, 89, 255, 0.3),
                        0 0 45px rgba(0, 89, 255, 0.1),
                        inset 0 0 15px rgba(255, 255, 255, 0.4);
                    text-shadow: 0 0 10px rgba(0, 89, 255, 0.8);
                }
                100% {
                    box-shadow: 
                        0 0 20px rgba(0, 89, 255, 0.7),
                        0 0 35px rgba(0, 89, 255, 0.5),
                        0 0 50px rgba(0, 89, 255, 0.3),
                        inset 0 0 20px rgba(255, 255, 255, 0.6);
                    text-shadow: 0 0 15px rgba(0, 89, 255, 1);
                }
            }
            
            @keyframes colorShift {
                0% { background-position: 0% 0%; }
                100% { background-position: 100% 100%; }
            }
            
            .crystal-button:hover {
                box-shadow: 
                    0 0 25px rgba(0, 89, 255, 0.8),
                    0 0 40px rgba(0, 89, 255, 0.6),
                    0 0 55px rgba(0, 89, 255, 0.4),
                    inset 0 0 25px rgba(255, 255, 255, 0.8);
                transform: translateY(-3px);
            }
            
            .crystal-button:active {
                box-shadow: 
                    0 0 15px rgba(0, 89, 255, 0.5),
                    0 0 30px rgba(0, 89, 255, 0.3),
                    inset 0 0 15px rgba(0, 0, 0, 0.2);
                transform: translateY(0);
            }
        `;
        document.head.appendChild(style);
    }
    
    successOverlay.classList.add('show');
    successMessage.classList.add('show');
    
    setTimeout(() => {
        successOverlay.classList.remove('show');
        successMessage.classList.remove('show');
    }, 1500);
}

// Add new function to save toggle states
function saveToggleStates() {
    openToggles.clear();
    document.querySelectorAll('.hashtag-toggle').forEach(toggle => {
        const label = toggle.querySelector('.hashtag-label').textContent;
        const contentDiv = toggle.nextElementSibling;
        
        if (contentDiv && (
            toggle.classList.contains('expanded') || 
            contentDiv.style.display === 'block' || 
            contentDiv.style.maxHeight !== '0px'
        )) {
            openToggles.add(label);
            sessionStorage.setItem(`scroll-${label}`, contentDiv.scrollTop || '0');
        }
    });
}

function restoreToggleStates() {
    // Give the DOM a chance to update first
    requestAnimationFrame(() => {
        document.querySelectorAll('.hashtag-toggle').forEach(toggle => {
            const label = toggle.querySelector('.hashtag-label').textContent;
            if (openToggles.has(label)) {
                const contentDiv = toggle.nextElementSibling;
                if (contentDiv) {
                    // Update toggle state
                    toggle.classList.add('expanded');
                    toggle.querySelector('.toggle-icon').textContent = '▼';
                    
                    // Show content immediately
                    contentDiv.style.display = 'block';
                    
                    // Ensure proper height calculation
                    requestAnimationFrame(() => {
                        contentDiv.style.maxHeight = `${contentDiv.scrollHeight}px`;
                        
                        // Restore scroll position
                        const scrollPos = sessionStorage.getItem(`scroll-${label}`);
                        if (scrollPos) {
                            contentDiv.scrollTop = parseInt(scrollPos);
                        }
                    });
                }
            }
        });
    });
}

// Add event listener for scroll position saving
document.addEventListener('scroll', (e) => {
    if (e.target.classList && e.target.classList.contains('hashtag-content')) {
        const label = e.target.previousElementSibling.querySelector('.hashtag-label').textContent;
        sessionStorage.setItem(`scroll-${label}`, e.target.scrollTop);
    }
}, true);

// Add auth state logging
auth.onAuthStateChanged((user) => {
    console.log('Auth state changed:', {
        isLoggedIn: !!user,
        userEmail: user?.email,
        emailVerified: user?.emailVerified,
        timestamp: new Date().toISOString()
    });
});

// Add debugging for redirect result handling
getRedirectResult(auth)
    .then((result) => {
        console.log('Redirect result received:', result);
        if (result) {
            handleAuthResult(result);
        }
    })
    .catch((error) => {
        console.error('Redirect result error:', {
            error,
            code: error.code,
            message: error.message,
            stack: error.stack
        });
    });

// Add a utility function to update toggle styling
function updateHashtagToggleStyle(hashtag, newConfig) {
    hashtagToggleConfig.customConfig[hashtag] = {
        ...hashtagToggleConfig.default,
        ...hashtagToggleConfig.customConfig[hashtag],
        ...newConfig
    };
    renderTasks(tasks); // Re-render to apply changes
}

// Add a utility function to update default toggle styling
function updateDefaultToggleStyle(newConfig) {
    hashtagToggleConfig.default = {
        ...hashtagToggleConfig.default,
        ...newConfig
    };
    renderTasks(tasks); // Re-render to apply changes
}

// Hashtag Configuration Panel
const configToggle = document.getElementById('configToggle');
const configPanel = document.getElementById('configPanel');
const customTagsContainer = document.getElementById('customTagsContainer');
const addCustomTagBtn = document.getElementById('addCustomTag');

// Show/hide configuration panel
configToggle.addEventListener('click', () => {
    const isVisible = configPanel.style.display === 'block';
    configPanel.style.display = isVisible ? 'none' : 'block';
    configToggle.innerHTML = isVisible ? '⚙️' : '×';
    
    // Save state to localStorage
    localStorage.setItem('configPanelVisible', !isVisible);
    
    // If opening, scroll panel into view on mobile
    if (!isVisible && window.innerWidth <= 768) {
        configPanel.scrollIntoView({ behavior: 'smooth' });
    }
});

// Apply default style changes
document.getElementById('defaultFontSize').addEventListener('change', (e) => {
    updateDefaultToggleStyle({
        fontSize: `${e.target.value}px`
    });
});

document.getElementById('defaultFontFamily').addEventListener('change', (e) => {
    updateDefaultToggleStyle({
        fontFamily: e.target.value
    });
});

document.getElementById('defaultHoverColor').addEventListener('change', (e) => {
    updateDefaultToggleStyle({
        hoverBgColor: `${e.target.value}33` // Add 20% opacity
    });
});

document.getElementById('defaultEasterEgg').addEventListener('change', (e) => {
    updateDefaultToggleStyle({
        easterEgg: e.target.value
    });
});

// Create a custom tag configuration row
function createCustomTagRow(tag = '', settings = {}) {
    const row = document.createElement('div');
    row.className = 'custom-tag-row';

    row.innerHTML = `
        <input type="text" class="customTag" placeholder="Enter hashtag (e.g., #0)" value="${tag}">
        <input type="number" class="customFontSize" placeholder="Font size (px)" value="${settings.fontSize ? settings.fontSize.replace('px','') : ''}">
        <input type="text" class="customFontFamily" placeholder="Font family" value="${settings.fontFamily || ''}">
        <input type="color" class="customHoverColor" value="${settings.hoverBgColor ? settings.hoverBgColor.replace('33','') : '#ffffff'}">
        <input type="text" class="customEasterEgg" placeholder="Easter egg (emoji)" value="${settings.easterEgg || ''}">
        <button class="applyCustom">Apply</button>
        <button class="removeCustom">✕</button>
    `;

    customTagsContainer.appendChild(row);
}

// Add new custom tag row
addCustomTagBtn.addEventListener('click', () => {
    createCustomTagRow();
});

// Handle apply/remove actions for custom tags
customTagsContainer.addEventListener('click', (e) => {
    const row = e.target.closest('.custom-tag-row');
    if (!row) return;

    if (e.target.classList.contains('applyCustom')) {
        const hashtag = row.querySelector('.customTag').value;
        if (!hashtag.startsWith('#')) {
            alert('Please enter a valid hashtag starting with #');
            return;
        }

        const config = {
            fontSize: row.querySelector('.customFontSize').value ? `${row.querySelector('.customFontSize').value}px` : undefined,
            fontFamily: row.querySelector('.customFontFamily').value || undefined,
            hoverBgColor: row.querySelector('.customHoverColor').value ? `${row.querySelector('.customHoverColor').value}33` : undefined,
            easterEgg: row.querySelector('.customEasterEgg').value || undefined,
            height: '50px'
        };

        Object.keys(config).forEach(key => {
            if (!config[key] || config[key] === 'px') {
                delete config[key];
            }
        });

        updateHashtagToggleStyle(hashtag, config);
        saveHashtagConfig();
    } else if (e.target.classList.contains('removeCustom')) {
        const tag = row.querySelector('.customTag').value;
        if (tag) {
            delete hashtagToggleConfig.customConfig[tag];
        }
        row.remove();
        saveHashtagConfig();
    }
});

// Store configurations in localStorage
async function saveConfigurations() {
    // Backwards compatibility wrapper
    await saveHashtagConfig();
}

// Load configurations from localStorage
async function loadConfigurations() {
    await loadHashtagConfig();
}

// Save configurations when changed
['defaultFontSize', 'defaultFontFamily', 'defaultHoverColor', 'defaultEasterEgg'].forEach(id => {
    document.getElementById(id).addEventListener('change', saveConfigurations);
});


// Load configurations on startup
loadConfigurations();

// Add initialization for panel visibility
async function initConfigPanel() {
    // Check if panel was visible before
    const wasVisible = localStorage.getItem('configPanelVisible') === 'true';
    if (wasVisible) {
        configPanel.style.display = 'block';
        configToggle.innerHTML = '×';
    }
    
    // Show a tooltip on first visit
    const firstVisit = !localStorage.getItem('configPanelSeen');
    if (firstVisit) {
        const tooltip = document.createElement('div');
        tooltip.style.cssText = `
            position: fixed;
            bottom: 60px;
            right: 1rem;
            background: var(--primary-gradient);
            color: var(--text-color);
            padding: 0.5rem 1rem;
            border-radius: 8px;
            font-size: 0.9rem;
            z-index: 1000;
            animation: fadeIn 0.3s ease-out;
        `;
        tooltip.textContent = 'Customize hashtag styles!';
        document.body.appendChild(tooltip);
        
        setTimeout(() => {
            tooltip.remove();
            localStorage.setItem('configPanelSeen', 'true');
        }, 3000);
    }

    // Initialize configuration sync
    initConfigSync();

    // Load saved configurations
    await loadHashtagConfig();
}

// Firestore helpers for hashtag configuration
async function saveConfigToFirestore(config) {
    if (!configDocRef) return;
    try {
        await setDoc(configDocRef, config);
    } catch (error) {
        console.error('Error saving config to Firestore:', error);
    }
}

async function loadConfigFromFirestore() {
    if (!configDocRef) return null;
    try {
        const snap = await getDoc(configDocRef);
        if (snap.exists()) {
            return snap.data();
        }
    } catch (error) {
        console.error('Error loading config from Firestore:', error);
    }
    return null;
}

// Hashtag Configuration Sync Functions
async function saveHashtagConfig() {
    const config = {
        default: {
            fontSize: document.getElementById('defaultFontSize').value,
            fontFamily: document.getElementById('defaultFontFamily').value,
            hoverBgColor: document.getElementById('defaultHoverColor').value + '33',
            easterEgg: document.getElementById('defaultEasterEgg').value,
            height: '45px'
        },
        customConfig: {}
    };

    // Save custom hashtag configurations from all rows
    customTagsContainer.querySelectorAll('.custom-tag-row').forEach(row => {
        const tag = row.querySelector('.customTag').value;
        if (tag && tag.startsWith('#')) {
            config.customConfig[tag] = {
                fontSize: row.querySelector('.customFontSize').value,
                fontFamily: row.querySelector('.customFontFamily').value,
                hoverBgColor: row.querySelector('.customHoverColor').value + '33',
                easterEgg: row.querySelector('.customEasterEgg').value,
                height: '50px'
            };
        }
    });

    // Save to localStorage and update global config
    localStorage.setItem('hashtagConfig', JSON.stringify(config));
    Object.assign(hashtagToggleConfig, config);
    renderTasks(tasks); // Re-render to apply changes
    await saveConfigToFirestore(config);
}

async function loadHashtagConfig() {
    try {
        let config = await loadConfigFromFirestore();
        if (config) {
            localStorage.setItem('hashtagConfig', JSON.stringify(config));
        } else {
            const saved = localStorage.getItem('hashtagConfig');
            if (!saved) return;
            config = JSON.parse(saved);
        }

        // Update global config
        Object.assign(hashtagToggleConfig, config);

        // Update default inputs
        if (config.default) {
            document.getElementById('defaultFontSize').value = config.default.fontSize?.replace('px', '') || '';
            document.getElementById('defaultFontFamily').value = config.default.fontFamily || '';
            document.getElementById('defaultHoverColor').value = config.default.hoverBgColor?.replace('33', '') || '';
            document.getElementById('defaultEasterEgg').value = config.default.easterEgg || '';
        }

        // Populate custom tag rows
        customTagsContainer.innerHTML = '';
        const customConfigs = Object.entries(config.customConfig || {});
        if (customConfigs.length > 0) {
            customConfigs.forEach(([tag, settings]) => {
                createCustomTagRow(tag, settings);
            });
        } else {
            // Ensure at least one empty row exists
            createCustomTagRow();
        }

        renderTasks(tasks); // Re-render with new styles
    } catch (error) {
        console.error('Error loading hashtag config:', error);
    }
}

// Update event listeners for real-time syncing
function initConfigSync() {
    const configInputs = [
        'defaultFontSize', 'defaultFontFamily', 'defaultHoverColor', 'defaultEasterEgg'
    ];

    configInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            ['change', 'input'].forEach(eventType => {
                element.addEventListener(eventType, () => {
                    saveHashtagConfig();
                });
            });
        }
    });

    // Save when any custom tag input changes
    customTagsContainer.addEventListener('input', () => {
        saveHashtagConfig();
    });

    // Listen for storage changes from other tabs/windows
    window.addEventListener('storage', (e) => {
        if (e.key === 'hashtagConfig') {
            loadHashtagConfig();
        }
    });

    // Listen for remote updates via Firestore
    if (configDocRef) {
        onSnapshot(configDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                localStorage.setItem('hashtagConfig', JSON.stringify(data));
                loadHashtagConfig();
            }
        });
    }
}

// Add event listeners to configuration inputs
const configInputs = [
    'defaultFontSize', 'defaultFontFamily', 'defaultHoverColor', 'defaultEasterEgg'
];

configInputs.forEach(inputId => {
    const element = document.getElementById(inputId);
    if (element) {
        element.addEventListener('change', () => {
            saveHashtagConfig();
            applyHashtagStyles();
        });
    }
});

// Load saved configurations when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // ...existing DOMContentLoaded code...
    loadHashtagConfig();
});

// Function to apply hashtag styles (you may already have this)
function applyHashtagStyles() {
    // Apply the current configuration to your hashtags
    // Implementation depends on how you're currently handling hashtag styling
}

// Ensure tasks is defined as an array
tasks = tasks || [];

// Later when using .map, you can also use optional chaining:
const myMapped = tasks?.map(task => {
    // ...process each task...
});

// Initialize hashtag hierarchy
initializeHashtagHierarchy();
