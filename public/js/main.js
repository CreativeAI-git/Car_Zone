$(".chat-list a").click(function () {
  $(".chatbox").addClass("showbox");
  return false;
});

$(".chat-icon").click(function () {
  $(".chatbox").removeClass("showbox");
});

document.addEventListener("DOMContentLoaded", function () {
  const profileMenuBtn = document.getElementById("profileMenuBtn");
  const profileSidebar = document.getElementById("profileSidebar");
  const profileSidebarClose = document.getElementById("profileSidebarClose");
  const profileOverlay = document.getElementById("profileOverlay");
  const body = document.body;

  profileMenuBtn?.addEventListener("click", () => {
    profileSidebar.classList.add("active");
    profileOverlay.classList.add("active");
    body.classList.add("profile-no-scroll");
  });

  profileSidebarClose?.addEventListener("click", closeProfileSidebar);
  profileOverlay?.addEventListener("click", closeProfileSidebar);

  function closeProfileSidebar() {
    profileSidebar.classList.remove("active");
    profileOverlay.classList.remove("active");
    body.classList.remove("profile-no-scroll");
  }
});

const desktopMenu = document.getElementById("mainMenu");
const mobileMenuContainer = document.getElementById(
  "mobileMenuContainer",
);

if (desktopMenu && mobileMenuContainer) {
  const mobileMenu = desktopMenu.cloneNode(true);

  mobileMenu.querySelectorAll("a").forEach((link) => {
    link.classList.add("text-white");
  });

  mobileMenuContainer.appendChild(mobileMenu);
}

document.querySelectorAll('.filter-preview-box').forEach(btn => {
  const panel = document.getElementById(btn.dataset.target);

  btn.addEventListener('click', () => {

    const isOpen = !panel.classList.contains('d-none');

    // close all panels first
    document.querySelectorAll('[data-panel]').forEach(p => {
      p.classList.add('d-none');
    });

    // toggle current panel
    if (!isOpen) {
      panel.classList.remove('d-none');
    }
  });
});

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