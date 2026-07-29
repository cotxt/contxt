const header = document.querySelector("[data-header]");
const menuButton = document.querySelector("[data-menu-button]");
const mobileMenu = document.querySelector("[data-mobile-menu]");
const revealItems = document.querySelectorAll("[data-reveal]");
const contactButton = document.querySelector("[data-contact-button]");
const toast = document.querySelector("[data-toast]");
const toastClose = document.querySelector("[data-toast-close]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const updateHeader = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 24);
};

const closeMenu = () => {
  header?.classList.remove("is-menu-open");
  document.body.classList.remove("menu-open");
  menuButton?.setAttribute("aria-expanded", "false");
  menuButton?.setAttribute("aria-label", "메뉴 열기");
  if (menuButton?.firstElementChild) {
    menuButton.firstElementChild.textContent = "MENU";
  }
};

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

menuButton?.addEventListener("click", () => {
  const open = !header?.classList.contains("is-menu-open");
  header?.classList.toggle("is-menu-open", open);
  document.body.classList.toggle("menu-open", open);
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
  if (menuButton.firstElementChild) {
    menuButton.firstElementChild.textContent = open ? "CLOSE" : "MENU";
  }
});

mobileMenu?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", closeMenu);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});

if (reduceMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver(
    (entries, instance) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        instance.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
  );

  revealItems.forEach((item) => observer.observe(item));
}

let toastTimer;

const hideToast = () => toast?.classList.remove("is-visible");

contactButton?.addEventListener("click", () => {
  if (!toast) return;
  window.clearTimeout(toastTimer);
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(hideToast, 4800);
});

toastClose?.addEventListener("click", hideToast);
