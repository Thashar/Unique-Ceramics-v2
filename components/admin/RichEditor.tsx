"use client";

import { useEffect, useRef } from "react";
import type { Jodit as JoditEditor } from "jodit";
import "jodit/build/jodit.min.css";

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

export default function RichEditor({ value, onChange }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorRef   = useRef<JoditEditor | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    let cancelled = false;

    // Jodit jest biblioteką wyłącznie przeglądarkową — import dynamiczny
    // zapobiega wykonaniu bundle'a podczas SSR komponentu klienckiego
    import("jodit").then(({ Jodit }) => {
      if (cancelled || editorRef.current || !textareaRef.current) return;
      const editor = Jodit.make(textareaRef.current, CONFIG);
      editor.value = value;
      editor.events.on("change", (v: string) => onChangeRef.current(v));
      editorRef.current = editor;
    });

    return () => {
      cancelled = true;
      if (editorRef.current) {
        editorRef.current.destruct();
        editorRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <textarea ref={textareaRef} defaultValue={value} />;
}
