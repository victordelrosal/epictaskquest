/**
 * Hashtag Hierarchy Manager
 * Creates a hierarchical structure for hashtags with #non0 as parent for all tags
 * except those starting with '0' or '_'
 */

let hashtagGroups = {
    parent: "#non0",
    excludePatterns: ["#0", "#_"],
    nestedTags: new Set(),
    excludedTags: new Set()
};

// Function to initialize hashtag hierarchy
export function initializeHashtagHierarchy() {
    // Initialize hashtag hierarchy
    console.log("Initializing hashtag hierarchy with parent tag:", hashtagGroups.parent);
    
    // Apply CSS for hashtag hierarchy
    applyHashtagHierarchyStyles();
    
    // Add event listener for DOM changes that might add new hashtags
    document.addEventListener('taskAdded', () => {
        console.log("Task added, reorganizing hashtags");
    });
    
    document.addEventListener('taskDeleted', () => {
        console.log("Task deleted, reorganizing hashtags");
    });
}

// Export this function to be called from scripts.js
export function organizeHashtags(allTags) {
    if (!allTags || !Array.isArray(allTags)) return [];
    
    // Clear previous groupings
    hashtagGroups.nestedTags.clear();
    hashtagGroups.excludedTags.clear();
    
    // Sort tags into appropriate groups
    allTags.forEach(tag => {
        // Skip the parent tag itself
        if (tag === hashtagGroups.parent) return;
        
        // Check if tag should be excluded from nesting
        const shouldExclude = hashtagGroups.excludePatterns.some(pattern => 
            tag.startsWith(pattern)
        );
        
        if (shouldExclude) {
            hashtagGroups.excludedTags.add(tag);
        } else {
            hashtagGroups.nestedTags.add(tag);
        }
    });
    
    return {
        parentTag: hashtagGroups.parent,
        nestedTags: Array.from(hashtagGroups.nestedTags),
        excludedTags: Array.from(hashtagGroups.excludedTags)
    };
}

// Export a function to check if a tag should be nested
export function shouldBeNested(tag) {
    if (!tag) return false;
    if (tag === hashtagGroups.parent) return false;
    
    return !hashtagGroups.excludePatterns.some(pattern => tag.startsWith(pattern));
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
    // Apply CSS for hashtag hierarchy
    applyHashtagHierarchyStyles();
});

// Apply CSS styles programmatically
function applyHashtagHierarchyStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .parent-hashtag {
            font-weight: bold;
            position: relative;
            cursor: pointer;
            padding-right: 20px;
        }
        
        .parent-hashtag:after {
            content: '▶';
            font-size: 0.7em;
            position: absolute;
            right: 5px;
            top: 50%;
            transform: translateY(-50%);
            transition: transform 0.2s ease;
        }
        
        .parent-hashtag.expanded:after {
            transform: translateY(-50%) rotate(90deg);
        }
        
        .nested-hashtag {
            margin-left: 15px;
            opacity: 0.9;
            transition: all 0.3s ease;
            display: none;
        }
        
        .nested-hashtag.visible {
            display: inline-block;
            animation: fadeIn 0.3s ease;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 0.9; transform: translateY(0); }
        }
    `;
    document.head.appendChild(styleElement);
}
