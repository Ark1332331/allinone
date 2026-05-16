import { notFound } from 'next/navigation';

import SubjectShelfClient from '@/components/learning/SubjectShelfClient';
import { SUBJECT_INFO_MAP, type LearnSubjectSlug } from '@/lib/learn-content';

export default async function SubjectShelfPage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const { subject } = await params;
  const subjectInfo = SUBJECT_INFO_MAP[subject as LearnSubjectSlug];

  if (!subjectInfo) {
    notFound();
  }

  return <SubjectShelfClient subjectSlug={subject} subjectInfo={subjectInfo} />;
}
