import assert from 'node:assert/strict';
import {AI_PROJECT_ID,AI_UPLOAD_PROJECT_ID,aiProjectRoute,AI_PROMPT,AI_SCHEMA,validateAIReport,analyzeAI,ensureAIProject} from '../ai-project.mjs';
export const report={title:'시험 사업',summary:'문서 근거를 바탕으로 구성한 테스트 결과',sections:[
 {title:'냉각 방식과 확보 조건',type:'paragraphs',paragraphs:['수랭 방식 도입 예정.'],bullets:[],columns:[],rows:[],metrics:[],refs:[{page:1,quote:'수랭 방식 도입 예정'}]},
 {title:'투자 판단에 필요한 수치',type:'metrics',paragraphs:[],bullets:[],columns:[],rows:[],metrics:[{label:'계획 용량',value:'3.6MW',note:'확정 아님'}],refs:[]},
 {title:'비교 조건',type:'table',paragraphs:[],bullets:[],columns:['항목','내용'],rows:[['추진 상태','검토 중']],metrics:[],refs:[]}
],warnings:['수전 미확정']};
assert.deepEqual(validateAIReport(report),report);
assert.throws(()=>validateAIReport({...report,sections:[{...report.sections[2],rows:[['one']]}]}));
await assert.rejects(()=>analyzeAI({name:'a.pdf',kind:'pdf',data:'JVBERi0='},{}),/API 키/);
let called;
const result=await analyzeAI({name:'report.pdf',kind:'pdf',data:'JVBERi0=',instruction:'핵심 정리'}, {ANTHROPIC_API_KEY:'unit-only'},async(url,opt)=>{
 called={url,opt,body:JSON.parse(opt.body)};
 return Response.json({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(report)}],usage:{input_tokens:100,output_tokens:200}});
});
assert.deepEqual(result.report,report);assert.equal(called.body.model,'claude-fable-5-2');assert.equal(called.body.output_config.effort,'high');assert.equal(called.url,'https://api.anthropic.com/v1/messages');assert.equal(called.body.system,AI_PROMPT);assert.deepEqual(called.body.output_config.format.schema,AI_SCHEMA);
await assert.rejects(()=>analyzeAI({name:'r',kind:'text',text:'문서'}, {ANTHROPIC_API_KEY:'unit-only'},async()=>Response.json({stop_reason:'max_tokens',content:[]})),/끝까지/);
const records={'project:keep':{full:'기존'},'meta:flags':{existing:true},'meta:order':['keep']};
const ws={get:id=>records[id],put:(id,v)=>records[id]=v,ctx:{storage:{transactionSync:f=>f()}}};
ensureAIProject(ws);assert.equal(records['project:keep'].full,'기존');assert.deepEqual(records['meta:order'],['keep',AI_PROJECT_ID,AI_UPLOAD_PROJECT_ID]);
delete records['project:'+AI_PROJECT_ID];ensureAIProject(ws);assert.equal(records['project:'+AI_PROJECT_ID],undefined);
console.log('PASS validation, missing key, bounded output, prompt/API contract, isolated one-time project creation');

const old={report:{title:'existing'},revision:7};records['meta:head']={[AI_PROJECT_ID]:{aiOverview:old}};
ws.env={ANTHROPIC_API_KEY:'test'};ws.sql={exec:()=>({toArray:()=>[]})};ws.broadcast=()=>{};
const url='https://test/api/ai-project/';
let response=await aiProjectRoute(ws,new Request(url+'status?project='+AI_UPLOAD_PROJECT_ID),'test','token');
assert.equal((await response.json()).saved,null);
response=await aiProjectRoute(ws,new Request(url+'save?project='+AI_UPLOAD_PROJECT_ID,{method:'POST',body:JSON.stringify({report,revision:0,source:{name:'manual',kind:'manual'}})}),'test','token');
assert.equal(response.status,200);
assert.deepEqual(records['meta:head'][AI_PROJECT_ID].aiOverview,old);
assert.equal(records['meta:head'][AI_UPLOAD_PROJECT_ID].aiOverview.report.title,report.title);
console.log('PASS independent new AI project storage and original overview preservation');
