function initMainUi() {
  $(".chat-list a").off("click").on("click", function () {
    $(".chatbox").addClass("showbox");
    return false;
  });

  $(".chat-icon").off("click").on("click", function () {
    $(".chatbox").removeClass("showbox");
  });

  const profileMenuBtn = document.getElementById("profileMenuBtn");
  const profileSidebar = document.getElementById("profileSidebar");
  const profileSidebarClose = document.getElementById("profileSidebarClose");
  const profileOverlay = document.getElementById("profileOverlay");
  const body = document.body;

  function closeProfileSidebar() {
    profileSidebar?.classList.remove("active");
    profileOverlay?.classList.remove("active");
    body.classList.remove("profile-no-scroll");
  }

  profileMenuBtn?.addEventListener("click", () => {
    profileSidebar?.classList.add("active");
    profileOverlay?.classList.add("active");
    body.classList.add("profile-no-scroll");
  }, { once: true });

  profileSidebarClose?.addEventListener("click", closeProfileSidebar, { once: true });
  profileOverlay?.addEventListener("click", closeProfileSidebar, { once: true });

  const desktopMenu = document.getElementById("mainMenu");
  const mobileMenuContainer = document.getElementById("mobileMenuContainer");

  if (desktopMenu && mobileMenuContainer) {
    mobileMenuContainer.innerHTML = "";
    const mobileMenu = desktopMenu.cloneNode(true);

    mobileMenu.querySelectorAll("a").forEach((link) => {
      link.classList.add("text-white");
    });

    mobileMenuContainer.appendChild(mobileMenu);
  }

  document.querySelectorAll(".filter-preview-box").forEach((btn) => {
    const panel = document.getElementById(btn.dataset.target);
    if (!panel) {
      return;
    }

    btn.onclick = () => {
      const isOpen = !panel.classList.contains("d-none");

      document.querySelectorAll("[data-panel]").forEach((p) => {
        p.classList.add("d-none");
      });

      if (!isOpen) {
        panel.classList.remove("d-none");
      }
    };
  });
}

window.initMainUi = initMainUi;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMainUi, { once: true });
} else {
  initMainUi();
}

function toggleTheme() {
  const body = document.body;

  if (body.classList.contains("theme-dark")) {
    body.classList.remove("theme-dark");
    body.classList.add("theme-light");
    localStorage.setItem("theme", "theme-light");
  } else {
    body.classList.remove("theme-light");
    body.classList.add("theme-dark");
    localStorage.setItem("theme", "theme-dark");
  }
}

// Load saved theme on page load
(function () {
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme === "theme-dark") {
    document.body.classList.add("theme-dark");
  } else {
    document.body.classList.add("theme-light");
  }
})();
