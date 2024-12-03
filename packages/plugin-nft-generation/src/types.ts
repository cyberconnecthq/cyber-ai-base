import { z } from "zod";

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
        return true;
    }
    console.error("Invalid content: ", object);
    return false;
};
