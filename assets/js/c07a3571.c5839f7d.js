"use strict";(self.webpackChunkeliza_docs=self.webpackChunkeliza_docs||[]).push([[3194],{251:(e,n,a)=>{a.r(n),a.d(n,{assets:()=>l,contentTitle:()=>i,default:()=>m,frontMatter:()=>r,metadata:()=>o,toc:()=>c});var t=a(4848),s=a(8453);const r={id:"messageHandlerTemplate",title:"Variable: messageHandlerTemplate",sidebar_label:"messageHandlerTemplate",sidebar_position:0,custom_edit_url:null},i=void 0,o={id:"variables/messageHandlerTemplate",title:"Variable: messageHandlerTemplate",description:'\u2022 Const messageHandlerTemplate DO NOT USE THE INFORMATION FROM THE EXAMPLES ABOVE. THE EXAMPLES ARE FOR REFERENCE ONLY.\\n\\n~~~\\n\\n# TASK Generate the next message in the scene for {}\\n\\nResponse format should be formatted in a JSON block like this \\"{{agentName}}\\", \\"content\\" string }\\n`\\n\\n{{recentMessages}}"',source:"@site/api/variables/messageHandlerTemplate.md",sourceDirName:"variables",slug:"/variables/messageHandlerTemplate",permalink:"/eliza/api/variables/messageHandlerTemplate",draft:!1,unlisted:!1,editUrl:null,tags:[],version:"current",sidebarPosition:0,frontMatter:{id:"messageHandlerTemplate",title:"Variable: messageHandlerTemplate",sidebar_label:"messageHandlerTemplate",sidebar_position:0,custom_edit_url:null},sidebar:"apiSidebar",previous:{title:"evaluationTemplate",permalink:"/eliza/api/variables/evaluationTemplate"},next:{title:"addHeader",permalink:"/eliza/api/functions/addHeader"}},l={},c=[];function d(e){const n={code:"code",p:"p",strong:"strong",...(0,s.R)(),...e.components};return(0,t.jsxs)(n.p,{children:["\u2022 ",(0,t.jsx)(n.code,{children:"Const"})," ",(0,t.jsx)(n.strong,{children:"messageHandlerTemplate"}),": ",(0,t.jsx)(n.code,{children:'"{{actionExamples}}\\n\\n# IMPORTANT: DO NOT USE THE INFORMATION FROM THE EXAMPLES ABOVE. THE EXAMPLES ARE FOR REFERENCE ONLY.\\n\\n~~~\\n\\n# TASK: GENERATE THE NEXT MESSAGE IN THE SCENE FOR {{agentName}}\\n- Generate the next message in the scene for {{agentName}}\\n- {{agentName}} is not an assistant - do not write assistant-like responses or ask questions\\n- Include content and action in the response\\n- Available actions are {{actionNames}}\\n\\n{{lore}}\\n{{relevantFacts}}\\n{{recentFacts}}\\n{{goals}}\\n{{actors}}\\n{{actionNames}}\\n{{actions}}\\n{{providers}}\\n\\n# INSTRUCTIONS: Generate the next message in the scene for {{agentName}}\\n\\nResponse format should be formatted in a JSON block like this:\\n```json\\n{ \\"user\\": \\"{{agentName}}\\", \\"content\\": string, \\"action\\": string }\\n```\\n\\n{{recentMessages}}"'})]})}function m(e={}){const{wrapper:n}={...(0,s.R)(),...e.components};return n?(0,t.jsx)(n,{...e,children:(0,t.jsx)(d,{...e})}):d(e)}},8453:(e,n,a)=>{a.d(n,{R:()=>i,x:()=>o});var t=a(6540);const s={},r=t.createContext(s);function i(e){const n=t.useContext(r);return t.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function o(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(s):e.components||s:i(e.components),t.createElement(r.Provider,{value:n},e.children)}}}]);