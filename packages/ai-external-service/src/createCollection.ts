type CreateCollectionByAgentInput = {
    name: string;
    description: string;
    image: string; // url
    creator?: string;
    totalSupply?: number;
};
export const createCollection = async (
    params: CreateCollectionByAgentInput
) => {
    const res = await fetch("https://api.stg.cyberconnect.dev/yume/", {
        method: "POST",
        headers: {
            "Accept-Encoding": "gzip, deflate, br",
            "Content-Type": "application/json",
            Accept: "application/json",
            Connection: "keep-alive",
        },
        body: JSON.stringify({
            query: `
mutation {
  CreateCollectionByAgent(
    input: { name: "${params.name}", description: "${params.description}", image:"${params.image}", signature: "LsVo7wLdn7XPAOTcb12802hykFWuM0zkRli0YwZdnsghEvBJpWeLV8dfchrZ" }
  ) {
    status
  }
}
`,
            variables: {},
        }),
    });
    const data = await res.json();
    console.log("🚀 ~ generateImage ~ data:", data);
    return data?.data?.generateImage;
};
