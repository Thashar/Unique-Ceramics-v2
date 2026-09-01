// Wywołania Google AI (Gemini) – wspólne definicje dla panelu admina
// (wybór modeli, przyciski AI / AI+ i „Uzupełnij przy użyciu AI”) oraz tras serwerowych.
// Moduł jest neutralny (same stałe) – może trafić do bundle klienta.

/** Rodzaj wywołania – rozdziela koszty zdjęć od kosztów tekstu. */
export type AiKind = "image" | "text";

/** Warianty generowania dostępne przy każdym zdjęciu produktu. */
export type AiVariant = "ai" | "ai_plus";

/** Wariant zapisywany dla uzupełniania danych produktu tekstem. */
export const AI_TEXT_VARIANT = "product_fill";

/**
 * Modele Gemini z wyjściem obrazowym. Lista jest allowlistą – wartość z ustawień
 * spoza niej jest ignorowana (do bazy trafia zwykły string, a nazwa modelu idzie
 * prosto do URL-a API).
 */
export const AI_IMAGE_MODELS = [
  { id: "gemini-3.1-flash-image", label: "Gemini 3.1 Flash Image (szybki)" },
  { id: "gemini-3.1-flash-lite-image", label: "Gemini 3.1 Flash Lite Image (najtańszy)" },
  { id: "gemini-3-pro-image", label: "Gemini 3 Pro Image (najlepsza jakość)" },
  { id: "gemini-2.5-flash-image", label: "Gemini 2.5 Flash Image (starszy)" },
] as const;

export const AI_MODEL_IDS: string[] = AI_IMAGE_MODELS.map((m) => m.id);

/** Klucze ustawień z wybranym modelem dla każdego wariantu. */
export const AI_MODEL_SETTING_KEY: Record<AiVariant, string> = {
  ai: "ai_image_model",
  ai_plus: "ai_image_model_plus",
};

export const AI_MODEL_DEFAULT: Record<AiVariant, string> = {
  ai: "gemini-3.1-flash-image",
  // Wariant „AI+” buduje całą scenę wokół produktu – tu jakość modelu widać najbardziej
  ai_plus: "gemini-3-pro-image",
};

/** Zwraca model z ustawień, o ile jest na allowliście – inaczej domyślny. */
export function resolveAiModel(variant: AiVariant, fromSettings: string): string {
  const value = fromSettings?.trim();
  return value && AI_MODEL_IDS.includes(value) ? value : AI_MODEL_DEFAULT[variant];
}

/**
 * Zasada kompletu – wspólna dla obu wariantów. Zdjęcie źródłowe bywa zestawem
 * (np. dzbanek z kubkami), a model albo gubił część sztuk, albo dokładał własne.
 * Sformułowana tak, żeby nie kolidowała z rekwizytami sceny w wariancie „AI+”:
 * zakaz dotyczy ceramiki i elementów produktu, nie lnu czy eukaliptusa.
 */
const SET_RULE = `CRITICAL - keep the set complete and unchanged: the generated image must show EVERY ceramic item visible in the original photo, all of them together, with the same number of pieces, the same shapes, colors, glaze and decorations. Do not drop, merge or hide any piece, and do not invent or add any extra ceramic items, tableware, lids, saucers or product parts that are not present in the original photo.`;

/**
 * Zasada kadru – wspólna dla obu wariantów. Galeria na karcie produktu ma kadr
 * poziomy 4:3, więc wynik ma być zawsze w tych proporcjach: pionowe albo
 * kwadratowe zdjęcie źródłowe przekomponowujemy przez dołożenie tła po bokach,
 * nie przez obcięcie ani rozciągnięcie produktu. Proporcje podajemy wprost
 * (4:3 i 1440×1080) – „mniej więcej poziomo” model potrafił odczytać jako
 * kwadrat, co widać było w wariancie „AI+”.
 */
const ORIENTATION_RULE = `OUTPUT FORMAT IS MANDATORY: the generated image must always be HORIZONTAL, in a 4:3 landscape frame - 1440 x 1080 pixels, width to height ratio exactly 4:3, clearly wider than it is tall. Never return a square (1:1), vertical (portrait) or 16:9 image, whatever the shape of the original photo. If the original is vertical or square, recompose the shot into that 4:3 frame by extending the background and the surface to the left and right of the product - never by cropping any part of the ceramic, never by stretching, squashing or rotating it, and never by adding black bars, letterboxing or borders. The whole product stays visible, upright and correctly proportioned, with comfortable margins around it.`;

/**
 * Zasada wierności kolorów – wspólna dla obu wariantów. Modele obrazowe lubią
 * „poprawiać” zdjęcie: ocieplać szkliwo, podbijać nasycenie, zamieniać chłodne
 * szarości w beże. Dla sklepu to realny problem – klient dostaje wtedy produkt
 * w innym kolorze niż na zdjęciu. Stąd osobna, dobitna reguła.
 */
const COLOR_RULE = `COLOR FIDELITY IS MANDATORY: reproduce the exact colors of the ceramic from the original photo - the same hue, saturation, lightness and glaze tone on every piece, including subtle shifts, speckles, streaks, crackle and color transitions of the glaze. Sample the colors from the original image and match them precisely; a cool grey stays cool grey, a muted blue stays muted blue, an off-white stays off-white. Do NOT restyle, recolor, tint, warm up, cool down, saturate, desaturate, brighten or "improve" the ceramic. Do not let the background color, the props or the lighting cast a color tint onto the product. The white balance must stay neutral so that the glaze color is identical to the original. Only the background, framing and lighting may change - the product's color must not.`;

/**
 * Zasada wielkości – wspólna dla obu wariantów. Modele lubiły "dopasować"
 * produkt do kadru: powiększać go przy pustym tle albo pomniejszać w scenie
 * z rekwizytami. Klient ocenia realny rozmiar po zdjęciu, więc zmiana skali
 * jest tu równie szkodliwa jak zmiana koloru.
 */
const SIZE_RULE = `SIZE FIDELITY IS MANDATORY: the ceramic product must keep the exact same real-world scale and proportions as in the original photo, relative to its own height and width - do not enlarge it, shrink it, zoom in on it or zoom out from it. Do not fill more or less of the frame with the product than a proportional recomposition of the original would require; only the amount of empty background or surrounding props may change to fit the new frame, never the size of the product itself. If several pieces are shown, keep their sizes relative to each other exactly as in the original photo.`;

/**
 * Zasada tła wariantu „AI”. Kolor `#E2D8CC` pochodzi ze zdjęcia wzorcowego
 * wskazanego przez właściciela (20.08.2026) – to **nie** jest `sand` #E8DFD0
 * z palety sklepu, więc nie „poprawiaj” go na wartość z palety.
 *
 * Sam hex modelowi nie wystarcza: potrafi zejść w ciemniejszy, cieplejszy tan
 * z winietą przy krawędziach. Dlatego dokładamy wartości RGB, listę odcieni
 * zakazanych, zakaz gradientu i winiety oraz regułę rozstrzygającą wątpliwość
 * na korzyść jaśniejszego tła. Zmieniając odcień, popraw hex i RGB naraz.
 */
const BACKGROUND_RULE = `BACKGROUND COLOR IS MANDATORY: a soft, light, warm beige - hex #E2D8CC, RGB (226, 216, 204) - a pale, gently warm neutral with low saturation, distinctly lighter than tan or camel. Fill the whole backdrop with that single flat tone, identical behind and underneath the product: no gradient, no vignette, no darker corners or edges, no backdrop falling off into shadow. The background must NOT drift into tan, camel, khaki, ochre, taupe, warm brown, dark sand or any deeper beige, and it must not pick up a warm orange cast from the lighting. If in doubt, make the background lighter rather than darker. The only shadow allowed is a soft, subtle contact shadow directly beneath the product.`;

/**
 * Zasada realizmu – wspólna dla obu wariantów i dla presetów układanych przez
 * model. Wynik ma wyglądać jak **prawdziwe zdjęcie**: klient ogląda ofertę
 * sklepu, a nie ilustrację, więc render 3D, malunek czy „plastikowy" wygląd
 * z gładkimi, wypolerowanymi powierzchniami są równie mylące jak zmiana koloru.
 */
const REALISM_RULE = `THE RESULT MUST LOOK LIKE A REAL PHOTOGRAPH: an authentic photo taken with a real camera in a real place, not a 3D render, CGI, illustration, painting, drawing, collage or obviously AI-generated picture. Keep real-world materials and surfaces with their natural texture and small imperfections - the grain of the clay, slight irregularities of the handmade form, tiny specks and unevenness of the glaze, the weave of fabric, the grain of wood. Lighting, reflections, contact shadows and depth of field must be physically believable and consistent across the whole frame. Avoid a plastic, waxy or over-polished look, avoid oversharpening, heavy retouching, glow, artificial haze and exaggerated contrast. A viewer must be able to take the image for an ordinary product photograph.`

/**
 * **Reguła nadrzędna** – granica, której modelowi nie wolno przekroczyć: sama
 * ceramika ma zostać taka sama jak na zdjęciu źródłowym. Kąt ujęcia, kształt
 * i kolor to trzy rzeczy, po których klient rozpoznaje przedmiot, a model lubił
 * je „poprawiać”: obracał kubek, podnosił kamerę nad przedmiot, wygładzał
 * ręcznie robioną formę. Reguła stoi **pierwsza** i wprost rozstrzyga konflikt
 * z opisem sceny (także z presetem ułożonym przez model) na korzyść wierności
 * przedmiotu – opis sceny nie może kazać przestawić ani przemalować ceramiki.
 */
const IDENTITY_RULE = `ABSOLUTE, NON-NEGOTIABLE RULE - THE CERAMIC ITSELF MUST STAY IDENTICAL TO THE ORIGINAL PHOTO. This is an image EDIT, not a new photo shoot: treat the pixels of the ceramic in the source image as a cut-out that is pasted unchanged into a new background, and re-light it only as much as the new scene demands. You are replacing what is around the product, never re-staging or re-shooting the product. Keep EXACTLY the same camera angle, viewpoint, eye level and perspective on the product as in the original photo: do not rotate, turn, tilt or flip the piece, do not move the camera around it, above it or below it, do not switch between eye-level, three-quarter and top-down views, and do not show any side, face or interior that is not visible in the original. Keep EXACTLY the same shape and silhouette: the same proportions, wall and rim profile, curvature, handle shape and position, spout, foot, lid and every detail of the form, including the small irregularities of a handmade piece - do not re-model, redraw, straighten, smooth, idealise or "fix" anything. Keep EXACTLY the same colors, glaze and decoration: the same hue and finish, and every pattern, drawing, lettering or motif in the same place, at the same size and in the same orientation. Nothing may be added to the ceramic and nothing removed from it. If any part of the scene description would require a different angle, shape, color, decoration or arrangement of the product, IGNORE that part of the scene description - fidelity of the product always wins. Only the background, surroundings, props, lighting and framing may change.`;

/**
 * Reguła kąta ujęcia. `IDENTITY_RULE` mówi o kącie jednym zdaniem wśród wielu
 * innych warunków i to za mało: model nadal potrafi obrócić przedmiot albo
 * podnieść kamerę „o kilka stopni", co przy ceramice widać od razu. Dlatego kąt
 * dostaje własną, wyliczoną regułę – z konkretnymi znacznikami do sprawdzenia
 * (elipsa wylewu i stopki, strona ucha, ile widać wnętrza) i z poleceniem
 * porównania sylwetki z oryginałem przed wypuszczeniem obrazu.
 */
const ANGLE_RULE = `CAMERA ANGLE IS LOCKED - THIS IS THE MOST FREQUENT MISTAKE, SO VERIFY IT LAST, JUST BEFORE YOU OUTPUT THE IMAGE. The product must be seen from the exact same camera position as in the original photo, down to the degree. Do not rotate the piece around its vertical axis even slightly, do not raise or lower the camera even slightly, do not tilt or roll it, do not step to the left or right, do not mirror or flip the image, do not change the shooting distance, the lens or the amount of perspective. All of the following must match the original photo exactly: how open or flat the ellipse of the rim and of the foot is (this is what gives the camera height away - a rounder ellipse means the camera moved up, a flatter one means it moved down); how much of the inside of the vessel is visible; which side the handle, spout, lid knob, seam or signature is on and how far it sticks out sideways; which part of the pattern, drawing or lettering faces the viewer and how strongly the rest of it is foreshortened towards the edges; the horizon line and the perspective of the surface the piece stands on; the angle at which the walls converge; how much of the base is visible. A five-degree turn or a slightly higher viewpoint is already a failure, even if the result looks better. If the photo shows several pieces, keep each one in the same orientation and the same arrangement relative to the others - which piece stands in front, behind, to the left or to the right, and how far each is turned - do not rearrange, re-space, re-order or swap them. Before you output the image, mentally overlay the silhouette of the product on the original: same width at every height, same rim curve, same handle position, same outline. If it does not overlay almost pixel for pixel, correct the angle and leave the scene alone.`;

/**
 * Reguły dotyczące samego produktu. Doklejamy je do **każdego** promptu –
 * także do tych wygenerowanych i zapisanych jako preset – bo to one pilnują,
 * żeby zdjęcie nadal przedstawiało ten konkretny produkt: ten sam kąt i kształt,
 * kadr, kolor szkliwa, komplet sztuk i skalę. Preset opisuje wyłącznie scenę
 * wokół przedmiotu.
 */
export const AI_PRODUCT_RULES = `${IDENTITY_RULE} ${ANGLE_RULE} ${ORIENTATION_RULE} ${COLOR_RULE} ${SET_RULE} ${SIZE_RULE} ${REALISM_RULE}`;

/** Scena wariantu „AI” – produkt na jednolitym, matowym tle (zdjęcie katalogowe). */
export const AI_SCENE_PLAIN = `Replace only the background behind and beneath the specific ceramic product from the original photo, leaving the product itself untouched and seen from the very same viewpoint. The result is a photorealistic, detailed catalog shot of that product, centrally placed and perfectly sharp, isolated and resting on a seamless, solid matte background surface. ${BACKGROUND_RULE} Natural, soft, diffused daylight from the side highlights the glaze and texture of the main ceramic piece, without darkening the backdrop. Clean, high-end catalog quality, high resolution and fine detail. If the original photo shows several pieces, keep them together in the arrangement they already have in the original photo, on that same background - only the backdrop around them is new.`;

/** Scena wariantu „AI+” – produkt w wystylizowanej scenie (len, eukaliptus, kamienie). */
export const AI_SCENE_STYLED = `HIGH-RESOLUTION STUDIO PRODUCT PHOTOGRAPHY IN A 4:3 LANDSCAPE FRAME (1440 x 1080 pixels), built around the ceramic product exactly as it appears in the original image: only the setting around it is new. The product must remain EXACTLY unchanged in camera angle, viewpoint, shape, color, glaze texture and pattern - it is not re-shot, only placed in a new environment. The ceramic piece is centrally placed, perfectly sharp. The background is a professionally styled, soft-focus natural studio environment. The ceramic rests on a subtly textured, raw linen tablecloth (cream/natural beige color). Around it, in the softly blurred background, are artfully arranged organic elements: a delicate sprig of eucalyptus, a raw wooden coaster, and a small collection of natural, smooth river pebbles in grey and brown tones. Natural, soft, diffused daylight is coming from the side (softbox effect), highlighting the glaze and texture of the main ceramic piece. Shallow depth of field (bokeh), with the product itself fully sharp. Clean, high-end catalog quality, high resolution, photorealistic; soft, natural light only - no dramatic, cinematic or theatrical lighting that would suggest a different camera position. If the original photo shows several pieces, place them all together in the scene as one set, each turned exactly as in the original and arranged relative to the others exactly as in the original; the eucalyptus, wooden coaster and pebbles are the only added props and they must stay in the blurred background. Compose the whole scene for a horizontal 4:3 frame: the styled surface, the linen and the blurred props fill the extra width on both sides of the product.`;

/** Składa prompt wysyłany do modelu: scena z presetu + niezmienne reguły produktu. */
export function buildImagePrompt(scene: string): string {
  return `${scene.trim()}\n\n${AI_PRODUCT_RULES}`;
}

export const AI_PROMPTS: Record<AiVariant, string> = {
  ai: buildImagePrompt(AI_SCENE_PLAIN),
  ai_plus: buildImagePrompt(AI_SCENE_STYLED),
};

export const AI_VARIANT_LABEL: Record<AiVariant, string> = {
  ai: "AI",
  ai_plus: "AI+",
};

export function isAiVariant(value: unknown): value is AiVariant {
  return value === "ai" || value === "ai_plus";
}

// ── Presety promptów ─────────────────────────────────────────────────────────

/**
 * Preset to **sama scena** – tło, rekwizyty, światło, nastrój. Reguły dotyczące
 * produktu (`AI_PRODUCT_RULES`) dokleja `buildImagePrompt`, więc żaden preset
 * nie jest w stanie ich pominąć ani nadpisać.
 */
export type AiPromptPreset = {
  id: string;
  name: string;
  scene: string;
};

export const AI_PRESETS_SETTING_KEY = "ai_prompt_presets";

/** Klucze ustawień z presetem wybranym dla każdego z przycisków. */
export const AI_PRESET_SETTING_KEY: Record<AiVariant, string> = {
  ai: "ai_prompt_preset_ai",
  ai_plus: "ai_prompt_preset_ai_plus",
};

/** Limity presetu – pilnowane w panelu i przy zapisie ustawień. */
export const AI_PRESET_LIMITS = { name: 80, scene: 4000, count: 30, description: 1000 };

/** Presety wbudowane: zawsze dostępne, nie do usunięcia ani edycji w miejscu. */
export const AI_BUILTIN_PRESETS: AiPromptPreset[] = [
  {
    id: "builtin_plain",
    // Dotychczasowy prompt przycisku „AI" – produkt na jednolitym tle
    name: "Domyślny AI",
    scene: AI_SCENE_PLAIN,
  },
  {
    id: "builtin_styled",
    // Dotychczasowy prompt przycisku „AI+" – scena z lnem i eukaliptusem
    name: "Domyślny AI+",
    scene: AI_SCENE_STYLED,
  },
];

export const AI_PRESET_DEFAULT: Record<AiVariant, string> = {
  ai: "builtin_plain",
  ai_plus: "builtin_styled",
};

export function isBuiltinPreset(id: string): boolean {
  return AI_BUILTIN_PRESETS.some((p) => p.id === id);
}

/** Bezpieczny odczyt presetów z ustawienia (JSON w bazie może być czymkolwiek). */
export function parseAiPresets(json: string): AiPromptPreset[] {
  if (!json?.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const seen = new Set<string>();
  const out: AiPromptPreset[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) continue;
    const raw = item as Record<string, unknown>;
    const id = typeof raw.id === "string" ? raw.id.trim() : "";
    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    const scene = typeof raw.scene === "string" ? raw.scene.trim() : "";
    // Własny preset nie może przejąć identyfikatora wbudowanego – inaczej
    // podmieniłby scenę, której panel nie pozwala edytować
    if (!id || !name || !scene || seen.has(id) || isBuiltinPreset(id)) continue;
    seen.add(id);
    out.push({
      id: id.slice(0, 64),
      name: name.slice(0, AI_PRESET_LIMITS.name),
      scene: scene.slice(0, AI_PRESET_LIMITS.scene),
    });
    if (out.length >= AI_PRESET_LIMITS.count) break;
  }
  return out;
}

/** Wbudowane + własne, w kolejności wyświetlania w panelu. */
export function allAiPresets(custom: AiPromptPreset[]): AiPromptPreset[] {
  return [...AI_BUILTIN_PRESETS, ...custom];
}

/**
 * Preset użyty dla danego przycisku. Usunięty lub nieznany identyfikator wraca
 * do wbudowanego domyślnego – generowanie ma działać także wtedy, gdy preset
 * skasowano po ustawieniu.
 */
export function resolveAiPreset(
  variant: AiVariant,
  presetId: string,
  custom: AiPromptPreset[]
): AiPromptPreset {
  const all = allAiPresets(custom);
  const chosen = presetId?.trim() ? all.find((p) => p.id === presetId.trim()) : undefined;
  return (
    chosen ??
    all.find((p) => p.id === AI_PRESET_DEFAULT[variant]) ??
    AI_BUILTIN_PRESETS[0]
  );
}

/** Wariant zapisywany w rejestrze zużycia dla generowania samego promptu. */
export const AI_PROMPT_VARIANT = "prompt_build";

/**
 * Prompt dla modelu tekstowego, który z polskiego opisu stylistyki układa
 * angielski opis sceny. Model ma pisać **wyłącznie o scenie**: reguły produktu
 * (kąt ujęcia, kadr, kolor, komplet, skala) dokleja `buildImagePrompt` i powtarzanie ich
 * w presecie tylko rozmywa polecenie.
 */
export function buildScenePrompt(description: string): string {
  return `Jesteś asystentem przygotowującym prompty do modelu generującego zdjęcia produktowe ceramiki (Google Gemini).
Na podstawie opisu po polsku ułóż JEDEN prompt po angielsku, opisujący scenę wokół produktu.

Opis stylistyki od użytkownika:
"""
${description}
"""

Zasady:
- Pisz po angielsku, jednym akapitem ciągłego tekstu (bez list, bez nagłówków, bez cudzysłowów na początku i końcu).
- Opisuj wyłącznie SCENĘ: tło, powierzchnię, rekwizyty, kolorystykę otoczenia, światło, głębię ostrości, nastrój i jakość zdjęcia.
- NIE pisz nic o samym produkcie: o jego kolorze, kształcie, wielkości, liczbie sztuk, proporcjach kadru ani o rozdzielczości wyniku. Te reguły są dodawane osobno i nie wolno ich powtarzać ani zmieniać.
- Nie każ modelowi zmieniać, stylizować ani „poprawiać" ceramiki – rekwizyty i tło mają jedynie otaczać produkt.
- Nie opisuj ujęcia produktu: żadnego obracania, przechylania, zdjęć z góry, z boku ani „pokaż wnętrze". Kąt, kształt i kolor ceramiki mają zostać takie jak na zdjęciu źródłowym – ustawiasz wyłącznie scenerię wokół.
- NIE USTAWIAJ KAMERY. Nie pisz o pozycji, wysokości ani odległości aparatu, o obiektywie, ogniskowej, kącie widzenia czy zbliżeniu. Zakazane są w szczególności zwroty typu "flat lay", "top-down", "from above", "bird's eye view", "low angle", "eye-level shot", "three-quarter view", "close-up", "macro", "wide angle", "shot from the side" i wszystkie ich odpowiedniki – nawet jeśli użytkownik o nie prosi. Kamera stoi dokładnie tam, gdzie stała przy zdjęciu źródłowym.
- Pisz tak, jakby produkt był wycięty ze zdjęcia źródłowego i wklejony bez zmian w nowe otoczenie: scena ma go otaczać i nigdy nie może wymuszać innego ustawienia, obrotu ani innej perspektywy. Rekwizyty rozmieszczaj wokół i za produktem, nie przed nim.
- Nie opisuj efektownego, kinowego ani mocno kierunkowego światła, które sugerowałoby inne ujęcie – trzymaj się miękkiego, naturalnego oświetlenia.
- Zachowaj klasę zdjęcia katalogowego: fotorealizm, naturalne, miękkie światło, czysta kompozycja.
- Scena ma wyglądać jak PRAWDZIWE zdjęcie zrobione aparatem w prawdziwym miejscu – nigdy jak render 3D, ilustracja, rysunek czy grafika komputerowa. Opisuj realne materiały i faktury, wiarygodne światło i cienie.
- Maksymalnie ${AI_PRESET_LIMITS.scene} znaków.

Odpowiedz samym promptem, bez komentarza i bez bloków kodu.`;
}

/**
 * Sufiks nazwy pliku nadawany przez `/api/admin/ai-image`. Po nim poznajemy,
 * że zdjęcie już powstało z AI – takiego nie puszczamy przez model po raz drugi
 * (kolejne pokolenie gubi wierność produktu), więc panel ukrywa pod nim przyciski.
 * Nazwy z uploadu i obrotu to `{timestamp}-{losowe}.webp` bez myślnika przed „ai”.
 */
export const AI_IMAGE_SUFFIX = "-ai.webp";

export function isAiGeneratedImage(url: string): boolean {
  return url.split("?")[0].endsWith(AI_IMAGE_SUFFIX);
}

// ── Opis produktu z AI (tekst) ───────────────────────────────────────────────

/**
 * Modele tekstowe (multimodalne – dostają zdjęcie i odpowiadają tekstem).
 * Jak wyżej: allowlista, bo nazwa modelu trafia do adresu API.
 */
export const AI_TEXT_MODELS = [
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite (tani, zalecany)" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite" },
  { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash (najlepszy opis)" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (najtańszy)" },
] as const;

const AI_TEXT_MODEL_IDS: string[] = AI_TEXT_MODELS.map((m) => m.id);

export const AI_TEXT_MODEL_SETTING_KEY = "ai_text_model";
export const AI_TEXT_MODEL_DEFAULT = "gemini-3.5-flash-lite";

export function resolveAiTextModel(fromSettings: string): string {
  const value = fromSettings?.trim();
  return value && AI_TEXT_MODEL_IDS.includes(value) ? value : AI_TEXT_MODEL_DEFAULT;
}

/** Maksymalne długości pól zwracanych przez model (i tak walidowane serwerowo). */
export const AI_TEXT_LIMITS = { name: 200, slug: 200, description: 600 };

/**
 * Prompt do uzupełnienia danych produktu ze zdjęcia. Kategorie podajemy modelowi,
 * bo ma wybrać istniejącą – wymyślona i tak zostałaby odrzucona przy walidacji.
 */
export function buildProductFillPrompt(categories: { slug: string; label: string }[]): string {
  const list = categories.map((c) => `- ${c.slug} (${c.label})`).join("\n");
  return `Jesteś asystentem sklepu z ręcznie robioną ceramiką artystyczną (Unique Ceramics).
Na podstawie zdjęcia produktu przygotuj dane do karty produktu w sklepie.

Najpierw przyjrzyj się uważnie samej ceramice i rozpoznaj, co się na niej znajduje:
- motyw lub wizerunek (np. zwierzę, roślina, twarz, postać, pejzaż, ornament, wzór geometryczny),
- napis, litery, cyfry, symbol lub znak,
- charakterystyczny kształt i detale formy (np. wytłoczenia, żłobienia, uchwyt, nóżki, falowana krawędź, nieregularny brzeg).
To, co widzisz na przedmiocie, jest najważniejszą cechą produktu – musi trafić i do nazwy, i do opisu.
Nazywaj to wprost i konkretnie ("kubek z sową", "miska z liściem monstery", "talerz z napisem Dzień dobry"),
a nie ogólnikami w rodzaju "z motywem" czy "ze wzorem". Jeśli nie masz pewności, co przedstawia motyw,
opisz go tak, jak wygląda, zamiast zgadywać konkretną nazwę.

Zasady:
- Pisz po polsku, w tonie spokojnym i rzeczowym, bez marketingowego przesadzania.
- Jako myślnika używaj wyłącznie półpauzy "–" (krótki myślnik). Nigdy nie używaj pauzy "—" (długi myślnik, em dash) ani encji &mdash;.
- "name": krótka nazwa produktu (2-5 słów), bez cudzysłowów i bez ceny; jeśli na ceramice jest motyw, wizerunek, znak lub napis, nazwa musi go zawierać.
- "slug": nazwa zapisana małymi literami, bez polskich znaków, wyrazy połączone myślnikami (tylko a-z, 0-9 i myślnik).
- "category": wybierz dokładnie jedną wartość slug z poniższej listy kategorii. Jeśli żadna nie pasuje, wpisz pusty ciąg.
- "description": 1-2 zdania. Zacznij od tego, co to za przedmiot i co go zdobi (motyw, wizerunek, znak, napis) oraz gdzie to zdobienie jest umieszczone, a potem dodaj kształt, kolor, szkliwo i fakturę. Gdy przedmiot jest gładki i bez zdobień, napisz o formie i wykończeniu. Nie wymyślaj wymiarów, pojemności ani ceny.

Dostępne kategorie:
${list || "- (brak zdefiniowanych kategorii)"}

Odpowiedz wyłącznie obiektem JSON, bez komentarzy i bez bloków kodu:
{"name":"...","slug":"...","category":"...","description":"..."}`;
}

// ── Koszty ────────────────────────────────────────────────────────────────────

/**
 * Stawki Google AI (paid tier, USD za 1 mln tokenów) – stan na 07.2026.
 * Wejście obejmuje prompt i zdjęcie źródłowe, wyjście to wygenerowany obraz lub tekst.
 * `tokensPerImage` służy do oszacowania kosztu modeli obrazowych, gdy API nie zwróci liczników.
 */
export const AI_MODEL_PRICING: Record<
  string,
  { inputPer1M: number; outputPer1M: number; tokensPerImage: number; kind: AiKind }
> = {
  // Modele obrazowe
  "gemini-3.1-flash-image": { inputPer1M: 0.5, outputPer1M: 60, tokensPerImage: 1120, kind: "image" },
  "gemini-3.1-flash-lite-image": { inputPer1M: 0.25, outputPer1M: 30, tokensPerImage: 1120, kind: "image" },
  "gemini-3-pro-image": { inputPer1M: 2, outputPer1M: 120, tokensPerImage: 1120, kind: "image" },
  "gemini-2.5-flash-image": { inputPer1M: 0.3, outputPer1M: 30, tokensPerImage: 1290, kind: "image" },
  // Modele tekstowe
  "gemini-3.6-flash": { inputPer1M: 1.5, outputPer1M: 7.5, tokensPerImage: 0, kind: "text" },
  "gemini-3.5-flash-lite": { inputPer1M: 0.3, outputPer1M: 2.5, tokensPerImage: 0, kind: "text" },
  "gemini-3.1-flash-lite": { inputPer1M: 0.25, outputPer1M: 1.5, tokensPerImage: 0, kind: "text" },
  "gemini-2.5-flash": { inputPer1M: 0.3, outputPer1M: 2.5, tokensPerImage: 0, kind: "text" },
  "gemini-2.5-flash-lite": { inputPer1M: 0.1, outputPer1M: 0.4, tokensPerImage: 0, kind: "text" },
};

/** Rodzaj modelu wg cennika; nieznany traktujemy jak obrazowy (tak było wcześniej). */
export function aiModelKind(model: string): AiKind {
  return AI_MODEL_PRICING[model]?.kind ?? "image";
}

/** Koszt jednego generowania w USD. Nieznany model → 0 (lepiej niż zmyślona kwota). */
export function aiCostUsd(model: string, promptTokens: number, outputTokens: number): number {
  const price = AI_MODEL_PRICING[model];
  if (!price) return 0;
  const usd =
    (promptTokens / 1_000_000) * price.inputPer1M +
    (outputTokens / 1_000_000) * price.outputPer1M;
  return Math.round(usd * 1_000_000) / 1_000_000;
}

/** Orientacyjny koszt jednego zdjęcia – do podglądu stawek w panelu. */
export function aiCostPerImageUsd(model: string): number {
  const price = AI_MODEL_PRICING[model];
  if (!price) return 0;
  return aiCostUsd(model, 0, price.tokensPerImage);
}
