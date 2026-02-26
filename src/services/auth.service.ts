import { userRepository } from "@/repositories";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@/lib/auth";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
} from "@/lib/errors";
import type { UserRole } from "@/types";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends AuthTokens {
  user: {
    _id: string;
    name: string;
    email: string;
    role: UserRole;
    isVerified: boolean;
  };
}

export class AuthService {
  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) throw new ConflictError("An account with this email already exists");

    const user = await userRepository.create(input);

    const accessToken = signAccessToken(user._id.toString(), user.role as UserRole);
    const refreshToken = signRefreshToken(user._id.toString());

    return {
      user: {
        _id: user._id.toString(),
        name: user.name as string,
        email: user.email as string,
        role: user.role as UserRole,
        isVerified: (user.isVerified as boolean) ?? false,
      },
      accessToken,
      refreshToken,
    };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await userRepository.findByEmailWithPassword(input.email);
    if (!user) throw new UnauthorizedError("Invalid email or password");
    if ((user as { isSuspended?: boolean }).isSuspended) {
      throw new ForbiddenError("Your account has been suspended. Please contact support.");
    }

    const isValid = await (user as { comparePassword: (p: string) => Promise<boolean> }).comparePassword(input.password);
    if (!isValid) throw new UnauthorizedError("Invalid email or password");

    const accessToken = signAccessToken(user._id.toString(), user.role as UserRole);
    const refreshToken = signRefreshToken(user._id.toString());

    return {
      user: {
        _id: user._id.toString(),
        name: user.name as string,
        email: user.email as string,
        role: user.role as UserRole,
        isVerified: (user.isVerified as boolean) ?? false,
      },
      accessToken,
      refreshToken,
    };
  }

  async refresh(token: string): Promise<AuthTokens> {
    let payload: { userId: string };
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    const user = await userRepository.findById(payload.userId);
    if (!user) throw new NotFoundError("User");
    if ((user as { isSuspended?: boolean }).isSuspended) {
      throw new ForbiddenError("Account suspended");
    }

    const accessToken = signAccessToken(user._id!.toString(), (user as { role: UserRole }).role);
    const refreshToken = signRefreshToken(user._id!.toString());
    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
