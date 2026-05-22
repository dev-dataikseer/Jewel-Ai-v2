"use strict";
/**
 * Jewel AI Studio — Professional Prompt Library (v2)
 *
 * Each workflow has a MasterPrompt (system_role, camera_settings, environment,
 * lighting_and_physics, preservation_lock, negative_prompt) and a map of
 * ChildPrompts keyed by jewelry-type slug.
 *
 * These are the single source of truth used by composePrompt() in queue.ts.
 * The DB (PromptTemplate / SubjectPrompt tables) can OVERRIDE any field —
 * these constants are the authoritative defaults / fallbacks.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNIVERSAL_NEGATIVE_PROMPT = exports.WORKFLOW_INTENTS = exports.CHILD_PROMPTS = exports.MASTER_PROMPTS = void 0;
exports.getChildPromptKey = getChildPromptKey;
// ─────────────────────────────────────────────────────────────────────────────
// MASTER PROMPTS — one per workflow
// ─────────────────────────────────────────────────────────────────────────────
exports.MASTER_PROMPTS = {
    // ── 01  CATALOG IMAGE ────────────────────────────────────────────────────
    CATALOG_IMAGE: {
        systemRole: 'Act as a master commercial product photographer and high-end jewelry retoucher.',
        cameraSettings: 'High-end macro product photography, shot on a 100mm macro lens, f/11 aperture for edge-to-edge sharpness, crisp focus stacking, high-resolution editorial print quality.',
        environment: 'Placed gracefully on a premium, soft cream-colored velvet surface. The surrounding environment is a clean, minimalist, and highly professional luxury studio setting with warm, light neutral tones to beautifully complement and make the jewelry pop.',
        lightingAndPhysics: "Soft, diffused Profoto studio lighting with a large overhead softbox. Authentic ambient occlusion. A highly accurate, dark contact shadow anchors the bottom of the ring's band directly into the velvet texture. The metal reflects the softbox light naturally without overexposing.",
        preservationLock: 'CRITICAL MANDATE: You must strictly preserve the exact original pixels, geometry, facet cuts, true colors, and scale of the masked ring. Do not warp the metal band, do not melt or shift the prongs, and do not alter the internal refractions of the gemstones.',
        negativePrompt: '3d render, CGI, digital illustration, plastic texture, artificial AI glow, over-smoothed metal, warped band, distorted facets, melted prongs, floating object, missing contact shadow, unnatural lighting, neon colors, cartoon, painterly effect.',
    },
    // ── 02  JEWELRY ON MODEL ─────────────────────────────────────────────────
    JEWELRY_ON_MODEL: {
        systemRole: 'Act as a world-class luxury jewelry editorial photographer and fashion art director with credits in Vogue, Cartier, Bulgari, and Van Cleef & Arpels campaigns. You specialize in capturing jewelry on live models in ways that make the piece the absolute star — the model\'s role is to give the jewelry context, scale, and aspirational desirability. Every image must look like a genuine high-production luxury brand campaign photograph — real skin texture, real anatomy, real lighting, never AI-generated or digitally composited. The jewelry must appear organically placed, naturally weighted, and photographically real.',
        cameraSettings: 'Canon EOS R5 full-frame mirrorless. 85mm f/1.4 portrait lens for natural perspective and beautiful out-of-focus background separation. Aperture f/2.8 — enough depth-of-field to keep the jewelry and immediate skin area sharp while the background softly dissolves. ISO 100–400. 1/250s with TTL strobe. Skin tones rendered accurately at D65 daylight balance. RAW + Lightroom CC grade to Vogue editorial standard.',
        environment: 'The model is photographed in an upscale luxury studio setting: clean, gradient-lit white or soft charcoal cyclorama background. The model\'s clothing, if visible, is minimalist and neutral (white silk, black cashmere, nude fabric) to ensure jewelry remains dominant. Alternatively, a lifestyle context is used — upscale interior with white marble, warm-wood paneling, or natural daylight flooding in from a large window. All environments feel physically real, elevated, and consistently lit.',
        lightingAndPhysics: 'Key light: large 5-foot octabank at 45-degree angle to model face, producing soft, directional light that models the contours of the face, hands, and neck. Fill light: large foam-core reflector or second softbox at 1.5-stop lower power, opening shadows without killing dimensionality. Jewelry accent: a small, precise Fresnel spot aimed specifically at the jewelry piece to guarantee metallic specular highlights and gemstone fire are fully activated. Metal surfaces reflect accurate skin-tone bounce light — warm gold appears warmer against skin, cool platinum appears cooler and more architectural. Gemstones react to the focused accent spot with pinpoint fire and brilliance. Skin tones are rendered with natural subsurface scattering — no flat, plastic-looking skin.',
        preservationLock: 'DUAL PRESERVATION MANDATE: (A) CUSTOMER ANATOMY — Do not alter the model\'s skin tone, skin texture, finger shape, hand size, wrist width, ear shape, neck contour, or any facial features (if visible). The model\'s identity must be entirely recognizable. (B) JEWELRY DESIGN — Do not alter the jewelry\'s design, metal color, gemstone color, prong count, setting style, chain type, or overall design. (C) SCALE ACCURACY — The jewelry must be rendered at anatomically correct scale. A ring must fit a human finger naturally, a necklace must hang at the correct collarbone or sternum position, earrings must align with the earlobe correctly.',
        negativePrompt: 'Cartoon, anime, digital painting, 3D render, CGI, plastic skin, mannequin, headless model, amputated limbs, extra fingers, missing fingers, deformed hands, warped wrist, floating jewelry, disconnected jewelry from skin, jewelry not touching skin, impossible jewelry positioning, jewelry inside the body, wrong metal color, altered gemstone color, text overlay, watermark, low resolution, grainy, blurry jewelry, over-retouched skin, alien-smooth skin, wrong metal color, unnatural eye color.',
    },
    // ── 03  GEMSTONE COLOR CHANGE ─────────────────────────────────────────────
    GEMSTONE_COLOR_CHANGE: {
        systemRole: 'Act as a master gemologist-photographer and precision retoucher who specializes in jewelry color variant production for luxury brands. You have deep knowledge of how different gemstones — diamonds, rubies, sapphires, emeralds, moissanites, amethysts, topazes, opals — physically interact with light: their refractive indices, dispersion rates, optical phenomena, and natural color saturation. Your task is a surgical precision operation: change ONLY the color and optical identity of the specified gemstone(s) in the image to match the target color and mineral type. Every other element — metal, prongs, background, lighting, image perspective — must remain pixel-perfect identical to the source.',
        cameraSettings: 'Preserve the exact camera perspective, focal length, depth-of-field, and framing of the source image. Do not change the zoom level, crop, or composition. The new gemstone must integrate seamlessly at the same perceived focal distance as the original stone.',
        environment: 'Preserve the background, surface, and environmental elements of the source image exactly as they are. Do not alter the surface color, texture, or any reflective properties of the background. The only change introduced is within the gemstone itself — its color, internal structure, and light behavior.',
        lightingAndPhysics: 'The new target gemstone must respond physically accurately to the existing lighting in the source image. The light source positions, intensity, and direction are fixed — the gemstone adapts its refractions, fire, and brilliance to those light conditions as if it were the real mineral photographed in that exact setup. Diamond: extreme brilliance, white specular, spectral rainbow dispersion fire. Ruby: deep chromium-red saturation, transparent with depth. Sapphire: royal blue depth, cool blue brilliance. Emerald: rich deep green with natural jardins, moderate brilliance. Moissanite: higher dispersion than diamond, more spectral rainbow fire. All gemstone colors must be scientifically accurate to their target mineral species.',
        preservationLock: 'SURGICAL PRECISION MANDATE — Only the gemstone(s) specified are to be modified. ALL other elements remain absolutely identical to the source image: (1) Metal color, finish, and texture unchanged. (2) Prong shape, count, and positioning unchanged. (3) Band, shank, or chain unchanged. (4) Setting style unchanged. (5) Background, surface, and ambient environment unchanged. (6) Image crop, perspective, and composition unchanged. (7) Any side or accent stones NOT specified for change must remain exactly as in the source. (8) The size and physical dimensions of the gemstone must remain the same.',
        negativePrompt: 'Metal color change, prong reshaping, band warping, background alteration, perspective shift, crop change, additional gemstones, removed gemstones, stone cut change, stone size change, gemstone outside its setting, setting redesigned, color spilling onto metal, color contaminating background, prongs floating, manufacturer markings changed, gemstone with impossible optical properties.',
    },
    // ── 04  CUSTOMER TRY-ON ───────────────────────────────────────────────────
    CUSTOMER_TRY_ON: {
        systemRole: 'Act as a world-class digital jewelry try-on specialist and VFX compositor with extensive experience in luxury e-commerce augmented reality. Your specialty is seamlessly integrating luxury jewelry pieces onto real customer photography in a way that looks completely photographed and physically real — never composited, never CGI, never obviously digitally edited. The customer\'s personal features (skin tone, skin texture, hand shape, finger size, wrist anatomy, ear structure, neck contour) must be preserved exactly. The jewelry appears to physically exist on the customer\'s body — resting naturally, casting accurate shadows on skin, interacting with skin lighting, and obeying all natural physical laws.',
        cameraSettings: 'Match and preserve the camera characteristics of the customer\'s uploaded photo exactly: focal length estimation, exposure, color temperature, and perspective. Do not change the crop, composition, or overall scene framing. The jewelry\'s rendering quality must match the photo quality — if the photo is taken in natural daylight, the jewelry must integrate under that daylight, not under studio strobe.',
        environment: 'Preserve the customer\'s background exactly as it appears in their uploaded photo. Do not replace, blur (unless already blurred), or alter the background environment. The jewelry must integrate seamlessly into the existing ambient lighting of the customer\'s photo — whether indoor, outdoor, golden hour, or fluorescent. All environmental light sources visible in the customer\'s photo should be reflected on the jewelry\'s metal and gemstones.',
        lightingAndPhysics: 'CRITICAL LIGHTING MATCH: Identify the dominant light source direction in the customer\'s photo from skin highlights and shadows. Apply matching highlights and shadows to the jewelry surface — metal specular highlights must appear on the same side as skin highlights. The jewelry must cast a soft shadow on the customer\'s skin falling away from the light source direction. Metal color behavior: yellow gold reflects warm skin tones; white gold and platinum reflect cooler ambient light; rose gold blends warmly with the skin\'s natural flush. Gemstones reflect ambient light colors visible in the customer\'s photo.',
        preservationLock: 'DUAL PRESERVATION MANDATE: (A) CUSTOMER ANATOMY — Do not alter the customer\'s skin tone, skin texture, finger shape, hand size, wrist width, ear shape, neck contour, or any facial features (if visible). The customer\'s identity must be entirely recognizable. (B) JEWELRY DESIGN — Do not alter the jewelry\'s design, metal color, gemstone color, prong count, setting style, chain type, or overall design. (C) SCALE ACCURACY — Jewelry must be at anatomically correct scale relative to the customer\'s specific body proportions.',
        negativePrompt: "Customer's skin color changed, customer's hand reshaped, customer's skin airbrushed unrealistically, customer's anatomy distorted, background replaced, jewelry floating above skin, jewelry embedded inside skin, no contact shadow, anatomically wrong scale, necklace floating off neck, earring not aligned to earlobe, wrong perspective of jewelry vs customer, wrong jewelry design, wrong metal color, wrong gemstone color, text overlay, watermark.",
    },
    // ── 05  BACKGROUND REPLACEMENT ───────────────────────────────────────────
    BACKGROUND_REPLACEMENT: {
        systemRole: 'Act as a world-class luxury product photography retoucher and CGI environment specialist. You specialize in seamlessly replacing backgrounds in existing jewelry photographs to produce premium, commercially-publishable images. Your backgrounds are not flat digital textures — they are three-dimensional environments with convincing depth, realistic lighting gradients, and physical plausibility. The key technical challenge is making the new background look like the jewelry was photographed in that environment from the very beginning — not composited or cut-out pasted.',
        cameraSettings: 'Preserve the exact camera perspective, focal length, aperture depth-of-field, and composition of the source jewelry image. Do not alter the crop. The new background must recede into the distance in a way consistent with the focal length and aperture of the source image.',
        environment: 'Replace the background with the requested luxury environment. In all cases, the background must feel photorealistic and physically plausible — not digital, not filtered, not obviously AI-generated. The transition between the jewelry\'s foreground surface and the new background must be seamless — no harsh cutline, no obvious edge, no halo artifact around the jewelry or surface edge.',
        lightingAndPhysics: 'CRITICAL ENVIRONMENT-JEWELRY LIGHT MATCHING: The new background must produce ambient fill light on the jewelry\'s metal surfaces consistent with the background\'s color palette. A warm golden-hour background should introduce warm amber bounce into the jewelry\'s shadow side; a cool blue studio background should introduce cool fill light. Any new background light sources must cast logical reflections on the jewelry\'s metal. The jewelry\'s contact shadow on the foreground surface must remain intact and unchanged.',
        preservationLock: 'FOREGROUND PRESERVATION MANDATE: (1) The jewelry piece itself must be preserved pixel-perfectly — zero changes to the metal, gemstones, prongs, design, or finish. (2) The foreground surface the jewelry rests on must be preserved and retained in the image — only the area behind and around the surface changes. (3) The contact shadow between the jewelry and the foreground surface is preserved exactly. (4) The jewelry must remain grounded to the foreground surface — never floating.',
        negativePrompt: 'Jewelry design altered, gemstone color changed, metal color changed, foreground surface texture changed, jewelry contact shadow removed, jewelry floating above surface, cutline visible around jewelry, halo artifact at background edge, background bleeding through jewelry, background too uniform/flat/digital, color temperature mismatch between jewelry and background, background too busy/distracting from jewelry, text in background, logos, watermarks.',
    },
    // ── 06  LUXURY ENHANCEMENT ───────────────────────────────────────────────
    LUXURY_ENHANCEMENT: {
        systemRole: 'Act as a senior luxury jewelry retoucher and post-production specialist with credits at Cartier, Tiffany & Co., Harry Winston, and Bulgari. Your specialty is taking good jewelry photographs and transforming them into extraordinary luxury campaign images through meticulous, professional-grade retouching and enhancement. You work with extreme precision and restraint — enhancement should feel invisible, as if the jewelry was always photographed at this level of quality. Enhancement is applied as a post-production layer — the underlying photograph geometry and design do not change.',
        cameraSettings: 'Preserve the original image\'s camera perspective, composition, and crop exactly. Output at maximum available resolution with no compression artifacts. Enhancement is post-production only.',
        environment: 'Evaluate the existing background and surface. If the background is acceptable but slightly flat or off-color, balance its tone and add subtle depth gradient. If the surface shows dirt, scratches, or imperfections not part of the jewelry, clean them. If the background-to-surface transition is rough or visible, smooth it into a professional infinity sweep. Do NOT replace the background with a different environment.',
        lightingAndPhysics: 'ENHANCEMENT PRIORITY: (1) METAL SURFACES — Enhance specular highlights on metal to match the precise reflective behavior of the metal type: yellow gold shows warm honey-gold specular; white gold/platinum shows cool crisp steel-blue specular; rose gold shows warm blush-copper specular. All highlights have clean natural falloff. (2) GEMSTONE BRILLIANCE — Amplify the internal light behavior: diamonds show more visible fire and dispersion, colored stones have richer saturated depth. (3) SHADOW DEPTH — Ensure all cast shadows and contact shadows are clean, natural, and physically correct. (4) OVERALL CLARITY — Sharpen fine details: prong tips, gemstone facet edges, chain link textures, engraving details. Apply microcontrast enhancement to metal surfaces. (5) COLOR BALANCE — Correct any unwanted color casts and bring the image to a neutral, accurate color standard.',
        preservationLock: 'NON-NEGOTIABLE BOUNDARIES: (1) Do NOT add gemstones, remove gemstones, or change their positions. (2) Do NOT change the fundamental design of the piece. (3) Do NOT change the metal color type. (4) Do NOT significantly alter the shape, form, or geometry of the jewelry piece. (5) Enhancement must look natural — enhancement artifacts (over-sharpening halos, artificial glows, HDR-like over-processing) are strictly forbidden. The final image must look like a better photograph of the same piece — not a digitally manipulated artwork.',
        negativePrompt: 'Gemstone added, gemstone removed, metal color changed, jewelry design changed, over-sharpening halo, artificial bloom/glow effect, HDR-over-processed look, neon or artificial color cast, fake glitter/sparkle particles, fantasy lighting rays, unrealistic lens flare, over-smoothed metal (loss of grain/texture), plastic-looking metal, unnatural gemstone color saturation, AI-artifact patterns on metal, any text, watermark, or logo.',
    },
    // ── 07  CUSTOM PROMPT ─────────────────────────────────────────────────────
    CUSTOM_PROMPT: {
        systemRole: 'Act as a world-class luxury jewelry photographer and creative director who can execute any creative brief at the highest professional standard. You are equally skilled at photorealistic product photography, editorial fashion imaging, abstract and artistic jewelry presentations, lifestyle and narrative compositions, and fantastical or surreal luxury artistic interpretations. Whatever creative direction is requested, your output must look like the work of a professional photographer with world-class post-production support — never amateurish, never obviously AI-generated, always visually compelling and technically superb. The jewelry piece must always be treated as the star of the image.',
        cameraSettings: 'Adapt the camera settings to best serve the requested creative direction. Default professional standard: Canon EOS R5, lens choice appropriate to the shot type (macro 100mm for close product work, 85mm portrait for editorial, 35mm for environmental context shots). Exposure, aperture, and ISO chosen for optimal quality and correct creative depth-of-field for the scene.',
        environment: 'The environment is entirely defined by the user\'s custom instruction. Construct the requested environment with maximum physical plausibility and luxury quality. Every surface, material, and spatial element in the environment must be chosen and rendered with the same care a professional set designer would apply to a real photography shoot. No environment should look like a generic AI background — every detail should feel specifically selected and styled for this piece.',
        lightingAndPhysics: 'Lighting is adapted to serve the user\'s creative direction. Always ensure: (1) The jewelry piece is the brightest, most luminous element in the composition — it always draws the eye first. (2) All lighting is physically plausible — every light source in the scene has a logical real-world equivalent. (3) Metal surfaces react correctly to the chosen light sources. (4) Gemstones exhibit their natural optical properties — fire, brilliance, color depth — in response to the actual light sources in the scene.',
        preservationLock: 'Regardless of creative direction, the jewelry piece itself must always be preserved: (1) The design, metal color, gemstone type, and physical form of the piece are never altered. (2) The piece is always clearly visible and legible — no obscuring by shadow, fog, or obstruction. (3) Physical plausibility is always maintained. (4) The jewelry always appears grounded and physically present in its environment — never floating, never ghostly.',
        negativePrompt: 'Jewelry design altered, wrong metal color, wrong gemstone color, jewelry floating, jewelry obscured beyond recognition, amateurish composition, snapshot quality, obvious AI artifacts (melted text, impossible anatomy, fused elements), low resolution output, missing contact shadow, physically impossible scene elements, dark or muddy overall exposure that hides jewelry detail.',
    },
    // BULK_GENERATION inherits from CATALOG_IMAGE
    BULK_GENERATION: {
        systemRole: 'Act as a world-class commercial jewelry photographer with over 20 years of high-end editorial experience. You specialize in pristine macro catalog photography for luxury jewelry brands. Your mission is to produce a photograph that looks physically real, hyper-detailed, and commercially polished — not rendered or AI-generated. Every image must feel like it was captured inside a professional luxury product studio under controlled lighting.',
        cameraSettings: 'Canon EOS R5 full-frame mirrorless, 100mm f/2.8L IS USM Macro lens. Aperture f/11 for total edge-to-edge sharpness and maximum depth of field. ISO 100 for zero grain. 1/125s shutter speed with studio strobe synchronization. Tripod-locked for absolute stability. RAW capture, color-calibrated to D65 neutral daylight.',
        environment: 'The jewelry piece rests on a premium matte cream-white velvet surface with an ultra-fine micro-texture. The surface curves gently upward in the background (infinity sweep), seamlessly transitioning to a soft warm-white studio backdrop. The surrounding environment is clean, minimalist, and impeccably professional — no objects, no distracting textures, no noise. The ambient color temperature is 5500K warm-neutral.',
        lightingAndPhysics: 'Primary light: a large 120cm Profoto octabank softbox positioned overhead-front at a 45-degree angle, producing soft, wrapping light that gently fills the metal\'s contours. Fill light: a large reflector panel placed opposite the key light. All shadows are soft, natural, and physically accurate — especially the contact shadow where the jewelry touches the velvet surface. Metal reflections are realistic. Gemstones exhibit authentic internal refractions.',
        preservationLock: 'ABSOLUTE MANDATE — Preserve the exact physical integrity of the jewelry piece: no geometry changes, no prong alteration, no gemstone color change, no band warping, no artificial smoothing, correct scale, piece physically grounded — never floating.',
        negativePrompt: '3D render, CGI, digital illustration, cartoon, plastic sheen, artificial neon glow, overexposed highlights, floating jewelry, missing contact shadow, warped prongs, melted metal, distorted facets, asymmetrical gemstones, wrong gemstone color, deformed band, watermark, text overlay, low resolution, grainy, over-sharpened halo artifacts.',
    },
};
// ─────────────────────────────────────────────────────────────────────────────
// CHILD PROMPTS — single text string per jewelry type slug
// Subject map in final JSON: { "ring": "...", "necklace": "..." }
// ─────────────────────────────────────────────────────────────────────────────
exports.CHILD_PROMPTS = {
    ring: {
        text: 'A luxury ring positioned elegantly in a professional studio alignment that beautifully showcases the center stone and the band detailing, allowing the natural geometry of the piece to dictate the best visual flow.',
    },
    necklace: {
        text: 'A luxury necklace gracefully draped with an elegant, fluid curve. The pendant and chain are aligned beautifully to capture maximum brilliance and showcase the intricate details naturally.',
    },
    bangles: {
        text: 'A set of luxury rigid bangles stacked or arranged in a naturally appealing, professional composition that highlights the continuous metalwork and embedded gemstones.',
    },
    bracelet: {
        text: 'A luxury flexible bracelet resting elegantly with a natural, flowing drape, beautifully aligned so the main stones or links catch the studio light perfectly.',
    },
    earrings_studs: {
        text: 'A pair of luxury stud earrings positioned in a balanced, professional alignment to capture the internal light and pristine cut of the main stones against the soft background.',
    },
    earrings_drops: {
        text: 'A pair of luxury drop earrings gracefully arranged, allowing their natural suspension or drape to dictate a beautiful, professional alignment that showcases the articulated settings.',
    },
    earrings_hoops: {
        text: 'A pair of luxury hoop earrings arranged in a visually pleasing, professional composition that beautifully showcases both the outer gemstone paving and the inner metallic curvature.',
    },
    pendant: {
        text: 'A luxury pendant positioned elegantly on the surface, naturally aligned to emphasize the pure craftsmanship, central stone, and intricate metallic details without feeling rigid.',
    },
    watch: {
        text: 'A luxury timepiece arranged in a classic, professional alignment that beautifully illuminates the dial texture and allows the strap to form a natural, elegant curve.',
    },
    brooch: {
        text: 'A luxury decorative brooch positioned naturally against the surface, aligned beautifully to catch the studio light perfectly across its complex geometric or floral arrangement.',
    },
    anklet: {
        text: 'A delicate luxury anklet gracefully draped in a natural, flowing arrangement, highlighting the fine chain links and allowing any dangling elements to settle beautifully.',
    },
    cufflinks: {
        text: 'A pair of premium luxury cufflinks arranged in a balanced, professional composition that elegantly showcases the front face alongside the polished metallic mechanism.',
    },
    multiple_items: {
        text: 'A curated luxury jewelry set arranged harmoniously, with each piece spaced and aligned beautifully to allow natural contact shadows while maintaining a cohesive, professional catalog aesthetic.',
    },
    // ── Gemstone Color Change target mineral profiles ─────────────────────────
    gemstone_ruby: {
        text: 'Change ONLY the center gemstone(s) to deep chromium red — pigeon blood ruby red. The new stone exhibits: rich, saturated red body color, high transparency and natural depth, red fire visible in the brightest facets, no orange overtone — pure ruby red.',
    },
    gemstone_sapphire: {
        text: 'Change ONLY the center gemstone(s) to royal blue — cornflower blue sapphire. Deep saturated blue with violet undertone in shadow areas, high transparency, brilliant cut fire. No green overtone, no gray haze — pure royal or cornflower blue.',
    },
    gemstone_emerald: {
        text: 'Change ONLY the center gemstone(s) to deep Colombian emerald green. Rich deep green with natural jardins (faint growth channels) giving the stone complex inner texture. Lower brilliance than diamond — velvety, warm glow.',
    },
    gemstone_diamond: {
        text: 'Change ONLY the center gemstone(s) to a white diamond. Extreme brilliance, spectral rainbow fire in pavilion facets, sharp on/off scintillation, table facet reflects a clean bright white specular point. No color tint — pure D-E colorless grade.',
    },
    gemstone_moissanite: {
        text: 'Change ONLY the center gemstone(s) to near-colorless moissanite. Near-colorless body (D-E equivalent) with higher fire dispersion than diamond (2.4x more rainbow fire). More numerous, more intensely colored rainbow dispersions. Maximum light return.',
    },
    // ── Luxury Enhancement metal profiles ────────────────────────────────────
    enhancement_yellow_gold: {
        text: 'ENHANCE metal surfaces for yellow gold: warm, rich, 24-karat honey-gold tone. Specular highlights show a clean golden-white hot spot with beautiful gradient falloff. Polished surfaces read as mirror-bright with warm golden reflections. Remove any greenish or orange color cast.',
    },
    enhancement_white_gold_platinum: {
        text: 'ENHANCE metal surfaces for white gold or platinum: cool, bright, architectural metallic quality. Specular highlights are brilliant, crisp, and cool (blue-white). Mid-tone surface is a clean, neutral cool silver. Remove any yellow warmth from inadequate original color balance.',
    },
    enhancement_rose_gold: {
        text: 'ENHANCE metal surfaces for rose gold: blush-copper-pink warmth. Specular highlights are warm blush-white — not pure white, not orange. Mid-tone surface is a rich, warm copper-pink. Ensure rose gold reads as distinctly pink-copper, not orange-gold.',
    },
    // ── Background Replacement environment profiles ───────────────────────────
    background_white_seamless: {
        text: 'Replace the background with a pure, photographic-quality white seamless paper background with a warm, slightly cream-toned quality. A gentle gradient exists behind the jewelry. Smooth professional infinity-sweep curve transition from the foreground surface.',
    },
    background_black_acrylic: {
        text: 'Replace the background with a highly polished black acrylic or obsidian glass surface extending infinitely behind the jewelry, with a mirrored reflection of the jewelry appearing below — fading to black within 2–3cm.',
    },
    background_marble: {
        text: 'Replace the background with premium Italian Carrara marble — white and cream body with fine, organic gray-silver veining running diagonally. Natural matte-satin finish. Marble extends as both the foreground surface and background wall in a gentle sweep.',
    },
    background_dark_velvet: {
        text: 'Replace the background with a rich, deeply-saturated midnight navy blue velvet. Micro-fiber texture visible when side-lit. Velvet background runs vertically behind the piece. Gemstones and metal highlights pop dramatically against the absorbent velvet.',
    },
    background_golden_hour: {
        text: 'Replace the background with a warm outdoor golden hour environment — heavily out-of-focus bokeh of late afternoon warm sunlight at 3500–4000K. Foreground surface receives warm golden sidelight. Warm amber rim highlight on the jewelry edges.',
    },
    background_luxury_interior: {
        text: 'Replace the background with an upscale interior environment — natural daylight (5600K) flooding from a large window, white marble or warm-oak surface, out-of-focus luxury furnishings visible in background.',
    },
    background_transparent: {
        text: 'Replace the background with a clean white ground suitable for PNG export or e-commerce listing. Pixel-precise extraction — no halo, no fringe. Contact shadow preserved as a soft, natural gray shadow on the white ground.',
    },
};
// ─────────────────────────────────────────────────────────────────────────────
// WORKFLOW INTENT LABELS
// ─────────────────────────────────────────────────────────────────────────────
exports.WORKFLOW_INTENTS = {
    CATALOG_IMAGE: 'commercial_catalog_composite',
    JEWELRY_ON_MODEL: 'jewelry_model_placement',
    GEMSTONE_COLOR_CHANGE: 'gemstone_color_specialist',
    CUSTOMER_TRY_ON: 'customer_hand_wrist_tryon',
    BACKGROUND_REPLACEMENT: 'studio_background_retouching',
    LUXURY_ENHANCEMENT: 'high_end_metal_gloss_enhancement',
    CUSTOM_PROMPT: 'open_creative_direction',
    BULK_GENERATION: 'commercial_catalog_composite',
};
// ─────────────────────────────────────────────────────────────────────────────
// UNIVERSAL NEGATIVE PROMPT (final fallback)
// ─────────────────────────────────────────────────────────────────────────────
exports.UNIVERSAL_NEGATIVE_PROMPT = 'low quality, blurry, distorted jewelry, melted metal, warped ring, asymmetrical gemstones, broken prongs, extra gemstones, floating jewelry, missing contact shadow, deformed chain, unrealistic reflections, poor lighting, cartoon, CGI look, 3D render, digital illustration, AI artifacts, text overlay, watermark, over-stylization, neon colors, plastic texture.';
// ─────────────────────────────────────────────────────────────────────────────
// HELPER — map a raw jewelry type string to a child prompt key
// ─────────────────────────────────────────────────────────────────────────────
function getChildPromptKey(rawType, workflow) {
    const t = rawType.toLowerCase().trim();
    // Workflow-specific special keys
    if (workflow === 'GEMSTONE_COLOR_CHANGE') {
        if (t.includes('ruby'))
            return 'gemstone_ruby';
        if (t.includes('sapphire'))
            return 'gemstone_sapphire';
        if (t.includes('emerald'))
            return 'gemstone_emerald';
        if (t.includes('diamond'))
            return 'gemstone_diamond';
        if (t.includes('moissanite'))
            return 'gemstone_moissanite';
    }
    if (workflow === 'LUXURY_ENHANCEMENT') {
        if (t.includes('rose gold'))
            return 'enhancement_rose_gold';
        if (t.includes('white gold') || t.includes('platinum'))
            return 'enhancement_white_gold_platinum';
        if (t.includes('yellow gold') || t.includes('gold'))
            return 'enhancement_yellow_gold';
    }
    if (workflow === 'BACKGROUND_REPLACEMENT') {
        if (t.includes('white') || t.includes('seamless'))
            return 'background_white_seamless';
        if (t.includes('black') || t.includes('acrylic'))
            return 'background_black_acrylic';
        if (t.includes('marble'))
            return 'background_marble';
        if (t.includes('velvet'))
            return 'background_dark_velvet';
        if (t.includes('golden') || t.includes('sunset') || t.includes('outdoor'))
            return 'background_golden_hour';
        if (t.includes('interior') || t.includes('lifestyle') || t.includes('luxury'))
            return 'background_luxury_interior';
        if (t.includes('transparent') || t.includes('png') || t.includes('cutout'))
            return 'background_transparent';
    }
    // Standard jewelry type routing
    if (t.includes('stud'))
        return 'earrings_studs';
    if (t.includes('drop'))
        return 'earrings_drops';
    if (t.includes('hoop'))
        return 'earrings_hoops';
    if (t.includes('earring'))
        return 'earrings_studs';
    if (t.includes('multiple') || t.includes('set') || t.includes('multi'))
        return 'multiple_items';
    if (t.includes('ring'))
        return 'ring';
    if (t.includes('necklace'))
        return 'necklace';
    if (t.includes('bangle'))
        return 'bangles';
    if (t.includes('bracelet'))
        return 'bracelet';
    if (t.includes('pendant'))
        return 'pendant';
    if (t.includes('watch'))
        return 'watch';
    if (t.includes('brooch'))
        return 'brooch';
    if (t.includes('anklet'))
        return 'anklet';
    if (t.includes('cufflink'))
        return 'cufflinks';
    return 'ring'; // universal fallback
}
