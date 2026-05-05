if (typeof window !== 'undefined' && window.matchMedia) {
  const _orig = window.matchMedia.bind(window);
  window.matchMedia = (query: string): MediaQueryList => {
    const mql = _orig(query);
    if (!mql.addListener) {
      mql.addListener = (cb: any) => mql.addEventListener('change', cb);
      mql.removeListener = (cb: any) => mql.removeEventListener('change', cb);
    }
    return mql;
  };
}
