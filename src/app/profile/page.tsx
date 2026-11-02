import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/current-profile";
import { signedImageUrls } from "@/lib/profile-images";
import { createClient } from "@/lib/supabase/server";
import { ImageUploads } from "./image-uploads";
import { ProfileForm } from "./profile-form";

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">My profile</h1>
          <Link href="/dashboard" className="text-sm font-medium text-indigo-600 hover:underline">
            &larr; Dashboard
          </Link>
        </div>
        <p className="text-slate-600">
          Ek baar bharo. Har form isi se apne aap bharega. Jo nahi pata, khali chhod do.
        </p>
        <Suspense fallback={<p className="text-slate-500">Loading profile...</p>}>
          <ProfileLoader />
        </Suspense>
      </div>
    </main>
  );
}

async function ProfileLoader() {
  let current: Awaited<ReturnType<typeof getCurrentUserProfile>>;
  try {
    current = await getCurrentUserProfile();
  } catch (error) {
    return (
      <p className="rounded bg-red-50 p-3 text-sm text-red-700">
        Profile load nahi hui: {(error as Error).message}
      </p>
    );
  }

  if (!current) redirect("/login");

  const urls = await signedImageUrls(await createClient(), current.profile);

  return (
    <>
      <ImageUploads urls={urls} />
      <ProfileForm initial={current.profile} />
    </>
  );
}
