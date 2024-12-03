import type { FarcasterClient } from "./client";
import type { Content, IAgentRuntime, Memory, UUID } from "@ai16z/eliza";
import { createCastMemory } from "./memory";
import {
    CastWithInteractions,
    Embed,
    User,
} from "@neynar/nodejs-sdk/build/api/index.js";

export async function sendCast({
    client,
    runtime,
    content,
    roomId,
    inReplyTo,
    embeds,
}: {
    profile: User;
    client: FarcasterClient;
    runtime: IAgentRuntime;
    content: Content;
    roomId: UUID;
    inReplyTo?: {
        parentHash: string;
        parentFid: number;
    };
    embeds?: Embed[];
}): Promise<{ memory: Memory; cast: CastWithInteractions }> {
    const result = await client.submitMessage(content.text, inReplyTo, embeds);

    return {
        cast: result,
        memory: createCastMemory({
            roomId,
            agentId: runtime.agentId,
            userId: runtime.agentId,
            cast: result,
        }),
    };
}
