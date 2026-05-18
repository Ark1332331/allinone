import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LEARNING_FLOW_STEPS,
  LEARNING_SUBJECTS,
  DEFAULT_MAJOR_COURSE,
  createMaterialReadingPath,
  createMajorCourseRoutePath,
  getLegacyMajorCoursePathRedirect,
  getLegacyMajorCourseRouteRedirect,
  createSubjectShelfPath,
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

test('major course exposes digital system as the default concrete course', () => {
  assert.equal(DEFAULT_MAJOR_COURSE.slug, 'digital-system');
  assert.equal(DEFAULT_MAJOR_COURSE.title, '数字系统设计基础');
  assert.equal(DEFAULT_MAJOR_COURSE.workspaceSlug, 'major-course:digital-system');
  assert.equal(createMajorCourseRoutePath(DEFAULT_MAJOR_COURSE.slug), '/learn/major-course/digital-system');
  assert.equal(createSubjectShelfPath(DEFAULT_MAJOR_COURSE.workspaceSlug), '/learn/major-course/digital-system');
  assert.equal(
    createMaterialReadingPath(DEFAULT_MAJOR_COURSE.workspaceSlug, 'm1'),
    '/learn/major-course/digital-system/m1'
  );
});

test('legacy major course colon routes redirect to concrete course paths', () => {
  assert.equal(
    getLegacyMajorCourseRouteRedirect('major-course:digital-system'),
    '/learn/major-course/digital-system'
  );
  assert.equal(
    getLegacyMajorCourseRouteRedirect('major-course:digital-system', 'm1'),
    '/learn/major-course/digital-system/m1'
  );
  assert.equal(getLegacyMajorCourseRouteRedirect('major-course'), null);
});

test('legacy major course path redirects before app route matching', () => {
  assert.equal(
    getLegacyMajorCoursePathRedirect('/learn/major-course:digital-system'),
    '/learn/major-course/digital-system'
  );
  assert.equal(
    getLegacyMajorCoursePathRedirect('/learn/major-course%3Adigital-system/m1'),
    '/learn/major-course/digital-system/m1'
  );
  assert.equal(getLegacyMajorCoursePathRedirect('/learn/major-course'), null);
});
