import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { adminService } from "@/services";
import { providerProfileRepository } from "@/repositories";
import type { IUser, IProviderProfile } from "@/types";
import { gravatarUrlForEmail } from "@/lib/gravatar";
import UserDetailView from "./UserDetailView";

export const metadata: Metadata = { title: "User Details" };

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [currentUser, { id }] = await Promise.all([getCurrentUser(), params]);
  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "staff")) {
    return notFound();
  }

  let rawUser: unknown;
  try {
    rawUser = await adminService.getUser(id);
  } catch {
    return notFound();
  }

  // JSON round-trip strips all Mongoose ObjectId / Buffer / prototype cruft,
  // producing a plain object that Next.js can safely serialise across the
  // Server → Client Component boundary.
  const user = JSON.parse(JSON.stringify(rawUser)) as IUser;

  let providerProfile: IProviderProfile | null = null;
  if (user.role === "provider") {
    const raw = await providerProfileRepository.findByUserId(String(user._id));
    if (raw) {
      providerProfile = JSON.parse(JSON.stringify(raw)) as IProviderProfile;
    }
  }

  return (
    <UserDetailView
      user={user}
      gravatarUrl={gravatarUrlForEmail(user.email, 128)}
      providerProfile={providerProfile}
      currentUserRole={currentUser.role}
    />
  );
}
