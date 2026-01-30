// ===========================
// SMOOTH SCROLLING
// ===========================

document.addEventListener('DOMContentLoaded', function() {
    // Smooth scroll for navigation links
    const navLinks = document.querySelectorAll('.nav-menu a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});

// ===========================
// ACTIVE NAVIGATION HIGHLIGHT
// ===========================

window.addEventListener('scroll', function() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-menu a');
    
    let currentSection = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        
        if (window.pageYOffset >= sectionTop - 100) {
            currentSection = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + currentSection) {
            link.classList.add('active');
        }
    });
});

// ===========================
// SCROLL TO TOP FUNCTIONALITY
// ===========================

// Create scroll-to-top button
const scrollButton = document.createElement('button');
scrollButton.innerHTML = '↑';
scrollButton.setAttribute('id', 'scrollToTop');
scrollButton.setAttribute('aria-label', 'Scroll to top');
scrollButton.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background-color: #3498db;
    color: white;
    border: none;
    font-size: 24px;
    cursor: pointer;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    z-index: 999;
`;

document.body.appendChild(scrollButton);

// Show/hide scroll button based on scroll position
window.addEventListener('scroll', function() {
    if (window.pageYOffset > 300) {
        scrollButton.style.opacity = '1';
        scrollButton.style.visibility = 'visible';
    } else {
        scrollButton.style.opacity = '0';
        scrollButton.style.visibility = 'hidden';
    }
});

// Scroll to top when button is clicked
scrollButton.addEventListener('click', function() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Hover effect for scroll button
scrollButton.addEventListener('mouseenter', function() {
    this.style.backgroundColor = '#2980b9';
    this.style.transform = 'scale(1.1)';
});

scrollButton.addEventListener('mouseleave', function() {
    this.style.backgroundColor = '#3498db';
    this.style.transform = 'scale(1)';
});

// ===========================
// ANIMATE ON SCROLL
// ===========================

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Apply animation to content blocks
document.addEventListener('DOMContentLoaded', function() {
    const animatedElements = document.querySelectorAll(
        '.content-block, .objective-card, .info-card, .workflow-step, .model-card, .achievement-card, .tool-category'
    );
    
    animatedElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(element);
    });
});

// ===========================
// TABLE RESPONSIVENESS
// ===========================

document.addEventListener('DOMContentLoaded', function() {
    const tables = document.querySelectorAll('table');
    
    tables.forEach(table => {
        // Add responsive wrapper if not already present
        if (!table.parentElement.classList.contains('table-responsive')) {
            const wrapper = document.createElement('div');
            wrapper.classList.add('table-responsive');
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        }
    });
});

// ===========================
// MOBILE MENU TOGGLE
// ===========================

document.addEventListener('DOMContentLoaded', function() {
    // Create mobile menu toggle button
    const navbar = document.querySelector('.navbar .container');
    const navMenu = document.querySelector('.nav-menu');
    
    // Only add toggle for mobile screens
    if (window.innerWidth <= 768) {
        const toggleButton = document.createElement('button');
        toggleButton.innerHTML = '☰';
        toggleButton.classList.add('mobile-menu-toggle');
        toggleButton.style.cssText = `
            display: none;
            background: none;
            border: none;
            color: white;
            font-size: 1.8rem;
            cursor: pointer;
            padding: 0.5rem;
        `;
        
        navbar.insertBefore(toggleButton, navMenu);
        
        toggleButton.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            this.innerHTML = navMenu.classList.contains('active') ? '✕' : '☰';
        });
        
        // Show toggle on mobile
        if (window.innerWidth <= 768) {
            toggleButton.style.display = 'block';
            navMenu.style.display = 'none';
        }
        
        // Close menu when clicking a link
        const navLinks = navMenu.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navMenu.classList.remove('active');
                toggleButton.innerHTML = '☰';
            });
        });
    }
});

// Handle window resize
window.addEventListener('resize', function() {
    const navMenu = document.querySelector('.nav-menu');
    const toggleButton = document.querySelector('.mobile-menu-toggle');
    
    if (window.innerWidth > 768) {
        navMenu.style.display = 'flex';
        if (toggleButton) toggleButton.style.display = 'none';
    } else {
        if (toggleButton) toggleButton.style.display = 'block';
        if (!navMenu.classList.contains('active')) {
            navMenu.style.display = 'none';
        }
    }
});

// ===========================
// COPY TO CLIPBOARD (Optional)
// ===========================

// Add copy functionality for code blocks if needed in future
function copyToClipboard(text) {
    const tempInput = document.createElement('textarea');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
}

// ===========================
// LOADING ANIMATION
// ===========================

window.addEventListener('load', function() {
    // Fade in hero section
    const hero = document.querySelector('.hero');
    if (hero) {
        hero.style.opacity = '0';
        hero.style.transition = 'opacity 0.8s ease';
        setTimeout(() => {
            hero.style.opacity = '1';
        }, 100);
    }
});

// ===========================
// PERFORMANCE OPTIMIZATION
// ===========================

// Debounce scroll events for better performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Apply debounce to scroll events
const debouncedScroll = debounce(function() {
    // Any scroll-based functions can be optimized here
}, 100);

window.addEventListener('scroll', debouncedScroll);

// ===========================
// PRINT FUNCTIONALITY
// ===========================

// Add print button functionality if needed
function printPage() {
    window.print();
}

// ===========================
// ACCESSIBILITY ENHANCEMENTS
// ===========================

// Add keyboard navigation support
document.addEventListener('keydown', function(e) {
    // Press 'Esc' to close mobile menu if open
    if (e.key === 'Escape') {
        const navMenu = document.querySelector('.nav-menu');
        const toggleButton = document.querySelector('.mobile-menu-toggle');
        
        if (navMenu && navMenu.classList.contains('active')) {
            navMenu.classList.remove('active');
            if (toggleButton) toggleButton.innerHTML = '☰';
        }
    }
    
    // Press 'Home' to scroll to top
    if (e.key === 'Home' && e.ctrlKey) {
        e.preventDefault();
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
});

// ===========================
// CONSOLE MESSAGE
// ===========================

console.log('%cThesis Webpage Loaded Successfully', 'color: #3498db; font-size: 16px; font-weight: bold;');
console.log('%cMachine Learning Approach to Earthquake Declustering', 'color: #2c3e50; font-size: 12px;');
console.log('%cby Md Ashraf | IIT (ISM) Dhanbad', 'color: #2c3e50; font-size: 12px;');
