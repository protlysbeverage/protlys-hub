import test from 'node:test';import assert from 'node:assert/strict';import {hallUrl,leaderboardUrl,hallViewFromHash,closeMemberSheet} from './hall-navigation.js';
test('Hall of Fame gets a URL history target',()=>assert.equal(hallUrl('/leaderboard','?period=last_week'),'/leaderboard?period=last_week#hall-of-fame'));
test('back and Leaderboard tab target preserve selected period',()=>assert.equal(leaderboardUrl('/leaderboard','?period=last_week'),'/leaderboard?period=last_week'));
test('refresh restores Hall of Fame from hash',()=>assert.equal(hallViewFromHash('#hall-of-fame'),'hall'));
test('closing member sheet preserves Hall of Fame view',()=>assert.equal(closeMemberSheet('hall'),'hall'));
