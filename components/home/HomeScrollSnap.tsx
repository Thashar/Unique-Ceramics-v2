"use client";

import { useEffect } from "react";

export default function HomeScrollSnap() {
  useEffect(() => {
    const html = document.documentElement;
    html.style.scrollSnapType = "y mandatory";
    html.style.scrollBehavior = "smooth";
    return () => {
      html.style.scrollSnapType = "";
      html.style.scrollBehavior = "";
    };
  }, []);
  return null;
}
