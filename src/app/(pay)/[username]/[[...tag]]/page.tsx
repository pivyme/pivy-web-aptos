import UsernamePayIndex from "@/components/pages/(app)/username-pay/UsernamePayIndex";
import { addressService } from "@/lib/api/address";
import { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ username: string; tag: string[] }>;
};

export const generateMetadata = async ({
  params,
}: Props): Promise<Metadata> => {
  const { username, tag: _tag } = await params;
  const tag = _tag && _tag.length > 0 ? _tag[0] : undefined;

  const response = await addressService.getAddressByUserTag(username, tag);

  if (response.error || !response.data) {
    return {
      title: "Page Not Found - PIVY",
    };
  }

  const { userData, linkData } = response.data;

  const pageTitle = linkData
    ? `"${linkData.label}" by @${userData.username}`
    : `Pay @${userData.username} with crypto`;
  const title = `${pageTitle} | PIVY`;

  const description = linkData
    ? linkData.description ||
      `Make a payment for "${linkData.label}" to @${userData.username} through a PIVY link.`
    : `Send cryptocurrency to @${userData.username} quickly and securely with PIVY.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/${username}${tag ? `/${tag}` : ""}`,
      siteName: "PIVY",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: `@${userData.username}`,
    },
  };
};

export default async function UsernamePay({ params }: Props) {
  const { username, tag: _tag } = await params;

  const tag = _tag && _tag.length > 0 ? _tag[0] : "";
  const response = await addressService.getAddressByUserTag(username, tag);

  if (response.error || !response.data) {
    return notFound();
  }

  return (
    <UsernamePayIndex
      username={username}
      tag={tag}
      initialData={response.data}
    />
  );
}
