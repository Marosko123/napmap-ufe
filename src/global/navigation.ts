export function registerNavigationApi() {
  if (typeof window !== 'undefined' && !window.navigation) {
    const listeners: ((ev: Event) => void)[] = [];
    const navigation = {
      addEventListener: (type: string, listener: (ev: Event) => void) => {
        if (type === 'navigate') {
          listeners.push(listener);
        }
      },
      navigate: (url: string) => {
        const destination = { url };
        const event = {
          destination,
          canIntercept: true,
          intercept: () => {
            window.history.pushState({}, '', url);
          },
        };
        listeners.forEach(listener => listener(event as any));
      },
    };
    (window as any).navigation = navigation;

    window.addEventListener('popstate', () => {
      const event = {
        destination: { url: window.location.href },
        canIntercept: true,
        intercept: () => {},
      };
      listeners.forEach(listener => listener(event as any));
    });
  }
}
