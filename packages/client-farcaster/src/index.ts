import { Client, IAgentRuntime } from "@ai16z/eliza";
import { FarcasterClient } from "./client";
import { FarcasterPostManager } from "./post";
import { FarcasterInteractionManager } from "./interactions";

export class FarcasterAgentClient implements Client {
    client: FarcasterClient;
    posts: FarcasterPostManager;
    interactions: FarcasterInteractionManager;

    constructor(
        public runtime: IAgentRuntime,
        client?: FarcasterClient
    ) {
        this.client =
            client ??
            new FarcasterClient({
                runtime,
            });

        this.posts = new FarcasterPostManager(this.client, this.runtime);

        this.interactions = new FarcasterInteractionManager(
            this.client,
            this.runtime
        );
    }

    async start() {
        await Promise.all([this.posts.start(), this.interactions.start()]);
    }

    async stop() {
        await Promise.all([this.posts.stop(), this.interactions.stop()]);
    }
}
