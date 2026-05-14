# Propositions d'application mobile PWA de suivi des calories

## Contexte du projet

Objectif : créer une application de suivi des calories **100% locale**, **pratique**, **rapide à utiliser** et pensée pour un public francophone non technique, dans le même esprit qu'Easy Sport.

### Contraintes techniques retenues

- PWA installable sur iPhone et Android
- HTML / CSS / JavaScript vanilla
- IndexedDB pour le stockage local
- Déploiement sur GitHub Pages
- Aucun backend
- Aucun compte utilisateur
- Données privées conservées uniquement sur l'appareil
- Option internet facultative uniquement pour certaines aides externes comme OpenFoodFacts

### Positionnement global

La vraie différence ne doit pas être seulement de "compter des calories", mais de **supprimer la friction de saisie**. Beaucoup d'applications existantes deviennent vite fatigantes car elles imposent trop de clics, trop de détails ou réservent les fonctions utiles au payant. Ici, la promesse doit être : **tenir dans la durée sans avoir l'impression de faire une corvée**.

---

# Proposition A — **CaloriFlash**

## 1) Nom et concept

**CaloriFlash** est une application de suivi calorique centrée sur une idée simple : **enregistrer un repas en moins de 10 secondes**.  
Elle cible les utilisateurs qui veulent suivre leur alimentation sans entrer dans une logique de coaching trop poussée. L'app mise sur les **favoris, repas récurrents, quantités prédéfinies et gestes ultra-courts**.

Le concept est minimaliste : l'utilisateur ne "cherche" presque jamais un aliment, il **réutilise** ce qu'il mange déjà souvent.

## 2) Philosophie de saisie

La saisie doit être pensée comme un raccourci, pas comme un formulaire.

Principes clés :

- bouton d'ajout visible dès l'ouverture
- favoris en premier, recherche seulement si nécessaire
- mémorisation des petits-déjeuners, déjeuners et collations habituels
- portions par défaut intelligentes
- duplication d'un repas d'hier en 1 geste
- ajout par "blocs repas" plutôt qu'aliment par aliment quand c'est possible
- historique personnel qui remonte automatiquement les aliments les plus utilisés

### Promesse d'usage

- **Petit-déjeuner habituel** : 2 taps
- **Repas déjà enregistré cette semaine** : 1 à 3 taps
- **Ajout d'un aliment courant** : recherche courte + portion prédéfinie
- **Objectif ressenti** : "je note sans casser mon rythme"

## 3) Fonctionnalités clés

1. **Favoris intelligents** : aliments et repas les plus fréquents affichés immédiatement
2. **Repas récurrents** : sauvegarde de modèles comme "petit-déjeuner habituel" ou "salade du midi"
3. **Ajout ultra-rapide** : saisie en moins de 10 secondes pour les cas fréquents
4. **Historique express** : recopier hier, avant-hier ou un repas typique
5. **Recherche locale instantanée** : aliments français courants accessibles hors ligne
6. **Portions prédéfinies** : grammes, portions standard, cuillères, tranches, bols, verres
7. **Recettes simples** : création de plats composés avec calories calculées automatiquement
8. **Résumé du jour clair** : calories consommées, restantes, répartition par repas

## 4) Écran par écran

### Écran 1 — Accueil / Aujourd'hui

Écran principal ultra lisible.

Contenu :

- total calories du jour
- jauge de progression vers l'objectif
- 4 blocs : petit-déjeuner, déjeuner, dîner, collations
- bouton flottant "Ajouter"
- raccourcis "Favoris", "Repas récents", "Copier hier"

Objectif : tout faire depuis cette page sans naviguer loin.

### Écran 2 — Ajout rapide

Écran central de l'application.

Sections :

- favoris personnels
- aliments récents
- repas enregistrés
- recherche rapide
- bouton "Scanner code-barres" si internet disponible

Interaction idéale :

- taper "ban" → banane apparaît immédiatement
- choisir "1 banane moyenne"
- valider

### Écran 3 — Recherche d'aliments

Pour les cas non couverts par les favoris.

Contenu :

- barre de recherche
- suggestions instantanées
- filtres simples : aliments bruts, marques, plats, boissons
- tri par pertinence et fréquence personnelle

### Écran 4 — Détail d'un aliment

Contenu :

- calories pour 100 g
- portions usuelles
- quantité modifiable
- aperçu nutritionnel simple
- bouton "Ajouter aux favoris"

### Écran 5 — Mes repas types

Bibliothèque de repas récurrents.

Exemples :

- "Petit-déj maison"
- "Sandwich jambon-beurre"
- "Pâtes bolognaise"
- "Goûter rapide"

Chaque repas peut être :

- ajouté en un tap
- modifié avant validation
- dupliqué
- renommé

### Écran 6 — Recettes / plats composés

Permet de créer un plat à partir de plusieurs ingrédients.

Contenu :

- liste d'ingrédients
- quantité de chaque ingrédient
- nombre de portions
- calories par portion calculées automatiquement
- bouton "Enregistrer comme repas"

### Écran 7 — Statistiques légères

Écran simple, non culpabilisant.

Contenu :

- moyenne calorique sur 7 jours
- jours complétés
- repas les plus fréquents
- moments oubliés souvent

## 5) Design / ambiance

Ambiance :

- minimaliste
- rassurante
- très claire
- rapide à lire

Direction visuelle :

- fond clair ou légèrement cassé
- accent couleur unique énergique, par exemple orange doux ou vert citron
- cartes larges
- typographie lisible et grande
- très peu de texte inutile
- icônes simples et familières

L'interface doit donner une impression de **fluidité immédiate**, presque comme une app de liste ou de notes rapides.

## 6) Ce qui la différencie des apps payantes

Par rapport à MyFitnessPal, Yazio ou FatSecret, **CaloriFlash** se différencie par :

- une logique orientée **rapidité réelle** et non accumulation de fonctionnalités
- une interface pensée d'abord pour les **habitudes répétitives de la vraie vie**
- aucune pression commerciale, aucune fonction importante bloquée
- aucun compte à créer
- aucune pub
- une expérience locale, privée, simple à comprendre

Là où beaucoup d'apps veulent devenir des plateformes nutrition complètes, CaloriFlash veut devenir **le carnet calorique le plus rapide possible**.

## 7) Avantages et inconvénients

### Avantages

- extrêmement simple à adopter
- très faible friction au quotidien
- idéal pour les personnes qui abandonnent les apps trop complexes
- très cohérent avec une PWA locale
- performant même hors ligne

### Inconvénients

- moins motivant pour les utilisateurs qui aiment les tableaux de bord riches
- moins pertinent pour les profils très orientés macros détaillées
- le minimalisme peut sembler "trop simple" à certains utilisateurs avancés

## Détail spécifique : base de données alimentaire

### Base locale préchargée

Recommandation :

- **1 200 à 1 800 aliments courants français**

Répartition suggérée :

- aliments bruts : fruits, légumes, féculents, viandes, poissons, œufs
- produits courants de supermarché
- boissons
- produits laitiers
- pains, viennoiseries, biscuits
- plats simples connus

Pourquoi ce volume :

- assez riche pour être utile dès le départ
- assez compact pour rester rapide en local
- plus facile à nettoyer et à maintenir qu'une base énorme et hétérogène

### Ajouts personnels

L'utilisateur peut :

- créer ses propres aliments
- modifier un aliment importé dans sa version personnelle
- enregistrer une marque ou une recette maison

### Recherche rapide

La recherche doit prioriser :

1. favoris
2. historique personnel
3. aliments de base locale
4. résultats code-barres si disponibles

### Option code-barres

Intégration possible via **OpenFoodFacts** :

- gratuite
- pratique pour les produits industriels
- nécessite internet au moment de la requête
- les résultats récupérés peuvent ensuite être conservés en local

### Gestion des portions

Portions à prévoir :

- grammes
- kilogrammes
- millilitres
- cuillères à café
- cuillères à soupe
- tranches
- unités
- bols
- verres
- pots

### Recettes / plats composés

Fonctionnement recommandé :

- création d'un plat avec plusieurs ingrédients
- calcul automatique du total
- découpe en portions
- enregistrement du plat en favori
- réutilisation ultra-rapide ensuite

---

# Proposition B — **NutriCap**

## 1) Nom et concept

**NutriCap** est une application qui ne se contente pas de compter : elle aide l'utilisateur à **mieux piloter son alimentation** sans complexité excessive.  
Le concept est celui d'un **coach nutritionnel personnel local**, qui donne des repères concrets sur l'équilibre alimentaire, les calories, les macros et la régularité.

Elle vise les personnes qui veulent :

- perdre du poids
- maintenir leur poids
- reprendre une alimentation structurée
- mieux répartir leurs repas
- être motivées par des objectifs visibles

## 2) Philosophie de saisie

La saisie reste simple, mais elle sert un système de feedback motivant.

Approche :

- l'app réduit les actions répétitives
- en échange, elle donne un retour immédiat utile
- chaque saisie doit "rapporter" une info concrète : calories restantes, équilibre du repas, protéines insuffisantes, rythme de la journée

L'idée n'est pas de faire de la nutrition anxiogène, mais de fournir un **cadre rassurant**.

### Promesse d'usage

- l'utilisateur sait où il en est en quelques secondes
- il comprend si sa journée est équilibrée
- il voit des progrès sans devoir analyser lui-même

## 3) Fonctionnalités clés

1. **Objectif personnalisé** : perte, maintien, prise légère, objectif calorique quotidien
2. **Suivi des macros** : protéines, glucides, lipides avec repères visuels simples
3. **Dashboard motivant** : progression journalière, hebdomadaire et tendances
4. **Suggestions d'équilibre** : recommandations douces du type "repas léger en protéines"
5. **Streaks de régularité** : jours complets consécutifs, semaines suivies
6. **Repas enregistrés** : pour conserver la rapidité de saisie
7. **Bilan fin de journée** : résumé utile et non culpabilisant
8. **Objectifs secondaires** : eau, fibres, légumes, régularité des repas

## 4) Écran par écran

### Écran 1 — Tableau de bord

Page d'accueil plus riche que dans la proposition A.

Contenu :

- calories consommées / objectif
- macros sous forme d'anneaux ou barres
- score d'équilibre du jour
- streak actuel
- message utile du jour
- raccourci "Ajouter un repas"

### Écran 2 — Ajout d'un repas

Toujours rapide, mais un peu plus structuré.

Contenu :

- favoris
- recherche
- repas récurrents
- recettes
- code-barres

Après validation :

- mini feedback visuel : "il vous reste X kcal"
- indication éventuelle : "protéines encore basses aujourd'hui"

### Écran 3 — Analyse du repas

Écran différenciant.

Contenu :

- calories du repas
- estimation protéines / glucides / lipides
- repère simple : équilibré, riche en glucides, faible en protéines, etc.
- conseils très courts, non techniques

### Écran 4 — Historique et tendances

Contenu :

- vue 7 jours / 30 jours
- moyenne calorique
- jours dans la cible
- répartition par repas
- heures de prise alimentaire les plus fréquentes

### Écran 5 — Objectifs personnels

L'utilisateur définit :

- objectif calorique
- objectif protéique
- rythme de repas
- préférence simple : "je veux surtout perdre", "je veux mieux manger", "je veux stabiliser"

### Écran 6 — Centre motivation

Contenu :

- streak actuel
- nombre de jours complets
- meilleures semaines
- mini badges liés à la régularité
- phrases encourageantes sobres

### Écran 7 — Bibliothèque recettes et repas

Contenu :

- recettes maison
- plats composés
- repas enregistrés
- duplication et ajustement des portions

## 5) Design / ambiance

Ambiance :

- plus premium
- plus moderne
- plus motivante
- plus "coach personnel"

Direction visuelle :

- couleurs profondes mais douces, par exemple bleu pétrole, vert sauge, corail
- cartes élégantes
- graphiques simples mais beaux
- animations courtes de validation
- hiérarchie visuelle nette

Le but est d'avoir une app qui semble sérieuse, sans devenir médicale ni austère.

## 6) Ce qui la différencie des apps payantes

**NutriCap** peut se distinguer par :

- un coaching **simple et local**, sans surcharger l'utilisateur
- des conseils compréhensibles pour un francophone non expert
- une expérience sans verrou payant sur les macros ou l'analyse de base
- une présentation plus humaine et moins "base de données brute"
- une vie privée renforcée : rien n'est envoyé sur un serveur

Face à MyFitnessPal ou Yazio, l'app peut être perçue comme **plus respectueuse, moins commerciale et plus claire**.

## 7) Avantages et inconvénients

### Avantages

- plus motivante dans la durée
- donne du sens à la saisie
- utile pour les objectifs de perte ou stabilisation
- bon compromis entre simplicité et accompagnement
- plus forte valeur perçue face aux apps premium

### Inconvénients

- un peu plus complexe que la proposition ultra-minimaliste
- demande un design très bien maîtrisé pour ne pas sembler chargé
- les suggestions nutritionnelles doivent rester prudentes pour ne pas donner l'impression d'un faux avis médical

## Détail spécifique : base de données alimentaire

### Base locale préchargée

Recommandation :

- **1 500 à 2 500 aliments**

La base doit contenir :

- calories
- protéines
- glucides
- lipides
- parfois fibres et sucres quand disponibles

Pour un coach nutritionnel, il faut une donnée plus riche que pour la proposition A.

### Ajouts personnels

L'utilisateur peut :

- créer un aliment personnel
- créer une version "ma marque"
- ajouter ses valeurs nutritionnelles
- enregistrer ses recettes favorites

### Recherche rapide

Recherche avec priorités :

1. historique personnel
2. aliments compatibles avec ses habitudes
3. base intégrée
4. résultats externes code-barres

### Option code-barres

OpenFoodFacts convient bien ici pour :

- les produits emballés
- les céréales, yaourts, snacks, plats préparés
- l'import ponctuel de fiches produits

L'app devra afficher clairement :

- "nécessite internet"
- "vérifier les valeurs si besoin"

### Gestion des portions

Portions recommandées :

- grammes / ml
- unités standard
- portions domestiques
- cuillères
- tranches
- verres
- barquettes

L'idéal est d'afficher à la fois :

- la portion standard
- une saisie libre en grammes

### Recettes / plats composés

Fonction recommandée :

- créer une recette complète
- stocker ingrédients + macros
- calculer par portion
- réutiliser dans un plan de repas
- proposer ensuite la recette dans les suggestions rapides

---

# Proposition C — **SnapCal**

## 1) Nom et concept

**SnapCal** est une application plus visuelle et plus engageante, qui transforme le suivi des calories en **journal photo alimentaire**.  
Le concept repose sur une entrée principale par **photo du repas**, enrichie ensuite par une saisie simplifiée. L'objectif n'est pas forcément une reconnaissance IA complexe hors scope, mais une expérience où l'utilisateur commence par **capturer son repas**, puis complète rapidement.

Cette proposition convient aux personnes qui aiment :

- visualiser leur journée
- garder une trace concrète de leurs repas
- être stimulées par des badges, défis et objectifs
- partager éventuellement leur progression avec elles-mêmes ou un proche, sans réseau social public

## 2) Philosophie de saisie

La saisie ne commence pas par "chercher un aliment" mais par **prendre une photo ou choisir une image**.

Ensuite l'app aide à compléter vite :

- tags rapides
- aliments suggérés parmi les habituels
- portions standards
- duplication des repas similaires

La photo devient un repère mémoire. Cela réduit l'effort mental, car beaucoup d'utilisateurs oublient surtout **ce qu'ils ont mangé**, pas seulement les calories.

### Promesse d'usage

- je prends la photo
- j'ajoute 2 ou 3 infos
- mon journal reste motivant et vivant

## 3) Fonctionnalités clés

1. **Entrée par photo** : appareil photo ou galerie
2. **Journal visuel** : timeline des repas avec miniatures
3. **Ajout calorique assisté** : favoris et suggestions rapides après la photo
4. **Badges et défis** : semaine complète, 3 petits-déjeuners suivis, 5 jours équilibrés
5. **Résumé par couleurs** : journées légères, denses, équilibrées
6. **Repas favoris illustrés** : les plats récurrents sont reconnaissables visuellement
7. **Recettes maison illustrées** : enregistrer un plat avec sa photo
8. **Mode motivation** : objectifs personnels, progression et récompenses visuelles

## 4) Écran par écran

### Écran 1 — Journal visuel du jour

Écran principal type timeline.

Contenu :

- photos des repas du jour
- calories par repas
- total du jour
- bouton central "Photographier"
- progression de l'objectif

### Écran 2 — Capture / ajout photo

Contenu :

- prendre une photo
- importer depuis la galerie
- recadrer simplement
- associer le repas : petit-déjeuner, déjeuner, dîner, collation

### Écran 3 — Compléter le repas

Après la photo :

- favoris proposés
- aliments récents
- recherche rapide
- portions standards
- ajout d'une note courte facultative

### Écran 4 — Détail visuel d'un repas

Contenu :

- grande photo
- liste des aliments associés
- calories totales
- portions choisies
- bouton "Enregistrer comme repas type"

### Écran 5 — Défis et badges

Contenu :

- défis actifs
- badges débloqués
- progression hebdomadaire
- objectifs simples et ludiques

Exemples :

- 7 jours avec au moins 2 repas loggés
- 5 dîners maison enregistrés
- 10 collations suivies sans oubli

### Écran 6 — Galerie / calendrier

Contenu :

- vue calendrier
- jours colorés selon le niveau de complétion
- accès aux photos et repas passés
- repérage très rapide des journées oubliées

### Écran 7 — Recettes illustrées

Contenu :

- plats composés avec photo
- calories par portion
- duplication rapide
- classement par catégories : maison, rapide, plaisir, déjeuner type

## 5) Design / ambiance

Ambiance :

- chaleureuse
- moderne
- motivante
- plus émotionnelle

Direction visuelle :

- fond clair chaleureux ou mode sombre très soigné
- cartes photo généreuses
- couleurs gourmandes et fraîches
- badges élégants, pas enfantins
- micro-animations de récompense

L'idée est de créer une app qui donne envie d'ouvrir son journal, pas seulement de remplir des chiffres.

## 6) Ce qui la différencie des apps payantes

**SnapCal** se distingue par :

- une approche plus visuelle que purement comptable
- une expérience proche du journal personnel, pas seulement du compteur nutritionnel
- une motivation par la mémoire visuelle et le plaisir d'usage
- une gamification légère sans abonnement
- une confidentialité forte : photos et journal restent sur l'appareil

Face aux apps classiques, elle se différencie en rendant l'expérience **plus humaine, plus incarnée et plus engageante**.

## 7) Avantages et inconvénients

### Avantages

- très engageante pour les utilisateurs visuels
- bon levier de fidélisation
- les photos aident à se souvenir des repas
- fort potentiel de design différenciant
- sensation d'app moderne et premium

### Inconvénients

- plus lourde à concevoir qu'une simple app texte
- stockage local des images à optimiser
- la photo seule ne suffit pas pour calculer des calories précises, il faut toujours une validation utilisateur
- peut moins convenir aux personnes qui veulent aller le plus vite possible sans image

## Détail spécifique : base de données alimentaire

### Base locale préchargée

Recommandation :

- **1 000 à 1 500 aliments courants**

Pourquoi un peu moins :

- la proposition met davantage l'accent sur le journal visuel et les repas types
- les utilisateurs s'appuieront plus vite sur leurs propres habitudes illustrées

### Ajouts personnels

Très important ici :

- aliments personnalisés
- repas illustrés personnels
- recettes maison avec photo
- plats favoris classés visuellement

### Recherche rapide

Recherche hybride :

1. repas visuels personnels
2. favoris
3. aliments récents
4. base locale
5. code-barres internet si besoin

### Option code-barres

Très utile pour :

- snacks
- boissons
- produits emballés pris en photo

OpenFoodFacts peut compléter l'expérience, mais doit rester optionnel et clairement signalé comme dépendant d'internet.

### Gestion des portions

Portions nécessaires :

- grammes
- portions standard
- unités
- cuillères
- tranches
- verres
- bols

Dans cette proposition, les visuels de portions peuvent être particulièrement utiles :

- "1 bol"
- "1 part"
- "1 assiette moyenne"

### Recettes / plats composés

Ici, les recettes doivent être très attractives :

- photo du plat
- liste des ingrédients
- nombre de portions
- calories par portion
- réutilisation dans la timeline en un tap

---

# Comparatif synthétique des 3 approches

## A — CaloriFlash

### Idéal pour

- les personnes pressées
- les utilisateurs qui abandonnent vite
- ceux qui veulent juste suivre sans prise de tête

### Positionnement

- ultra-pratique
- très simple
- focalisé usage quotidien

## B — NutriCap

### Idéal pour

- les personnes ayant un objectif précis
- celles qui aiment comprendre leur équilibre alimentaire
- les utilisateurs motivés par des tableaux de bord clairs

### Positionnement

- coach nutritionnel accessible
- plus premium
- plus analytique

## C — SnapCal

### Idéal pour

- les profils visuels
- les utilisateurs attirés par une app engageante
- ceux qui aiment les badges, défis et journaux photo

### Positionnement

- plus émotionnel
- plus différenciant visuellement
- plus moderne dans l'expérience

---

# Recommandation stratégique

Si l'objectif principal est de créer une app **vraiment pratique** et de maximiser l'adhésion quotidienne, la meilleure base de départ est :

## **Recommandation n°1 : partir de la Proposition A — CaloriFlash**

Pourquoi :

- c'est la plus cohérente avec la promesse "la saisie ne doit pas être une contrainte"
- c'est la plus simple à développer proprement en PWA locale
- c'est celle qui peut être comprise immédiatement par un public non technique
- elle a un vrai angle différenciant face aux apps trop chargées

Ensuite, il serait pertinent d'ajouter progressivement :

- depuis la proposition B : les objectifs, le dashboard, les streaks
- depuis la proposition C : quelques éléments visuels et badges légers

## Ordre de construction conseillé

### Version 1

- cœur ultra-rapide de CaloriFlash
- base locale d'aliments
- favoris
- repas récurrents
- recettes
- résumé du jour

### Version 2

- objectifs personnalisés
- macros simples
- dashboard motivant
- streaks

### Version 3

- journal visuel optionnel
- photos repas
- badges
- défis

Cette trajectoire permet de construire une app utile très vite, tout en gardant un potentiel d'évolution fort.

---

# Suggestion de nom de dépôt GitHub

Comme le compte GitHub mentionné est **joeguigui79-blip**, quelques idées de dépôt :

- `caloriflash`
- `nutricap-pwa`
- `snapcal-pwa`
- `suivi-calories-pwa`
- `easy-calories`

Si le but est d'être proche de l'esprit Easy Sport, **`easy-calories`** ou **`caloriflash`** sont les noms les plus parlants.

---

# Conclusion

Les trois approches sont viables avec la stack choisie, mais elles répondent à des besoins différents :

- **CaloriFlash** : meilleure option si la priorité absolue est la rapidité et la simplicité
- **NutriCap** : meilleure option si l'on veut une vraie sensation de coaching personnel
- **SnapCal** : meilleure option si l'on veut une app très engageante, visuelle et différenciante

Pour un produit utile, francophone, local, installable et durable, la stratégie la plus solide consiste à **commencer ultra-pratique**, puis enrichir sans alourdir.