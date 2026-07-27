import { useEffect, useState, useCallback } from 'react';

export type Route =
  | { name: 'dashboard' }
  | { name: 'upload' }
  | { name: 'draw' }
  | { name: 'project'; id: string };

function parse(pathname: string): Route {
  const projectMatch = pathname.match(/^\/project\/([^/]+)$/);
  if (projectMatch) return { name: 'project', id: projectMatch[1] };
  if (pathname === '/upload') return { name: 'upload' };
  if (pathname === '/draw') return { name: 'draw' };
  return { name: 'dashboard' };
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(() => parse(window.location.pathname));

  useEffect(() => {
    const onPop = () => setRoute(parse(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setRoute(parse(path));
  }, []);

  return { route, navigate };
}
