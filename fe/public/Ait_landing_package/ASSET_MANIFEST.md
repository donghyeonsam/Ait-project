# Ait Landing Assets

## Reference

| File | Purpose |
| --- | --- |
| `references/landing-ui-reference.png` | 구현 목표 랜딩페이지 시안 |
| `references/design-system.png` | 색상·서체·간격·라디우스·그림자 기준 |

## Branding

| File | Recommended use |
| --- | --- |
| `public/assets/landing/branding/ait-mark.svg` | favicon, compact mobile mark |
| `public/assets/landing/branding/ait-wordmark.svg` | desktop navbar logo |

## People

| File | Recommended use |
| --- | --- |
| `public/assets/landing/people/interviewee-primary.webp` | hero mock interview and first study tile |
| `public/assets/landing/people/study-member-female.webp` | group study and multimodal analysis card |
| `public/assets/landing/people/study-member-male.webp` | group study participant |

All people are fictional AI-generated characters. Use descriptive `alt` text
only when the image adds content. Use empty `alt=""` when the image is purely
decorative inside an already-labelled product preview.

## Decoration and UI visuals

| File | Recommended use |
| --- | --- |
| `public/assets/landing/decor/hero-orbits.svg` | subtle hero background orbit |
| `public/assets/landing/decor/dot-grid.svg` | low-opacity hero dot pattern |
| `public/assets/landing/decor/gold-spark.svg` | tiny badge/accent spark |
| `public/assets/landing/visuals/waveform.svg` | static fallback waveform |
| `public/assets/landing/visuals/partner-logo-slot.svg` | neutral logo marquee placeholder |

Use Lucide React for interface icons. Do not rasterize icons. Do not use real
company logos unless Ait has permission and an actual partnership. The reference
mockup's company names are visual placeholders only.

## Asset paths in React

Files under `public/` should be referenced from the root:

```tsx
<img
  src="/assets/landing/people/interviewee-primary.webp"
  alt=""
/>
```

The SVG waveform is a no-JavaScript fallback. In the live mockup, animate a
CSS/SVG waveform while keeping this asset as a reduced-motion fallback.
