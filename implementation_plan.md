# Character Image Generator MVP

Työkalu kahden realistisen hahmon kuvien generointiin eri tilanteissa. OpenAI `gpt-image-1` API + referenssikuvat. Next.js → Vercel.

## User Review Required

> [!IMPORTANT]
> **API-avain**: Asetetaan `.env.local` -tiedostoon. Voit antaa avaimen kun aloitetaan toteutus.

> [!WARNING]
> **Kustannukset**: ~$0.02–$0.19 per kuva (laadusta riippuen). Korkea laatu = kalliimpi.

## Arkkitehtuuri

```
┌─────────────────────────────────┐
│  Next.js Frontend (Vercel)      │
│                                  │
│  ┌───────────┐ ┌──────────────┐ │
│  │ Character  │ │ Prompt +     │ │
│  │ Cards (2)  │ │ Generate     │ │
│  │ + refs     │ │              │ │
│  └───────────┘ └──────────────┘ │
│  ┌──────────────────────────────┐│
│  │ Image Gallery (IndexedDB)    ││
│  └──────────────────────────────┘│
└────────────┬────────────────────┘
             │ POST /api/generate
             ▼
┌─────────────────────────────────┐
│  API Route                       │
│  - Vastaanottaa: prompt + refs   │
│  - Rakentaa englanninkielisen    │
│    promptin automaattisesti      │
│  - Kutsuu OpenAI gpt-image-1    │
│  - Palauttaa kuvan              │
└─────────────────────────────────┘
```

## Proposed Changes

### Project Setup

#### [NEW] Next.js project (`cosmic-triangulum/`)
- `npx create-next-app` (TypeScript, App Router, no Tailwind)
- Riippuvuudet: `openai`

---

### API Route

#### [NEW] `app/api/generate/route.ts`
- POST endpoint: vastaanottaa `{ prompt, characterDescriptions[], referenceImages[], size, quality }`
- **Auto-prompt builder**: käyttäjän suomi/englanti prompti → rikas englanninkielinen GPT-prompt
  - Yhdistää hahmon kuvauskortin (nimi, ulkonäkö, vaatteet) + käyttäjän tilannekuvaus
  - Jos molemmat hahmot valittu → kuvaa molemmat promptissa selkeästi
- Kutsuu `openai.images.edit()` referenssikuvien kanssa
- Palauttaa base64-kuvan

---

### Frontend

#### [NEW] `app/page.tsx` — Päänäkymä
Layout: yläosa = hahmojen hallinta, keskiosa = promptti + generointi, alaosa = galleria

#### [NEW] `app/globals.css`
Tumma, moderni teema. CSS-muuttujat. Animaatiot.

#### [NEW] `components/CharacterCard.tsx`
- Hahmon nimi + kuvaus (muokattava)
- **Strukturoitu kuvauskortti**: nimi, ulkonäkö, vaatteet, persoonallisuus
- Referenssikuvat: useita per hahmo, pienoiskuvat
- Drag & drop upload tai tiedostovalitsin
- Kuvat tallennetaan IndexedDB:hen

#### [NEW] `components/PromptPanel.tsx`
- Vapaa tekstikenttä (suomeksi tai englanniksi)
- Hahmovalinta: Hahmo 1 / Hahmo 2 / Molemmat
- Koko: Instagram neliö (1024×1024), Story (1024×1536), Landscape (1536×1024)
- Laatu: Low / Medium / High
- Generoi-nappi

#### [NEW] `components/ImageGallery.tsx`
- Generoitujen kuvien grid
- Jokaisessa kuvassa: prompti, aikaleima, lataa-nappi
- Lightbox klikattaessa
- Tallennus IndexedDB:hen (pysyy selaimen muistissa)

#### [NEW] `lib/db.ts`
- IndexedDB wrapper (hahmodata + generoidut kuvat)

#### [NEW] `lib/promptBuilder.ts`  
- Rakentaa englanninkielisen kuvagenerointiprompin hahmokuvauksesta + käyttäjän syötteestä

---

### Deploy

#### [NEW] `.env.example`
```
OPENAI_API_KEY=sk-...
```

## Verification Plan

### Selaintestit
1. Käynnistä `npm run dev`, avaa `localhost:3000`
2. Syötä hahmojen kuvaukset, lataa referenssikuvat
3. Kirjoita promptti, generoi kuva
4. Tarkista galleria, lataus, lightbox

### Manuaalinen
- Käyttäjä arvioi hahmokonsistenssin
- Käyttäjä deployaa Verceliin
