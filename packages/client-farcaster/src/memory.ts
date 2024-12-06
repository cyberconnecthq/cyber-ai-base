import {
    elizaLogger,
    embeddingZeroVector,
    IAgentRuntime,
    stringToUuid,
    type Memory,
    type UUID,
} from "@ai16z/eliza";
import { toHex } from "viem";
import { castUuid, roomUuid } from "./utils";
import { FarcasterClient } from "./client";
import { CastWithInteractions } from "@neynar/nodejs-sdk/build/api/index.js";

export function createCastMemory({
    roomId,
    agentId,
    userId,
    cast,
}: {
    roomId: UUID;
    agentId: UUID;
    userId: UUID;
    cast: CastWithInteractions;
}): Memory {
    const inReplyTo = cast.parent_hash
        ? castUuid({
              hash: toHex(cast.parent_hash),
              agentId,
          })
        : undefined;

    return {
        id: castUuid({
            hash: cast.hash,
            agentId,
        }),
        agentId,
        userId,
        content: {
            text: cast.text,
            source: "farcaster",
            url: "",
            inReplyTo,
            hash: cast.hash,
        },
        roomId,
        embedding: embeddingZeroVector,
        createdAt: new Date(cast.timestamp).getTime(),
    };
}

export async function buildConversationThread({
    cast,
    runtime,
    client,
}: {
    cast: CastWithInteractions;
    runtime: IAgentRuntime;
    client: FarcasterClient;
}): Promise<CastWithInteractions[]> {
    const thread: CastWithInteractions[] = [];
    const visited: Set<string> = new Set();

    async function processThread(currentCast: CastWithInteractions) {
        if (visited.has(cast.hash)) {
            return;
        }

        visited.add(cast.hash);

        const roomId = roomUuid({
            threadHash: currentCast.thread_hash,
            agentId: runtime.agentId,
        });

        // Check if the current cast has already been saved
        const memory = await runtime.messageManager.getMemoryById(
            castUuid({
                hash: currentCast.hash,
                agentId: runtime.agentId,
            })
        );

        if (!memory) {
            elizaLogger.log("Creating memory for cast", cast.hash);

            const userId = stringToUuid(cast.author.username.toString());

            await runtime.ensureConnection(
                userId,
                roomId,
                currentCast.author.username,
                currentCast.author.display_name,
                "farcaster"
            );

            await runtime.messageManager.createMemory(
                createCastMemory({
                    roomId,
                    agentId: runtime.agentId,
                    userId,
                    cast: currentCast,
                })
            );
        }

        thread.unshift(currentCast);

        if (currentCast.parent_hash) {
            const parentCast = await client.getCast(currentCast.parent_hash);

            if (!parentCast) return;
            await processThread(parentCast);
        }
    }

    await processThread(cast);
    return thread;
}
