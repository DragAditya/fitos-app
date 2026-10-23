import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireOwner } from "@/server/auth/session";
import { getMemberById } from "@/server/services/members";
import { PageHeader } from "@/components/ui/page";
import { MemberEditForm } from "@/components/owner/member-forms";

export const metadata = { title: "Edit member" };

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner();
  const { id } = await params;
  const member = await getMemberById(auth.gym.id, id);
  if (!member) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/members/${member.id}`} className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted transition-colors hover:text-ink">
        <ArrowLeft className="size-3.5" /> Back to profile
      </Link>
      <PageHeader
        eyebrow={member.member_code}
        title={`Edit ${member.full_name}`}
        description="Changes are written directly to the database and audit-logged. Email changes affect sign-in."
      />
      <MemberEditForm member={member} />
    </div>
  );
}
