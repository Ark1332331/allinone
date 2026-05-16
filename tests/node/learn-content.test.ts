import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LEARNING_FLOW_STEPS,
  LEARNING_SUBJECTS,
  SUBJECT_INFO_MAP,
} from '../../src/lib/learn-content.ts';

test('learning home keeps a reading-first three-step flow', () => {
  assert.equal(LEARNING_FLOW_STEPS.length, 3);
  assert.deepEqual(
    LEARNING_FLOW_STEPS.map((step) => step.title),
    ['导入资料', '进入正文', '边读边问']
  );
});

test('learning subjects expose the four supported shelves with stable metadata', () => {
  assert.deepEqual(
    LEARNING_SUBJECTS.map((subject) => subject.slug),
    ['advanced-math', 'probability', 'deep-learning', 'major-course']
  );
  assert.equal(Object.keys(SUBJECT_INFO_MAP).length, 4);
  assert.equal(SUBJECT_INFO_MAP['major-course'].title, '专业课');
});
