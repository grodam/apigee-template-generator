Prompt d'Intégration UI : Architecture Canvas

Ce prompt est destiné à être utilisé avec Claude Code (ou Claude 3.5/3.7) pour migrer l'interface utilisateur actuelle vers le nouveau modèle de "Canvas" interactif.

Contexte du Projet

Je suis un architecte avec 20 ans d'expérience. Nous transformons une application de configuration d'API qui utilise actuellement un flux linéaire (Wizard avec boutons "Next") en une interface de type Canvas/Node-based. L'objectif est de centraliser tout le paramétrage sur une page unique pour améliorer la "Developer Experience" (DX).

Ta Mission

Tu es un développeur Full-Stack expert en React et Tailwind CSS. Tu dois refactoriser l'UI de l'application actuelle en utilisant le modèle de design fourni ci-dessous.

Contraintes Techniques :

Zéro Régression : Les fonctionnalités métiers existantes (mapping OpenAPI, validation) doivent être conservées.

Layout : Adopter une structure à une seule page sans étapes "Next/Back". Tout doit être visible dans des Cards.

Composants : Utiliser lucide-react pour les icônes et Tailwind CSS pour le styling.

Logique de Complétion : Implémenter le calcul dynamique de progression (%) pour chaque Card en fonction des champs obligatoires.

Logs & Azure : Intégrer le "Side-Drawer" de logs pour le feedback visuel du push vers Azure.

Code de Référence (UI Source)

Voici le prototype React à intégrer. Analyse sa structure d'état (formData) et sa gestion des Cards expandables :

import React, { useState } from 'react';
import { 
  Upload, Package, ShieldCheck, Target, ChevronDown, ChevronUp, 
  Terminal, CheckCircle2, Activity, ExternalLink, Save, CloudUpload 
} from 'lucide-react';

// ... (Insérer ici le code de api_canvas_dashboard.jsx)


Instructions pour l'implémentation :

Analyse de l'existant : Identifie où se trouvent les formulaires actuels (API Product, Proxy, Target).

Mapping : Transfère la logique de ces formulaires dans les nouvelles Cards expandables du prototype.

Initialisation : La "Card 0" doit servir de point d'entrée pour l'import de la spécification OpenAPI. Elle doit déclencher le pré-remplissage des autres cards.

Push Azure : - Implémente le bouton "Push to Azure" dans le header.

Connecte l'action de push à l'ouverture automatique du Side-Drawer de logs.

Affiche les étapes du déploiement en temps réel dans la console.

Health Check : Ajoute le badge d'état de santé dynamique dans la Card Target pour valider le endpoint après le push.

Commence par analyser ma structure de fichiers actuelle et propose-moi un plan d'action avant de modifier le code.