/* =============================================
   VELORIAN — MAIN JAVASCRIPT
   ============================================= */

(function () {
  "use strict";

  /* ---------- NAVBAR SCROLL EFFECT ---------- */
  const navbar = document.getElementById("navbar");

  window.addEventListener("scroll", () => {
    if (window.scrollY > 40) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  });

  /* ---------- HAMBURGER / MOBILE MENU ---------- */
  const hamburger = document.getElementById("hamburger");
  const mobileMenu = document.getElementById("mobileMenu");
  let menuOpen = false;

  hamburger.addEventListener("click", toggleMenu);

  mobileMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("click", (e) => {
    if (menuOpen && !mobileMenu.contains(e.target) && !hamburger.contains(e.target)) {
      closeMenu();
    }
  });

  function toggleMenu() {
    menuOpen ? closeMenu() : openMenu();
  }

  function openMenu() {
    menuOpen = true;
    hamburger.classList.add("open");
    mobileMenu.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeMenu() {
    menuOpen = false;
    hamburger.classList.remove("open");
    mobileMenu.classList.remove("open");
    document.body.style.overflow = "";
  }

  /* ---------- HERO SLIDER ---------- */
  const slides = document.querySelectorAll(".hero-slide");
  const dots   = document.querySelectorAll(".dot");
  let current  = 0;
  let autoplay;

  function showSlide(index) {
    slides.forEach((s, i) => {
      s.classList.toggle("active", i === index);
    });
    dots.forEach((d, i) => {
      d.classList.toggle("active", i === index);
    });
    current = index;
  }

  document.getElementById("heroNext").addEventListener("click", () => {
    const next = (current + 1) % slides.length;
    showSlide(next);
    resetAutoplay();
  });

  document.getElementById("heroPrev").addEventListener("click", () => {
    const prev = (current - 1 + slides.length) % slides.length;
    showSlide(prev);
    resetAutoplay();
  });

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      showSlide(parseInt(dot.dataset.index));
      resetAutoplay();
    });
  });

  function startAutoplay() {
    autoplay = setInterval(() => {
      showSlide((current + 1) % slides.length);
    }, 5000);
  }

  function resetAutoplay() {
    clearInterval(autoplay);
    startAutoplay();
  }

  startAutoplay();

  /* ---------- TOUCH SWIPE SUPPORT ---------- */
  const heroSection = document.querySelector(".hero");
  let touchStartX = 0;

  heroSection.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].clientX;
  }, { passive: true });

  heroSection.addEventListener("touchend", (e) => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        showSlide((current + 1) % slides.length);
      } else {
        showSlide((current - 1 + slides.length) % slides.length);
      }
      resetAutoplay();
    }
  }, { passive: true });

  /* ---------- ADD TO CART ---------- */
  const cartToast  = document.getElementById("cartToast");
  let toastTimeout;

  document.querySelectorAll(".add-cart-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();

      // Animate button
      btn.textContent = "✓ Added!";
      btn.style.background = "#16a34a";
      setTimeout(() => {
        btn.textContent = "Add to Cart";
        btn.style.background = "";
      }, 1800);

      // Show toast
      clearTimeout(toastTimeout);
      cartToast.classList.add("show");
      toastTimeout = setTimeout(() => {
        cartToast.classList.remove("show");
      }, 2500);
    });
  });

  /* ---------- ACTIVE NAV LINK ON SCROLL ---------- */
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".nav-links a");

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          navLinks.forEach((link) => {
            link.classList.remove("active");
            if (link.getAttribute("href") === `#${entry.target.id}`) {
              link.classList.add("active");
            }
          });
        }
      });
    },
    { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
  );

  sections.forEach((s) => sectionObserver.observe(s));

  /* ---------- SCROLL REVEAL (cards fade in) ---------- */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity  = "1";
          entry.target.style.transform = "translateY(0)";
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  document.querySelectorAll(".product-card").forEach((card, i) => {
    card.style.opacity   = "0";
    card.style.transform = "translateY(30px)";
    card.style.transition = `opacity 0.5s ease ${i * 0.08}s, transform 0.5s ease ${i * 0.08}s, box-shadow 0.3s ease, border-color 0.3s ease`;
    revealObserver.observe(card);
  });

  /* ---------- SUBSCRIBE FORM ---------- */
  document.querySelectorAll(".subscribe-form").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = form.querySelector("input[type='email']");
      if (input.value.trim()) {
        input.value = "";
        input.placeholder = "Thanks for subscribing! ✓";
        input.style.color = "#4ade80";
        setTimeout(() => {
          input.placeholder = "Enter your email";
          input.style.color = "";
        }, 3000);
      }
    });
  });

  /* ---------- SMOOTH SCROLL FOR ANCHOR LINKS ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const href = anchor.getAttribute("href");
      if (href === "#") return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const offset = 70; // navbar height
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: "smooth" });
      }
    });
  });

})();