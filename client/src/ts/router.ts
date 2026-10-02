// FinanceWise — SPA Router

type RenderFunction = () => void | Promise<void>;

const routes: Record<string, RenderFunction> = {};
let currentPage = '';
let transitionTimer: ReturnType<typeof setTimeout> | undefined;
let transitionId = 0;

const getHashPage = () => window.location.hash.slice(1).split('?')[0] || 'dashboard';

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
    const page = getHashPage();

    if (routes[page]) {
      const thisTransition = ++transitionId;
      if (transitionTimer) clearTimeout(transitionTimer);

      // Dynamic overlays are mounted outside #page-container so fixed modals
      // stay viewport-bound. Close stale overlays when changing routes.
      document.getElementById('bills-modal-overlay')?.remove();
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
        // Do not let the fading-out page receive clicks while its handlers
        // still point at overlays that were just removed.
        container.style.pointerEvents = 'none';
        transitionTimer = setTimeout(async () => {
          // A newer navigation owns the container now. The old render must
          // not recreate a modal or overwrite the newer page.
          if (thisTransition !== transitionId || getHashPage() !== page) return;

          try {
            await routes[page]();
          } catch (error) {
            // A route must not leave the shell permanently hidden if its
            // render fails. Keep the error visible for debugging while the
            // transition cleanup below restores the container state.
            console.error(`Failed to render route: ${page}`, error);
          } finally {
            // Only the active transition may reveal the container. An older
            // async render must never overwrite a newer page's transition.
            if (thisTransition === transitionId && getHashPage() === page) {
              container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
              container.style.opacity = '1';
              container.style.transform = 'translateY(0)';
              container.style.pointerEvents = '';
            }
          }
        }, 150);
      }

      // Close mobile sidebar
      document.getElementById('sidebar')?.classList.remove('open');
    }
  };

  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
