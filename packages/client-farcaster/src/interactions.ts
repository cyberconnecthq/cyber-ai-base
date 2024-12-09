import {
    composeContext,
    Content,
    elizaLogger,
    Evaluator,
    generateMessageResponse,
    generateObjectV2,
    generateShouldRespond,
    generateText,
    Memory,
    ModelClass,
    stringToUuid,
    type IAgentRuntime,
} from "@ai16z/eliza";
import type { FarcasterClient } from "./client";
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
    Embed,
    User,
} from "@neynar/nodejs-sdk/build/api/index.js";
import { generateImage } from "@cyberlab/ai-external-serivce";
import { isNftCreationParams, NftCreationParamsSchema } from "./types";

const AIArtist: { userName: string; address: string; fid: number }[] = [
    {
        fid: 888116,
        address: "0x796321ec356026FD4b3b3910dBAFBc434C252006",
        userName: "wayne-liberty",
    },
];

function extractImageUrlFromEmbed(embed?: Embed) {
    if (!embed) return null;
    if ("url" in embed) {
        if (embed.metadata?.content_type?.startsWith("image")) {
            return embed.url;
        }
    }
    return null;
}
export class FarcasterInteractionManager {
    private timeout: NodeJS.Timeout | undefined;
    constructor(
        public client: FarcasterClient,
        public runtime: IAgentRuntime
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
                Math.floor(Math.random() * 2) * 60 * 1000
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
                continue;
            }
            console.log(
                "🚀 ~ FarcasterInteractionManager ~ handleInteractions ~ cast:",
                cast.author.username,
                cast.text
            );
            if (
                cast.author.username ===
                this.runtime.getSetting("PLATFORM_AI_FARCASTER_NAME")
            ) {
                console.log("skipping cast from platform ai", cast.hash);
                continue;
            }

            const conversationId = `${cast.thread_hash}-${this.runtime.agentId}`;
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

        const castHandled = await this.runtime.cacheManager.get(
            `farcaster/cast_interaction_handled/${cast.hash}`
        );
        if (castHandled) {
            console.log("skipping cast already handled", cast.hash);
            return;
        } else {
            this.runtime.cacheManager.set(
                `farcaster/cast_interaction_handled/${cast.hash}`,
                true
            );
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

        const imageUrl = extractImageUrlFromEmbed(cast.embeds?.[0]);
        console.log("🚀 ~ FarcasterInteractionManager ~ imageUrl:", imageUrl);

        const aiArtist = AIArtist.find(
            (artist) => artist.userName === cast.author.username
        );

        const state = await this.runtime.composeState(memory, {
            farcasterUsername: agent.username,
            timeline: formattedTimeline,
            currentPost,
            imageUrlInPost: imageUrl,
            aiArtistAddress: aiArtist?.address,
        });

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

        const evaluationResult = await this.runtime.evaluate(
            memory,
            state,
            false,
            async (response: Content) => {
                console.log(
                    "🚀 ~ FarcasterInteractionManager ~ response:",
                    response
                );
                if (response.type === "GENERATE_NFT") {
                    elizaLogger.log("Nft generation result:", response);
                    const postContent = response.text;
                    if (!postContent) {
                        return [];
                    }

                    elizaLogger.log("Sending NFT generation result cast");
                    let results:
                        | {
                              memory: Memory;
                              cast: CastWithInteractions;
                          }
                        | undefined;
                    if (response.status === "SUCCESS") {
                        results = await sendCast({
                            runtime: this.runtime,
                            client: this.client,
                            profile: cast.author,
                            content: {
                                text: postContent,
                            },
                            roomId: memory.roomId,
                            inReplyTo: {
                                parentFid: cast.author.fid,
                                parentHash: cast.hash,
                            },
                            embeds: response.nftImageUrl
                                ? [{ url: response.nftImageUrl as string }]
                                : undefined,
                        });
                        elizaLogger.log("Cast sent", results.cast);
                    } else {
                        results = await sendCast({
                            runtime: this.runtime,
                            client: this.client,
                            profile: cast.author,
                            content: {
                                text: postContent,
                            },
                            roomId: memory.roomId,
                            inReplyTo: {
                                parentFid: cast.author.fid,
                                parentHash: cast.hash,
                            },
                        });
                        elizaLogger.log("Cast sent", results.cast);
                    }
                    this.runtime.cacheManager.set(
                        `farcaster/nft_generation_${results?.cast.hash}`,
                        results
                    );
                }
                return [];
            },
            (evaluator: Evaluator) => evaluator.name === "GENERATE_NFT"
        );
        console.log(
            "🚀 ~ FarcasterInteractionManager ~ evaluationResult:",
            evaluationResult
        );

        if (evaluationResult.includes("GENERATE_NFT")) {
            elizaLogger.log(
                "Already generated NFT for this message, skip responding"
            );
            return { text: "Response Decision:", action: "IGNORE" };
        }

        const shouldRespondContext = composeContext({
            state,
            template:
                this.runtime.character.templates
                    ?.twitterShouldRespondTemplate ||
                this.runtime.character?.templates?.shouldRespondTemplate ||
                shouldRespondTemplate,
        });
        console.log(
            "🚀 ~ FarcasterInteractionManager ~ shouldRespondContext:",
            shouldRespondContext
        );

        const shouldRespond = await generateShouldRespond({
            runtime: this.runtime,
            context: shouldRespondContext,
            modelClass: ModelClass.SMALL,
        });

        const shouldRespondWithImageTemplate =
            this.runtime.character?.templates
                ?.twitterShouldRespondWithImageTemplate;
        const shouldRespondWithImageContext = shouldRespondWithImageTemplate
            ? composeContext({
                  state,
                  template: shouldRespondWithImageTemplate,
              })
            : null;
        console.log(
            "🚀 ~ FarcasterInteractionManager ~ shouldRespondWithImageContext:",
            shouldRespondWithImageContext
        );

        const shouldRespondWithImage = shouldRespondWithImageContext
            ? await generateShouldRespond({
                  runtime: this.runtime,
                  context: shouldRespondWithImageContext,
                  modelClass: ModelClass.SMALL,
              })
            : "IGNORE";
        console.log(
            "🚀 ~ FarcasterInteractionManager ~ shouldRespondWithImage:",
            shouldRespondWithImage
        );

        console.log(
            "🚀 ~ FarcasterInteractionManager ~ shouldRespond:",
            shouldRespond
        );

        if (
            shouldRespond !== "RESPOND" &&
            shouldRespondWithImage !== "RESPOND"
        ) {
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

        let response = await generateMessageResponse({
            runtime: this.runtime,
            context,
            modelClass: ModelClass.SMALL,
        });

        response.inReplyTo = memoryId;

        if (!response.text) return;

        let generatedImageUrl: string | undefined;
        const address = await this.extractAddressFromPost(cast.text);
        if (shouldRespondWithImage === "RESPOND") {
            if (address) {
                generatedImageUrl = await this.generateImage(cast.text);
                response.text += `
@${this.runtime.getSetting("PLATFORM_AI_FARCASTER_NAME")} could you mint this image as an NFT?
creatorAddress: ${address}
`;
            } else {
                response.text += `
Missing Information!

Please confirm that you have provided the following:

- EVM Address: Ensure you have submitted a valid EVM address to earn rewards.

Please update them and try again.
                `;
            }
        }
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
                embeds: generatedImageUrl
                    ? [{ url: generatedImageUrl }]
                    : undefined,
            });

            const newState = await this.runtime.updateRecentMessageState(state);

            await this.runtime.messageManager.createMemory(results.memory);

            await this.runtime.evaluate(
                memory,
                newState,
                true,
                undefined,
                (evaluator: Evaluator) => {
                    return evaluator.name !== "GENERATE_NFT";
                }
            );

            await this.runtime.processActions(
                memory,
                [results.memory],
                newState
            );

            const responseInfo = `Context:\n\n${context}\n\nSelected Post: ${results.cast.hash} - ${results.cast.author.username}: ${results.cast.text}\nAgent's Output:\n${response.text}`;

            await this.runtime.cacheManager.set(
                `farcaster/cast_generation_${results.cast.hash}.txt`,
                responseInfo
            );

            await wait();
        } catch (error) {
            console.error(`Error sending response cast: ${error}`);
        }
    }

    private async generateImage(description: string) {
        const keywordsResponse = await generateText({
            runtime: this.runtime,
            context: `
            I want to create an NFT image using the following information, condense all descriptions into 8 words or fewer, not necessarily individual words, to create a more abstract visual representation for the generated image:
Description: ${description}.
the response should be comma separated words or phrases of the words only.
            `,
            modelClass: ModelClass.SMALL,
        });
        console.log(
            "🚀 ~ FarcasterInteractionManager ~ generateImage ~ keywordsResponse:",
            keywordsResponse
        );
        const imageUrl = await generateImage(
            `please generate an image for this NFT ${keywordsResponse.replaceAll('"', "")}`,
            this.runtime.character.exactlyModelId ||
                this.runtime.getSetting("EXACTLY_MODEL_ID") ||
                "c4c51742-fd8e-47df-95bc-da3ca5d895fc"
        );
        return imageUrl;
    }

    private async extractAddressFromPost(post: string): Promise<string | null> {
        let content: any;
        try {
            content = await generateObjectV2({
                runtime: this.runtime,
                context: `${post}`,
                // @ts-expect-error there was an type error in source code here
                modelClass: ModelClass.SMALL,
                schema: NftCreationParamsSchema,
                schemaDescription: `
                do not make up value for creator address
                `,
            });
        } catch (e) {
            elizaLogger.error(`Failed to generate NFT. Error: ${e}`);
        }
        console.log("🚀 ~ generated params from post:", content);

        if (!isNftCreationParams(content?.object)) {
            return null;
        }
        return content.object.creatorAddress;
    }
}
