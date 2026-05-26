const heliusEndpoint = "https://mainnet.helius-rpc.com/";
const bobrosCollectionId = process.env.BOBROS_COLLECTION_ID ?? "AWELeP8RBpDX4rMmUmpGtJu8oM6Fd712nq8ZkavD3r6g";
const bobrosCreatorId = process.env.BOBROS_CREATOR_ID ?? "47RTs3TqVdxQV7x8wdN9k2EAB851mahQVgp7ZEetDBj8";
const base58Alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const pageLimit = 1000;
const maxPages = 20;

export type BobrosHolderResult = {
  isHolder: boolean;
  bobrosCount: number;
  wallet: string;
};

type HeliusGrouping = {
  group_key?: string;
  group_value?: string;
  verified?: boolean;
};

type HeliusCreator = {
  address?: string;
  verified?: boolean;
};

type HeliusAsset = {
  id?: string;
  interface?: string;
  burnt?: boolean;
  grouping?: HeliusGrouping[];
  creators?: HeliusCreator[];
  authorities?: HeliusCreator[];
  compression?: unknown;
  ownership?: {
    owner?: string;
  };
  content?: {
    metadata?: {
      name?: string;
      token_standard?: string;
      creators?: HeliusCreator[];
    };
  };
};

type HeliusResponse = {
  result?: {
    total?: number;
    items?: HeliusAsset[];
  };
  error?: {
    message?: string;
  };
};

function decodeBase58(value: string) {
  if (!value) return null;

  const bytes = [0];

  for (let charIndex = 0; charIndex < value.length; charIndex += 1) {
    const carryStart = base58Alphabet.indexOf(value[charIndex] ?? "");
    if (carryStart < 0) return null;

    let carry = carryStart;

    for (let byteIndex = 0; byteIndex < bytes.length; byteIndex += 1) {
      const next = bytes[byteIndex] * 58 + carry;
      bytes[byteIndex] = next & 0xff;
      carry = next >> 8;
    }

    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  for (let index = 0; index < value.length - 1 && value[index] === "1"; index += 1) {
    bytes.push(0);
  }

  return bytes.reverse();
}

export function isValidSolanaAddress(value: string) {
  if (value.length < 32 || value.length > 44) return false;

  const decoded = decodeBase58(value);
  return decoded?.length === 32;
}

function isNftLike(asset: HeliusAsset) {
  const assetInterface = asset.interface?.toLowerCase() ?? "";
  const tokenStandard = asset.content?.metadata?.token_standard?.toLowerCase() ?? "";

  return (
    !assetInterface ||
    assetInterface.includes("nft") ||
    assetInterface === "mplcoreasset" ||
    assetInterface === "mpl_core_asset" ||
    tokenStandard.includes("nonfungible")
  );
}

function hasBobrosCollection(asset: HeliusAsset) {
  const collectionGroups = asset.grouping?.filter((group) => group.group_key === "collection") ?? [];

  if (collectionGroups.length === 0) return undefined;
  return collectionGroups.some((group) => group.group_value === bobrosCollectionId);
}

function hasBobrosCreator(asset: HeliusAsset) {
  const creators = [...(asset.creators ?? []), ...(asset.content?.metadata?.creators ?? [])];

  return creators.some((creator) => creator.address === bobrosCreatorId && creator.verified === true);
}

function hasBobrosAuthority(asset: HeliusAsset) {
  return (asset.authorities ?? []).some((authority) => authority.address === bobrosCreatorId);
}

function isBobrosAsset(asset: HeliusAsset, wallet: string) {
  if (asset.burnt) return false;
  if (asset.ownership?.owner && asset.ownership.owner !== wallet) return false;
  if (!isNftLike(asset)) return false;

  const collectionMatch = hasBobrosCollection(asset);

  if (collectionMatch !== undefined) return collectionMatch;

  return hasBobrosCreator(asset) || hasBobrosAuthority(asset);
}

async function getAssetsByOwner(wallet: string, page: number, apiKey: string) {
  const response = await fetch(`${heliusEndpoint}?api-key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `bobros-holder-${page}`,
      method: "getAssetsByOwner",
      params: {
        ownerAddress: wallet,
        page,
        limit: pageLimit,
        displayOptions: {
          showCollectionMetadata: true,
          showUnverifiedCollections: true,
          showFungible: false,
          showNativeBalance: false,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Helius request failed with ${response.status}`);
  }

  const data = (await response.json()) as HeliusResponse;

  if (data.error) {
    throw new Error(data.error.message ?? "Helius holder check failed");
  }

  return {
    total: data.result?.total ?? 0,
    items: data.result?.items ?? [],
  };
}

async function countBobrosAssets(wallet: string, apiKey: string) {
  const matchedAssetIds = new Set<string>();

  for (let page = 1; page <= maxPages; page += 1) {
    const { total, items } = await getAssetsByOwner(wallet, page, apiKey);

    if (page === 1) {
      logHolderDebug(wallet, items);
    }

    items.forEach((asset, index) => {
      if (!isBobrosAsset(asset, wallet)) return;

      matchedAssetIds.add(asset.id ?? `page-${page}-asset-${index}`);
    });

    if (items.length < pageLimit) break;
    if (page * pageLimit >= total) break;
  }

  return matchedAssetIds.size;
}

function logHolderDebug(wallet: string, items: HeliusAsset[]) {
  if (process.env.BOBROS_HOLDER_DEBUG !== "true") return;

  console.info(
    "Bobros holder debug",
    JSON.stringify({
      wallet,
      samples: items.slice(0, 10).map((asset) => ({
        id: asset.id,
        name: asset.content?.metadata?.name,
        grouping: asset.grouping,
        creators: asset.creators,
        metadataCreators: asset.content?.metadata?.creators,
        authorities: asset.authorities,
        compression: asset.compression,
        ownership: asset.ownership,
        interface: asset.interface,
        burnt: asset.burnt,
      })),
    }),
  );
}

export async function checkBobrosHolder(wallet: string): Promise<BobrosHolderResult> {
  if (!isValidSolanaAddress(wallet)) {
    return { isHolder: false, bobrosCount: 0, wallet };
  }

  const heliusApiKey = process.env.HELIUS_API_KEY;

  if (!heliusApiKey) {
    throw new Error("Helius API key is not configured");
  }

  const bobrosCount = await countBobrosAssets(wallet, heliusApiKey);

  return {
    isHolder: bobrosCount > 0,
    bobrosCount,
    wallet,
  };
}
