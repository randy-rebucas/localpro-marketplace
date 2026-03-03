import { loyaltyService } from "@/services/loyalty.service";
import { loyaltyRepository } from "@/repositories/loyalty.repository";
import RewardsClient, { type RewardsData } from "./RewardsClient";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default async function RewardsContent({ userId }: { userId: string }) {
  const [account, ledger] = await Promise.all([
    loyaltyService.getAccount(userId),
    loyaltyRepository.getLedger(userId, 20),
  ]);

  const referredCount = await loyaltyRepository.countReferrals(
    account.userId.toString()
  );

  const data: RewardsData = JSON.parse(
    JSON.stringify({
      account,
      ledger,
      referralCode: account.referralCode,
      referralLink: `${BASE_URL}/register?ref=${account.referralCode}`,
      referredCount,
    })
  );

  return <RewardsClient data={data} />;
}
