const {test}=require('node:test');
const assert=require('node:assert/strict');
const {ScoringService}=require('../dist/modules/attempts/scoring.service');
test('objective scoring requires exact answers and keeps manual work ungraded',()=>{
 const s=new ScoringService(),options=['a','b','c'];
 assert.equal(s.grade('MULTIPLE_CHOICE','READING',{selectedOptionIds:['a']},{correctOptionIndexes:[0,2]},options).score,0);
 assert.equal(s.grade('MULTIPLE_CHOICE','READING',{selectedOptionIds:['c','a']},{correctOptionIndexes:[0,2]},options).score,1);
 assert.equal(s.grade('CHOOSE_CORRECT','READING',{selectedOptionIds:['a']},{correctOptionIndexes:[1]},options).score,0);
 assert.equal(s.grade('TRUE_FALSE','READING',{value:true},{value:false},[]).score,0);
 assert.equal(s.grade('SHORT_ANSWER','READING',{text:'bye'},{acceptedAnswers:['hello']},[]).score,0);
 assert.equal(s.grade('MATCHING','READING',{pairs:[{left:'A',right:'2'},{left:'B',right:'1'}]},{pairs:[{left:'A',right:'1'},{left:'B',right:'2'}]},[]).score,0);
 assert.equal(s.grade('TRUE_FALSE','READING',{}, {value:false},[]).score,0);
 assert.equal(s.grade('SHORT_ANSWER','WRITING',{text:'hello'},{acceptedAnswers:['hello']},[]).gradingStatus,'NEEDS_MANUAL_GRADING');
 assert.equal(s.grade('SHORT_ANSWER','SPEAKING',{text:'hello'},{acceptedAnswers:['hello']},[]).score,0);
});
