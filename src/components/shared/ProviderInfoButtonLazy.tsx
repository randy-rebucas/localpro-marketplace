"use client";

import dynamic from "next/dynamic";

// Dynamic import must live in a Client Component when ssr:false is used
const ProviderInfoButton = dynamic(
  () => import("@/components/shared/ProviderInfoButton"),
  { ssr: false }
);

export default function ProviderInfoButtonLazy(
  props: React.ComponentProps<typeof ProviderInfoButton>
) {
  return <ProviderInfoButton {...props} />;
}
