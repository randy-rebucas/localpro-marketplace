import crypto from "crypto";
import bcrypt from "bcryptjs";
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
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "@/lib/email";
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
    approvalStatus: string;
  };
}

export class AuthService {
  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) throw new ConflictError("An account with this email already exists");

    // Providers start in pending_approval state; clients and admins are auto-approved
    const approvalStatus = input.role === "provider" ? "pending_approval" : "approved";

    const user = await userRepository.create({ ...input, approvalStatus });
    const userId = user._id.toString();

    // Send verification email (fire-and-forget; skipped if SMTP not configured)
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await userRepository.setVerificationToken(userId, verificationToken, expiry);
    sendVerificationEmail(user.email as string, user.name as string, verificationToken).catch(
      (err) => console.error("[EMAIL] verification send failed:", err)
    );

    const accessToken = signAccessToken(userId, user.role as UserRole);
    const refreshToken = signRefreshToken(userId);

    return {
      user: {
        _id: userId,
        name: user.name as string,
        email: user.email as string,
        role: user.role as UserRole,
        isVerified: (user.isVerified as boolean) ?? false,
        approvalStatus,
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
        approvalStatus: (user as { approvalStatus?: string }).approvalStatus ?? "approved",
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

  // ─── Email Verification ────────────────────────────────────────────────────

  async verifyEmail(token: string): Promise<void> {
    const user = await userRepository.findByVerificationToken(token);
    if (!user) throw new ValidationError("Invalid or expired verification token");

    const u = user as unknown as {
      _id: { toString(): string };
      isVerified: boolean;
      verificationTokenExpiry?: Date;
    };

    if (u.isVerified) return; // already verified — idempotent

    if (u.verificationTokenExpiry && u.verificationTokenExpiry < new Date()) {
      throw new ValidationError("Verification link has expired. Please request a new one.");
    }

    await userRepository.markVerified(u._id.toString());
  }

  async resendVerificationEmail(userId: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError("User");
    if ((user as { isVerified?: boolean }).isVerified) return;

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await userRepository.setVerificationToken(userId, token, expiry);
    await sendVerificationEmail(
      (user as { email: string }).email,
      (user as { name: string }).name,
      token
    );
  }

  // ─── Password Reset ────────────────────────────────────────────────────────

  async forgotPassword(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email);
    // Always return quietly — do not reveal whether the email exists
    if (!user) return;

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await userRepository.setResetPasswordToken(user._id!.toString(), token, expiry);
    await sendPasswordResetEmail(
      (user as { email: string }).email,
      (user as { name: string }).name,
      token
    );
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (newPassword.length < 8) {
      throw new ValidationError("Password must be at least 8 characters");
    }

    const user = await userRepository.findByResetToken(token);
    if (!user) throw new ValidationError("Invalid or expired reset token");

    const u = user as unknown as {
      _id: { toString(): string };
      resetPasswordTokenExpiry?: Date;
    };

    if (u.resetPasswordTokenExpiry && u.resetPasswordTokenExpiry < new Date()) {
      throw new ValidationError("Password reset link has expired. Please request a new one.");
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await userRepository.updatePassword(u._id.toString(), hashed);
  }
}

export const authService = new AuthService();
