
import { AppLayoutClient } from "./(symptom-checker)/AppLayoutClient";

export default function HomePage() {
  // AppLayoutClient now renders its own AppShell to correctly pass
  // the client-side interactive trigger button for the chat history.
  return (
    <AppLayoutClient />
  );
}
