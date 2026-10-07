# Art, icons & letters: prompts and decisions

Status: **discussion draft plus what's already in the site.** The site now ships hand-coded SVG food icons with small motion effects (steam, sizzle, gravy ripple). Use the prompts below in an image tool if you want richer, illustrated versions; drop the results into `public/art/` and we'll swap them in.

## 1. Food icons (the cast)

### What changed

- **Steamed momo** has a curl of steam that rises and fades in a loop.
- **Deep-fried momo** is golden brown with crispy blisters and a little sizzle sparkle.
- **Tandoori momo** has char marks and a smoky orange tint.
- **Gravy (jhol / Schezwan) momo** sits in a red gravy pool that ripples.
- **Menu edition:** Neapolitan pizza slice, vada pav, noodles, chai, dal baati. **Pasta is removed.**
- Motion respects `prefers-reduced-motion`.

### Prompts for a richer illustrated set

Use the same style line for every icon so the set matches.

**Style line (paste first):**
> Cute food character sticker, thick hand-drawn crayon outline, soft wax-crayon texture, flat warm colours, tiny dot eyes and a small smile with rosy cheeks, centred on a plain cream background, no text, consistent stroke weight, kid's-notebook doodle charm, high resolution 2048×2048

- **Steamed momo:** *…a plump white steamed momo with pleated top folds, translucent glossy wrapper, three wisps of steam curling up from its head like a little hairstyle*
- **Deep-fried momo:** *…a golden-brown deep-fried momo with crispy bubbly blistered skin, a few oil sparkles, slightly darker crunchy edges*
- **Tandoori momo:** *…a momo with orange-red tandoori masala coating, smoky char marks, a tiny onion ring and lemon wedge beside it*
- **Gravy / jhol momo:** *…a white momo sitting happily in a small pool of glossy red Schezwan gravy at the bottom, a few gravy splashes, spring-onion flecks*
- **Neapolitan pizza:** *…a single Neapolitan pizza slice with puffy leopard-spotted charred crust, pools of melted fresh mozzarella, bright tomato sauce, two fresh basil leaves, a long cheese pull*
- **Vada pav:** *…a Mumbai vada pav: soft pav bun with a golden potato vada peeking out, green chutney, a fried green chilli on the side*
- **Noodles:** *…a bowl of hakka noodles with chopsticks lifting a swirl, colourful veggies, steam*
- **Chai:** *…a cutting-chai glass with milky tea, a curl of steam, a Parle-G-style biscuit (no brand text) leaning on it*
- **Dal baati:** *…round golden baati balls with ghee shine beside a small katori of dal and a dollop of churma*

### Tools for icons

| Tool | Use it for | Notes |
|------|-----------|-------|
| **Recraft** | Real SVG output plus export as an animated **Lottie** | Best fit: vector, consistent "style" presets |
| **LottieFiles Creator** | Prompt-to-vector and adding motion (steam loop, bounce) | Exports Lottie JSON/dotLottie for the web |
| Midjourney / Ideogram | Rich raster stickers (PNG) | Then vectorise in Recraft |
| Rive | Interactive animated mascot (reacts on hover) | More work; nice for the mascot later |

**Motion ideas:** steam rises and fades (2 s loop); the fried momo gives a tiny hop and sizzle sparkle; gravy ripples; pizza cheese stretches when hovered; chai steam forms a little heart once every few loops.

## 2. The gang illustration (our own, not the reference image)

The reference ("Unfiltered" lineup) shows a diverse group standing together in flat colourful illustration. **We must not copy it.** Make our own lineup with relatable filmy nods:

> Flat hand-drawn illustration with clean ink outlines and warm muted colours on a cream background. Six young Indian adult friends stand together, arms over shoulders, laughing. The group: a Gujarati woman in a mirror-work chaniya choli holding dandiya sticks; a lanky office guy in glasses with a loosened tie flying like a cape; a sleepy woman in an oversized cartoon T-shirt with messy hair, holding a chai glass; a bearded Sikh man in a saffron patka and striped football jersey (no club logos) with a ball under his arm; a curly-haired guy in a mustard hoodie and backpack doing an arms-wide filmy hero pose; a ponytailed woman in sportswear with a badminton racquet. A tiny steamed-momo mascot with steam on its head sits on the hero-pose guy's shoulder. Little sparkles around them. Leave empty space below for a handwritten wordmark. No text, no real logos, no celebrity likeness.

Filmy nods to keep **as poses and moods only**: the arms-wide romantic-hero pose, a slow-motion hair flip, a silent-comedy "oops" face. No real actor faces, no franchise characters.

## 3. Real food photos (one per edition)

- **Momo edition:** a real photo of steamed momos.
- **Menu edition:** a real photo of a Neapolitan pizza.

Current build: the site shows freely licensed Wikimedia Commons photos with credit lines (see `app/photos.ts`). Before a public launch, either keep the attribution visible or replace them with your own photos from the first meetup (best option: it's real, and it's yours).

## 4. Invitation letters

There are three postcard styles. People pick the one they like; the site never assumes from gender:

| Style | Look | Tone |
|-------|------|------|
| **Hero post** | Midnight blue and red, comic halftone, a searchlight in the sky with a **momo-shaped signal**, cape, a "POW!" burst, a lightning-bolt emblem | "Calling all heroes. Your gang needs you this weekend." |
| **Princess post** | Pink and lilac, glitter sparkles, a tiara, castle silhouette, a wax seal heart | "Royal invitation. The palace (a café) requests your presence." |
| **Notebook post** | The original crayon notebook look with the food cast | "Dear you, got plans?" |

**Why not the actual Batman and Superman logos:** those are registered DC trademarks. Putting them on a public site or invitation can get the site taken down or bring a legal notice. The hero card uses an **original "Momo-signal"** (a searchlight beam with a momo silhouette) and a lightning-bolt emblem instead, so it feels like a childhood superhero letter without borrowing anyone's logo. The same goes for princess cards: a generic tiara and castle, never a specific film princess.

## 5. Slogans

Already in the site:

- **Make a wish. We'll get your gang ready.**
- **Come and be found.**
- Your people are out there. Let's go meet them.
- Phones down. Plates up.
- The group chat that actually meets.
- Some friends you find. Some find you.
- Bring yourself. We'll bring the gang.
- Kal milte hain? Pakka.

## 6. Tab names (to discuss)

The site now has two tabs: **Ghar** (home) and **Adda** (group chat). Other options:

- Home: *Bhai ka ghar*, *Apna ghar*, *Ghar*
- Chat: *Adda*, *Gang chat*, *Katta*
