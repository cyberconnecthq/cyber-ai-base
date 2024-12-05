import { IAgentRuntime } from "@ai16z/eliza";
import { toHex } from "viem";
import { populateMentions } from "./utils";
import { NeynarAPIClient } from "@neynar/nodejs-sdk";
import {
    CastsResponseResult,
    CastWithInteractions,
    NotificationType,
    PostCastResponseCast,
    User,
    Embed,
} from "@neynar/nodejs-sdk/build/api/index.js";

type FidRequest = {
    fid: number;
    pageSize: number;
};

export class FarcasterClient {
    runtime: IAgentRuntime;
    farcaster: NeynarAPIClient;

    constructor(opts: { runtime: IAgentRuntime; url: string; ssl: boolean }) {
        this.runtime = opts.runtime;
        this.farcaster = new NeynarAPIClient({
            apiKey: this.runtime.getSetting("NEYNAR_API_KEY") as string,
        });
    }

    async submitMessage(
        cast: string,
        replyTo?: {
            parentHash: string;
            parentFid: number;
        },
        embeds?: Embed[]
    ): Promise<CastWithInteractions> {
        const result = await this.farcaster.publishCast({
            signerUuid: this.runtime.getSetting("NEYNAR_SIGNER_UUID") as string,
            text: cast,
            parent: replyTo?.parentHash,
            parentAuthorFid: replyTo?.parentFid,
            embeds: embeds,
        });

        if (!result.success) {
            throw new Error("Failed to submit message");
        }
        // TODO: maybe need to wait for the cast to be indexed

        const detailedCast = await this.farcaster.fetchBulkCasts({
            casts: [result.cast.hash],
        });

        return detailedCast.result.casts[0];
    }

    // async loadCastFromMessage(message: CastAddMessage): Promise<Cast> {
    //     const profileMap = {};

    //     const profile = await this.getProfile(message.data.fid);

    //     profileMap[message.data.fid] = profile;

    //     for (const mentionId of message.data.castAddBody.mentions) {
    //         if (profileMap[mentionId]) continue;
    //         profileMap[mentionId] = await this.getProfile(mentionId);
    //     }

    //     const text = populateMentions(
    //         message.data.castAddBody.text,
    //         message.data.castAddBody.mentions,
    //         message.data.castAddBody.mentionsPositions,
    //         profileMap
    //     );

    //     return {
    //         id: toHex(message.hash),
    //         message,
    //         text,
    //         profile,
    //     };
    // }

    async getCast(castHash: string): Promise<CastWithInteractions> {
        const cachedCast =
            await this.runtime.cacheManager.get<CastWithInteractions>(
                `farcaster/cast/${castHash}`
            );
        if (cachedCast) {
            return cachedCast;
        }

        const result = await this.farcaster.fetchBulkCasts({
            casts: [castHash],
        });

        const cast = result.result.casts[0];

        this.runtime.cacheManager.set(`farcaster/cast/${castHash}`, cast);

        return cast;
    }

    async getCastsByFid(request: FidRequest) {
        const response = await this.farcaster.fetchCastsForUser(request);

        response.casts.map((cast) => {
            this.runtime.cacheManager.set(
                `farcaster/cast/${toHex(cast.hash)}`,
                cast
            );
        });

        return response;
    }

    async getMentions(request: FidRequest): Promise<CastWithInteractions[]> {
        const response = await this.farcaster.fetchAllNotifications({
            fid: request.fid,
            type: [NotificationType.Mentions, NotificationType.Replies],
        });

        const casts = response.notifications
            .map((notification) => {
                return notification.cast;
            })
            .filter(Boolean);

        casts.map((cast) => {
            if (cast) {
                this.runtime.cacheManager.set(`farcaster/cast/${toHex(cast.hash)}`, cast);
            }
        });

        return casts as CastWithInteractions[];
    }

    async getProfile(fid: number): Promise<User> {
        const cachedProfile = await this.runtime.cacheManager.get<User>(`farcaster/profile/${fid}`)
        if (cachedProfile) {
            return cachedProfile;
        }

        const result = await this.farcaster.fetchBulkUsers({
            fids: [fid],
        });

        const profile = result.users[0];

        this.runtime.cacheManager.set(`farcaster/profile/${fid}`, profile);

        return profile;
    }

    async getTimeline(config: FidRequest): Promise<{
        timeline: CastWithInteractions[];
        nextPageToken?: string | null;
    }> {
        const timeline: CastWithInteractions[] = [];

        const results = await this.getCastsByFid(config);

        results.casts.map((cast) => {
            timeline.push(cast);
        });

        return {
            timeline,
            nextPageToken: results.next.cursor,
        };
    }
}
