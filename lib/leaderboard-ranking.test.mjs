import test from 'node:test';import assert from 'node:assert/strict';import {strictRank,dashboardRows} from './leaderboard-ranking.js';import fs from 'node:fs';

test('ties rank strictly by steps, reached time, then join date',()=>{const rows=[
 {user_id:'c',steps:100,reached_at:'2026-10-27T09:00:00Z',joined_at:'2026-01-01'},
 {user_id:'b',steps:100,reached_at:'2026-10-27T08:00:00Z',joined_at:'2026-02-01'},
 {user_id:'a',steps:100,reached_at:'2026-10-27T08:00:00Z',joined_at:'2026-01-01'},
 {user_id:'d',steps:90,reached_at:'2026-10-27T07:00:00Z',joined_at:'2025-01-01'}];
 const ranked=strictRank(rows);assert.deepEqual(ranked.map(r=>r.user_id),['a','b','c','d']);assert.deepEqual(ranked.map(r=>r.rank),[1,2,3,4]);});

test('dashboard order is the movement ranking top 3 plus viewer when outside top 3',()=>{const rows=['a','b','c','me'].map((id,i)=>({user_id:id,steps:400-i*100,reached_at:`2026-10-27T0${i}:00:00Z`,joined_at:'2026-01-01'}));const movement=strictRank(rows);const dashboard=dashboardRows(rows,'me');assert.deepEqual(dashboard.map(r=>r.user_id),[...movement.slice(0,3).map(r=>r.user_id),'me']);assert.equal(dashboard[3].rank,4);});

test('shared member sheet is a body portal with backdrop below sheet and all close handlers',()=>{const src=fs.readFileSync(new URL('../components/MemberProfileSheet.js',import.meta.url),'utf8');assert.match(src,/createPortal\(/);assert.match(src,/document\.body/);const css=fs.readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');assert.match(css,/\.member-sheet-backdrop\{[^}]*z-index:8000/);assert.match(css,/\.member-profile-sheet\{[^}]*z-index:8001/);assert.match(src,/member-sheet-backdrop[^>]*onClick=\{close\}/);assert.match(src,/e\.key==='Escape'/);assert.match(src,/popstate/);assert.match(src,/changedTouches\[0\]\.clientY-startY\.current>70/);});

test('dashboard and movement both import the shared ranking and member sheet',()=>{const dashboard=fs.readFileSync(new URL('../components/WeeklyGroupLeaderboard.js',import.meta.url),'utf8');const movement=fs.readFileSync(new URL('../app/leaderboard/LeaderboardClient.js',import.meta.url),'utf8');for(const src of [dashboard,movement]){assert.match(src,/leaderboard-ranking/);assert.match(src,/MemberProfileSheet/)}assert.doesNotMatch(dashboard,/function MemberSheet/);assert.doesNotMatch(movement,/function MemberSheet/);});
