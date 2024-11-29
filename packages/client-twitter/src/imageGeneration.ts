import { elizaLogger } from "@ai16z/eliza";

export const ChibsModelId = "9d758849-365e-4cf5-8dc1-0fdd9bc3209c";

export const promptForChibs = (prompt: string) => {
    let p = prompt.toLowerCase().replaceAll("chibs", "penguin").replaceAll("chibling", "penguin");
    p += "; cartoon style; cute white eyes with black eyeball; flat color background;";
    p = "draw a penguin cartoon for this tweet:"
    return p;
};

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
            query: `mutation {\n  generateImage(prompt: "${prompt}", modelId: "${modelId}")\n}`,
            variables: {},
        }),
    });
    const data = await res.json();
    elizaLogger.log("image generation prompt:", prompt);
    return data?.data?.generateImage;
};
