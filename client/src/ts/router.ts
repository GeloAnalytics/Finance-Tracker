// FinanceWise — SPA Router

type RenderFunction = () => void;

const routes: Record<string, RenderFunction> = {};
let currentPage = '';

export function registerRoute(name: string, render: RenderFunction) {
  routes[name] = render;
}

export function navigateTo(page: string) {
  window.location.hash = page;
}

export function getCurrentPage(): string {
  return currentPage;
}

export function initRouter() {
  const handleRoute = () => {
    const hash = window.location.hash.slice(1) || 'dashboard';
    const page = hash.split('?')[0];

    if (routes[page]) {
      currentPage = page;

      // Update active nav link
      document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.getAttribute('data-page') === page);
      });

      // Render page with animation
      const container = document.getElementById('page-container');
      if (container) {
        container.style.opacity = '0';
        container.style.transform = 'translateY(10px)';
        setTimeout(() => {
          routes[page]();
          container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          container.style.opacity = '1';
          container.style.transform = 'translateY(0)';
        }, 150);
      }

      // Close mobile sidebar
      document.getElementById('sidebar')?.classList.remove('open');
    }
  };

  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
