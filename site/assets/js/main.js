(() => {
  "use strict";

  function setActiveNavLink() {
    // Get current page file name (ex: "services.html")
    const currentPage = window.location.pathname.split("/").pop() || "index.html";

    // Grab all nav links inside your header nav
    const navLinks = document.querySelectorAll(".nav a");

    navLinks.forEach((link) => {
      const href = link.getAttribute("href");

      // Only compare normal page links (skip external links, mailto, #anchors)
      if (!href || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("#")) {
        return;
      }

      const linkPage = href.split("/").pop();

      if (linkPage === currentPage) {
        link.classList.add("is-active");
      } else {
        link.classList.remove("is-active");
      }
    });
  }


function setupMobileNav() {
    const toggle = document.querySelector(".nav-toggle");
    const nav = document.querySelector(".nav");

    if (!toggle || !nav) return;

    toggle.addEventListener("click", () => {
        const isOpen = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(isOpen));
        toggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    });

    nav.querySelector("a").forEach((link) => {
        link.addEventListener("click", () => {
            nav.classList.remove("is-open");
            toggle.setAttribute("aria-expanded", "false");
            toggle.setAttribute("aria-label", "Open menu");
        });
    });
}

  document.addEventListener("DOMContentLoaded", () => {

        setActiveNavLink();
        setupMobileNav();
  })

})();

