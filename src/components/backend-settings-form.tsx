"use client";

type Props = {
  action: string;
  children: React.ReactNode;
  className?: string;
};

export function BackendSettingsForm({ action, children, className }: Props) {
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const response = await fetch(action, {
      method: "POST",
      body: formData,
      credentials: "same-origin",
      redirect: "follow",
    });
    if (response.redirected) {
      window.location.assign(response.url);
      return;
    }
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      window.alert(payload?.error ?? "Save failed");
    }
  }

  return (
    <form className={className} onSubmit={onSubmit}>
      {children}
    </form>
  );
}
