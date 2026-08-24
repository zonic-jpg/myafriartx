import { useEffect, useState } from "react";

const STORAGE_KEY = "myafriart_session_id";

function generateSessionId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function useSessionId(): string {
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = generateSessionId();
      localStorage.setItem(STORAGE_KEY, id);
    }
    setSessionId(id);
  }, []);

  return sessionId;
}
