import { apiAuthService } from "./api-auth-service";
import type { AuthService } from "./types";

export const authService: AuthService = apiAuthService;

export { getHomePath } from "./home-path";
export { isTwoFactorChallenge } from "./types";
export type { AuthService, Session } from "./types";
