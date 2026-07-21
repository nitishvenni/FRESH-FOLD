export const MAIN_TAB_ROOT_PATHS = ["/home", "/order-history", "/ai-care", "/support", "/profile"] as const;

/** Only non-Home tab roots consume Android Back. Nested routes remain native. */
export const shouldReturnMainTabBackToHome = (pathname: string): boolean =>
  pathname !== "/home" && (MAIN_TAB_ROOT_PATHS as readonly string[]).includes(pathname);
