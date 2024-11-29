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
    return data?.data?.generateImage;
};
