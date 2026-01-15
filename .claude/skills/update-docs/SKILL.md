---
name: update-docs
description: Met a jour la documentation du projet (CLAUDE.md, README) apres des modifications de code. Utilise ce skill automatiquement apres avoir fait des changements significatifs au projet.
---

# Update Documentation

## Quand utiliser ce skill

Apres avoir effectue des modifications significatives au projet:
- Ajout de nouvelles fonctionnalites
- Modification de l'architecture ou de la structure
- Ajout de nouveaux services, composants ou utilitaires
- Changement des commandes de build/dev
- Modification des dependances importantes
- Changement des conventions de code

## Instructions

### 1. Analyser les changements effectues

Identifier ce qui a change:
- Nouveaux fichiers ou dossiers
- Nouvelles fonctionnalites
- Changements d'architecture
- Nouvelles dependances
- Nouvelles commandes

### 2. Mettre a jour CLAUDE.md

Le fichier `CLAUDE.md` a la racine du projet doit refleter:
- La structure actuelle du projet
- Les commandes disponibles
- La stack technique
- Les conventions de code
- L'architecture des services
- Les fichiers de configuration importants

Sections a verifier:
- **Quick Start**: Commandes toujours valides?
- **Structure du Projet**: Nouveaux dossiers/fichiers importants?
- **Stack Technique**: Nouvelles dependances majeures?
- **Commandes**: Nouvelles commandes ajoutees?
- **Architecture**: Nouveaux services ou patterns?
- **Conventions**: Nouvelles conventions etablies?

### 3. Mettre a jour le README si necessaire

Le fichier `apigee-react-generator/README.md` est destine aux utilisateurs finaux.
Mettre a jour si:
- Nouvelles fonctionnalites utilisateur
- Changement d'utilisation
- Nouvelles options de configuration

### 4. Format des mises a jour

- Garder le style concis et technique
- Pas d'emojis sauf demande explicite
- Utiliser le francais pour CLAUDE.md
- Utiliser l'anglais pour README.md (documentation utilisateur)

## Exemple de workflow

```
1. Apres avoir ajoute un nouveau service `src/services/newService.ts`:
   - Ajouter dans CLAUDE.md section "Services Principaux"

2. Apres avoir ajoute une nouvelle commande npm:
   - Ajouter dans CLAUDE.md section "Commandes"

3. Apres avoir ajoute une nouvelle dependance majeure:
   - Ajouter dans CLAUDE.md section "Stack Technique"
```

## Checklist rapide

- [ ] CLAUDE.md reflete la structure actuelle
- [ ] Nouvelles commandes documentees
- [ ] Nouveaux services/composants mentionnes
- [ ] Stack technique a jour
- [ ] README utilisateur mis a jour si impact UX
