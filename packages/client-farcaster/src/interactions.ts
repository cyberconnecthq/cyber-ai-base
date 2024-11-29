import {
    composeContext,
    generateMessageResponse,
    generateShouldRespond,
    Memory,
    ModelClass,
    stringToUuid,
    type IAgentRuntime,
} from "@ai16z/eliza";
import type { FarcasterClient } from "./client";
import { toHex } from "viem";
import { buildConversationThread, createCastMemory } from "./memory";
import {
    formatCast,
    formatTimeline,
    messageHandlerTemplate,
    shouldRespondTemplate,
} from "./prompts";
import { castUuid, wait } from "./utils";
import { sendCast } from "./actions";
import {
    CastWithInteractions,
    User,
} from "@neynar/nodejs-sdk/build/api/index.js";

export class FarcasterInteractionManager {
    private timeout: NodeJS.Timeout | undefined;
    constructor(
        public client: FarcasterClient,
        public runtime: IAgentRuntime,
        public cache: Map<string, any>
    ) {}

    public async start() {
        const handleInteractionsLoop = async () => {
            try {
                await this.handleInteractions();
            } catch (error) {
                console.error(error);
                return;
            }

            this.timeout = setTimeout(
                handleInteractionsLoop,
                (Math.floor(Math.random() * (5 - 2 + 1)) + 2) * 60 * 1000
            ); // Random interval between 2-5 minutes
        };

        handleInteractionsLoop();
    }

    public async stop() {
        if (this.timeout) clearTimeout(this.timeout);
    }

    private async handleInteractions() {
        const agentFid = Number(this.runtime.getSetting("FARCASTER_FID"));

        const casts = await this.client.getMentions({
            fid: agentFid,
            pageSize: 20,
        });
        const agent = await this.client.getProfile(agentFid);

        for (const cast of casts) {
            if (
                Date.now() - new Date(cast.timestamp).getTime() >
                5 * 1e3 * 60
            ) {
                console.log(
                    "🚀 ~ FarcasterInteractionManager ~ handleInteractions ~ skipping cast as it is older than 5 minutes",
                    cast.hash
                );
                continue;
            }
            console.log(
                "🚀 ~ FarcasterInteractionManager ~ handleInteractions ~ cast:",
                cast.author.username,
                cast.text
            );
            const messageHash = toHex(cast.hash);
            const conversationId = `${messageHash}-${this.runtime.agentId}`;
            const roomId = stringToUuid(conversationId);
            const userId = stringToUuid(cast.author.username.toString());

            await this.runtime.ensureConnection(
                userId,
                roomId,
                cast.author.username,
                cast.author.display_name,
                "farcaster"
            );

            const thread = await buildConversationThread({
                client: this.client,
                runtime: this.runtime,
                cast,
            });
            console.log(
                "🚀 ~ FarcasterInteractionManager ~ handleInteractions ~ thread:",
                thread
            );

            const memory: Memory = {
                content: { text: cast.text },
                agentId: this.runtime.agentId,
                userId,
                roomId,
            };

            await this.handleCast({
                agent,
                cast,
                memory,
            });
        }
    }

    private async handleCast({
        agent,
        cast,
        memory,
    }: {
        agent: User;
        cast: CastWithInteractions;
        memory: Memory;
    }) {
        if (cast.author.fid === agent.fid) {
            console.log("skipping cast from bot itself", cast.hash);
            return;
        }

        if (!memory.content.text) {
            console.log("skipping cast with no text", cast.hash);
            return { text: "", action: "IGNORE" };
        }

        const currentPost = formatCast(cast);

        const { timeline } = await this.client.getTimeline({
            fid: agent.fid,
            pageSize: 10,
        });

        const formattedTimeline = formatTimeline(
            this.runtime.character,
            timeline
        );
        console.log(
            "🚀 ~ FarcasterInteractionManager ~ formattedTimeline:",
            formattedTimeline
        );

        const state = await this.runtime.composeState(memory, {
            farcasterUsername: agent.username,
            timeline: formattedTimeline,
            currentPost,
        });
        console.log("🚀 ~ FarcasterInteractionManager ~ state:", state);

        const shouldRespondContext = composeContext({
            state,
            template:
                this.runtime.character.templates
                    ?.farcasterShouldRespondTemplate ||
                this.runtime.character?.templates?.shouldRespondTemplate ||
                shouldRespondTemplate,
        });
        console.log(
            "🚀 ~ FarcasterInteractionManager ~ shouldRespondContext:",
            shouldRespondContext
        );

        const memoryId = castUuid({
            agentId: this.runtime.agentId,
            hash: cast.hash,
        });
        console.log("🚀 ~ FarcasterInteractionManager ~ memoryId:", memoryId);

        const castMemory =
            await this.runtime.messageManager.getMemoryById(memoryId);

        if (!castMemory) {
            await this.runtime.messageManager.createMemory(
                createCastMemory({
                    agentId: this.runtime.agentId,
                    roomId: memory.roomId,
                    userId: memory.userId,
                    cast,
                })
            );
        }

        const shouldRespond = await generateShouldRespond({
            runtime: this.runtime,
            context: shouldRespondContext,
            modelClass: ModelClass.SMALL,
        });
        console.log(
            "🚀 ~ FarcasterInteractionManager ~ shouldRespond:",
            shouldRespond
        );

        if (shouldRespond !== "RESPOND") {
            console.log("Not responding to message");
            return { text: "Response Decision:", action: shouldRespond };
        }

        const context = composeContext({
            state,
            template:
                this.runtime.character.templates
                    ?.farcasterMessageHandlerTemplate ??
                this.runtime.character?.templates?.messageHandlerTemplate ??
                messageHandlerTemplate,
        });

        const response = await generateMessageResponse({
            runtime: this.runtime,
            context,
            modelClass: ModelClass.SMALL,
        });

        response.inReplyTo = memoryId;

        if (!response.text) return;
        console.log("🚀 ~ FarcasterInteractionManager ~ response:", response);

        try {
            const results = await sendCast({
                runtime: this.runtime,
                client: this.client,
                profile: cast.author,
                content: response,
                roomId: memory.roomId,
                inReplyTo: {
                    parentFid: cast.author.fid,
                    parentHash: cast.hash,
                },
            });

            const newState = await this.runtime.updateRecentMessageState(state);

            await this.runtime.messageManager.createMemory(results.memory);

            await this.runtime.evaluate(memory, newState);

            await this.runtime.processActions(
                memory,
                [results.memory],
                newState
            );

            const responseInfo = `Context:\n\n${context}\n\nSelected Post: ${results.cast.hash} - ${results.cast.author.username}: ${results.cast.text}\nAgent's Output:\n${response.text}`;

            await this.runtime.cacheManager.set(
                `twitter/tweet_generation_${results.cast.hash}.txt`,
                responseInfo
            );

            await wait();
        } catch (error) {
            console.error(`Error sending response cast: ${error}`);
        }
    }
}
