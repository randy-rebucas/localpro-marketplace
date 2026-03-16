import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { userRepository } from "@/repositories";
import AdminSupportThread from "./_components/AdminSupportThread";

export default async function AdminSupportThreadPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const admin = await getCurrentUser();
  if (!admin || (admin.role !== "admin" && admin.role !== "staff")) {
    redirect("/login");
  }

  const targetUser = await userRepository.findById(userId);

  const serialized = targetUser?._id
    ? {
        _id: targetUser._id.toString(),
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
      }
    : null;

  return (
    <AdminSupportThread
      userId={userId}
      adminId={admin.userId}
      targetUser={serialized}
    />
  );
}

