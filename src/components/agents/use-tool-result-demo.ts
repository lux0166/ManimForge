"use client";

import { useEffect, useState } from "react";

export function useToolResultDemo(totalItems: number, stepInterval = 300) {
  const [visible, setVisible] = useState(1);
  const [status, setStatus] = useState<"streaming" | "success">("streaming");

  useEffect(() => {
    setVisible(1);
    setStatus("streaming");
    const interval = setInterval(() => {
      setVisible((prev) => {
        if (prev < totalItems) {
          return prev + 1;
        }
        clearInterval(interval);
        setStatus("success");
        return prev;
      });
    }, stepInterval);

    return () => clearInterval(interval);
  }, [totalItems, stepInterval]);

  return { visible, status };
}
