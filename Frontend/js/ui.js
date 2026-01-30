/**
 * UI Helpers for DineLink Resto
 * Handles mobile menu toggle, page entrance animations, and general interactivity
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initEntranceAnimations();
  initButtonInteractions();
});

/**
 * Mobile Hamburger Menu Logic
 */
function initMobileMenu() {
  const toggle = document.getElementById('menuToggle');
  const nav = document.querySelector('.nav');
  
  if (!toggle || !nav) return;

  // Toggle open/close
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    nav.classList.toggle('open');
    const isOpen = nav.classList.contains('open');
    toggle.textContent = isOpen ? '✕' : '☰'; // Change icon
    toggle.setAttribute('aria-expanded', isOpen);
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (nav.classList.contains('open') && !nav.contains(e.target) && e.target !== toggle) {
      nav.classList.remove('open');
      toggle.textContent = '☰';
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  // Close when clicking a link
  nav.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.textContent = '☰';
    });
  });
}

/**
 * Entrance Animations for food cards
 */
function initEntranceAnimations() {
  const cards = document.querySelectorAll('.foodItem, .cartItem, .orderItem');
  cards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'all 0.5s ease-out';
    
    setTimeout(() => {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 100 * index);
  });
}

/**
 * Subtle pulse effect on button clicks
 */
function initButtonInteractions() {
  const buttons = document.querySelectorAll('button, .addButton, .orderButton, .qtyBtn');
  buttons.forEach(btn => {
    btn.addEventListener('mousedown', () => {
      btn.style.transform = 'scale(0.95)';
    });
    btn.addEventListener('mouseup', () => {
      btn.style.transform = 'scale(1)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
    });
  });
}

/**
 * Global helpers for popups (exported to window)
 */
window.openErrorPopUp1 = () => {
  const p = document.getElementById('errorPopup1');
  if (p) p.style.display = 'block';
};

window.closeErrorPopUp1 = () => {
  const p = document.getElementById('errorPopup1');
  if (p) p.style.display = 'none';
};

window.openErrorPopUp2 = () => {
  const p = document.getElementById('errorPopup2');
  if (p) p.style.display = 'block';
};

window.closeErrorPopUp2 = () => {
  const p = document.getElementById('errorPopup2');
  if (p) p.style.display = 'none';
};