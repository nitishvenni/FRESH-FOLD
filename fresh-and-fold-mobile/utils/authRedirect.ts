export const getAuthRedirectTarget = (
  pathname: string,
  isLoggedIn: boolean
): "/home" | "/login" | null => {
  // The index route owns its initial redirect once the root Stack is mounted.
  if (pathname === "/") return null;
  if (isLoggedIn && (pathname === "/login" || pathname === "/otp")) return "/home";
  if (!isLoggedIn && pathname !== "/login" && pathname !== "/otp") return "/login";
  return null;
};
