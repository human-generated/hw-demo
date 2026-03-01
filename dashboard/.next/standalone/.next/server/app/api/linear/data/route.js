"use strict";(()=>{var e={};e.id=9700,e.ids=[9700],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},2719:(e,t,a)=>{a.r(t),a.d(t,{originalPathname:()=>j,patchFetch:()=>g,requestAsyncStorage:()=>m,routeModule:()=>h,serverHooks:()=>y,staticGenerationAsyncStorage:()=>f});var n={};a.r(n),a.d(n,{GET:()=>c,POST:()=>l,dynamic:()=>s});var r=a(9303),o=a(8716),i=a(670);let s="force-dynamic",p=`query Dashboard {
  viewer {
    id name email
    assignedIssues(
      filter: { state: { type: { nin: ["completed", "cancelled"] } } }
      first: 100
      orderBy: updatedAt
    ) {
      nodes {
        id identifier title priority url updatedAt
        state { name color type }
        team { name key }
        project { name }
      }
    }
  }
  teams { nodes { id name key color } }
}`;async function u(){try{let e=await fetch("http://159.65.205.244:3000/config/linear-token",{cache:"no-store"});return(await e.json()).token||null}catch{return null}}async function d(e,t,a){return(await fetch("https://api.linear.app/graphql",{method:"POST",headers:{Authorization:`Bearer ${e}`,"Content-Type":"application/json"},body:JSON.stringify({query:t,variables:a}),cache:"no-store"})).json()}async function c(){if(!process.env.LINEAR_CLIENT_ID)return Response.json({not_configured:!0});let e=await u();if(!e)return Response.json({not_authenticated:!0},{status:401});let t=await d(e,p);return t.errors?.[0]?.extensions?.code==="UNAUTHENTICATED"?Response.json({not_authenticated:!0},{status:401}):Response.json(t)}async function l(e){let t=await u();if(!t)return Response.json({not_authenticated:!0},{status:401});let{query:a,variables:n}=await e.json();return Response.json(await d(t,a,n))}let h=new r.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/linear/data/route",pathname:"/api/linear/data",filename:"route",bundlePath:"app/api/linear/data/route"},resolvedPagePath:"/tmp/hw-demo/dashboard/app/api/linear/data/route.js",nextConfigOutput:"standalone",userland:n}),{requestAsyncStorage:m,staticGenerationAsyncStorage:f,serverHooks:y}=h,j="/api/linear/data/route";function g(){return(0,i.patchFetch)({serverHooks:y,staticGenerationAsyncStorage:f})}},9303:(e,t,a)=>{e.exports=a(517)}};var t=require("../../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),n=t.X(0,[8948],()=>a(2719));module.exports=n})();