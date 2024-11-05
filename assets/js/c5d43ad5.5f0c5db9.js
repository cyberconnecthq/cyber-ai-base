"use strict";(self.webpackChunkeliza_docs=self.webpackChunkeliza_docs||[]).push([[578],{431:(e,n,a)=>{a.r(n),a.d(n,{assets:()=>o,contentTitle:()=>l,default:()=>h,frontMatter:()=>s,metadata:()=>r,toc:()=>c});var t=a(4848),i=a(8453);const s={sidebar_position:5},l="Evaluators",r={id:"core/evaluators",title:"Evaluators",description:"Evaluators are components that assess and extract information from conversations, helping agents build long-term memory and track goal progress. They analyze conversations to extract facts, update goals, and maintain agent state.",source:"@site/docs/core/evaluators.md",sourceDirName:"core",slug:"/core/evaluators",permalink:"/eliza/docs/core/evaluators",draft:!1,unlisted:!1,editUrl:"https://github.com/ai16z/eliza/tree/main/docs/docs/core/evaluators.md",tags:[],version:"current",sidebarPosition:5,frontMatter:{sidebar_position:5},sidebar:"tutorialSidebar",previous:{title:"Actions",permalink:"/eliza/docs/core/actions"},next:{title:"Basic Usage",permalink:"/eliza/docs/guides/basic-usage"}},o={},c=[{value:"Overview",id:"overview",level:2},{value:"Built-in Evaluators",id:"built-in-evaluators",level:2},{value:"Fact Evaluator",id:"fact-evaluator",level:3},{value:"Fact Types",id:"fact-types",level:4},{value:"Example Facts:",id:"example-facts",level:4},{value:"Goal Evaluator",id:"goal-evaluator",level:3},{value:"Goal Updates",id:"goal-updates",level:4},{value:"Example Goal:",id:"example-goal",level:4},{value:"Creating Custom Evaluators",id:"creating-custom-evaluators",level:2},{value:"Best Practices",id:"best-practices",level:2},{value:"Fact Extraction",id:"fact-extraction",level:3},{value:"Goal Tracking",id:"goal-tracking",level:3},{value:"Memory Integration",id:"memory-integration",level:2},{value:"Related",id:"related",level:2}];function d(e){const n={code:"code",h1:"h1",h2:"h2",h3:"h3",h4:"h4",header:"header",li:"li",ol:"ol",p:"p",pre:"pre",strong:"strong",ul:"ul",...(0,i.R)(),...e.components};return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(n.header,{children:(0,t.jsx)(n.h1,{id:"evaluators",children:"Evaluators"})}),"\n",(0,t.jsx)(n.p,{children:"Evaluators are components that assess and extract information from conversations, helping agents build long-term memory and track goal progress. They analyze conversations to extract facts, update goals, and maintain agent state."}),"\n",(0,t.jsx)(n.h2,{id:"overview",children:"Overview"}),"\n",(0,t.jsx)(n.p,{children:"Evaluators help agents:"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Extract useful information from conversations"}),"\n",(0,t.jsx)(n.li,{children:"Track progress toward goals"}),"\n",(0,t.jsx)(n.li,{children:"Build long-term memory"}),"\n",(0,t.jsx)(n.li,{children:"Maintain context awareness"}),"\n"]}),"\n",(0,t.jsx)(n.h2,{id:"built-in-evaluators",children:"Built-in Evaluators"}),"\n",(0,t.jsx)(n.h3,{id:"fact-evaluator",children:"Fact Evaluator"}),"\n",(0,t.jsx)(n.p,{children:"The fact evaluator extracts factual information from conversations for long-term memory storage."}),"\n",(0,t.jsx)(n.pre,{children:(0,t.jsx)(n.code,{className:"language-typescript",children:"interface Fact {\n    claim: string;\n    type: 'fact' | 'opinion' | 'status';\n    in_bio: boolean;\n    already_known: boolean;\n}\n"})}),"\n",(0,t.jsx)(n.h4,{id:"fact-types",children:"Fact Types"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.code,{children:"fact"}),": True statements about the world or character that don't change"]}),"\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.code,{children:"status"}),": Facts that are true but may change over time"]}),"\n",(0,t.jsxs)(n.li,{children:[(0,t.jsx)(n.code,{children:"opinion"}),": Non-factual opinions, thoughts, feelings, or recommendations"]}),"\n"]}),"\n",(0,t.jsx)(n.h4,{id:"example-facts",children:"Example Facts:"}),"\n",(0,t.jsx)(n.pre,{children:(0,t.jsx)(n.code,{className:"language-json",children:'[\n  {\n    "claim": "User lives in Oakland",\n    "type": "fact",\n    "in_bio": false,\n    "already_known": false\n  },\n  {\n    "claim": "User completed marathon in 3 hours",\n    "type": "fact", \n    "in_bio": false,\n    "already_known": false\n  },\n  {\n    "claim": "User is proud of their achievement",\n    "type": "opinion",\n    "in_bio": false,\n    "already_known": false\n  }\n]\n'})}),"\n",(0,t.jsx)(n.h3,{id:"goal-evaluator",children:"Goal Evaluator"}),"\n",(0,t.jsx)(n.p,{children:"The goal evaluator tracks progress on agent goals and objectives."}),"\n",(0,t.jsx)(n.pre,{children:(0,t.jsx)(n.code,{className:"language-typescript",children:"interface Goal {\n    id: string;\n    name: string;\n    status: 'IN_PROGRESS' | 'DONE' | 'FAILED';\n    objectives: Objective[];\n}\n\ninterface Objective {\n    description: string;\n    completed: boolean;\n}\n"})}),"\n",(0,t.jsx)(n.h4,{id:"goal-updates",children:"Goal Updates"}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Monitors conversation for goal progress"}),"\n",(0,t.jsx)(n.li,{children:"Updates objective completion status"}),"\n",(0,t.jsx)(n.li,{children:"Marks goals as complete when all objectives are done"}),"\n",(0,t.jsx)(n.li,{children:"Marks goals as failed when they cannot be completed"}),"\n"]}),"\n",(0,t.jsx)(n.h4,{id:"example-goal",children:"Example Goal:"}),"\n",(0,t.jsx)(n.pre,{children:(0,t.jsx)(n.code,{className:"language-json",children:'{\n  "id": "goal-123",\n  "name": "Complete Marathon Training",\n  "status": "IN_PROGRESS",\n  "objectives": [\n    {\n      "description": "Run 30 miles per week",\n      "completed": true\n    },\n    {\n      "description": "Complete practice half-marathon", \n      "completed": false\n    }\n  ]\n}\n'})}),"\n",(0,t.jsx)(n.h2,{id:"creating-custom-evaluators",children:"Creating Custom Evaluators"}),"\n",(0,t.jsx)(n.p,{children:"To create a custom evaluator, implement the Evaluator interface:"}),"\n",(0,t.jsx)(n.pre,{children:(0,t.jsx)(n.code,{className:"language-typescript",children:"interface Evaluator {\n    name: string;\n    similes: string[];\n    description: string;\n    validate: (runtime: IAgentRuntime, message: Memory) => Promise<boolean>;\n    handler: (\n        runtime: IAgentRuntime,\n        message: Memory,\n        state?: State,\n        options?: any\n    ) => Promise<any>;\n    examples: EvaluatorExample[];\n}\n"})}),"\n",(0,t.jsx)(n.p,{children:"Example custom evaluator:"}),"\n",(0,t.jsx)(n.pre,{children:(0,t.jsx)(n.code,{className:"language-typescript",children:'const customEvaluator: Evaluator = {\n    name: "CUSTOM_EVALUATOR",\n    similes: ["ALTERNATE_NAME"],\n    description: "Evaluates something in the conversation",\n    validate: async (runtime, message) => {\n        // Determine if evaluation should run\n        return true;\n    },\n    handler: async (runtime, message, state, options) => {\n        // Evaluation logic\n        return evaluationResult;\n    },\n    examples: [\n        // Example inputs and outputs\n    ]\n};\n'})}),"\n",(0,t.jsx)(n.h2,{id:"best-practices",children:"Best Practices"}),"\n",(0,t.jsx)(n.h3,{id:"fact-extraction",children:"Fact Extraction"}),"\n",(0,t.jsxs)(n.ol,{children:["\n",(0,t.jsxs)(n.li,{children:["\n",(0,t.jsx)(n.p,{children:(0,t.jsx)(n.strong,{children:"Avoid Duplication"})}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Check for existing facts"}),"\n",(0,t.jsx)(n.li,{children:"Only store new information"}),"\n",(0,t.jsx)(n.li,{children:"Mark duplicates as already_known"}),"\n"]}),"\n"]}),"\n",(0,t.jsxs)(n.li,{children:["\n",(0,t.jsx)(n.p,{children:(0,t.jsx)(n.strong,{children:"Proper Categorization"})}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Distinguish between facts/opinions/status"}),"\n",(0,t.jsx)(n.li,{children:"Check if fact exists in bio"}),"\n",(0,t.jsx)(n.li,{children:"Include relevant context"}),"\n"]}),"\n"]}),"\n",(0,t.jsxs)(n.li,{children:["\n",(0,t.jsx)(n.p,{children:(0,t.jsx)(n.strong,{children:"Quality Control"})}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Remove corrupted facts"}),"\n",(0,t.jsx)(n.li,{children:"Validate fact format"}),"\n",(0,t.jsx)(n.li,{children:"Ensure facts are meaningful"}),"\n"]}),"\n"]}),"\n"]}),"\n",(0,t.jsx)(n.h3,{id:"goal-tracking",children:"Goal Tracking"}),"\n",(0,t.jsxs)(n.ol,{children:["\n",(0,t.jsxs)(n.li,{children:["\n",(0,t.jsx)(n.p,{children:(0,t.jsx)(n.strong,{children:"Clear Objectives"})}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Break goals into measurable objectives"}),"\n",(0,t.jsx)(n.li,{children:"Define completion criteria"}),"\n",(0,t.jsx)(n.li,{children:"Track partial progress"}),"\n"]}),"\n"]}),"\n",(0,t.jsxs)(n.li,{children:["\n",(0,t.jsx)(n.p,{children:(0,t.jsx)(n.strong,{children:"Status Updates"})}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Only update changed goals"}),"\n",(0,t.jsx)(n.li,{children:"Include complete objectives list"}),"\n",(0,t.jsx)(n.li,{children:"Preserve unchanged data"}),"\n"]}),"\n"]}),"\n",(0,t.jsxs)(n.li,{children:["\n",(0,t.jsx)(n.p,{children:(0,t.jsx)(n.strong,{children:"Failure Handling"})}),"\n",(0,t.jsxs)(n.ul,{children:["\n",(0,t.jsx)(n.li,{children:"Define failure conditions"}),"\n",(0,t.jsx)(n.li,{children:"Record failure reasons"}),"\n",(0,t.jsx)(n.li,{children:"Allow goal adaptation"}),"\n"]}),"\n"]}),"\n"]}),"\n",(0,t.jsx)(n.h2,{id:"memory-integration",children:"Memory Integration"}),"\n",(0,t.jsx)(n.p,{children:"Evaluators work with the memory system to:"}),"\n",(0,t.jsxs)(n.ol,{children:["\n",(0,t.jsx)(n.li,{children:"Store extracted facts"}),"\n",(0,t.jsx)(n.li,{children:"Update goal states"}),"\n",(0,t.jsx)(n.li,{children:"Build long-term context"}),"\n",(0,t.jsx)(n.li,{children:"Maintain conversation history"}),"\n"]}),"\n",(0,t.jsx)(n.p,{children:"Example memory integration:"}),"\n",(0,t.jsx)(n.pre,{children:(0,t.jsx)(n.code,{className:"language-typescript",children:"// Store new fact\nconst factMemory = await runtime.factManager.addEmbeddingToMemory({\n    userId: agentId,\n    content: { text: fact },\n    roomId,\n    createdAt: Date.now()\n});\n\nawait runtime.factManager.createMemory(factMemory, true);\n"})}),"\n",(0,t.jsx)(n.h2,{id:"related",children:"Related"})]})}function h(e={}){const{wrapper:n}={...(0,i.R)(),...e.components};return n?(0,t.jsx)(n,{...e,children:(0,t.jsx)(d,{...e})}):d(e)}},8453:(e,n,a)=>{a.d(n,{R:()=>l,x:()=>r});var t=a(6540);const i={},s=t.createContext(i);function l(e){const n=t.useContext(s);return t.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function r(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(i):e.components||i:l(e.components),t.createElement(s.Provider,{value:n},e.children)}}}]);