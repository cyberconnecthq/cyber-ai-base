type CreateCollectionByAgentInput = {
    name: string;
    description: string;
    image: string; // url
    creator: string;
    totalSupply?: number;
    coCreator?: string;
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
mutation createToken($input: CreateCollectionByAgentInput!) {
  CreateCollectionByAgent(input: $input) {
    status
    tokenId
    contractAddress
    nftId
  }
}
`,
            variables: {
                input: {
                    creator: params.creator,
                    name: params.name,
                    description: params.description,
                    image: params.image,
                    signature:
                        "LsVo7wLdn7XPAOTcb12802hykFWuM0zkRli0YwZdnsghEvBJpWeLV8dfchrZ",
                    coCreator: params.coCreator,
                },
            },
        }),
    });
    const data = await res.json();
    console.log("🚀 ~ generated nft ~ data:", data);
    return {
        status: data?.data?.CreateCollectionByAgent?.status,
        contractAddress: data?.data?.CreateCollectionByAgent?.contractAddress,
        tokenId: data?.data?.CreateCollectionByAgent?.tokenId,
        nftId: data?.data?.CreateCollectionByAgent?.nftId,
    };
};