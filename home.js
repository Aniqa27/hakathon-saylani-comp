// home.js
import { supabase, checkUser, getCurrentUser } from "./config.js";

// DOM Elements
let currentUser = null;
let currentProfile = null;

// Check authentication and get user profile
async function checkAuth() {
    const user = await checkUser();
    
    if (!user) {
        window.location.href = 'index.html';
        return null;
    }
    
    currentUser = user;
    await loadUserProfile();
    
    return user;
}

// Load user profile
async function loadUserProfile() {
    try {
        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error loading profile:', error);
        }
        
        currentProfile = profile || {};
        
        // Display user info in navbar
        const userName = profile?.full_name || 
                        currentUser.user_metadata?.name || 
                        currentUser.email?.split('@')[0] || 
                        'User';
        
        const userEmailEl = document.getElementById('userEmail');
        if (userEmailEl) userEmailEl.textContent = userName;
        
        // Display avatar
        const avatarContainer = document.getElementById('userAvatar');
        if (!avatarContainer) return;
        
        if (profile?.avatar_url) {
            avatarContainer.innerHTML = `<img src="${profile.avatar_url}" alt="${userName}" style="width:100%;height:100%;object-fit:cover;">`;
        } else {
            const initial = userName.charAt(0).toUpperCase();
            avatarContainer.innerHTML = `<span style="color: white; font-weight: 600; font-size: 1rem;">${initial}</span>`;
            avatarContainer.style.background = 'var(--saylani-green)';
        }
    } catch (error) {
        console.error('Error in loadUserProfile:', error);
    }
}

// Initialize Event Listeners
function initEventListeners() {
    console.log('Initializing event listeners...'); // Debug log
    
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = 'index.html';
        });
    }

    // Edit Profile Button
    const editProfileBtn = document.getElementById('editProfileBtn');
    if (editProfileBtn) {
        console.log('Edit profile button found'); // Debug log
        editProfileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Edit profile clicked'); // Debug log
            openProfileModal();
        });
    } else {
        console.error('Edit profile button not found!');
    }

    // Create Post Button
    const createPostBtn = document.getElementById('createPostBtn');
    if (createPostBtn) {
        createPostBtn.addEventListener('click', () => {
            resetPostForm();
            document.getElementById('postModal').style.display = 'flex';
        });
    }

    // Close Post Details Modal
    const closeDetailsBtn = document.getElementById('closeDetails');
    if (closeDetailsBtn) {
        closeDetailsBtn.addEventListener('click', () => {
            document.getElementById('postDetailsModal').style.display = 'none';
        });
    }

    // Delete Post
    const deletePostBtn = document.getElementById('deletePostBtn');
    if (deletePostBtn) {
        deletePostBtn.addEventListener('click', async () => {
            const postId = document.getElementById('postId').value;
            if (!postId || !confirm('Are you sure you want to delete this post?')) return;

            const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', postId)
                .eq('user_id', currentUser.id);

            if (error) {
                alert('Error deleting post: ' + error.message);
            } else {
                alert('Post deleted successfully!');
                document.getElementById('postModal').style.display = 'none';
                loadPosts();
            }
        });
    }

    // Handle Post Form Submission
    const postForm = document.getElementById('postForm');
    if (postForm) {
        postForm.addEventListener('submit', handlePostSubmit);
    }

    // Handle Profile Form Submission
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        console.log('Profile form found'); // Debug log
        // Remove any existing listeners and add new one
        profileForm.removeEventListener('submit', handleProfileSubmit);
        profileForm.addEventListener('submit', handleProfileSubmit);
    } else {
        console.error('Profile form not found!');
    }

    // Image Preview for Post
    const postImageInput = document.getElementById('postImage');
    if (postImageInput) {
        postImageInput.addEventListener('change', function(e) {
            const preview = document.getElementById('imagePreview');
            preview.innerHTML = '';
            
            if (this.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.style.width = '100%';
                    img.style.maxHeight = '200px';
                    img.style.objectFit = 'cover';
                    img.style.borderRadius = '12px';
                    preview.appendChild(img);
                };
                reader.readAsDataURL(this.files[0]);
            }
        });
    }

    // Avatar Preview
    const avatarInput = document.getElementById('avatarInput');
    if (avatarInput) {
        avatarInput.addEventListener('change', function(e) {
            const preview = document.getElementById('currentAvatar');
            
            if (this.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.src = e.target.result;
                };
                reader.readAsDataURL(this.files[0]);
            }
        });
    }

    // Avatar click to trigger file input
    const avatarLabel = document.querySelector('label[for="avatarInput"]');
    if (avatarLabel) {
        avatarLabel.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('avatarInput').click();
        });
    }

    // Nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const category = link.dataset.category;
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            loadPosts(category);
        });
    });

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// Reset post form
function resetPostForm() {
    document.getElementById('postId').value = '';
    document.getElementById('postTitle').value = '';
    document.getElementById('postCategory').value = '';
    document.getElementById('postContent').value = '';
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('postImage').value = '';
    document.getElementById('deletePostBtn').style.display = 'none';
    document.getElementById('modalTitle').textContent = 'Create New Post';
    document.getElementById('submitBtnText').textContent = 'Publish Post';
}

// Handle Post Form Submission
async function handlePostSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitPostBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Processing...';

    const postId = document.getElementById('postId').value;
    const title = document.getElementById('postTitle').value;
    const category = document.getElementById('postCategory').value;
    const content = document.getElementById('postContent').value;
    const imageFile = document.getElementById('postImage').files[0];

    let imageUrl = null;

    // Upload image if exists
    if (imageFile) {
        try {
            const fileName = `${currentUser.id}/${Date.now()}_${imageFile.name}`;
            const { error } = await supabase.storage
                .from('post-images')
                .upload(fileName, imageFile);
            
            if (!error) {
                const { data: urlData } = supabase.storage
                    .from('post-images')
                    .getPublicUrl(fileName);
                imageUrl = urlData.publicUrl;
            }
        } catch (error) {
            console.error('Image upload error:', error);
        }
    }

    // Prepare post data with user info
    const userDisplayName = currentProfile?.full_name || 
                           currentUser.user_metadata?.name || 
                           currentUser.email?.split('@')[0];
    
    const postData = {
        user_id: currentUser.id,
        user_name: userDisplayName,
        title,
        content,
        category,
        image_url: imageUrl
    };

    let result;
    if (postId) {
        // Update existing post
        result = await supabase
            .from('posts')
            .update(postData)
            .eq('id', postId)
            .eq('user_id', currentUser.id);
    } else {
        // Create new post
        result = await supabase
            .from('posts')
            .insert([postData]);
    }

    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;

    if (result.error) {
        alert('Error saving post: ' + result.error.message);
    } else {
        alert(postId ? 'Post updated!' : 'Post published!');
        document.getElementById('postModal').style.display = 'none';
        loadPosts();
    }
}

// Handle Profile Form Submission - FIXED VERSION
async function handleProfileSubmit(e) {
    e.preventDefault();
    console.log('Profile form submitted'); // Debug log
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Saving...';

    try {
        const fullName = document.getElementById('fullName')?.value || '';
        const bio = document.getElementById('userBio')?.value || '';
        const avatarFile = document.getElementById('avatarInput')?.files[0];

        console.log('Saving profile:', { fullName, bio, hasAvatar: !!avatarFile }); // Debug log

        let avatarUrl = currentProfile?.avatar_url;

        // Upload avatar if exists
        if (avatarFile) {
            try {
                // Create avatars bucket if it doesn't exist
                const fileName = `avatars/${currentUser.id}_${Date.now()}.jpg`;
                console.log('Uploading avatar:', fileName);
                
                const { error: uploadError } = await supabase.storage
                    .from('post-images')
                    .upload(fileName, avatarFile, {
                        upsert: true,
                        contentType: avatarFile.type
                    });
                
                if (uploadError) {
                    console.error('Upload error:', uploadError);
                    throw uploadError;
                }
                
                const { data: urlData } = supabase.storage
                    .from('post-images')
                    .getPublicUrl(fileName);
                
                avatarUrl = urlData.publicUrl;
                console.log('Avatar uploaded:', avatarUrl);
            } catch (error) {
                console.error('Avatar upload error:', error);
                alert('Error uploading avatar: ' + error.message);
            }
        }

        // Update user metadata in auth
        const { error: updateError } = await supabase.auth.updateUser({
            data: { name: fullName }
        });

        if (updateError) {
            console.error('Auth update error:', updateError);
        }

        // Save to profiles table
        const profileData = {
            id: currentUser.id,
            full_name: fullName,
            bio: bio,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString()
        };

        console.log('Saving profile data:', profileData);

        const { error } = await supabase
            .from('user_profiles')
            .upsert(profileData, { onConflict: 'id' });

        if (error) {
            console.error('Profile upsert error:', error);
            throw error;
        }

        console.log('Profile saved successfully');
        alert('Profile updated successfully!');
        
        // Close modal
        const profileModal = document.getElementById('profileModal');
        if (profileModal) profileModal.style.display = 'none';
        
        // Reload user profile
        await loadUserProfile();
        
        // Reload posts to update author names
        loadPosts();
        
    } catch (error) {
        console.error('Error in profile save:', error);
        alert('Error saving profile: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// Open Profile Modal - FIXED VERSION
function openProfileModal() {
    console.log('Opening profile modal'); // Debug log
    console.log('Current profile:', currentProfile); // Debug log
    console.log('Current user:', currentUser); // Debug log
    
    // Get form elements
    const fullNameInput = document.getElementById('fullName');
    const userBioInput = document.getElementById('userBio');
    const avatarImg = document.getElementById('currentAvatar');
    const profileModal = document.getElementById('profileModal');
    
    if (!fullNameInput || !userBioInput || !avatarImg || !profileModal) {
        console.error('Profile modal elements not found!');
        return;
    }
    
    // Set values
    fullNameInput.value = currentProfile?.full_name || 
                         currentUser?.user_metadata?.name || 
                         '';
    
    userBioInput.value = currentProfile?.bio || '';
    
    // Set avatar
    if (currentProfile?.avatar_url) {
        avatarImg.src = currentProfile.avatar_url;
    } else {
        // Default avatar
        avatarImg.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlNWU1ZTUiLz48dGV4dCB4PSI1MCIgeT0iNjAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI1MCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+PzwvdGV4dD48L3N2Zz4=';
    }
    
    // Show modal
    profileModal.style.display = 'flex';
}

// Load and Display Posts
async function loadPosts(category = 'all') {
    const postsGrid = document.getElementById('postsGrid');
    if (!postsGrid) return;
    
    // Show "Loading..." text instead of spinner
    postsGrid.innerHTML = '<div class="no-posts"><p>Loading posts...</p></div>';

    let query = supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

    if (category !== 'all') {
        query = query.eq('category', category);
    }

    const { data: posts, error } = await query;

    if (error) {
        postsGrid.innerHTML = '<div class="no-posts">Error loading posts. Please refresh.</div>';
        console.error('Error:', error);
        return;
    }

    if (posts.length === 0) {
        postsGrid.innerHTML = `
            <div class="no-posts">
                <i class="fas fa-newspaper" style="font-size: 3rem; color: var(--gray-300); margin-bottom: 1rem;"></i>
                <h3>No posts yet</h3>
                <p>Be the first to create a post!</p>
                <button id="createFirstPost" class="btn btn-primary" style="margin-top: 1rem;">
                    <i class="fas fa-plus"></i> Create Your First Post
                </button>
            </div>
        `;
        
        setTimeout(() => {
            const createFirstBtn = document.getElementById('createFirstPost');
            if (createFirstBtn) {
                createFirstBtn.addEventListener('click', () => {
                    resetPostForm();
                    document.getElementById('postModal').style.display = 'flex';
                });
            }
        }, 100);
        
        return;
    }

    postsGrid.innerHTML = '';
    posts.forEach(post => {
        createPostCardElement(post, postsGrid);
    });
}

// Create Post Card Element
function createPostCardElement(post, container) {
    const isCurrentUser = currentUser && post.user_id === currentUser.id;
    
    // Get username
    const userName = post.user_name || 'User';
    
    const postCard = document.createElement('div');
    postCard.className = 'post-card';
    postCard.dataset.postId = post.id;
    
    postCard.innerHTML = `
        ${post.image_url ? `
            <img src="${post.image_url}" alt="${post.title}" class="post-image">
        ` : ''}
        <div class="post-content">
            <span class="post-category">${post.category}</span>
            <h3 class="post-title">${post.title}</h3>
            <p class="post-text">${post.content}</p>
            <div class="post-footer">
                <span class="post-author">
                    <i class="fas fa-user"></i> 
                    ${userName}
                    ${isCurrentUser ? ' (You)' : ''}
                </span>
                <span class="post-time">
                    <i class="far fa-clock"></i> 
                    ${formatDate(post.created_at)}
                </span>
                <div class="post-actions">
                    <button class="view-details-btn" data-id="${post.id}">
                        <i class="fas fa-eye"></i> View
                    </button>
                    ${isCurrentUser ? `
                        <button class="edit-post-btn" data-id="${post.id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    container.appendChild(postCard);
    
    // Add event listeners
    setTimeout(() => {
        const viewBtn = postCard.querySelector('.view-details-btn');
        if (viewBtn) {
            viewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                viewPostDetails(post.id);
            });
        }
        
        const editBtn = postCard.querySelector('.edit-post-btn');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                loadPostForEdit(post.id);
            });
        }
        
        postCard.addEventListener('click', (e) => {
            if (!e.target.closest('.view-details-btn') && 
                !e.target.closest('.edit-post-btn')) {
                viewPostDetails(post.id);
            }
        });
    }, 10);
}

// View Post Details
async function viewPostDetails(postId) {
    const { data: post, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

    if (error) {
        console.error('Error loading post details:', error);
        alert('Error loading post details');
        return;
    }

    if (post) {
        // Get author profile
        let authorProfile = null;
        try {
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', post.user_id)
                .single();
            authorProfile = profile;
        } catch (err) {
            console.log('No profile found for author');
        }
        
        const postDetailsContent = document.getElementById('postDetailsContent');
        postDetailsContent.innerHTML = `
            ${post.image_url ? `
                <img src="${post.image_url}" alt="${post.title}" class="post-details-image">
            ` : ''}
            <div class="post-details">
                <span class="post-details-category">${post.category}</span>
                <h1 class="post-details-title">${post.title}</h1>
                <div class="post-details-content">${post.content}</div>
                <div class="post-details-footer">
                    <div class="post-details-author">
                        <div class="author-avatar">
                            ${authorProfile?.avatar_url ? 
                                `<img src="${authorProfile.avatar_url}" alt="${post.user_name}" style="width:100%;height:100%;object-fit:cover;">` :
                                `<i class="fas fa-user"></i>`
                            }
                        </div>
                        <div class="author-info">
                            <h4>${post.user_name || 'User'}</h4>
                            <p>Posted ${formatDate(post.created_at)}</p>
                            ${authorProfile?.bio ? `<p>${authorProfile.bio}</p>` : ''}
                        </div>
                    </div>
                    ${currentUser && post.user_id === currentUser.id ? `
                        <button class="btn btn-primary edit-from-details" data-id="${post.id}">
                            <i class="fas fa-edit"></i> Edit Post
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        
        const editBtn = postDetailsContent.querySelector('.edit-from-details');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                document.getElementById('postDetailsModal').style.display = 'none';
                loadPostForEdit(post.id);
            });
        }
        
        document.getElementById('postDetailsModal').style.display = 'flex';
    }
}

// Format date function
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 60) {
        return `${diffMins}m ago`;
    } else if (diffHours < 24) {
        return `${diffHours}h ago`;
    } else if (diffDays < 7) {
        return `${diffDays}d ago`;
    } else {
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }
}

// Load post for editing
async function loadPostForEdit(postId) {
    const { data: post, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

    if (!error && post) {
        document.getElementById('postId').value = post.id;
        document.getElementById('postTitle').value = post.title;
        document.getElementById('postCategory').value = post.category;
        document.getElementById('postContent').value = post.content;
        
        const preview = document.getElementById('imagePreview');
        if (post.image_url) {
            preview.innerHTML = `<img src="${post.image_url}" alt="Current image" style="width:100%;max-height:200px;object-fit:cover;border-radius:12px;">`;
        } else {
            preview.innerHTML = '';
        }

        document.getElementById('modalTitle').textContent = 'Edit Post';
        document.getElementById('submitBtnText').textContent = 'Update Post';
        document.getElementById('deletePostBtn').style.display = 'block';
        document.getElementById('postModal').style.display = 'flex';
    }
}

// Setup category filtering
function setupCategoryFilter() {
    const categories = ['all', 'Technology', 'Lifestyle', 'Food', 'Travel', 'Education'];
    const container = document.getElementById('categoryTabs');
    if (!container) return;
    
    // Clear container first
    container.innerHTML = '';
    
    categories.forEach(category => {
        const tab = document.createElement('div');
        tab.className = `category-tab ${category === 'all' ? 'active' : ''}`;
        tab.textContent = category === 'all' ? 'All Posts' : category;
        tab.dataset.category = category;
        
        tab.addEventListener('click', () => {
            document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadPosts(category);
        });
        
        container.appendChild(tab);
    });
}

// Initialize
async function init() {
    console.log('Initializing app...'); // Debug log
    await checkAuth();
    initEventListeners();
    setupCategoryFilter();
    loadPosts();

    // Setup real-time updates
    supabase
        .channel('posts-channel')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'posts' }, 
            () => {
                loadPosts();
            }
        )
        .subscribe();
}

// Start the app
init();