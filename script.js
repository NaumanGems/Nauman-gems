// L'amour Jewelry - Main JavaScript
// import { FirebaseService, showToast, scrollToSection } from './firebase.js';

console.log('Script.js loaded successfully');

class LamourJewelry {
    constructor() {
        this.cart = [];
        this.isMobileMenuOpen = false;
        this.isModalOpen = false;
        this.wishlist = [];
        this.user = null;
        this.authDropdowns = [];
        
        this.init();
    }

    init() {
        console.log('Initializing LamourJewelry...');
        this.setTheme('dark');
        this.loadCart();
        this.setupEventListeners();
        this.loadFeaturedProducts();
        this.setupScrollEffects();
        this.hideLoadingScreen();
        this.setupAuthStateListener();
        this.updateCartCountBadge(); // Initialize cart count badge
        console.log('LamourJewelry initialization complete');
    }

    setupAuthStateListener() {
        // Check if Firebase Auth is available
        if (!window.firebaseAuth) {
            console.warn('Firebase Auth not available, using fallback auth state');
            return;
        }

        // Listen for auth state changes
        window.firebaseAuth.onAuthStateChanged((user) => {
            if (user) {
                this.user = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || user.email,
                    provider: user.providerData[0]?.providerId || 'email'
                };
            } else {
                this.user = null;
            }
            this.updateAuthUI();
        }, (error) => {
            console.error('Auth state listener error:', error);
        });
    }

    // Theme Management
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    }

    // Theme Management
    toggleTheme() {
        // Theme toggle removed - dark mode only
    }

    // Cart Management
    loadCart() {
        const savedCart = localStorage.getItem('lamour_cart');
        if (savedCart) {
            this.cart = JSON.parse(savedCart);
        }
        this.updateCartCount();
    }

    saveCart() {
        localStorage.setItem('lamour_cart', JSON.stringify(this.cart));
        this.updateCartCount();
        this.updateCartCountBadge();
    }

    addToCart(product) {
        const existingItem = this.cart.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.cart.push({
                ...product,
                quantity: 1
            });
        }
        
        this.saveCart();
        this.showToast(`${product.title} added to cart!`, 'success');
        this.createConfetti();
    }

    removeFromCart(productId) {
        console.log('Removing item from cart:', productId);
        this.cart = this.cart.filter(item => item.id !== productId);
        this.saveCart();
        this.updateCartDisplay(); // Immediately update the display
        this.showToast('Item removed from cart', 'info');
    }

    updateCartQuantity(productId, quantity) {
        console.log('Updating cart quantity:', productId, 'to', quantity);
        const item = this.cart.find(item => item.id === productId);
        if (item) {
            if (quantity <= 0) {
                this.removeFromCart(productId);
            } else {
                item.quantity = quantity;
                this.saveCart();
                this.updateCartDisplay(); // Immediately update the display
            }
        }
    }

    updateCartCount() {
        const count = this.cart.reduce((total, item) => total + item.quantity, 0);
        const cartCount = document.getElementById('cart-count');
        if (cartCount) {
            cartCount.textContent = count;
        }
        this.updateCartCountBadge(); // Update badge after cart count changes
    }

    getCartTotal() {
        return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    // Authentication Methods
    async signInWithGoogle() {
        try {
            // Check if Firebase Auth is available
            if (!window.firebaseAuth || !window.firebaseAuthMethods) {
                throw new Error('Firebase Authentication not initialized');
            }

            // Show loading state
            const loadingAlert = Swal.fire({
                title: 'Sign in with Google',
                text: 'Opening Google sign-in...',
                icon: 'info',
                showConfirmButton: false,
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Use Firebase Auth
            const authResult = await window.firebaseAuthMethods.signInWithPopup(
                window.firebaseAuth, 
                window.googleProvider
            );
            
            // Close loading alert
            loadingAlert.close();
            
            this.user = {
                uid: authResult.user.uid,
                email: authResult.user.email,
                displayName: authResult.user.displayName || 'Google User',
                provider: 'google'
            };
            
            this.updateAuthUI();
            this.closeAllDropdowns();
            
            Swal.fire({
                title: 'Welcome to L\'amour!',
                text: `Hello ${this.user.displayName}! You have been successfully signed in.`,
                icon: 'success',
                timer: 3000,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Google sign in error:', error);
            
            // Handle specific Firebase errors
            if (error.code === 'auth/popup-closed-by-user') {
                Swal.fire({
                    title: 'Sign-in Cancelled',
                    text: 'You cancelled the Google sign-in',
                    icon: 'info'
                });
            } else if (error.code === 'auth/popup-blocked') {
                Swal.fire({
                    title: 'Pop-up Blocked',
                    text: 'Please allow pop-ups for this site and try again',
                    icon: 'warning'
                });
            } else if (error.code === 'auth/unauthorized-domain') {
                Swal.fire({
                    title: 'Domain Not Authorized',
                    text: 'This domain needs to be added to Firebase authentication settings.',
                    icon: 'error'
                });
            } else {
                Swal.fire({
                    title: 'Sign-in Error',
                    text: error.message || 'There was an issue with Google sign-in',
                    icon: 'error'
                });
            }
        }
    }

    async signUpWithEmail() {
        const { value: formValues } = await Swal.fire({
            title: 'Create Your Account',
            html: `
                <div style="text-align: left; margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-dark);">Full Name</label>
                    <input id="swal-input1" class="swal2-input" placeholder="Enter your full name" required>
                </div>
                <div style="text-align: left; margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-dark);">Email Address</label>
                    <input id="swal-input2" class="swal2-input" type="email" placeholder="Enter your email address" required>
                </div>
                <div style="text-align: left; margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-dark);">Password</label>
                    <input id="swal-input3" class="swal2-input" type="password" placeholder="Create a password (min 6 characters)" required>
                </div>
                <div style="text-align: left;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-dark);">Confirm Password</label>
                    <input id="swal-input4" class="swal2-input" type="password" placeholder="Confirm your password" required>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Create Account',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#d4af37',
            cancelButtonColor: '#6c757d',
            preConfirm: () => {
                const name = document.getElementById('swal-input1').value.trim();
                const email = document.getElementById('swal-input2').value.trim();
                const password = document.getElementById('swal-input3').value;
                const confirmPassword = document.getElementById('swal-input4').value;
                
                if (!name || !email || !password || !confirmPassword) {
                    Swal.showValidationMessage('Please fill in all fields');
                    return false;
                }
                
                if (name.length < 2) {
                    Swal.showValidationMessage('Name must be at least 2 characters long');
                    return false;
                }
                
                if (!this.validateEmail(email)) {
                    Swal.showValidationMessage('Please enter a valid email address');
                    return false;
                }
                
                if (password.length < 6) {
                    Swal.showValidationMessage('Password must be at least 6 characters long');
                    return false;
                }
                
                if (password !== confirmPassword) {
                    Swal.showValidationMessage('Passwords do not match');
                    return false;
                }
                
                return { name, email, password };
            }
        });

        if (formValues) {
            try {
                // Show loading state
                Swal.fire({
                    title: 'Creating Account...',
                    text: 'Please wait while we set up your account',
                    icon: 'info',
                    showConfirmButton: false,
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                // Use Firebase Auth to create account
                const authResult = await window.firebaseAuthMethods.createUserWithEmailAndPassword(
                    window.firebaseAuth,
                    formValues.email,
                    formValues.password
                );
                
                this.user = {
                    uid: authResult.user.uid,
                    email: authResult.user.email,
                    displayName: formValues.name,
                    provider: 'email'
                };
                
                this.updateAuthUI();
                this.closeAllDropdowns();
                
                Swal.fire({
                    title: 'Welcome to L\'amour!',
                    text: `Hello ${this.user.displayName}! Your account has been created successfully.`,
                    icon: 'success',
                    timer: 3000,
                    showConfirmButton: false
                });
            } catch (error) {
                console.error('Email sign up error:', error);
                
                let errorMessage = 'Failed to create account';
                if (error.code === 'auth/email-already-in-use') {
                    errorMessage = 'An account with this email already exists. Please try logging in instead.';
                } else if (error.code === 'auth/weak-password') {
                    errorMessage = 'Password is too weak. Please choose a stronger password.';
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = 'Please enter a valid email address.';
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                Swal.fire({
                    title: 'Account Creation Failed',
                    text: errorMessage,
                    icon: 'error'
                });
            }
        }
    }

    async signInWithEmail() {
        const { value: formValues } = await Swal.fire({
            title: 'Welcome Back',
            html: `
                <div style="text-align: left; margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-dark);">Email Address</label>
                    <input id="swal-input1" class="swal2-input" type="email" placeholder="Enter your email address" required>
                </div>
                <div style="text-align: left;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--text-dark);">Password</label>
                    <input id="swal-input2" class="swal2-input" type="password" placeholder="Enter your password" required>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Sign In',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#d4af37',
            cancelButtonColor: '#6c757d',
            preConfirm: () => {
                const email = document.getElementById('swal-input1').value.trim();
                const password = document.getElementById('swal-input2').value;
                
                if (!email || !password) {
                    Swal.showValidationMessage('Please fill in all fields');
                    return false;
                }
                
                if (!this.validateEmail(email)) {
                    Swal.showValidationMessage('Please enter a valid email address');
                    return false;
                }
                
                return { email, password };
            }
        });

        if (formValues) {
            try {
                // Show loading state
                Swal.fire({
                    title: 'Signing In...',
                    text: 'Please wait while we verify your credentials',
                    icon: 'info',
                    showConfirmButton: false,
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                // Use Firebase Auth to sign in
                const authResult = await window.firebaseAuthMethods.signInWithEmailAndPassword(
                    window.firebaseAuth,
                    formValues.email,
                    formValues.password
                );
                
                this.user = {
                    uid: authResult.user.uid,
                    email: authResult.user.email,
                    displayName: authResult.user.displayName || formValues.email.split('@')[0],
                    provider: 'email'
                };
                
                this.updateAuthUI();
                this.closeAllDropdowns();
                
                Swal.fire({
                    title: 'Welcome to L\'amour!',
                    text: `Hello ${this.user.displayName}! You have been successfully signed in.`,
                    icon: 'success',
                    timer: 3000,
                    showConfirmButton: false
                });
            } catch (error) {
                console.error('Email sign in error:', error);
                
                let errorMessage = 'Failed to sign in';
                if (error.code === 'auth/user-not-found') {
                    errorMessage = 'No account found with this email. Please check your email or create a new account.';
                } else if (error.code === 'auth/wrong-password') {
                    errorMessage = 'Incorrect password. Please try again.';
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = 'Please enter a valid email address.';
                } else if (error.code === 'auth/too-many-requests') {
                    errorMessage = 'Too many failed attempts. Please try again later.';
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                Swal.fire({
                    title: 'Sign In Failed',
                    text: errorMessage,
                    icon: 'error'
                });
            }
        }
    }

    async signOut() {
        try {
            const userName = this.user?.displayName || 'User';
            
            if (window.firebaseAuth && window.firebaseAuthMethods) {
                await window.firebaseAuthMethods.signOut(window.firebaseAuth);
            }
            
            this.user = null;
            this.updateAuthUI();
            
            Swal.fire({
                title: 'Successfully Logged Out',
                text: `Goodbye, ${userName}! You have been logged out successfully.`,
                icon: 'success',
                timer: 3000,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Sign out error:', error);
            Swal.fire({
                title: 'Error',
                text: 'Failed to sign out',
                icon: 'error'
            });
        }
    }

    updateAuthUI() {
        const googleBtn = document.getElementById('google-auth-btn');
        const signupBtn = document.getElementById('signup-btn');
        const loginBtn = document.getElementById('login-btn');
        
        if (this.user) {
            // User is signed in - show welcome message and logout
            if (googleBtn) {
                googleBtn.innerHTML = `
                    <i class="fas fa-user-circle"></i>
                    <span>Welcome, ${this.user.displayName}</span>
                `;
                googleBtn.onclick = () => this.toggleUserDropdown();
                googleBtn.classList.add('user-welcome');
            }
            
            if (signupBtn) {
                signupBtn.style.display = 'none';
            }
            
            if (loginBtn) {
                loginBtn.innerHTML = `
                    <i class="fas fa-sign-out-alt"></i>
                    <span>Logout</span>
                `;
                loginBtn.onclick = () => this.signOut();
                loginBtn.classList.add('logout-btn');
            }
        } else {
            // User is signed out - show all auth buttons
            if (googleBtn) {
                googleBtn.innerHTML = `
                    <i class="fab fa-google"></i>
                    <span>Continue with Google</span>
                `;
                googleBtn.onclick = () => this.signInWithGoogle();
                googleBtn.classList.remove('user-welcome');
            }
            
            if (signupBtn) {
                signupBtn.style.display = 'flex';
                signupBtn.innerHTML = `
                    <i class="fas fa-user-plus"></i>
                    <span>Sign Up</span>
                `;
                signupBtn.onclick = () => this.signUpWithEmail();
            }
            
            if (loginBtn) {
                loginBtn.innerHTML = `
                    <i class="fas fa-sign-in-alt"></i>
                    <span>Login</span>
                `;
                loginBtn.onclick = () => this.signInWithEmail();
                loginBtn.classList.remove('logout-btn');
            }
        }
    }

    toggleUserDropdown() {
        // Show user profile options
        Swal.fire({
            title: 'My Account',
            html: `
                <div style="text-align: left;">
                    <p><strong>Name:</strong> ${this.user.displayName}</p>
                    <p><strong>Email:</strong> ${this.user.email}</p>
                    <p><strong>Provider:</strong> ${this.user.provider}</p>
                </div>
            `,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Sign Out',
            cancelButtonText: 'Close',
            confirmButtonColor: '#dc3545'
        }).then((result) => {
            if (result.isConfirmed) {
                this.signOut();
            }
        });
    }

    closeAllDropdowns() {
        // No dropdowns to close anymore
    }

    showProfile() {
        Swal.fire({
            title: 'My Profile',
            text: 'Profile functionality coming soon!',
            icon: 'info'
        });
        this.closeAllDropdowns();
    }

    showOrders() {
        Swal.fire({
            title: 'My Orders',
            text: 'Order history coming soon!',
            icon: 'info'
        });
        this.closeAllDropdowns();
    }

    // Event Listeners
    setupEventListeners() {
        // Mobile menu toggle
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', () => this.toggleMobileMenu());
        }

        // Navigation links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const target = link.getAttribute('href');
                if (target && target.startsWith('#')) {
                    e.preventDefault();
                    this.scrollToSection(target);
                    this.updateActiveNavLink(link);
                }
                // Otherwise, let the browser handle navigation
            });
        });

        // Cart button functionality (desktop & mobile)
        const cartBtn = document.getElementById('cart-btn');
        const mobileCartBtn = document.getElementById('mobile-cart-btn');
        if (cartBtn) {
            cartBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleCart();
            });
        }
        if (mobileCartBtn) {
            mobileCartBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleCart();
            });
        }

        const cartClose = document.getElementById('cart-close');
        if (cartClose) {
            cartClose.addEventListener('click', () => this.closeCart());
        }

        const cartOverlay = document.getElementById('cart-overlay');
        if (cartOverlay) {
            cartOverlay.addEventListener('click', () => this.closeCart());
        }

        // Category cards
        const categoryCards = document.querySelectorAll('.category-card');
        categoryCards.forEach(card => {
            card.addEventListener('click', () => {
                const category = card.dataset.category;
                this.filterProducts(category);
                this.scrollToSection('#shop');
            });
        });

        // Search functionality
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchProducts(e.target.value);
            });
        }

        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const query = searchInput.value;
                this.searchProducts(query);
            });
        }

        // Filter functionality
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.handleFilterChange());
        }

        const priceFilter = document.getElementById('price-filter');
        if (priceFilter) {
            priceFilter.addEventListener('change', () => this.handleFilterChange());
        }

        const sortFilter = document.getElementById('sort-filter');
        if (sortFilter) {
            sortFilter.addEventListener('change', () => this.handleFilterChange());
        }

        const clearFiltersBtn = document.getElementById('clear-filters-btn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearFilters());
        }

        // Load more button
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => this.loadMoreProducts());
        }

        // Modal functionality
        const modalOverlay = document.getElementById('modal-overlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', () => this.closeModal());
        }

        const modalClose = document.getElementById('modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', () => this.closeModal());
        }

        // Newsletter form
        const newsletterForm = document.getElementById('newsletter-form');
        if (newsletterForm) {
            newsletterForm.addEventListener('submit', (e) => this.handleNewsletterSubmit(e));
        }

        // Contact form
        const contactForm = document.getElementById('contact-form');
        if (contactForm) {
            contactForm.addEventListener('submit', (e) => this.handleContactSubmit(e));
        }

        // Checkout button
        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => this.handleCheckout());
        }

        // Scroll to top button
        const scrollToTopBtn = document.getElementById('scroll-to-top');
        if (scrollToTopBtn) {
            scrollToTopBtn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        // FAQ functionality
        this.setupFAQAccordion();

        // Setup auth event listeners
        this.setupAuthEventListeners();

        // Global event listeners
        document.addEventListener('click', (e) => {
            // Close dropdowns when clicking outside
            if (!e.target.closest('.auth-buttons')) {
                this.closeAllDropdowns();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.closeCart();
                this.closeAllDropdowns();
            }
        });

        // Wishlist functionality
        const wishlistBtn = document.getElementById('wishlist-btn');
        const mobileWishlistBtn = document.getElementById('mobile-wishlist-btn');
        if (wishlistBtn) {
            wishlistBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleWishlistSection();
            });
        }
        if (mobileWishlistBtn) {
            mobileWishlistBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleWishlistSection();
            });
        }
        const wishlistClose = document.getElementById('wishlist-close');
        if (wishlistClose) {
            wishlistClose.addEventListener('click', () => this.closeWishlist());
        }
        const wishlistOverlay = document.getElementById('wishlist-overlay');
        if (wishlistOverlay) {
            wishlistOverlay.addEventListener('click', () => this.closeWishlist());
        }

        console.log('Event listeners setup complete');
    }

    // FAQ Accordion Functionality
    setupFAQAccordion() {
        const faqItems = document.querySelectorAll('.faq-item');
        
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            if (question) {
                question.addEventListener('click', () => {
                    // Close other FAQ items
                    faqItems.forEach(otherItem => {
                        if (otherItem !== item) {
                            otherItem.classList.remove('active');
                        }
                    });
                    
                    // Toggle current item
                    item.classList.toggle('active');
                });
            }
        });
    }

    // Mobile Menu
    toggleMobileMenu() {
        const navMenu = document.getElementById('nav-menu');
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        
        this.isMobileMenuOpen = !this.isMobileMenuOpen;
        
        if (this.isMobileMenuOpen) {
            navMenu.classList.add('active');
            mobileMenuToggle.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            navMenu.classList.remove('active');
            mobileMenuToggle.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // Product Loading
    async loadFeaturedProducts() {
        try {
            console.log('Loading featured products...');
            const gemTypes = [
                { name: 'Amethyst', color: 'purple', img: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&h=400&fit=crop' },
                { name: 'Ruby', color: 'red', img: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=400&h=400&fit=crop' },
                { name: 'Sapphire', color: 'blue', img: 'https://images.unsplash.com/photo-1464983953574-0892a716854b?w=400&h=400&fit=crop' },
                { name: 'Emerald', color: 'green', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop' },
                { name: 'Citrine', color: 'yellow', img: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=400&h=400&fit=crop' },
                { name: 'Topaz', color: 'blue', img: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&h=400&fit=crop' },
                { name: 'Opal', color: 'colorful', img: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=400&h=400&fit=crop' },
                { name: 'Garnet', color: 'red', img: 'https://images.unsplash.com/photo-1464983953574-0892a716854b?w=400&h=400&fit=crop' },
                { name: 'Peridot', color: 'green', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop' },
                { name: 'Aquamarine', color: 'blue', img: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=400&h=400&fit=crop' },
                { name: 'Spinel', color: 'pink', img: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&h=400&fit=crop' },
                { name: 'Morganite', color: 'peach', img: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=400&h=400&fit=crop' },
                { name: 'Alexandrite', color: 'green-red', img: 'https://images.unsplash.com/photo-1464983953574-0892a716854b?w=400&h=400&fit=crop' },
                { name: 'Tanzanite', color: 'violet', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop' },
                { name: 'Tourmaline', color: 'multi', img: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=400&h=400&fit=crop' },
                { name: 'Zircon', color: 'blue', img: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&h=400&fit=crop' },
                { name: 'Quartz', color: 'clear', img: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=400&h=400&fit=crop' },
                { name: 'Onyx', color: 'black', img: 'https://images.unsplash.com/photo-1464983953574-0892a716854b?w=400&h=400&fit=crop' },
                { name: 'Jade', color: 'green', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop' },
                { name: 'Lapis Lazuli', color: 'blue', img: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=400&h=400&fit=crop' }
            ];
            // Define the 4 categories with their characteristics
            const categories = [
                {
                    name: 'Pearl',
                    basePrice: 50000,
                    priceRange: 20000,
                    description: 'Natural freshwater pearls with lustrous finish',
                    tags: ['pearl', 'natural', 'lustrous', 'elegant']
                },
                {
                    name: 'Glass Fill',
                    basePrice: 30000,
                    priceRange: 15000,
                    description: 'Glass-filled gemstones with enhanced clarity',
                    tags: ['glass', 'filled', 'enhanced', 'clarity']
                },
                {
                    name: 'Zircon',
                    basePrice: 80000,
                    priceRange: 40000,
                    description: 'Natural zircon gemstones with brilliant sparkle',
                    tags: ['zircon', 'natural', 'brilliant', 'sparkle']
                },
                {
                    name: 'Moissanite',
                    basePrice: 120000,
                    priceRange: 60000,
                    description: 'Lab-grown moissanite with diamond-like brilliance',
                    tags: ['moissanite', 'lab-grown', 'brilliant', 'diamond-like']
                }
            ];

            const products = Array.from({ length: 110 }, (_, i) => {
                const categoryIndex = i % categories.length;
                const category = categories[categoryIndex];
                const productNumber = Math.floor(i / categories.length) + 1;
                
                // Generate price within category range
                const priceVariation = (Math.random() - 0.5) * 2; // ±50% variation
                const price = Math.round(category.basePrice + (priceVariation * category.priceRange));
                
                // Select gem type for variety
                const gem = gemTypes[i % gemTypes.length];
                
                return {
                    id: `${category.name.toLowerCase()}-${productNumber}`,
                    title: `${category.name} ${gem.name} #${productNumber}`,
                    price: price,
                    image: gem.img,
                    category: category.name.toLowerCase(),
                    description: `${category.description}. Features ${gem.name.toLowerCase()} with ${gem.color} color.`,
                    featured: i < 10,
                    tags: [...category.tags, gem.name.toLowerCase(), gem.color]
                };
            });
            
            this.products = products;
            this.renderProducts(products.filter(p => p.featured), 'featured-products');
            this.renderProducts(products, 'shop-products');
            
        } catch (error) {
            console.error('Error loading featured products:', error);
            this.showToast('Error loading products', 'error');
        }
    }

    renderProducts(products, containerId) {
        console.log(`Rendering ${products.length} products in container: ${containerId}`);
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container not found: ${containerId}`);
            return;
        }

        const productsHTML = products.map(product => this.createProductCard(product)).join('');
        container.innerHTML = productsHTML;
        console.log(`Rendered products in ${containerId}`);
        
        // Update product count after rendering
        if (containerId === 'shop-products') {
            this.updateProductCount();
        }
    }

    createProductCard(product) {
        const tags = product.tags ? product.tags.join(', ') : '';
        const isFeatured = product.featured;
        const isNew = Math.random() > 0.7; // Randomly mark some as new
        const isSale = Math.random() > 0.8; // Randomly mark some as sale
        
        return `
            <div class="product-card" data-product-id="${product.id}" data-category="${product.category}" data-price="${product.price}" data-tags="${tags}">
                <div class="product-image">
                    <img src="${product.image}" alt="${product.title}" loading="lazy">
                    <div class="product-badges">
                        ${isFeatured ? '<span class="badge featured">Featured</span>' : ''}
                        ${isNew ? '<span class="badge new">New</span>' : ''}
                        ${isSale ? '<span class="badge sale">Sale</span>' : ''}
                    </div>
                </div>
                <div class="product-info">
                    <div class="product-category">${product.category.charAt(0).toUpperCase() + product.category.slice(1)}</div>
                    <h3 class="product-title">${product.title}</h3>
                    <div class="product-price">
                        ${isSale ? `<span class="original-price">Rs. ${(product.price * 1.2).toLocaleString()}</span>` : ''}
                        <span class="current-price">Rs. ${product.price.toLocaleString()}</span>
                    </div>
                    <p class="product-description">${product.description}</p>
                    <div class="product-tags">
                        ${product.tags ? product.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : ''}
                    </div>
                    <div class="product-actions">
                        <button class="add-to-cart" data-product-id="${product.id}">
                            <i class="fas fa-shopping-cart"></i>
                            Add to Cart
                        </button>
                        <button class="view-details" data-product-id="${product.id}">
                            <i class="fas fa-eye"></i>
                            View Details
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async addToCartFromId(productId) {
        try {
            const product = this.products.find(p => p.id === productId);
            if (product) {
                this.addToCart(product);
            }
        } catch (error) {
            console.error('Error adding product to cart:', error);
        }
    }

    // Modal Management
    async showProductModal(productId) {
        try {
            const product = this.products.find(p => p.id === productId);
            if (!product) return;

            const modal = document.getElementById('product-modal');
            const modalBody = document.getElementById('modal-body');
            
            const isInWishlist = this.wishlist.includes(productId);
            
            modalBody.innerHTML = `
                <div class="product-modal-content">
                    <div class="product-modal-image">
                        <img src="${product.image}" alt="${product.title}">
                        <div class="product-modal-badges">
                            ${product.featured ? '<span class="badge featured">Featured</span>' : ''}
                        </div>
                    </div>
                    <div class="product-modal-details">
                        <div class="product-modal-category">${product.category.charAt(0).toUpperCase() + product.category.slice(1)}</div>
                        <h2>${product.title}</h2>
                        <div class="product-modal-price">Rs. ${product.price.toLocaleString()}</div>
                        <p class="product-modal-description">${product.description}</p>
                        
                        <div class="product-modal-tags">
                            ${product.tags ? product.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : ''}
                        </div>
                        
                        <div class="product-modal-actions">
                            <button class="btn btn-primary" onclick="lamour.addToCartFromId('${productId}')">
                                <i class="fas fa-shopping-cart"></i>
                                Add to Cart
                            </button>
                            <button class="btn btn-outline" onclick="lamour.toggleWishlist('${productId}')">
                                <i class="fas fa-heart ${isInWishlist ? 'filled' : ''}"></i>
                                ${isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
                            </button>
                        </div>
                        
                        <div class="product-modal-info">
                            <div class="info-item">
                                <i class="fas fa-gem"></i>
                                <span>Certified Gemstones</span>
                            </div>
                            <div class="info-item">
                                <i class="fas fa-shipping-fast"></i>
                                <span>Free Shipping</span>
                            </div>
                            <div class="info-item">
                                <i class="fas fa-undo"></i>
                                <span>30-Day Returns</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            modal.classList.add('show');
            this.isModalOpen = true;
            document.body.style.overflow = 'hidden';

            // Add event listener for modal add to cart
            const addToCartBtn = modalBody.querySelector('.add-to-cart-modal');
            if (addToCartBtn) {
                addToCartBtn.addEventListener('click', () => {
                    this.addToCart(product);
                    this.closeModal();
                });
            }
        } catch (error) {
            console.error('Error showing product modal:', error);
        }
    }

    closeModal() {
        const modal = document.getElementById('product-modal');
        if (modal) {
            modal.classList.remove('show');
            this.isModalOpen = false;
            document.body.style.overflow = '';
        }
    }

    // Newsletter
    handleNewsletterSubmit(e) {
        e.preventDefault();
        const email = e.target.querySelector('input[type="email"]').value;
        
        if (this.validateEmail(email)) {
            this.showToast('Thank you for subscribing!', 'success');
            e.target.reset();
        } else {
            this.showToast('Please enter a valid email address.', 'error');
        }
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Contact form
    handleContactSubmit(e) {
        e.preventDefault();
        this.showToast('Message sent successfully!', 'success');
        e.target.reset();
    }

    // Checkout
    handleCheckout() {
        if (this.cart.length === 0) {
            this.showToast('Your cart is empty!', 'error');
            return;
        }
        this.showToast('Redirecting to checkout...', 'info');
        setTimeout(() => {
            window.location.href = 'checkout.html';
        }, 1000);
    }

    // Scroll Effects
    setupScrollEffects() {
        // Scroll to top button
        const scrollToTop = document.getElementById('scroll-to-top');
        if (scrollToTop) {
            window.addEventListener('scroll', () => {
                if (window.pageYOffset > 300) {
                    scrollToTop.classList.add('visible');
                } else {
                    scrollToTop.classList.remove('visible');
                }
            });
        }

        // Navbar scroll effect
        const navbar = document.getElementById('navbar');
        if (navbar) {
            window.addEventListener('scroll', () => {
                if (window.pageYOffset > 100) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }
            });
        }

        // Intersection Observer for animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                }
            });
        }, observerOptions);

        // Observe elements for animation
        document.querySelectorAll('.product-card, .category-card, .section-header, .about-content').forEach(el => {
            observer.observe(el);
        });
    }

    // Loading Screen
    hideLoadingScreen() {
        // Hide loading screen immediately and with fallback
        const hideScreen = () => {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500);
            }
        };

        // Try to hide immediately
        hideScreen();
        
        // Also hide after a delay as backup
        setTimeout(hideScreen, 1500);
        
        // Final fallback - hide after 3 seconds no matter what
        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
                loadingScreen.classList.add('hidden');
            }
        }, 3000);
    }

    // Toast Notifications
    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${this.getToastIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        toastContainer.appendChild(toast);

        // Animate in
        setTimeout(() => toast.classList.add('show'), 100);

        // Auto remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    // Confetti Animation
    createConfetti() {
        const colors = ['#D4AF37', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFE66D'];
        
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.animationDelay = Math.random() * 3 + 's';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            
            document.body.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 3000);
        }
    }

    // Smooth Scrolling
    scrollToSection(selector) {
        const target = document.querySelector(selector);
        if (target) {
            const offsetTop = target.offsetTop - 80; // Account for fixed navbar
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    }

    updateActiveNavLink(clickedLink) {
        // Remove active class from all nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        // Add active class to clicked link
        clickedLink.classList.add('active');
    }

    // Product Filtering
    filterProducts(category) {
        const products = document.querySelectorAll('.product-card');
        const categoryFilter = document.getElementById('category-filter');
        const priceFilter = document.getElementById('price-filter');
        const sortFilter = document.getElementById('sort-filter');
        
        // Update category filter if provided
        if (category && categoryFilter) {
            categoryFilter.value = category;
        }
        
        // Get filter values
        const selectedCategory = categoryFilter ? categoryFilter.value : category || '';
        const selectedPrice = priceFilter ? priceFilter.value : '';
        const selectedSort = sortFilter ? sortFilter.value : 'featured';
        
        // Filter products
        products.forEach(product => {
            const productCategory = product.dataset.category;
            const productPrice = parseInt(product.dataset.price);
            let showProduct = true;
            
            // Category filter
            if (selectedCategory && productCategory !== selectedCategory) {
                showProduct = false;
            }
            
            // Price filter
            if (selectedPrice && showProduct) {
                const [min, max] = selectedPrice.split('-').map(p => p === '+' ? Infinity : parseInt(p));
                if (productPrice < min || (max !== Infinity && productPrice > max)) {
                    showProduct = false;
                }
            }
            
            product.style.display = showProduct ? 'block' : 'none';
        });
        
        // Sort products
        this.sortProducts(selectedSort);
        
        // Update product count
        this.updateProductCount();
    }

    // Sort products
    sortProducts(sortType) {
        const container = document.getElementById('shop-products');
        if (!container) return;
        
        const products = Array.from(container.children);
        
        products.sort((a, b) => {
            const priceA = parseInt(a.dataset.price);
            const priceB = parseInt(b.dataset.price);
            const titleA = a.querySelector('.product-title').textContent;
            const titleB = b.querySelector('.product-title').textContent;
            
            switch (sortType) {
                case 'price-low':
                    return priceA - priceB;
                case 'price-high':
                    return priceB - priceA;
                case 'name':
                    return titleA.localeCompare(titleB);
                case 'featured':
                default:
                    const featuredA = a.querySelector('.badge.new') ? 1 : 0;
                    const featuredB = b.querySelector('.badge.new') ? 1 : 0;
                    return featuredB - featuredA;
            }
        });
        
        // Re-append sorted products
        products.forEach(product => container.appendChild(product));
    }

    // Update product count
    updateProductCount() {
        const visibleProducts = document.querySelectorAll('.product-card[style*="block"], .product-card:not([style*="none"])');
        const countElement = document.getElementById('product-count');
        if (countElement) {
            countElement.textContent = `${visibleProducts.length} products`;
        }
    }

    // Search products
    searchProducts(query) {
        const products = document.querySelectorAll('.product-card');
        const searchTerm = query.toLowerCase();
        
        products.forEach(product => {
            const title = product.querySelector('.product-title').textContent.toLowerCase();
            const description = product.querySelector('.product-description').textContent.toLowerCase();
            const tags = product.dataset.tags ? product.dataset.tags.toLowerCase() : '';
            
            const matches = title.includes(searchTerm) || 
                           description.includes(searchTerm) || 
                           tags.includes(searchTerm);
            
            product.style.display = matches ? 'block' : 'none';
        });
        
        this.updateProductCount();
    }

    // Cart Toggle
    toggleCart() {
        const cartSection = document.getElementById('cart');
        const cartOverlay = document.getElementById('cart-overlay');
        
        if (cartSection && cartOverlay) {
            if (cartSection.classList.contains('active')) {
                this.closeCart();
            } else {
                this.openCart();
            }
        }
    }

    openCart() {
        const cartSection = document.getElementById('cart');
        const cartOverlay = document.getElementById('cart-overlay');
        
        if (cartSection && cartOverlay) {
            cartSection.classList.add('active');
            cartOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            this.updateCartDisplay();
        }
    }

    closeCart() {
        const cartSection = document.getElementById('cart');
        const cartOverlay = document.getElementById('cart-overlay');
        
        if (cartSection && cartOverlay) {
            cartSection.classList.remove('active');
            cartOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    updateCartDisplay() {
        const cartItems = document.getElementById('cart-items');
        const cartSubtotal = document.getElementById('cart-subtotal');
        const cartTotal = document.getElementById('cart-total');
        
        if (!cartItems) return;
        
        if (this.cart.length === 0) {
            cartItems.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
            if (cartSubtotal) cartSubtotal.textContent = 'Rs. 0.00';
            if (cartTotal) cartTotal.textContent = 'Rs. 0.00';
            this.updateCartCountBadge();
            return;
        }
        
        let subtotal = 0;
        let totalItems = 0;
        cartItems.innerHTML = this.cart.map(item => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;
            totalItems += item.quantity;
            const size = item.size || 1;
            return `
                <div class="cart-item" data-product-id="${item.id}">
                    <img src="${item.image}" alt="${item.title}">
                    <div class="cart-item-details">
                        <h4>${item.title}</h4>
                        <p>Rs. ${item.price.toFixed(2)}</p>
                        <div class="quantity-controls">
                            <button class="quantity-btn minus" data-product-id="${item.id}" data-action="decrease">-</button>
                            <span class="quantity-display">${item.quantity}</span>
                            <button class="quantity-btn plus" data-product-id="${item.id}" data-action="increase">+</button>
                        </div>
                        <div class="size-controls">
                            <label for="size-select-${item.id}">Size:</label>
                            <select id="size-select-${item.id}" data-product-id="${item.id}" class="cart-size-select">
                                <option value="1" ${size == 1 ? 'selected' : ''}>1</option>
                                <option value="2" ${size == 2 ? 'selected' : ''}>2</option>
                                <option value="3" ${size == 3 ? 'selected' : ''}>3</option>
                                <option value="4" ${size == 4 ? 'selected' : ''}>4</option>
                                <option value="5" ${size == 5 ? 'selected' : ''}>5</option>
                            </select>
                        </div>
                    </div>
                    <button class="remove-item" data-product-id="${item.id}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }).join('');
        
        // Add event listeners for quantity buttons and remove buttons
        setTimeout(() => {
            // Quantity buttons
            document.querySelectorAll('.quantity-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const productId = btn.getAttribute('data-product-id');
                    const action = btn.getAttribute('data-action');
                    const item = this.cart.find(item => item.id === productId);
                    
                    if (item) {
                        let newQuantity = item.quantity;
                        if (action === 'increase') {
                            newQuantity += 1;
                        } else if (action === 'decrease') {
                            newQuantity -= 1;
                        }
                        this.updateCartQuantity(productId, newQuantity);
                    }
                });
            });
            
            // Remove buttons
            document.querySelectorAll('.remove-item').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const productId = btn.getAttribute('data-product-id');
                    this.removeFromCart(productId);
                });
            });
            
            // Size selection
            document.querySelectorAll('.cart-size-select').forEach(select => {
                select.addEventListener('change', (e) => {
                    const productId = select.getAttribute('data-product-id');
                    const newSize = parseInt(select.value);
                    this.updateCartItemSize(productId, newSize);
                });
            });
        }, 0);
        
        if (cartSubtotal) cartSubtotal.textContent = `Rs. ${subtotal.toFixed(2)}`;
        if (cartTotal) cartTotal.textContent = `Rs. ${subtotal.toFixed(2)}`;
        this.updateCartCountBadge();
    }

    updateCartCountBadge() {
        const totalItems = this.cart.reduce((total, item) => total + item.quantity, 0);
        const badges = document.querySelectorAll('.cart-count-badge');
        
        badges.forEach(badge => {
            badge.textContent = totalItems;
            if (totalItems > 0) {
                badge.classList.add('show');
                badge.classList.add('animate');
                // Remove animate class after animation completes
                setTimeout(() => {
                    badge.classList.remove('animate');
                }, 600);
            } else {
                badge.classList.remove('show');
            }
        });
    }

    // Wishlist functionality
    toggleWishlist(productId) {
        const index = this.wishlist.indexOf(productId);
        if (index > -1) {
            this.wishlist.splice(index, 1);
            this.showToast('Removed from wishlist', 'info');
        } else {
            this.wishlist.push(productId);
            this.showToast('Added to wishlist', 'success');
        }
        localStorage.setItem('lamour_wishlist', JSON.stringify(this.wishlist));
    }

    // Clear all filters
    clearFilters() {
        const categoryFilter = document.getElementById('category-filter');
        const priceFilter = document.getElementById('price-filter');
        const sortFilter = document.getElementById('sort-filter');
        const searchInput = document.getElementById('search-input');
        
        if (categoryFilter) categoryFilter.value = '';
        if (priceFilter) priceFilter.value = '';
        if (sortFilter) sortFilter.value = 'featured';
        if (searchInput) searchInput.value = '';
        
        this.filterProducts();
        this.showToast('Filters cleared', 'info');
    }

    // Handle filter changes
    handleFilterChange() {
        this.filterProducts();
    }

    // Open modal
    openModal() {
        const modal = document.getElementById('product-modal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    // Setup Auth Event Listeners
    setupAuthEventListeners() {
        // Signup button
        const signupBtn = document.getElementById('signup-btn');
        if (signupBtn) {
            signupBtn.addEventListener('click', () => this.signUpWithEmail());
        }

        // Login button
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.signInWithEmail());
        }

        // Product interactions (event delegation)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-to-cart') || e.target.closest('.add-to-cart')) {
                e.preventDefault();
                const button = e.target.classList.contains('add-to-cart') ? e.target : e.target.closest('.add-to-cart');
                const productId = button.dataset.productId;
                if (productId) {
                    this.addToCartFromId(productId);
                }
            }

            if (e.target.classList.contains('view-details') || e.target.closest('.view-details')) {
                e.preventDefault();
                const button = e.target.classList.contains('view-details') ? e.target : e.target.closest('.view-details');
                const productId = button.dataset.productId;
                if (productId) {
                    this.showProductModal(productId);
                }
            }
        });

        // Footer category links
        const footerCategoryLinks = document.querySelectorAll('[data-category]');
        footerCategoryLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const category = link.dataset.category;
                this.filterProducts(category);
                this.scrollToSection('#shop');
            });
        });

        // Initialize auth UI
        this.updateAuthUI();
    }

    // Load More Products
    loadMoreProducts() {
        // This would typically load more products from a database
        // For now, we'll just show a toast message
        this.showToast('Loading more products...', 'info');
        
        // Simulate loading delay
        setTimeout(() => {
            this.showToast('More products loaded!', 'success');
        }, 1000);
    }

    toggleWishlistSection() {
        const wishlistSection = document.getElementById('wishlist');
        const wishlistOverlay = document.getElementById('wishlist-overlay');
        if (wishlistSection && wishlistOverlay) {
            if (wishlistSection.classList.contains('active')) {
                this.closeWishlist();
            } else {
                this.openWishlist();
            }
        }
    }
    openWishlist() {
        const wishlistSection = document.getElementById('wishlist');
        const wishlistOverlay = document.getElementById('wishlist-overlay');
        if (wishlistSection && wishlistOverlay) {
            wishlistSection.classList.add('active');
            wishlistOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            this.updateWishlistDisplay();
        }
    }
    closeWishlist() {
        const wishlistSection = document.getElementById('wishlist');
        const wishlistOverlay = document.getElementById('wishlist-overlay');
        if (wishlistSection && wishlistOverlay) {
            wishlistSection.classList.remove('active');
            wishlistOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
    updateWishlistDisplay() {
        const wishlistItemsContainer = document.getElementById('wishlist-items');
        const emptyMessage = document.getElementById('wishlist-empty-message');
        if (!wishlistItemsContainer || !emptyMessage) return;
        wishlistItemsContainer.innerHTML = '';
        if (this.wishlist.length === 0) {
            emptyMessage.style.display = 'block';
            return;
        }
        emptyMessage.style.display = 'none';
        this.wishlist.forEach(productId => {
            const product = this.products ? this.products.find(p => p.id === productId) : null;
            if (product) {
                const item = document.createElement('div');
                item.className = 'wishlist-item';
                item.innerHTML = `
                    <img src="${product.image}" alt="${product.title}" class="wishlist-item-image">
                    <div class="wishlist-item-details">
                        <div class="wishlist-item-title">${product.title}</div>
                        <div class="wishlist-item-price">Rs. ${product.price.toLocaleString()}</div>
                    </div>
                    <button class="wishlist-remove-btn" aria-label="Remove from Wishlist">&times;</button>
                `;
                item.querySelector('.wishlist-remove-btn').addEventListener('click', () => {
                    this.toggleWishlist(productId);
                    this.updateWishlistDisplay();
                });
                wishlistItemsContainer.appendChild(item);
            }
        });
    }

    updateCartItemSize(productId, newSize) {
        const item = this.cart.find(item => item.id === productId);
        if (item) {
            item.size = newSize;
            this.saveCart();
            this.updateCartDisplay(); // Re-render cart to show updated size
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, creating LamourJewelry instance...');
    window.lamour = new LamourJewelry();
    console.log('LamourJewelry instance created and assigned to window.lamour');

    // Mobile dropdown menu logic
    const mobileDropdownToggle = document.getElementById('mobile-dropdown-toggle');
    const mobileDropdownMenu = document.getElementById('mobile-dropdown-menu');
    const mobileMenuLinks = document.querySelectorAll('.mobile-dropdown-menu .nav-link');
    const mobileLoginBtn = document.getElementById('mobile-login-btn');
    const mobileSignupBtn = document.getElementById('mobile-signup-btn');
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');

    function closeMobileDropdown() {
        if (mobileDropdownMenu) mobileDropdownMenu.classList.remove('active');
    }
    function toggleMobileDropdown() {
        if (mobileDropdownMenu) mobileDropdownMenu.classList.toggle('active');
    }

    if (mobileDropdownToggle) {
        mobileDropdownToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleMobileDropdown();
        });
    }
    // Close dropdown when clicking a link
    mobileMenuLinks.forEach(link => {
        link.addEventListener('click', closeMobileDropdown);
    });
    // Mobile Login/Signup buttons trigger main buttons
    if (mobileLoginBtn && loginBtn) {
        mobileLoginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            closeMobileDropdown();
            loginBtn.click();
        });
    }
    if (mobileSignupBtn && signupBtn) {
        mobileSignupBtn.addEventListener('click', function(e) {
            e.preventDefault();
            closeMobileDropdown();
            signupBtn.click();
        });
    }
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768 && mobileDropdownMenu && mobileDropdownMenu.classList.contains('active')) {
            if (!mobileDropdownMenu.contains(e.target) && e.target !== mobileDropdownToggle) {
                closeMobileDropdown();
            }
        }
    });
    // Optional: close on resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) closeMobileDropdown();
    });
});

// Add CSS for confetti animation
const confettiStyles = `
    .confetti {
        position: fixed;
        width: 10px;
        height: 10px;
        pointer-events: none;
        animation: confetti-fall 3s linear forwards;
        z-index: 10000;
    }

    @keyframes confetti-fall {
        0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
        }
        100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
        }
    }

    .product-modal-content {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
    }

    .product-modal-image img {
        width: 100%;
        height: 400px;
        object-fit: cover;
        border-radius: var(--border-radius);
    }

    .product-modal-details h2 {
        font-family: var(--font-heading);
        font-size: 2rem;
        margin-bottom: 1rem;
        color: var(--text-dark);
    }

    .product-modal-price {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--primary-gold);
        margin-bottom: 1rem;
    }

    .product-modal-description {
        color: var(--text-light);
        line-height: 1.6;
        margin-bottom: 2rem;
    }

    .product-modal-actions {
        display: flex;
        gap: 1rem;
    }

    @media (max-width: 768px) {
        .product-modal-content {
            grid-template-columns: 1fr;
        }
        
        .product-modal-actions {
            flex-direction: column;
        }
    }
`;

// Inject confetti styles
const styleSheet = document.createElement('style');
styleSheet.textContent = confettiStyles;
document.head.appendChild(styleSheet); 