import {
    ActionExample,
    composeContext,
    elizaLogger,
    EvaluationExample,
    Evaluator,
    generateObjectV2,
    ModelClass,
} from "@ai16z/eliza";
import {
    HandlerCallback,
    IAgentRuntime,
    Memory,
    Plugin,
    State,
} from "@ai16z/eliza";
import { extractNftParamsTemplate } from "./extractNftParamsTemplate";
import { isNftCreationParams, NftCreationParamsSchema } from "./types";
import { createCollection } from "@cyberlab/ai-external-serivce";

function validateUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}
export const nftGenerationEvaluator: Evaluator = {
    name: "GENERATE_NFT",
    alwaysRun: true,
    similes: [
        "NFT_GENERATION",
        "NFT_GEN",
        "CREATE_NFT",
        "MAKE_NFT",
        "NFT_CREATE",
        "NFT_MAKE",
    ],
    description:
        "Read the message and see if the message contain necessary information (name, description and creator address) to generate a NFT, if yes return true else false",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const text = message.content.text.toLocaleLowerCase();
        return (
            text.includes("nft") ||
            text.includes("mint") ||
            text.includes("collection")
        );
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        _state: State,
        _options: any,
        callback: HandlerCallback
    ) => {
        elizaLogger.log("Nft generation request:", message);

        const state = (await runtime.composeState(message)) as State;

        const context = composeContext({
            state,
            template: extractNftParamsTemplate,
        });

        let content: any;
        try {
            content = await generateObjectV2({
                runtime,
                context,
                // @ts-expect-error there was an type error in source code here
                modelClass: ModelClass.SMALL,
                schema: NftCreationParamsSchema,
            });
        } catch (e) {
            elizaLogger.error(`Failed to generate NFT. Error: ${e}`);
        }
        console.log("🚀 ~ generated params from post:", content);

        if (!isNftCreationParams(content?.object)) {
            callback({
                text: `
Missing Information!

Please confirm that you have provided the following:

- EVM Address: Ensure you have submitted a valid EVM address to earn rewards.
- Image: Make sure you have uploaded an image for your NFT.
- Title: Check that you have provided a title for your NFT.

Please update them and try again.
                `,
                type: "GENERATE_NFT",
                status: "FAILED",
            });
            return;
        }

        const imageUrl: string | false = validateUrl(
            _state.imageUrlInPost as string
        )
            ? (_state.imageUrlInPost as string)
            : false;

        const aiArtistAddress = _state.aiArtistAddress as string | undefined;

        if (!imageUrl) {
            elizaLogger.error(`did not get image url from the post`);
            return callback({
                text: `Please provide an image to generate the NFT`,
                type: "GENERATE_NFT",
                status: "FAILED",
            });
        }

        try {
            console.log(
                "Create NFT here: \n",
                JSON.stringify(content.object, null, 2)
            );
            const result = await createCollection({
                name: content.object.name,
                description: content.object.description,
                creator: aiArtistAddress || content.object.creatorAddress,
                image: imageUrl,
                coCreator: content.object.creatorAddress,
            });
            if (result.nftId) {
                return callback?.({
                    text: `Congrats! Now anyone can mint your NFT via this link, and you’ll earn rewards from the minting fees!,
                ${`${process.env.YUME_SITE_BASE_URL}/mint/${result.nftId}`}
                `,
                    type: "GENERATE_NFT",
                    status: "SUCCESS",
                    nftLink: `${process.env.YUME_SITE_BASE_URL}/mint/${result.nftId}`,
                    nftImageUrl: imageUrl,
                });
            } else {
                return callback?.({
                    text: `Nft generation failed`,
                    type: "GENERATE_NFT",
                    status: "FAILED",
                    error: true,
                });
            }
        } catch (error) {
            elizaLogger.error(`Failed to generate NFT. Error: ${error}`);
            callback({
                text: `Nft generation failed: ${error.message}`,
                error: true,
            });
        }
    },
    examples: [
        {
            context: `Actors in the scene:
{{user1}}: a random user on the internet who wants to mint an NFT
            `,
            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        text: "can you help me mint this NFT? Name:SpaceMan, Description:A lone astronaut floats weightlessly in the void, surrounded by swirling galaxies and nebulae. His helmet reflects distant stars, capturing the endless mystery of the cosmos. The perfect fusion of solitude and wonder. Creator Wallet: 0xFc8Baaf63e61507100FB4901ac7d0F58FF015E5F",
                    },
                },
            ] as ActionExample[],
            outcome: `Create: 
json\`\`\`
{
  "name": "SpaceMan",
  "description": "A lone astronaut floats weightlessly in the void, surrounded by swirling galaxies and nebulae. His helmet reflects distant stars, capturing the endless mystery of the cosmos. The perfect fusion of solitude and wonder.",
  "image": "https://www.example.com/image.jpg",
  "creatorAddress": "0xFc8Baaf63e61507100FB4901ac7d0F58FF015E5F"
  }
\`\`\`,
            `,
        },
        {
            context: `Actors in the scene:
{{user1}}: a artist on the internet who wants to create an nft from their work`,
            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        text: "I want to create this NFT: Name:SunsetBeach, Description:A beautiful sunset on a tropical beach, with palm trees swaying gently in the breeze. The sky is painted in shades of pink, orange, and purple, casting a warm glow over the sand and sea. creator address: 0xFc8Baaf63e61507100FB4901ac7d0F58FF015E5F",
                    },
                },
            ] as ActionExample[],
            outcome: `Create:
            json\`\`\`
            {
              "name": "SunsetBeach",
              "description": "A beautiful sunset on a tropical beach, with palm trees swaying gently in the breeze. The sky is painted in shades of pink, orange, and purple, casting a warm glow over the sand and sea.",
              "image": "https://www.example.com/image.jpg",
              "creatorAddress": "0xFc8Baaf63e61507100FB4901ac7d0F58FF015E5F"
            }
             \`\`\`
            `,
        },
    ] as EvaluationExample[],
};

export const nftGenerationPlugin: Plugin = {
    name: "nftGeneration",
    description: "Generate nft from text prompts",
    actions: [],
    evaluators: [nftGenerationEvaluator],
    providers: [],
};
