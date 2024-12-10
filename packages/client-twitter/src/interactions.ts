import { SearchMode, Tweet } from "agent-twitter-client";
import {
    composeContext,
    generateMessageResponse,
    generateShouldRespond,
    messageCompletionFooter,
    shouldRespondFooter,
    Content,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    stringToUuid,
    elizaLogger,
    Evaluator,
} from "@ai16z/eliza";
import { ClientBase } from "./base";
import {
    buildConversationThread,
    sendTweet,
    wait,
    // isBurnChibsTx,
} from "./utils.ts";

export const twitterMessageHandlerTemplate =
    `{{timeline}}

# Knowledge
{{knowledge}}

# Task: Generate a post for the character {{agentName}}.
About {{agentName}} (@{{twitterUserName}}):
{{bio}}
{{lore}}
{{topics}}

{{providers}}

{{characterPostExamples}}

{{postDirections}}

Recent interactions between {{agentName}} and other users:
{{recentPostInteractions}}

{{recentPosts}}


# Task: Generate a post/reply in the voice, style and perspective of {{agentName}} (@{{twitterUserName}}) while using the thread of tweets as additional context:
Current Post:
{{currentPost}}
Thread of Tweets You Are Replying To:

{{formattedConversation}}

{{actions}}

# Task: Generate a post in the voice, style and perspective of {{agentName}} (@{{twitterUserName}}). Include an action, if appropriate. {{actionNames}}:
{{currentPost}}
` + messageCompletionFooter;

export const twitterShouldRespondTemplate =
    `# INSTRUCTIONS: Determine if {{agentName}} (@{{twitterUserName}}) should respond to the message and participate in the conversation. Do not comment.

Response options are RESPOND, IGNORE and STOP .

{{agentName}} should respond to messages that are directed at them, or participate in conversations that are interesting or relevant to their background, IGNORE messages that are irrelevant to them, and should STOP if the conversation is concluded.

{{agentName}} is in a room with other users and wants to be conversational, but not annoying.
{{agentName}} should RESPOND to messages that are directed at them, or participate in conversations that are interesting or relevant to their background.
If a message is not interesting or relevant, {{agentName}} should IGNORE.
Unless directly RESPONDing to a user, {{agentName}} should IGNORE messages that are very short or do not contain much information.
If a user asks {{agentName}} to stop talking, {{agentName}} should STOP.
If {{agentName}} concludes a conversation and isn't part of the conversation anymore, {{agentName}} should STOP.

{{recentPosts}}

IMPORTANT: {{agentName}} (aka @{{twitterUserName}}) is particularly sensitive about being annoying, so if there is any doubt, it is better to IGNORE than to RESPOND.

{{currentPost}}

Thread of Tweets You Are Replying To:

{{formattedConversation}}

# INSTRUCTIONS: Respond with [RESPOND] if {{agentName}} should respond, or [IGNORE] if {{agentName}} should not respond to the last message and [STOP] if {{agentName}} should stop participating in the conversation.
` + shouldRespondFooter;

export class TwitterInteractionClient {
    client: ClientBase;
    runtime: IAgentRuntime;

    constructor(client: ClientBase, runtime: IAgentRuntime) {
        this.client = client;
        this.runtime = runtime;
    }

    async start() {
        const handleTwitterInteractionsLoop = () => {
            this.handleTwitterInteractions();
            setTimeout(
                handleTwitterInteractionsLoop,
                // (Math.floor(Math.random() * (5 - 2 + 1)) + 2) * 60 * 1000
                60000
            ); // Random interval between 2-5 minutes
        };
        handleTwitterInteractionsLoop();
    }

    async handleTwitterInteractions() {
        elizaLogger.log("Checking Twitter interactions");
        const twitterUsername = this.client.profile.username;
        try {
            // Check for mentionsx
            const tweetCandidates = (
                await this.client.fetchSearchTweets(
                    `@${twitterUsername}`,
                    10,
                    SearchMode.Latest
                )
            ).tweets.filter((tweet) => {
                return (
                    Date.now() - new Date(tweet.timestamp * 1000).getTime() <=
                    5 * 1e3 * 60
                );
            });

            // elizaLogger.log("search result: ", tweetCandidates.length);

            // de-duplicate tweetCandidates with a set
            const uniqueTweetCandidates = [...new Set(tweetCandidates)];
            // Sort tweet candidates by ID in ascending order
            uniqueTweetCandidates
                .sort((a, b) => a.id.localeCompare(b.id))
                .filter((tweet) => tweet.userId !== this.client.profile.id);
            // for each tweet candidate, handle the tweet
            for (const tweet of uniqueTweetCandidates) {
                // console.log(tweet);
                // console.log(this.client.lastCheckedTweetId);
                if (
                    !this.client.lastCheckedTweetId ||
                    BigInt(tweet.id) > this.client.lastCheckedTweetId
                ) {
                    elizaLogger.log("New Tweet found", tweet.permanentUrl);

                    const roomId = stringToUuid(
                        tweet.conversationId + "-" + this.runtime.agentId
                    );

                    const userIdUUID =
                        tweet.userId === this.client.profile.id
                            ? this.runtime.agentId
                            : stringToUuid(tweet.userId!);

                    await this.runtime.ensureConnection(
                        userIdUUID,
                        roomId,
                        tweet.username,
                        tweet.name,
                        "twitter"
                    );

                    const thread = await buildConversationThread(
                        tweet,
                        this.client
                    );

                    const message = {
                        content: { text: tweet.text },
                        agentId: this.runtime.agentId,
                        userId: userIdUUID,
                        roomId,
                    };

                    await this.handleTweet({
                        tweet,
                        message,
                        thread,
                    });

                    elizaLogger.info("set lastCheckedTweetId", tweet.id);
                    // Update the last checked tweet ID after processing each tweet
                    this.client.lastCheckedTweetId = BigInt(tweet.id);
                }
            }

            // Save the latest checked tweet ID to the file
            await this.client.cacheLatestCheckedTweetId();

            elizaLogger.log("Finished checking Twitter interactions");
        } catch (error) {
            elizaLogger.error("Error handling Twitter interactions:", error);
        }
    }
    private async handleTweet({
        tweet,
        message,
        thread,
    }: {
        tweet: Tweet;
        message: Memory;
        thread: Tweet[];
    }) {
        if (tweet.userId === this.client.profile.id) {
            // console.log("skipping tweet from bot itself", tweet.id);
            // Skip processing if the tweet is from the bot itself
            return;
        }

        if (!message.content.text) {
            elizaLogger.log("Skipping Tweet with no text", tweet.id);
            return { text: "", action: "IGNORE" };
        }

        elizaLogger.log("Processing Tweet: ", tweet.id);

        // if there's a photo
        const photos: string[] = [];
        tweet.photos.map((photo) => {
            photos.push(photo.url);
        });

        const formatTweet = (tweet: Tweet) => {
            return `  ID: ${tweet.id}
  From: ${tweet.name} (@${tweet.username})
  Text: ${tweet.text}`;
        };
        const currentPost = formatTweet(tweet);

        let homeTimeline: Tweet[] = [];
        // read the file if it exists

        const cachedTimeline = await this.client.getCachedTimeline();
        if (cachedTimeline) {
            homeTimeline = cachedTimeline;
        } else {
            homeTimeline = await this.client.fetchHomeTimeline(50);
            await this.client.cacheTimeline(homeTimeline);
        }

        elizaLogger.debug("Thread: ", thread);
        const formattedConversation = thread
            .map(
                (tweet) => `@${tweet.username} (${new Date(
                    tweet.timestamp * 1000
                ).toLocaleString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    month: "short",
                    day: "numeric",
                })}):
        ${tweet.text}`
            )
            .join("\n\n");

        elizaLogger.debug("formattedConversation: ", formattedConversation);

        const formattedHomeTimeline =
            `# ${this.runtime.character.name}'s Home Timeline\n\n` +
            homeTimeline
                .map((tweet) => {
                    return `ID: ${tweet.id}\nFrom: ${tweet.name} (@${tweet.username})${tweet.inReplyToStatusId ? ` In reply to: ${tweet.inReplyToStatusId}` : ""}\nText: ${tweet.text}\n---\n`;
                })
                .join("\n");

        let state = await this.runtime.composeState(message, {
            twitterClient: this.client.twitterClient,
            twitterUserName: this.runtime.getSetting("TWITTER_USERNAME"),
            currentPost,
            formattedConversation,
            timeline: formattedHomeTimeline,
            imageUrlInPost: photos[0] || false,
            // if the post is from artist
            aiArtistAddress:
                tweet.username.toLocaleLowerCase() ===
                process.env.ARTIST_TWITTER_USERNAME.toLocaleLowerCase()
                    ? "0x796321ec356026FD4b3b3910dBAFBc434C252006"
                    : null,
            platform: "twitter",
        });
        // console.log(state);

        // check if the tweet exists, save if it doesn't
        const tweetId = stringToUuid(tweet.id + "-" + this.runtime.agentId);
        const tweetExists =
            await this.runtime.messageManager.getMemoryById(tweetId);

        if (!tweetExists) {
            elizaLogger.log("tweet does not exist, saving");
            const userIdUUID = stringToUuid(tweet.userId as string);
            const roomId = stringToUuid(tweet.conversationId);

            const message = {
                id: tweetId,
                agentId: this.runtime.agentId,
                content: {
                    text: tweet.text,
                    url: tweet.permanentUrl,
                    inReplyTo: tweet.inReplyToStatusId
                        ? stringToUuid(
                              tweet.inReplyToStatusId +
                                  "-" +
                                  this.runtime.agentId
                          )
                        : undefined,
                },
                userId: userIdUUID,
                roomId,
                createdAt: tweet.timestamp * 1000,
            };
            this.client.saveRequestMessage(message, state);
        }
        const shouldRespondContext = composeContext({
            state,
            template:
                this.runtime.character.templates
                    ?.twitterShouldRespondTemplate ||
                this.runtime.character?.templates?.shouldRespondTemplate ||
                twitterShouldRespondTemplate,
        });
        const shouldRespond = await generateShouldRespond({
            runtime: this.runtime,
            context: shouldRespondContext,
            modelClass: ModelClass.MEDIUM,
        });
        let shouldRespondWithImage = "IGNORE";
        if (
            this.runtime.character?.templates?.shouldRespondWithImageTemplate ||
            this.runtime.character?.templates
                ?.twitterShouldRespondWithImageTemplate
        ) {
            const shouldRespondWithImageContext = composeContext({
                state,
                template:
                    this.runtime.character.templates
                        ?.twitterShouldRespondWithImageTemplate ||
                    this.runtime.character?.templates
                        ?.shouldRespondWithImageTemplate,
            });

            shouldRespondWithImage = await generateShouldRespond({
                runtime: this.runtime,
                context: shouldRespondWithImageContext,
                modelClass: ModelClass.MEDIUM,
            });
        }

        // const txHash = tweet.text.match(/0x[A-Fa-f0-9]{64}/)?.[0];

        // console.log("--- read tx hash === " + txHash);
        // console.log("--- tx hash cache=== " + this.client.cosumedTx);
        // let burnChibs = false;
        // if (txHash && !this.client.cosumedTx.includes?.(txHash)) {
        //     burnChibs = await isBurnChibsTx(txHash);
        //     this.client.cosumedTx.push(txHash);
        // }

        // console.log("--- has burnt chibs === " + burnChibs);

        console.log("----------shouldRespond-----------");
        console.log(`----------${shouldRespond}-----------`);
        console.log("----------shouldRespondWithImage-----------");
        console.log(`----------${shouldRespondWithImage}-----------`);

        if (
            this.client.profile.username.toLocaleLowerCase() ===
            process.env.ARTIST_TWITTER_USERNAME.toLocaleLowerCase()
        ) {
            if (shouldRespondWithImage === "RESPOND") {
                const address = tweet.text.match(/0x[A-Fa-f0-9]{40}/)?.[0];
                if (!address) {
                    // if generate image without address for an artist, do nothing
                    return { text: "Response Decision:", action: "STOP" };
                }
            }
        }

        // Promise<"RESPOND" | "IGNORE" | "STOP" | null> {
        if (shouldRespond !== "RESPOND") {
            elizaLogger.log("Not responding to message");
            return { text: "Response Decision:", action: shouldRespond };
        }

        if (tweet.username === process.env.PLATFORM_TWITTER_USERNAME) {
            return { text: "Response Decision:", action: "STOP" };
        }

        const context = composeContext({
            state,
            template:
                this.runtime.character.templates
                    ?.twitterMessageHandlerTemplate ||
                this.runtime.character?.templates?.messageHandlerTemplate ||
                twitterMessageHandlerTemplate,
        });

        elizaLogger.debug("Interactions prompt:\n" + context);

        const response = await generateMessageResponse({
            runtime: this.runtime,
            context,
            modelClass: ModelClass.MEDIUM,
        });

        const removeQuotes = (str: string) =>
            str.replace(/^['"](.*)['"]$/, "$1");

        const stringId = stringToUuid(tweet.id + "-" + this.runtime.agentId);

        response.inReplyTo = stringId;

        response.text = removeQuotes(response.text);
        if (response.text) {
            try {
                const callback: HandlerCallback = async (response: Content) => {
                    let memories: Memory[];
                    // specific for platform
                    if (
                        this.runtime.plugins.filter(
                            (plugin) => plugin.name === "nftGeneration"
                        ).length > 0
                    ) {
                        const evaluateRes = new Promise<Memory[]>((resolve) => {
                            this.runtime
                                .evaluate(
                                    message,
                                    state,
                                    false,
                                    async (response: Content) => {
                                        console.log(
                                            "🚀 ~ evaluationResult callback response:",
                                            response
                                        );
                                        memories = await sendTweet(
                                            this.client,
                                            response,
                                            message.roomId,
                                            this.runtime.getSetting(
                                                "TWITTER_USERNAME"
                                            ),
                                            tweet.id
                                        );
                                        if (memories) {
                                            resolve(memories);
                                        } else {
                                            resolve([]);
                                        }
                                        return [];
                                    },
                                    (evaluator: Evaluator) =>
                                        evaluator.name === "GENERATE_NFT"
                                )
                                .then((evaluatorToRun) => {
                                    if (
                                        evaluatorToRun.includes("GENERATE_NFT")
                                    ) {
                                        // runing nft-generation
                                        console.log("runing nft-generation");
                                    } else {
                                        console.log(
                                            "not runing nft-generation"
                                        );
                                        resolve([]);
                                    }
                                });
                        });
                        memories = await evaluateRes;
                        if (memories.length > 0) return memories;
                    }

                    memories = await sendTweet(
                        this.client,
                        response,
                        message.roomId,
                        this.runtime.getSetting("TWITTER_USERNAME"),
                        tweet.id,
                        {
                            shouldRespondWithImage:
                                shouldRespondWithImage === "RESPOND",
                            exatlyModelId:
                                this.runtime.character.exactlyModelId,
                            originTweet: tweet.text,
                        },
                        this.runtime.character.isArtist,
                        state
                    );
                    return memories;
                };

                const responseMessages = await callback(response);

                state = (await this.runtime.updateRecentMessageState(
                    state
                )) as State;

                for (const responseMessage of responseMessages) {
                    if (
                        responseMessage ===
                        responseMessages[responseMessages.length - 1]
                    ) {
                        responseMessage.content.action = response.action;
                    } else {
                        responseMessage.content.action = "CONTINUE";
                    }
                    await this.runtime.messageManager.createMemory(
                        responseMessage
                    );
                }

                await this.runtime.evaluate(
                    message,
                    state,
                    true,
                    undefined,
                    (evaluator: Evaluator) => {
                        return evaluator.name !== "GENERATE_NFT";
                    }
                );

                await this.runtime.processActions(
                    message,
                    responseMessages,
                    state
                );

                const responseInfo = `Context:\n\n${context}\n\nSelected Post: ${tweet.id} - ${tweet.username}: ${tweet.text}\nAgent's Output:\n${response.text}`;

                await this.runtime.cacheManager.set(
                    `twitter/tweet_generation_${tweet.id}.txt`,
                    responseInfo
                );
                await wait();
            } catch (error) {
                elizaLogger.error(`Error sending response tweet: ${error}`);
            }
        }
    }
}
