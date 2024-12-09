import { elizaLogger } from "@ai16z/eliza";

export const ChibsModelId = "9d758849-365e-4cf5-8dc1-0fdd9bc3209c";

export const promptByGpt = async (prompt: string) => {
    const response = await (
        await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "user",
                        content:
                            "Infer a description in less than 20 words for this text: " +
                            prompt,
                    },
                ],
            }),
        })
    ).json();
    return response?.choices?.[0]?.message?.content as string;
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
            query: `mutation generateImage($prompt: String!, $modelId: String!) {
  generateImage(
    input: { prompt: $prompt, modelId: $modelId, signature: "LsVo7wLdn7XPAOTcb12802hykFWuM0zkRli0YwZdnsghEvBJpWeLV8dfchrZ" }
  ) {
    status
    uri
  }
}`,
            variables: {
                prompt,
                modelId,
            },
        }),
    });

    const data = await res.json();
    console.log("🚀 ~ generateImage ~ data:", JSON.stringify(data));
    elizaLogger.log("🚀 ~ image generation prompt:", prompt);
    elizaLogger.log("🚀 ~ image generation modelId:", modelId);
    return data?.data?.generateImage?.uri;
};
