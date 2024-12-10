import { Tweet } from "agent-twitter-client";
import {
    composeContext,
    embeddingZeroVector,
    generateObjectV2,
    generateText,
    State,
} from "@ai16z/eliza";
import { Content, Memory, UUID, ModelClass } from "@ai16z/eliza";
import { stringToUuid } from "@ai16z/eliza";
import { ClientBase } from "./base";
import { elizaLogger } from "@ai16z/eliza";
import { generateImage, promptByGpt } from "@cyberlab/ai-external-serivce";
import { z } from "zod";

const MAX_TWEET_LENGTH = 280; // Updated to Twitter's current character limit

export const wait = (minTime: number = 1000, maxTime: number = 3000) => {
    const waitTime =
        Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
    return new Promise((resolve) => setTimeout(resolve, waitTime));
};

export const isValidTweet = (tweet: Tweet): boolean => {
    // Filter out tweets with too many hashtags, @s, or $ signs, probably spam or garbage
    const hashtagCount = (tweet.text?.match(/#/g) || []).length;
    const atCount = (tweet.text?.match(/@/g) || []).length;
    const dollarSignCount = (tweet.text?.match(/\$/g) || []).length;
    const totalCount = hashtagCount + atCount + dollarSignCount;

    return (
        hashtagCount <= 1 &&
        atCount <= 2 &&
        dollarSignCount <= 1 &&
        totalCount <= 3
    );
};

export async function buildConversationThread(
    tweet: Tweet,
    client: ClientBase,
    maxReplies: number = 4
): Promise<Tweet[]> {
    const thread: Tweet[] = [];
    const visited: Set<string> = new Set();

    async function processThread(currentTweet: Tweet, depth: number = 0) {
        elizaLogger.log("Processing tweet:", {
            id: currentTweet.id,
            inReplyToStatusId: currentTweet.inReplyToStatusId,
            depth: depth,
        });

        if (!currentTweet) {
            elizaLogger.log("No current tweet found for thread building");
            return;
        }

        // Stop if we've reached our reply limit
        if (depth >= maxReplies) {
            elizaLogger.log("Reached maximum reply depth", depth);
            return;
        }

        // Handle memory storage
        const memory = await client.runtime.messageManager.getMemoryById(
            stringToUuid(currentTweet.id + "-" + client.runtime.agentId)
        );
        if (!memory) {
            const roomId = stringToUuid(
                currentTweet.conversationId + "-" + client.runtime.agentId
            );
            const userId = stringToUuid(currentTweet.userId);

            await client.runtime.ensureConnection(
                userId,
                roomId,
                currentTweet.username,
                currentTweet.name,
                "twitter"
            );

            await client.runtime.messageManager.createMemory({
                id: stringToUuid(
                    currentTweet.id + "-" + client.runtime.agentId
                ),
                agentId: client.runtime.agentId,
                content: {
                    text: currentTweet.text,
                    source: "twitter",
                    url: currentTweet.permanentUrl,
                    inReplyTo: currentTweet.inReplyToStatusId
                        ? stringToUuid(
                              currentTweet.inReplyToStatusId +
                                  "-" +
                                  client.runtime.agentId
                          )
                        : undefined,
                },
                createdAt: currentTweet.timestamp * 1000,
                roomId,
                userId:
                    currentTweet.userId === client.profile.id
                        ? client.runtime.agentId
                        : stringToUuid(currentTweet.userId),
                embedding: embeddingZeroVector,
            });
        }

        if (visited.has(currentTweet.id)) {
            elizaLogger.info("Already visited tweet:", currentTweet.id);
            return;
        }

        visited.add(currentTweet.id);
        thread.unshift(currentTweet);

        elizaLogger.info("Current thread state:", {
            length: thread.length,
            currentDepth: depth,
            tweetId: currentTweet.id,
        });

        // If there's a parent tweet, fetch and process it
        if (currentTweet.inReplyToStatusId) {
            elizaLogger.info(
                "Fetching parent tweet:",
                currentTweet.inReplyToStatusId
            );
            try {
                const parentTweet = await client.twitterClient.getTweet(
                    currentTweet.inReplyToStatusId
                );

                if (parentTweet) {
                    elizaLogger.info("Found parent tweet:", {
                        id: parentTweet.id,
                        text: parentTweet.text?.slice(0, 50),
                    });
                    await processThread(parentTweet, depth + 1);
                } else {
                    elizaLogger.info(
                        "No parent tweet found for:",
                        currentTweet.inReplyToStatusId
                    );
                }
            } catch (error) {
                elizaLogger.error("Error fetching parent tweet:", {
                    tweetId: currentTweet.inReplyToStatusId,
                    error,
                });
            }
        } else {
            elizaLogger.debug(
                "Reached end of reply chain at:",
                currentTweet.id
            );
        }
    }

    await processThread(tweet, 1);

    elizaLogger.log("Final thread built:", {
        totalTweets: thread.length,
        tweetIds: thread.map((t) => ({
            id: t.id,
            text: t.text?.slice(0, 50),
        })),
    });

    return thread;
}

export async function sendTweet(
    client: ClientBase,
    content: Content,
    roomId: UUID,
    twitterUsername: string,
    inReplyTo: string,
    imageParams: {
        shouldRespondWithImage: boolean;
        exatlyModelId?: string;
        originTweet: string;
    } = {
        shouldRespondWithImage: false,
        exatlyModelId: "",
        originTweet: "",
    },
    isArtist?: boolean,
    state?: State
): Promise<Memory[]> {
    const tweetChunks = splitTweetContent(content.text);
    const sentTweets: Tweet[] = [];
    let previousTweetId = inReplyTo;

    for (const [index, chunk] of tweetChunks.entries()) {
        let body, result, imageResponse;
        console.log("----------send tweet-----------");
        const dailyImageCount =
            ((await client.runtime.cacheManager.get(
                "daily_image_count/" + twitterUsername
            )) as number) || 0;
        console.log(dailyImageCount);
        if (
            imageParams.shouldRespondWithImage &&
            imageParams.exatlyModelId &&
            dailyImageCount < client.runtime.character.dailyImageLimit
        ) {
            console.log("----------GENERATE IMAGE-----------");
            // console.log(state);
            // console.log(state.formattedConversation);
            const imagePrompt = client.runtime.character
                .imageGenerationPromptFormat
                ? await client.runtime.character.imageGenerationPromptFormat(
                      state.formattedConversation
                  )
                : await promptByGpt(state.formattedConversation);

            console.log("Image generate params:", {
                imagePrompt,
                exatlyModelId: imageParams.exatlyModelId,
            });

            const result = await generateImage(
                imagePrompt,
                imageParams.exatlyModelId
            );
            const image = result.uri;
            imageResponse = image ? await fetch(image) : null;
            client.runtime.cacheManager.set(
                "daily_image_count/" + twitterUsername,
                dailyImageCount + 1,
                { expires: dailyImageCount === 0 ? 0 : getTomorrowTimeStamp() }
            );
        }
        const buffer = imageResponse?.ok
            ? Buffer.from(await imageResponse.arrayBuffer())
            : null;

        if (index === tweetChunks.length - 1 && buffer) {
            if (isArtist) {
                console.log("----------Artist call platform-----------");
                result = await client.requestQueue.add(
                    async () =>
                        await client.twitterClient.sendTweetWithMedia(
                            await makeTagPlatformTweet({ client, state }),
                            [buffer],
                            previousTweetId
                        )
                );
            } else {
                console.log("----------send tweet with image-----------");
                result = await client.requestQueue.add(
                    async () =>
                        await client.twitterClient.sendTweetWithMedia(
                            chunk.trim(),
                            [buffer],
                            previousTweetId
                        )
                );
            }

            await wait(2000);
        } else {
            result = await client.requestQueue.add(
                async () =>
                    await client.twitterClient.sendTweet(
                        chunk.trim(),
                        previousTweetId
                    )
            );
        }
        body = await result.json();

        // if we have a response
        if (body?.data?.create_tweet?.tweet_results?.result) {
            // Parse the response
            const tweetResult = body.data.create_tweet.tweet_results.result;
            const finalTweet: Tweet = {
                id: tweetResult.rest_id,
                text: tweetResult.legacy.full_text,
                conversationId: tweetResult.legacy.conversation_id_str,
                //createdAt:
                timestamp: tweetResult.timestamp * 1000,
                userId: tweetResult.legacy.user_id_str,
                inReplyToStatusId: tweetResult.legacy.in_reply_to_status_id_str,
                permanentUrl: `https://twitter.com/${twitterUsername}/status/${tweetResult.rest_id}`,
                hashtags: [],
                mentions: [],
                photos: [],
                thread: [],
                urls: [],
                videos: [],
            };
            sentTweets.push(finalTweet);
            previousTweetId = finalTweet.id;
        } else {
            console.error("Error sending chunk", chunk, "repsonse:", body);
        }

        // Wait a bit between tweets to avoid rate limiting issues
        await wait(1000, 2000);
    }

    const memories: Memory[] = sentTweets.map((tweet) => ({
        id: stringToUuid(tweet.id + "-" + client.runtime.agentId),
        agentId: client.runtime.agentId,
        userId: client.runtime.agentId,
        content: {
            text: tweet.text,
            source: "twitter",
            url: tweet.permanentUrl,
            inReplyTo: tweet.inReplyToStatusId
                ? stringToUuid(
                      tweet.inReplyToStatusId + "-" + client.runtime.agentId
                  )
                : undefined,
        },
        roomId,
        embedding: embeddingZeroVector,
        createdAt: tweet.timestamp * 1000,
    }));

    return memories;
}

function splitTweetContent(content: string): string[] {
    const maxLength = MAX_TWEET_LENGTH;
    const paragraphs = content.split("\n\n").map((p) => p.trim());
    const tweets: string[] = [];
    let currentTweet = "";

    for (const paragraph of paragraphs) {
        if (!paragraph) continue;

        if ((currentTweet + "\n\n" + paragraph).trim().length <= maxLength) {
            if (currentTweet) {
                currentTweet += "\n\n" + paragraph;
            } else {
                currentTweet = paragraph;
            }
        } else {
            if (currentTweet) {
                tweets.push(currentTweet.trim());
            }
            if (paragraph.length <= maxLength) {
                currentTweet = paragraph;
            } else {
                // Split long paragraph into smaller chunks
                const chunks = splitParagraph(paragraph, maxLength);
                tweets.push(...chunks.slice(0, -1));
                currentTweet = chunks[chunks.length - 1];
            }
        }
    }

    if (currentTweet) {
        tweets.push(currentTweet.trim());
    }

    return tweets;
}

function splitParagraph(paragraph: string, maxLength: number): string[] {
    // eslint-disable-next-line
    const sentences = paragraph.match(/[^\.!\?]+[\.!\?]+|[^\.!\?]+$/g) || [
        paragraph,
    ];
    const chunks: string[] = [];
    let currentChunk = "";

    for (const sentence of sentences) {
        if ((currentChunk + " " + sentence).trim().length <= maxLength) {
            if (currentChunk) {
                currentChunk += " " + sentence;
            } else {
                currentChunk = sentence;
            }
        } else {
            if (currentChunk) {
                chunks.push(currentChunk.trim());
            }
            if (sentence.length <= maxLength) {
                currentChunk = sentence;
            } else {
                // Split long sentence into smaller pieces
                const words = sentence.split(" ");
                currentChunk = "";
                for (const word of words) {
                    if (
                        (currentChunk + " " + word).trim().length <= maxLength
                    ) {
                        if (currentChunk) {
                            currentChunk += " " + word;
                        } else {
                            currentChunk = word;
                        }
                    } else {
                        if (currentChunk) {
                            chunks.push(currentChunk.trim());
                        }
                        currentChunk = word;
                    }
                }
            }
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
}

export const isBurnChibsTx = async (tx: string) => {
    const eventlog = await (
        await fetch(
            `https://api.w3w.ai/cyber/v1/explorer/transaction/${tx}/logs`,
            {
                headers: {
                    "content-type": "application/json",
                    Referer: "https://cyberscan.co/",
                },
                body: null,
                method: "GET",
            }
        )
    ).json();
    const log = eventlog?.data?.[0];
    console.log("tx log", eventlog);
    if (
        log?.address === "0x38f970260c3eeee0adcaed0e2c3e937e8e2e9780" &&
        log?.function_name === "Transfer" &&
        log?.input_data?.[1]?.hex_data ===
            "0x000000000000000000000000000000000000dead"
    ) {
        return true;
    }

    return false;
};

export const extractNftParamsTemplate = `
Extract NFT creation params from the recent messages:

{{recentMessages}}
`;

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

export async function makeTagPlatformTweet({
    client,
    state,
}: {
    client: ClientBase;
    state: State;
}) {
    const context = composeContext({
        state,
        template: extractNftParamsTemplate,
    });
    try {
        const content: any = await generateObjectV2({
            runtime: client.runtime,
            context,
            // @ts-expect-error there was an type error in source code here
            modelClass: ModelClass.SMALL,
            schema: NftCreationParamsSchema,
        });
        console.log(content);

        const template = `@${process.env.PLATFORM_TWITTER_USERNAME} please create a NFT for me. name:${content.object.name} desc:${content.object.description} creator address:${content.object.creatorAddress}`;
        const generatedText = await generateText({
            runtime: client.runtime,
            context: `please shortern this text to meet the twitter's post tweet limit of 250 words, #IMPORTANT: just shorten the desc, the addresses MUST NOT be changed; no commentary or additional information should be included.
            ${template}`,
            modelClass: ModelClass.SMALL,
        });
        console.log("generatedText", generatedText);
        return generatedText;
    } catch (e) {
        elizaLogger.error(`Failed to generate NFT. Error: ${e}`);
    }
}
function getTomorrowTimeStamp() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
}
