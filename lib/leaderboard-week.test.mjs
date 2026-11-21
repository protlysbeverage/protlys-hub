import test from 'node:test'; import assert from 'node:assert/strict';
import {isoWeekStart,summarizeMemberWeek,weekContextLabel} from './leaderboard-week.js';
test('Nairobi leaderboard weeks start on Sunday',()=>{
  assert.equal(isoWeekStart(new Date('2026-10-25T12:00:00Z'),'UTC'),'2026-10-25');
  assert.equal(isoWeekStart(new Date('2026-10-26T12:00:00Z'),'UTC'),'2026-10-25');
});
test('current week totals today distance and movement days',()=>{const s=summarizeMemberWeek([{date:'2026-10-25',steps:1000},{date:'2026-10-26',steps:2000}],'2026-10-25','2026-10-26');assert.equal(s.weeklySteps,3000);assert.equal(s.stepsToday,2000);assert.equal(s.movementDays,2);assert.equal(s.distanceKm,2.25);});
test('past week returns best day and zero days are 0/7',()=>{const s=summarizeMemberWeek([{date:'2026-10-18',steps:0},{date:'2026-10-19',steps:5000}],'2026-10-18','2026-10-27');assert.equal(s.stepsToday,null);assert.equal(s.bestDay.steps,5000);assert.equal(s.movementDays,1);const z=summarizeMemberWeek([],'2026-10-18','2026-10-27');assert.equal(z.movementDays,0);assert.equal(weekContextLabel('2026-10-18','2026-10-25'),'Week of 18 Oct 2026');});
test('hidden privacy can be represented without calculating numbers',()=>{const payload={steps_visible:false};assert.equal(payload.steps_visible,false);assert.equal(payload.days,undefined);});
