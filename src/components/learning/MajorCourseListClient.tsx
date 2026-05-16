'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import {
  createMajorCourseWorkspaceSlug,
  createMajorCourseRoutePath,
  DEFAULT_MAJOR_COURSES,
  slugifyCourseName,
  type MajorCourseInfo,
} from '@/lib/learn-content';
import {
  loadSubjectWorkspace,
  migrateSubjectWorkspace,
  saveSubjectWorkspace,
} from '@/lib/learning-workspace';

const MAJOR_COURSES_STORAGE_KEY = 'allinone-major-courses';
const LEGACY_MAJOR_COURSE_SLUG = 'major-course';

function loadMajorCourses(): MajorCourseInfo[] {
  if (typeof window === 'undefined') {
    return DEFAULT_MAJOR_COURSES;
  }

  try {
    const raw = window.localStorage.getItem(MAJOR_COURSES_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_MAJOR_COURSES;
    }

    const parsed = JSON.parse(raw) as MajorCourseInfo[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_MAJOR_COURSES;
    }

    return parsed;
  } catch {
    return DEFAULT_MAJOR_COURSES;
  }
}

function saveMajorCourses(courses: MajorCourseInfo[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(MAJOR_COURSES_STORAGE_KEY, JSON.stringify(courses));
}

function migrateLegacyMajorCourseToDefault() {
  const legacy = loadSubjectWorkspace(LEGACY_MAJOR_COURSE_SLUG);
  const target = loadSubjectWorkspace(DEFAULT_MAJOR_COURSES[0].workspaceSlug);

  if (legacy.materials.length === 0 || target.materials.length > 0) {
    return;
  }

  saveSubjectWorkspace(
    migrateSubjectWorkspace(
      legacy,
      DEFAULT_MAJOR_COURSES[0].workspaceSlug,
      DEFAULT_MAJOR_COURSES[0].title
    )
  );
}

export default function MajorCourseListClient() {
  const [courses, setCourses] = useState<MajorCourseInfo[]>(DEFAULT_MAJOR_COURSES);
  const [courseName, setCourseName] = useState('');

  useEffect(() => {
    migrateLegacyMajorCourseToDefault();
    setCourses(loadMajorCourses());
  }, []);

  const sortedCourses = useMemo(
    () => [...courses].sort((left, right) => left.title.localeCompare(right.title, 'zh-CN')),
    [courses]
  );

  const createCourse = () => {
    const title = courseName.trim();
    if (!title) {
      return;
    }

    const baseSlug = slugifyCourseName(title);
    let slug = baseSlug;
    let counter = 2;
    while (courses.some((course) => course.slug === slug)) {
      slug = `${baseSlug}-${counter}`;
      counter += 1;
    }

    const nextCourse: MajorCourseInfo = {
      slug,
      title,
      description: '自定义专业课资料库。',
      workspaceSlug: createMajorCourseWorkspaceSlug(slug),
    };
    const nextCourses = [...courses, nextCourse];
    setCourses(nextCourses);
    saveMajorCourses(nextCourses);
    saveSubjectWorkspace({
      ...loadSubjectWorkspace(nextCourse.workspaceSlug),
      subjectTitle: nextCourse.title,
    });
    setCourseName('');
  };

  return (
    <div className="min-h-dvh paper-texture px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-[28px] border border-[var(--border-color)] bg-[var(--card-bg)]/92 p-6 shadow-custom backdrop-blur-sm md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-primary)]">
                Major Courses
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-5xl">
                专业课
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[var(--muted)]">
                专业课先拆成具体课程。每门课都有独立资料库、当前目标、背景资料和阅读历史。
              </p>
            </div>

            <Link
              href="/learn"
              className="inline-flex items-center justify-center rounded-full border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--foreground)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
            >
              返回学习空间
            </Link>
          </div>
        </header>

        <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--card-bg)]/92 p-6 shadow-custom backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">
            Create Course
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
            创建具体课程
          </h2>
          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            <input
              value={courseName}
              onChange={(event) => setCourseName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  createCourse();
                }
              }}
              placeholder="例如：高级程序设计 / 人工智能导论 / 矩阵计算与优化"
              className="input-japanese w-full rounded-full px-4 py-3 text-sm text-[var(--foreground)]"
            />
            <button
              type="button"
              onClick={createCourse}
              className="btn-japanese inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm"
            >
              创建课程
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {sortedCourses.map((course) => (
            <article
              key={course.workspaceSlug}
              className="rounded-[24px] border border-[var(--border-color)] bg-[var(--card-bg)]/92 p-5 shadow-custom transition hover:border-[var(--accent-primary)]/40"
            >
              <h2 className="text-2xl font-semibold text-[var(--foreground)]">
                {course.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {course.description}
              </p>
              <Link
                href={createMajorCourseRoutePath(course.slug)}
                className="btn-japanese mt-5 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm"
              >
                进入资料库
              </Link>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
