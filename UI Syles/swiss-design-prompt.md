# Prompt : Adaptation UI - Système de Design "Minimalisme Suisse"

## 1. Contexte du Projet

Nous refondons une application d'architecture technique (écosystème webMethods/API Management) pour un expert ayant 20 ans d'expérience. L'objectif est de projeter une image de **Rigueur**, **Autorité**, **Précision** et **Modernité Institutionnelle**.

---

## 2. Principes Fondamentaux du Design (Swiss Style)

Tu dois appliquer ces règles strictement lors de la modification des composants :

- **Palette Monochrome** : Noir (`#000000`), Blanc (`#FFFFFF`), et Gris technique (`#F3F4F6`, `#9CA3AF`). Pas de dégradés, pas de couleurs vives sauf pour les alertes critiques.

- **Typographie Dominante** : Utilise `Inter` ou `Helvetica`. Joue sur les contrastes de graisses (Black/Bold vs Light).

- **Grille Modulaire** : Tout doit être aligné sur une grille rigoureuse. Utilise des bordures fines (`1px`) ou épaisses (`2px` pour les sections) plutôt que des ombres.

- **Espace Négatif** : Augmente les marges et les paddings. Le contenu doit "respirer".

- **Zéro Ombre** : Supprime les `box-shadow`. La profondeur est créée par les lignes et les blocs de couleur pleine.

---

## 3. Configuration Tailwind CSS suggérée

Applique ces classes ou assure-toi que le thème les supporte :

| Élément | Classes Tailwind |
|---------|------------------|
| Titres | `font-black uppercase tracking-tighter` |
| Labels techniques | `font-mono text-[10px]` |
| Bordures | `border-black`, `border-t-2`, `border-gray-200` |
| Boutons | `bg-black text-white px-6 py-3 hover:bg-gray-800 transition-all uppercase text-xs font-bold` |

---

## 4. Bibliothèque de Composants à Implémenter

### 4.1 SectionHeader

Un numéro de section en gros (`text-4xl font-black`), un titre en uppercase (`tracking-widest`) et une bordure inférieure noire épaisse.

### 4.2 SwissCard

Un conteneur sans ombre, avec une bordure supérieure ou inférieure, un padding généreux et une transition douce au survol (changement de background vers un gris très léger).

### 4.3 ProgressBar

Une ligne fine grise avec un indicateur noir uni.

### 4.4 Console Panel

Un bloc noir massif avec du texte mono blanc/gris.

---

## 5. Instructions de Refactorisation

1. Parcoure l'application actuelle.

2. Remplace tous les arrondis (`rounded-xl`, etc.) par des angles droits ou des arrondis très subtils (`rounded-none` ou `rounded-sm`).

3. Convertis tous les éléments "flottants" en éléments structurés par des lignes de séparation.

4. Harmonise les icônes (Lucide-React) : utilise une épaisseur de trait (`strokeWidth`) de `2` ou `2.5` pour plus d'impact.

5. Assure-toi que l'application est parfaitement responsive en utilisant les préfixes `md:` et `lg:` pour maintenir la grille suisse sur mobile.

---

> **Référence** : Consulter le fichier `swiss_design_reference.html` pour l'aspect visuel final attendu.
