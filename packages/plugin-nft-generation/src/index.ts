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
        // elizaLogger.log("Validating nft generation action");
        // return !!lumaApiKey;
        return (
            message.content.text.includes("nft") ||
            message.content.text.includes("NFT") ||
            message.content.text.includes("Nft") ||
            message.content.text.includes("mint") ||
            message.content.text.includes("Mint")
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
        console.log("🚀 ~ content:", content);

        if (!isNftCreationParams(content?.object)) {
            callback({
                text: "Could you please provide more details about the nft you'd like me to generate? It should contain a name, description, and creator address.",
                type: "GENERATE_NFT",
                status: "FAILED",
            });
            return;
        }

        try {
            console.log(
                "Create NFT here: \n",
                JSON.stringify(content.object, null, 2)
            );
            const result = await createCollection({
                name: content.object.name,
                description: content.object.description,
                creator: content.object.creatorAddress,
                image: "",
            });
            return callback({
                text: `Here is your generated NFT link! tokenId:${result.tokenId}, contractAddress:${result.contractAddress},
                nftLink: ${`${process.env.YUME_SITE_BASE_URL}/mint/${result.nftId}`}
                `,
                type: "GENERATE_NFT",
                status: "SUCCESS",
                nftLink: "https://www.example.com/image.jpg",
            });
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
