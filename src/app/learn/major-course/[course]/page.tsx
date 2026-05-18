import SubjectShelfClient from '@/components/learning/SubjectShelfClient';
import {
  createMajorCourseWorkspaceSlug,
  DEFAULT_MAJOR_COURSES,
  type LearnSubjectInfo,
} from '@/lib/learn-content';

export default async function MajorCourseShelfPage({
  params,
}: {
  params: Promise<{ course: string }>;
}) {
  const { course } = await params;
  const workspaceSlug = createMajorCourseWorkspaceSlug(course);
  const courseInfo = DEFAULT_MAJOR_COURSES.find((item) => item.slug === course);
  const subjectInfo: LearnSubjectInfo = {
    title: courseInfo?.title ?? decodeURIComponent(course),
    description:
      courseInfo?.description ??
      '这是一门具体专业课的资料库。课件、作业、重点整理和往年题会在这里形成独立学习上下文。',
    emphasis:
      '优先导入这门课当前最常用的课件或复习资料，再把重点/往年题挂成当前目标背景。',
  };

  return <SubjectShelfClient subjectSlug={workspaceSlug} subjectInfo={subjectInfo} />;
}
