"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window { Jodit: any; }
}

const JODIT_CSS = "https://cdn.jsdelivr.net/npm/jodit@3/build/jodit.min.css";
const JODIT_JS  = "https://cdn.jsdelivr.net/npm/jodit@3/build/jodit.min.js";

const CONFIG = {
  height: 520,
  language: "pl",
  toolbarAdaptive: false,
  buttons: [
    "bold","italic","underline","strikethrough","|",
    "ul","ol","|",
    "fontsize","|",
    "paragraph","|",
    "left","center","right","|",
    "link","|",
    "undo","redo","|",
    "fullsize","source",
  ],
  style: { font: "14px/1.6 Inter, Arial, sans-serif" },
  askBeforePasteHTML: false,
  askBeforePasteFromWord: false,
  defaultActionOnPaste: "insert_clear_html",
};

interface Props {
  value: string;
  onChange: (val: string) => void;
}

let scriptLoaded = false;
let scriptLoading = false;
const onLoadCallbacks: (() => void)[] = [];

function loadJodit(cb: () => void) {
  if (scriptLoaded) { cb(); return; }
  onLoadCallbacks.push(cb);
  if (scriptLoading) return;
  scriptLoading = true;

  if (!document.getElementById("jodit-css")) {
    const link = document.createElement("link");
    link.id = "jodit-css";
    link.rel = "stylesheet";
    link.href = JODIT_CSS;
    document.head.appendChild(link);
  }

  const script = document.createElement("script");
  script.id = "jodit-js";
  script.src = JODIT_JS;
  script.onload = () => {
    scriptLoaded = true;
    onLoadCallbacks.forEach((fn) => fn());
    onLoadCallbacks.length = 0;
  };
  document.body.appendChild(script);
}

export default function RichEditor({ value, onChange }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorRef   = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    loadJodit(() => {
      if (editorRef.current || !textareaRef.current) return;
      const editor = window.Jodit.make(textareaRef.current, CONFIG);
      editor.value = value;
      editor.events.on("change", (v: string) => onChangeRef.current(v));
      editorRef.current = editor;
    });

    return () => {
      if (editorRef.current) {
        editorRef.current.destruct();
        editorRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <textarea ref={textareaRef} defaultValue={value} />;
}
