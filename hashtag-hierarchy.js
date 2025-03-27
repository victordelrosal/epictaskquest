/**
 * Hashtag Hierarchy Manager
 * Creates a hierarchical structure for hashtags with #non0 as parent for all tags
 * except those starting with '0' or '_'
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize hashtag hierarchy after tasks are loaded
    initializeHashtagHierarchy();
});

function initializeHashtagHierarchy() {
    // Get all hashtags from tasks and organize them
    reorganizeHashtags();
    
    // Listen for new task additions to update hierarchy
    document.addEventListener('taskAdded', () => {
        reorganizeHashtags();
    });
    
    // Listen for task deletions to update hierarchy
    document.addEventListener('taskDeleted', () => {
        reorganizeHashtags();
    });
}

function reorganizeHashtags() {
    // Find all hashtags in the task lists
    const allHashtags = findAllHashtagsInTasks();
    
    // Create the #non0 parent toggle if it doesn't exist
    createParentToggle();
    
    // Group hashtags under #non0 except those starting with '0' or '_'
    groupHashtagsUnderParent(allHashtags);
}

function findAllHashtagsInTasks() {
    // This would need to scan all tasks for hashtags
    // For now we'll return a placeholder
    const hashtagElements = document.querySelectorAll('.hashtag');
    return Array.from(hashtagElements).map(el => el.textContent);
}

function createParentToggle() {
    // Check if #non0 toggle already exists
    if (!document.querySelector('.hashtag[data-tag="#non0"]')) {
        // Create the parent toggle element
        const parentToggle = document.createElement('span');
        parentToggle.className = 'hashtag parent-hashtag';
        parentToggle.setAttribute('data-tag', '#non0');
        parentToggle.textContent = '#non0';
        parentToggle.style.fontSize = '22px';
        parentToggle.style.fontFamily = 'Arial';
        
        // Add to the appropriate container (this would depend on your task structure)
        const taskLists = document.querySelectorAll('.task-list');
        taskLists.forEach(list => {
            const toggleContainer = list.querySelector('.hashtag-container') || 
                                   createHashtagContainer(list);
            toggleContainer.appendChild(parentToggle.cloneNode(true));
        });
        
        // Add event listener for parent toggle
        addParentToggleEventListener();
    }
}

function createHashtagContainer(taskList) {
    const container = document.createElement('div');
    container.className = 'hashtag-container';
    taskList.appendChild(container);
    return container;
}

function groupHashtagsUnderParent(allHashtags) {
    // For each hashtag, determine if it should be nested
    document.querySelectorAll('.hashtag').forEach(hashtagEl => {
        const tagText = hashtagEl.getAttribute('data-tag');
        
        // Skip the parent toggle itself
        if (tagText === '#non0') return;
        
        // If tag doesn't start with '0' or '_', nest under #non0
        if (!tagText.startsWith('#0') && !tagText.startsWith('#_')) {
            hashtagEl.classList.add('nested-hashtag');
            hashtagEl.setAttribute('data-parent', '#non0');
            
            // Initially hide nested hashtags
            if (!document.querySelector('.hashtag[data-tag="#non0"]').classList.contains('active')) {
                hashtagEl.style.display = 'none';
            }
        } else {
            // Remove nesting from excluded tags
            hashtagEl.classList.remove('nested-hashtag');
            hashtagEl.removeAttribute('data-parent');
        }
    });
}

function addParentToggleEventListener() {
    document.querySelectorAll('.hashtag[data-tag="#non0"]').forEach(parentEl => {
        parentEl.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Toggle active state
            parentEl.classList.toggle('active');
            const isActive = parentEl.classList.contains('active');
            
            // Show/hide all nested hashtags
            document.querySelectorAll('.hashtag[data-parent="#non0"]').forEach(child => {
                child.style.display = isActive ? 'inline-block' : 'none';
            });
            
            // Update task visibility based on filters
            updateTaskVisibility();
        });
    });
}

function updateTaskVisibility() {
    // This function would update which tasks are visible based on active filters
    // Implementation depends on your existing filtering logic
}

// Export functions for use in main scripts.js
export { initializeHashtagHierarchy };
