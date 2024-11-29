import { elizaLogger } from "@ai16z/eliza";

export const generateImage = async (prompt: string, modelId: string) => {
    const res = await fetch("https://api.stg.cyberconnect.dev/yume/", {
        method: "POST",
        headers: {
            "Accept-Encoding": "gzip, deflate, br",
            "Content-Type": "application/json",
            Accept: "application/json",
            Connection: "keep-alive",
        },
        body: JSON.stringify({
            query: `mutation {\n  generateImage(prompt: ${prompt}, modelId: ${modelId})\n}`,
            variables: {},
        }),
    });
    const data = await res.json();
    elizaLogger.log('image generation:', data)
    return data?.data?.generateImage;
};
