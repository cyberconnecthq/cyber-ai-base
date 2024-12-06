import type { Hex } from "viem";
import { z } from "zod";

export type Profile = {
    fid: number;
    signer: Hex;
    name: string;
    username: string;
    pfp?: string;
    bio?: string;
    url?: string;
    // location?: string;
    // twitter?: string;
    // github?: string;
};

export const NftCreationParamsSchema = z.object({
    name: z.string({
        description: "The name of the NFT",
    }),
    description: z.string({
        description: "The description of the NFT",
    }),
    creatorAddress: z.string({
        description: "The address of the creator of the NFT",
    }),
});

export interface NftCreationParams {
    name: string;
    description: string;
    creatorAddress: string;
}

export const isNftCreationParams = (
    object: any
): object is NftCreationParams => {
    if (NftCreationParamsSchema.safeParse(object).success) {
        if (
            object.creatorAddress.length !== 42 ||
            !object.creatorAddress.startsWith("0x")
        ) {
            return false;
        }
        return true;
    }
    console.error("Invalid content: ", object);
    return false;
};
