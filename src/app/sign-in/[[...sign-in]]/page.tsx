import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="grid min-h-dvh place-items-center bg-muted/40 p-4">
      <SignIn />
    </main>
  );
}
