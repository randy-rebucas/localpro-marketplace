import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { userRepository } from "@/repositories/user.repository";
import { jobRepository } from "@/repositories/job.repository";
import { Types } from "mongoose";
import ProfileClient from "./_components/ProfileClient";
import type { InitialClientUser } from "./_components/ProfileClient";
import type { UserDocument } from "@/models/User";
import type { IAddress } from "@/types";

export default async function ClientProfilePage() {
  const token = await getCurrentUser();
  if (!token) redirect("/login");

  const [rawUser, jobCount] = await Promise.all([
    userRepository.findById(token.userId),
    jobRepository.count({ clientId: new Types.ObjectId(token.userId) }),
  ]);

  if (!rawUser) redirect("/login");

  const u = rawUser as UserDocument;

  const initialUser: InitialClientUser = {
    name:       u.name,
    email:      u.email,
    role:       u.role,
    isVerified: u.isVerified,
    avatar:     u.avatar ?? null,
    phone:      u.phone ?? null,
    createdAt:  u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt),
    kycStatus:  u.kycStatus ?? null,
    addresses:  (u.addresses ?? []).map((a) => ({
      _id:         a._id.toString(),
      label:       a.label,
      address:     a.address,
      isDefault:   a.isDefault,
      coordinates: a.coordinates
        ? { lat: a.coordinates.lat, lng: a.coordinates.lng }
        : undefined,
    })) as IAddress[],
  };

  return <ProfileClient initialUser={initialUser} initialJobCount={jobCount} />;
}
