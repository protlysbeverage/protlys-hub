import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('fullscreen challenge route includes all real-data types and validation',()=>{const s=read('app/challenges/new/NewChallengeClient.js');for(const x of ['steps','protein','movement_days','stillness','distance'])assert.ok(s.includes("'"+x+"'"));assert.match(s,/maxLength=\{50\}/);assert.match(s,/maxLength=\{200\}/);assert.match(s,/type="date"/);assert.match(s,/end>=start/);assert.match(s,/90/);assert.match(s,/days_hit/);});
test('challenge creation stores type target scoring mode and group id',()=>{const s=read('app/challenges/new/NewChallengeClient.js');for(const x of ['challenge_type:type','target:Number(target)','scoring_mode:score','group_id:groupId||null'])assert.ok(s.includes(x));assert.match(s,/visibility:groupId\?'private':visibility/);});
test('challenge ranking is strict and distance uses the Overview formula',()=>{const s=read('supabase/migrations/20261027073827_challenge_types_fullscreen_flows.sql');assert.match(s,/row_number\(\) over\(order by progress desc,reached_day asc nulls last,joined_at asc,user_id\)/);assert.match(s,/d\.value\*0\.00075/);});
