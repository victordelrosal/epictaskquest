// scripts.js

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-analytics.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    signOut, 
    setPersistence, 
    browserLocalPersistence,
    GoogleAuthProvider,
    signInWithPopup 
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyASqKkvoIp6qvX2Dvze5s6nfKBghQ41axQ",
    authDomain: "epic-task-quest.firebaseapp.com",
    projectId: "epic-task-quest",
    storageBucket: "epic-task-quest.appspot.com",
    messagingSenderId: "421446505180",
    appId: "1:421446505180:web:ac2270f8c0b92d16529a19",
    measurementId: "G-35SX22QFBS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

console.log("Firebase initialized successfully.");

// ===========================
// Authentication Logic
// ===========================

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
googleLoginButton.addEventListener('click', () => {
    signInWithPopup(auth, googleProvider)
        .then((result) => {
            // This gives you a Google Access Token
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential.accessToken;
            // The signed-in user info
            const user = result.user;
            
            // Check if user's email is authorized
            if (user.email === authorizedEmail) {
                console.log("Google sign-in successful");
                loginError.style.display = "none";
            } else {
                // Unauthorized user
                signOut(auth);
                loginError.textContent = "Unauthorized email address";
                loginError.style.display = "block";
            }
        })
        .catch((error) => {
            console.error("Error during Google sign-in:", error);
            loginError.textContent = "Google sign-in failed. Please try again.";
            loginError.style.display = "block";
        });
});

// Logout Button
const logoutButton = document.getElementById('logoutButton');

logoutButton.addEventListener('click', () => {
    signOut(auth).then(() => {
        console.log("User signed out.");
    }).catch((error) => {
        console.error("Error signing out:", error);
    });
});

// Monitor Authentication State
onAuthStateChanged(auth, (user) => {
    if (user) {
        if (user.email === authorizedEmail) {
            // Show the main app
            loginContainer.style.display = "none";
            appContainer.style.display = "flex";
            loadTasks(); // Load tasks only after authentication
        } else {
            // Unauthorized user
            loginContainer.innerHTML = `<h2 style="color: var(--error-color);">Unauthorized Access</h2>`;
            console.warn(`User ${user.email} is not authorized to view this content.`);
            // Optionally, you can sign out the unauthorized user
            signOut(auth);
        }
    } else {
        // No user is signed in
        loginContainer.style.display = "flex";
        appContainer.style.display = "none";
    }
});

// ===========================
// Initialize Global Variables
// ===========================
let tasks = [];
let totalPoints = 0;
let level = 1;
let completedTasks = 0;
const pointsToNextLevel = 100;

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
const nextBadgeButton = document.getElementById('nextBadge');
let currentBadgeIndex = 0;

// Add badge navigation functions
function updateBadgeDisplay(index) {
    const achievementContainer = document.getElementById('achievementImage');
    achievementContainer.innerHTML = `<img src="${achievementImages[index]}" alt="Level ${index + 1} Achievement">`;
    achievementContainer.classList.remove('visible');
    // Force reflow
    void achievementContainer.offsetWidth;
    achievementContainer.classList.add('visible');
    
    // Update button states
    currentBadgeIndex = index;
}

function navigateBadge(direction) {
    let newIndex;
    if (direction === 'prev') {
        newIndex = (currentBadgeIndex - 1 + achievementImages.length) % achievementImages.length;
    } else {
        newIndex = (currentBadgeIndex + 1) % achievementImages.length;
    }
    updateBadgeDisplay(newIndex);
}

// Add event listeners for badge navigation
prevBadgeButton.addEventListener('click', () => navigateBadge('prev'));
nextBadgeButton.addEventListener('click', () => navigateBadge('next'));

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
        6: customPoints || 30 // Use stored custom points if available
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

// Add a new task to Firestore
async function addTask() {
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

    const task = {
        text,
        difficulty,
        customPoints,
        completed: false,
        timestamp: serverTimestamp(),
        isWishlist: isWishlist,
        position: position || activeTasks + 1
    };

    try {
        const docRef = await addDoc(collection(db, "tasks"), task);
        console.log("Task added with ID: ", docRef.id);
        task.id = docRef.id;
        
        // Insert task at the correct position
        if (position) {
            tasks.splice(position - 1, 0, task);
        } else {
            tasks.unshift(task);
        }
        
        renderTasks();
        animateTaskAddition(docRef.id);
        
        // Reset form
        taskInput.value = "";
        difficultySelect.value = "1"; // Reset to default difficulty
        document.getElementById('customPoints').style.display = 'none';
        document.getElementById('customPoints').value = '';
        wishlistCheckbox.checked = false;
    } catch (error) {
        console.error("Error adding task: ", error);
    }
}

// Toggle task completion
async function toggleTaskCompletion(taskId, completed) {
    try {
        const taskDoc = doc(db, "tasks", taskId);
        await updateDoc(taskDoc, { completed: completed });
        console.log(`Task ${taskId} marked as ${completed ? 'completed' : 'active'}.`);
        loadTasks(); // Reload tasks to update stats and trigger animations

        if (completed) {
            triggerConfetti();
        }
    } catch (error) {
        console.error("Error updating task: ", error);
    }
}

// Edit task text
async function editTaskText(taskId, newText) {
    if (newText.trim() === "") {
        alert("Task text cannot be empty.");
        loadTasks(); // Reload to reset changes
        return;
    }

    try {
        const taskDoc = doc(db, "tasks", taskId);
        await updateDoc(taskDoc, { text: newText });
        console.log(`Task ${taskId} text updated.`);
        
        // Re-render tasks immediately to show new hashtag grouping
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            tasks[taskIndex].text = newText;
            renderTasks(tasks); // Re-render with updated task
        }
    } catch (error) {
        console.error("Error editing task: ", error);
    }
}

// Update task difficulty
async function updateTaskDifficulty(taskId, newDifficulty) {
    try {
        const taskDoc = doc(db, "tasks", taskId);
        await updateDoc(taskDoc, { difficulty: newDifficulty });
        console.log(`Task ${taskId} difficulty updated to ${newDifficulty}.`);
        loadTasks(); // Reload tasks to update UI and trigger animations
    } catch (error) {
        console.error("Error updating task difficulty: ", error);
    }
}

// Delete a task
async function deleteTask(taskId) {
    try {
        await deleteDoc(doc(db, "tasks", taskId));
        console.log(`Task ${taskId} deleted.`);
        animateTaskDeletion(taskId);
        loadTasks(); // Reload tasks to update list and stats
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

function renderTasks(filteredTasks = tasks) {
    // Clear existing tasks
    activeTasksList.innerHTML = `<h3>Active Tasks</h3>`;
    completedTasksList.innerHTML = `<h3>Completed Tasks</h3>`;

    // Separate active and completed tasks
    const activeTasks = filteredTasks.filter(task => !task.completed);
    const completedTasksArr = filteredTasks.filter(task => task.completed);

    // Group active tasks by hashtags
    const { sortedGroups, noHashtagGroup } = groupTasksByHashtags(activeTasks);

    // Render hashtag groups with toggles
    sortedGroups.forEach(([tag, tasks]) => {
        const groupDiv = document.createElement('div');
        groupDiv.classList.add('hashtag-group');
        
        // Create toggle header
        const toggleHeader = document.createElement('div');
        toggleHeader.classList.add('hashtag-toggle');
        toggleHeader.innerHTML = `
            <span class="toggle-icon">▶</span>
            <span class="hashtag-label">${tag}</span>
            <span class="task-count">${tasks.length}</span>
        `;
        
        // Create content container
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('hashtag-content');
        contentDiv.style.display = 'none'; // Initially collapsed
        
        // Add toggle functionality
        toggleHeader.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = contentDiv.style.display !== 'none';
            toggleHeader.querySelector('.toggle-icon').textContent = isExpanded ? '▶' : '▼';
            
            // Animate content
            if (isExpanded) {
                contentDiv.style.maxHeight = '0';
                setTimeout(() => {
                    contentDiv.style.display = 'none';
                }, 300); // Match transition duration
            } else {
                contentDiv.style.display = 'block';
                contentDiv.style.maxHeight = contentDiv.scrollHeight + 'px';
            }
            
            toggleHeader.classList.toggle('expanded');
        });

        // Add tasks to content container
        tasks.forEach(task => {
            const taskItem = createTaskElement(task, false);
            contentDiv.appendChild(taskItem);
        });

        groupDiv.appendChild(toggleHeader);
        groupDiv.appendChild(contentDiv);
        activeTasksList.appendChild(groupDiv);
    });

    // Render tasks without hashtags
    if (noHashtagGroup.length > 0) {
        const groupDiv = document.createElement('div');
        groupDiv.classList.add('hashtag-group');
        
        // Create toggle header for other tasks
        const toggleHeader = document.createElement('div');
        toggleHeader.classList.add('hashtag-toggle');
        toggleHeader.innerHTML = `
            <span class="toggle-icon">▶</span>
            <span class="hashtag-label">Other Tasks</span>
            <span class="task-count">${noHashtagGroup.length}</span>
        `;
        
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('hashtag-content');
        contentDiv.style.display = 'none';
        
        toggleHeader.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = contentDiv.style.display !== 'none';
            toggleHeader.querySelector('.toggle-icon').textContent = isExpanded ? '▶' : '▼';
            
            if (isExpanded) {
                contentDiv.style.maxHeight = '0';
                setTimeout(() => {
                    contentDiv.style.display = 'none';
                }, 300);
            } else {
                contentDiv.style.display = 'block';
                contentDiv.style.maxHeight = contentDiv.scrollHeight + 'px';
            }
            
            toggleHeader.classList.toggle('expanded');
        });

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

    // Render Completed Tasks (unchanged)
    completedTasksArr
        .sort((a, b) => getPoints(b.difficulty, b.customPoints) - getPoints(a.difficulty, a.customPoints))
        .forEach(task => {
            const taskItem = createTaskElement(task, true);
            completedTasksList.appendChild(taskItem);
        });
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
        toggleTaskCompletion(task.id, checkbox.checked);
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

    // Add input event listener to show hashtag suggestions
    taskText.addEventListener('input', (e) => {
        const cursorPosition = e.target.selectionStart;
        const text = e.target.value;
        
        // Check if we're typing a hashtag
        if (text[cursorPosition - 1] === '#') {
            // Show hashtag suggestions from existing tags
            showHashtagSuggestions(e.target);
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
                await updateDoc(taskDoc, { 
                    isWishlist: !task.isWishlist 
                });
                cartToggle.innerHTML = !task.isWishlist ? '🛒' : '☐';
                cartToggle.classList.toggle('active');
                task.isWishlist = !task.isWishlist;

                // Refresh the task list if we're currently filtering by wishlist
                if (currentFilter === 'wishlist') {
                    filterTasks(taskSearchInput.value);
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
        if (num === 6) {
            // For Custom difficulty, just show the points
            option.textContent = `${task.customPoints || 30}`;
        } else {
            // For predefined difficulties, just show the points
            option.textContent = `${getPoints(num)}`;
        }
        if (num === task.difficulty) option.selected = true;
        difficultySelectElement.appendChild(option);
    });

    // Custom points input
    const customPointsInputElement = document.createElement('input');
    customPointsInputElement.type = 'number';
    customPointsInputElement.min = '1';
    customPointsInputElement.max = '100';
    customPointsInputElement.placeholder = 'Enter points';
    customPointsInputElement.className = 'custom-points';
    customPointsInputElement.style.display = task.difficulty === 6 ? 'block' : 'none';
    customPointsInputElement.value = task.customPoints || '';
    customPointsInputElement.disabled = isCompleted;

    // Add event listener for custom points changes
    customPointsInputElement.addEventListener('change', () => {
        updateTaskCustomPoints(task.id, customPointsInputElement.value)
            .then(() => {
                // Only sort after custom points have been set
                loadTasks();
            });
    });

    difficultySelectElement.addEventListener('change', () => {
        const difficulty = parseInt(difficultySelectElement.value);
        customPointsInputElement.style.display = difficulty === 6 ? 'block' : 'none';
        
        if (difficulty !== 6) {
            // Only update difficulty and sort when switching away from custom
            updateTaskDifficulty(task.id, difficulty);
        } else {
            // Just update difficulty without sorting when switching to custom
            const taskDoc = doc(db, "tasks", task.id);
            updateDoc(taskDoc, { difficulty: difficulty });
        }
    });

    // Delete Button
    const deleteButton = document.createElement('button');
    deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
    deleteButton.title = 'Delete Task';
    deleteButton.addEventListener('click', () => {
        deleteTask(task.id);
    });

    // Append actions
    taskActions.appendChild(difficultySelectElement);
    taskActions.appendChild(customPointsInputElement);
    if (!isCompleted) {
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

// Add hashtag suggestions functionality
function showHashtagSuggestions(inputElement) {
    // Get all existing hashtags
    const allHashtags = new Set();
    tasks.forEach(task => {
        const hashtags = extractHashtags(task.text);
        hashtags.forEach(tag => allHashtags.add(tag));
    });

    // Create suggestions dropdown if it doesn't exist
    let suggestionsDiv = document.getElementById('hashtag-suggestions');
    if (!suggestionsDiv) {
        suggestionsDiv = document.createElement('div');
        suggestionsDiv.id = 'hashtag-suggestions';
        suggestionsDiv.style.position = 'absolute';
        suggestionsDiv.style.background = 'var(--card-background)';
        suggestionsDiv.style.border = '1px solid var(--blue-7)';
        suggestionsDiv.style.borderRadius = 'var(--border-radius)';
        suggestionsDiv.style.maxHeight = '200px';
        suggestionsDiv.style.overflow = 'auto';
        suggestionsDiv.style.zIndex = '1000';
        document.body.appendChild(suggestionsDiv);
    }

    // Position the suggestions below the input
    const rect = inputElement.getBoundingClientRect();
    suggestionsDiv.style.left = `${rect.left}px`;
    suggestionsDiv.style.top = `${rect.bottom + 5}px`;
    suggestionsDiv.style.width = `${rect.width}px`;

    // Add suggestions
    suggestionsDiv.innerHTML = '';
    allHashtags.forEach(tag => {
        const suggestion = document.createElement('div');
        suggestion.textContent = tag;
        suggestion.style.padding = '0.5rem 1rem';
        suggestion.style.cursor = 'pointer';
        suggestion.style.color = 'var(--text-color)';
        suggestion.style.transition = 'background-color 0.2s';

        suggestion.addEventListener('mouseenter', () => {
            suggestion.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        });

        suggestion.addEventListener('mouseleave', () => {
            suggestion.style.backgroundColor = 'transparent';
        });

        suggestion.addEventListener('click', () => {
            const cursorPosition = inputElement.selectionStart;
            const text = inputElement.value;
            const textBeforeCursor = text.substring(0, cursorPosition);
            const textAfterCursor = text.substring(cursorPosition);
            const lastHashIndex = textBeforeCursor.lastIndexOf('#');
            inputElement.value = textBeforeCursor.substring(0, lastHashIndex) + tag + textAfterCursor;
            inputElement.focus();
            inputElement.setSelectionRange(cursorPosition + tag.length - (textBeforeCursor.length - lastHashIndex - 1), cursorPosition + tag.length - (textBeforeCursor.length - lastHashIndex - 1));
            suggestionsDiv.style.display = 'none';
        });

        suggestionsDiv.appendChild(suggestion);
    });

    // Show suggestions
    suggestionsDiv.style.display = 'block';

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!suggestionsDiv.contains(e.target) && e.target !== inputElement) {
            suggestionsDiv.style.display = 'none';
        }
    }, { once: true });
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
    filterTasks(taskSearchInput.value);
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

function triggerConfetti() {
    const confettiColors = ['#FFD700', '#FFC300', '#FFEA00', '#FFF700', '#FFDD00', '#FFC100', '#FFB700']; // Various shades of gold
    const numberOfConfetti = 200; // Increased number for more generous effect

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

// Add event listener for the main form's difficulty select
document.getElementById('difficultySelect').addEventListener('change', (e) => {
    const customPointsInput = document.getElementById('customPoints');
    if (e.target.value === '6') {
        customPointsInput.style.display = 'block';
        customPointsInput.value = '30'; // Set default value
        customPointsInput.focus(); // Optional: automatically focus the input
    } else {
        customPointsInput.style.display = 'none';
        customPointsInput.value = ''; // Clear the value when not using custom
    }
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
    
    // Apply wishlist filter
    if (currentFilter === 'wishlist') {
        filteredTasks = filteredTasks.filter(task => task.isWishlist);
    }
    
    // Clear and update active tasks list first
    activeTasksList.innerHTML = `<h3>${currentFilter === 'wishlist' ? '🛒 Shopping List' : 'Active Tasks'}</h3>`;
    
    // Sort and display active tasks
    const activeTasks = filteredTasks.filter(task => !task.completed);
    activeTasks
        .sort((a, b) => getPoints(b.difficulty, b.customPoints) - getPoints(a.difficulty, a.customPoints))
        .forEach((task, index) => {
            const taskItem = createTaskElement(task, false, index + 1);
            activeTasksList.appendChild(taskItem);
        });
        
    // Update completed tasks separately
    const completedTasksArr = filteredTasks.filter(task => task.completed);
    completedTasksList.innerHTML = `<h3>Completed Tasks</h3>`;
    completedTasksArr.forEach((task, index) => {
        const taskItem = createTaskElement(task, true, index + 1);
        completedTasksList.appendChild(taskItem);
    });
}
