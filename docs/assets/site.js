/* Minhas Finanças — dark mode (class) + ano dinâmico. Sem dependências. */
(function () {
  var root = document.documentElement;
  var STORAGE_KEY = "mf-site-theme";

  function currentTheme() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "dark" || saved === "light") return saved;
    } catch (e) {}
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  }

  function apply(theme) {
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    document.querySelectorAll("[data-theme-icon]").forEach(function (el) {
      var isDark = theme === "dark";
      var sun = el.querySelector('[data-icon="sun"]');
      var moon = el.querySelector('[data-icon="moon"]');
      // sol aparece no modo escuro (ação: ir para claro), lua no modo claro
      if (sun) sun.classList.toggle("hidden", !isDark);
      if (moon) moon.classList.toggle("hidden", isDark);
    });
  }

  function initCounters() {
    var counters = document.querySelectorAll("[data-count]");
    if (!("IntersectionObserver" in window) || counters.length === 0) {
      counters.forEach(function (el) {
        el.textContent = el.getAttribute("data-count");
      });
      return;
    }
    var animated = new WeakSet();
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting || animated.has(entry.target)) return;
          animated.add(entry.target);
          animateCount(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.4 }
    );
    counters.forEach(function (el) {
      observer.observe(el);
    });
  }

  function animateCount(el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    if (isNaN(target)) return;
    var suffix = el.getAttribute("data-suffix") || "";
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = String(target) + suffix;
      return;
    }
    var duration = 1200;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(target * eased)) + suffix;
      if (p < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window) || items.length === 0) {
      items.forEach(function (el) {
        el.classList.add("visible");
      });
      return;
    }
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    items.forEach(function (el) {
      observer.observe(el);
    });
  }

  function init() {
    initReveal();
    initCounters();
    apply(currentTheme());
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var next = root.classList.contains("dark") ? "light" : "dark";
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch (e) {}
        apply(next);
      });
    });
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
