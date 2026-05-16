import ReadingWorkspace from '@/components/learning/ReadingWorkspace';
import { createMajorCourseWorkspaceSlug } from '@/lib/learn-content';

export default async function MajorCourseMaterialReadingPage({
  params,
}: {
  params: Promise<{ course: string; materialId: string }>;
}) {
  const { course, materialId } = await params;

  return (
    <ReadingWorkspace
      subjectSlug={createMajorCourseWorkspaceSlug(course)}
      materialId={materialId}
    />
  );
}
