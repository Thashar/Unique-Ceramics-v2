"use client";

import { useEffect, useRef } from "react";
import type { Jodit as JoditEditor } from "jodit";
import "jodit/build/jodit.min.css";

const BUTTONS = [
  "bold","italic","underline","strikethrough","|",
  "ul","ol","|",
  "fontsize","|",
  "paragraph","|",
  "left","center","right","|",
  "link","|",
  "undo","redo","|",
  "fullsize","source",
];

interface Props {
  value: string;
  onChange: (val: string) => void;
  /**
   * Wariant wielkości tekstu odpowiadający stronie, na której treść wyląduje
   * (`rich-content-lg` – wprowadzenie do warsztatów, `rich-content-sm` – opisy projektów).
   * Sam wygląd treści opisuje klasa `.rich-content` w `globals.css` – ta sama,
   * której używa strona, żeby edytor pokazywał to, co zobaczy klient.
   */
  contentClass?: string;
}

export default function RichEditor({ value, onChange, contentClass }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorRef   = useRef<JoditEditor | null>(null);
  const onChangeRef = useRef(onChange);
  const classRef    = useRef(contentClass);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    let cancelled = false;

    // Jodit jest biblioteką wyłącznie przeglądarkową – import dynamiczny
    // zapobiega wykonaniu bundle'a podczas SSR komponentu klienckiego
    import("jodit").then(({ Jodit }) => {
      if (cancelled || editorRef.current || !textareaRef.current) return;
      const editor = Jodit.make(textareaRef.current, {
        height: 520,
        language: "pl",
        toolbarAdaptive: false,
        buttons: BUTTONS,
        // Wygląd treści bierze się z arkusza strony (`.rich-content`), nie z inline
        // stylu Jodita – inline `font` nadpisywał go i edytor kłamał o rozmiarze tekstu
        editorClassName: ["rich-content", classRef.current].filter(Boolean).join(" "),
        askBeforePasteHTML: false,
        askBeforePasteFromWord: false,
        defaultActionOnPaste: "insert_clear_html",
      });
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
