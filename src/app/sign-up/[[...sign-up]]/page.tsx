import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="grid min-h-dvh place-items-center bg-muted/40 p-4">
      <SignUp />
    </main>
  );
}
