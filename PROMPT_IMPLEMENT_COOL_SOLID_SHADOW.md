# Mission : Implementer le theme "Cool Solid + Shadow" sur l'application

## Contexte

L'application Apigee Template Generator utilise deja une architecture Canvas avec des cards Swiss Design. Tu dois implementer le theme de background "Cool Solid" combine avec le style de cards "Shadow" pour faire ressortir visuellement les cards sur le fond.

## Fichiers a modifier

1. `apigee-react-generator/src/index.css` - Variables CSS et classes globales
2. `apigee-react-generator/src/components/Canvas/CanvasContainer.tsx` - Appliquer les classes

## Specifications du Theme

### 1. Background "Cool Solid"

Un fond gris-bleu uni, subtil et moderne (style Notion/Linear).

```css
/* Couleur principale du background */
--swiss-bg-canvas: #F1F5F9;  /* Slate-100 de Tailwind */
```

**Alternative plus chaude :**
```css
--swiss-bg-canvas: #F8FAFC;  /* Slate-50 - plus clair */
```

**Alternative plus froide :**
```css
--swiss-bg-canvas: #E2E8F0;  /* Slate-200 - plus contraste */
```

### 2. Style de Cards "Shadow"

Les cards doivent avoir une ombre subtile qui s'intensifie au hover.

```css
/* Card par defaut */
.swiss-card {
  background-color: #FFFFFF;
  border-top: 2px solid #000000;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.05),
    0 2px 4px -1px rgba(0, 0, 0, 0.03);
  transition: all 0.2s ease;
}

/* Card au hover */
.swiss-card:hover {
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.08),
    0 4px 6px -2px rgba(0, 0, 0, 0.04);
  transform: translateY(-1px);
}

/* Card expanded (optionnel - ombre plus prononcee) */
.swiss-card.expanded {
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
}
```

---

## Implementation CSS Complete

Ajoute ou modifie les variables et classes suivantes dans `index.css` :

```css
/* ========================================
   THEME: COOL SOLID + SHADOW
   ======================================== */

:root {
  /* Background Canvas - Cool Solid */
  --swiss-bg-canvas: #F1F5F9;

  /* Card Shadows */
  --swiss-shadow-card: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  --swiss-shadow-card-hover: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04);
  --swiss-shadow-card-expanded: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);

  /* Existing Swiss colors (keep) */
  --swiss-black: #000000;
  --swiss-white: #FFFFFF;
  --swiss-gray-50: #FAFAFA;
  --swiss-gray-100: #F5F5F5;
  --swiss-gray-200: #E5E5E5;
  --swiss-gray-300: #D4D4D4;
  --swiss-gray-400: #A3A3A3;
  --swiss-gray-500: #737373;
}

/* Dark mode adjustments */
.dark {
  --swiss-bg-canvas: #0F172A;  /* Slate-900 */
  --swiss-shadow-card: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
  --swiss-shadow-card-hover: 0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3);
  --swiss-shadow-card-expanded: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.4);
}

/* ========================================
   CANVAS CONTAINER
   ======================================== */

.swiss-canvas {
  background-color: var(--swiss-bg-canvas);
  min-height: calc(100vh - 140px); /* Adjust based on header/footer height */
  padding: 2.5rem 2rem;
}

/* ========================================
   SWISS CARD WITH SHADOW
   ======================================== */

.swiss-card {
  background-color: var(--swiss-white);
  border-top: 2px solid var(--swiss-black);
  box-shadow: var(--swiss-shadow-card);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
  cursor: pointer;
}

.swiss-card:hover {
  box-shadow: var(--swiss-shadow-card-hover);
  transform: translateY(-1px);
}

.swiss-card.expanded {
  box-shadow: var(--swiss-shadow-card-expanded);
}

/* Dark mode card */
.dark .swiss-card {
  background-color: #1E293B;  /* Slate-800 */
  border-top-color: var(--swiss-gray-400);
}

.dark .swiss-card:hover {
  background-color: #334155;  /* Slate-700 */
}
```

---

## Implementation dans CanvasContainer.tsx

Assure-toi que le container principal utilise la classe `swiss-canvas` :

```tsx
// Dans CanvasContainer.tsx
export function CanvasContainer() {
  return (
    <main className="swiss-canvas">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Progress Header */}
        <ProgressHeader />

        {/* Cards */}
        <OpenAPICard />
        <ApiProductCard />
        <ProxyConfigCard />
        <TargetServersCard />

        {/* Export Section */}
        <ExportSection />
      </div>
    </main>
  );
}
```

---

## Implementation dans les Cards (SwissCard.tsx)

Si tu as un composant SwissCard reutilisable :

```tsx
interface SwissCardProps {
  number: string;
  title: string;
  subtitle?: string;
  completion?: number;
  expanded?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
  badge?: React.ReactNode;
  collapsedPreview?: React.ReactNode;
}

export function SwissCard({
  number,
  title,
  subtitle,
  completion,
  expanded = false,
  onToggle,
  children,
  badge,
  collapsedPreview
}: SwissCardProps) {
  return (
    <article
      className={cn(
        "swiss-card",
        expanded && "expanded"
      )}
      onClick={onToggle}
    >
      {/* Card Header */}
      <div className="px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-3xl font-black text-[var(--swiss-gray-200)]">
            {number}
          </span>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-[var(--swiss-gray-400)] mt-1 font-mono">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {badge}
          {completion !== undefined && (
            <div className="text-right">
              <span className="text-[10px] text-[var(--swiss-gray-400)] uppercase font-bold">
                Completion
              </span>
              <p className="text-lg font-black">{completion}%</p>
            </div>
          )}
          <ChevronRight
            className={cn(
              "w-5 h-5 transition-transform",
              expanded && "rotate-90"
            )}
          />
        </div>
      </div>

      {/* Collapsed Preview (visible when not expanded) */}
      {!expanded && collapsedPreview && (
        <div className="px-6 pb-4">
          {collapsedPreview}
        </div>
      )}

      {/* Expandable Content */}
      <div className={cn(
        "overflow-hidden transition-all duration-300",
        expanded ? "max-h-[2000px]" : "max-h-0"
      )}>
        <div className="px-6 pb-6 border-t border-[var(--swiss-gray-100)] pt-6">
          {children}
        </div>
      </div>
    </article>
  );
}
```

---

## Classes Tailwind equivalentes (si tu preferes)

Si tu veux utiliser Tailwind directement sans CSS custom :

```tsx
// Background canvas
<main className="bg-slate-100 dark:bg-slate-900 min-h-screen p-10">

// Card avec shadow
<article className={cn(
  "bg-white dark:bg-slate-800",
  "border-t-2 border-black dark:border-slate-400",
  "shadow-md hover:shadow-lg",
  "transition-all duration-200",
  "hover:-translate-y-0.5",
  expanded && "shadow-lg"
)}>
```

---

## Checklist d'implementation

- [ ] Ajouter les variables CSS dans `index.css` (section `:root`)
- [ ] Ajouter les variables dark mode (section `.dark`)
- [ ] Creer/modifier la classe `.swiss-canvas`
- [ ] Creer/modifier la classe `.swiss-card` avec les shadows
- [ ] Appliquer `.swiss-canvas` au container principal
- [ ] Appliquer `.swiss-card` a toutes les cards
- [ ] Tester le hover effect sur les cards
- [ ] Tester le dark mode
- [ ] Verifier que le contraste est suffisant pour la lisibilite

---

## Resultat attendu

- Le fond de la zone canvas doit etre d'un gris-bleu subtil (`#F1F5F9`)
- Les cards blanches doivent "flotter" visuellement grace a l'ombre
- Au hover, les cards doivent legerement s'elever avec une ombre plus prononcee
- L'effet doit etre subtil et professionnel, pas trop prononce
- Le dark mode doit fonctionner avec des couleurs inversees appropriees
