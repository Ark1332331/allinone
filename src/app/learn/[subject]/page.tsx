import { notFound, redirect } from 'next/navigation';

import MajorCourseListClient from '@/components/learning/MajorCourseListClient';
import SubjectShelfClient from '@/components/learning/SubjectShelfClient';
import {
  getLegacyMajorCourseRouteRedirect,
  SUBJECT_INFO_MAP,
  type LearnSubjectSlug,
} from '@/lib/learn-content';

export default async function SubjectShelfPage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const { subject } = await params;
  const legacyRedirect = getLegacyMajorCourseRouteRedirect(subject);
  if (legacyRedirect) {
    redirect(legacyRedirect);
  }

  if (subject === 'major-course') {
    return <MajorCourseListClient />;
  }

  const subjectInfo = SUBJECT_INFO_MAP[subject as LearnSubjectSlug];

  if (!subjectInfo) {
    notFound();
  }

  return <SubjectShelfClient subjectSlug={subject} subjectInfo={subjectInfo} />;
}
