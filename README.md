
# Cross scolaire – WebApp de gestion (HTML/JS/CSS)

Application 100% locale pour gérer un **cross scolaire** : import des élèves, création de **courses au tour** ou **au temps**, génération de **dossards avec code-barres**, **scans** en direct, **classements** (individuel / par classe) et **impression** A4.

- Démo : https://www.webjeje.com/online/webapp/cross/
- Stack : **Vanilla HTML/CSS/JS**, aucune dépendance build, 1 lib CDN (JsBarcode).
- Données : **localStorage** (local-first, pas de serveur).

---

## ✨ Fonctionnalités

- **Import des élèves**
  - CSV (`nom,prenom,classe,date_naissance,genre`) ou **saisie manuelle** (seul `nom` est requis).
  - **Reset général** (élèves + courses + résultats) avec confirmation.

- **Paramétrages des courses**
  - Création par **filtres** (genre, classes, âge min/max, date de référence optionnelle).
  - Deux types :
    - **Course au tour** : chaque **scan** du dossard = **+1 tour**.
    - **Course au temps** : **ordre d’arrivée** avec **chrono mm:ss**.
  - **Édition** d’une course existante (réécrit participants + **efface** ses résultats).

- **Dossards (½ A4, 2 par page A4)**
  - Attribution automatique (préfixe + numéro de départ).
  - **Code-barres CODE128** (scan = numéro de dossard).
  - Aperçu + **impression**.

- **Course au tour (live)**
  - Deux groupes de commandes :
    - **G1** : *Charger* / *Réinitialiser* (focus **inactif**).
    - **G2** : *Démarrer* / *Fin* (focus **actif**).
  - Classement **individuel** (tours + dernier scan) et **par classe** (tours cumulés).
  - **Focus scanner** “collant” (reprend seul), **pause auto** quand une liste `<select>` est ouverte.

- **Course au temps (live)**
  - Deux groupes de commandes :
    - **G1** : *Charger* / *Réinitialiser* (focus **inactif**, chrono `00:00`).
    - **G2** : *Départ* / *Fin* (focus **actif**, chrono **mm:ss**).
  - Liste **Inscrits** (encore en course) & **Arrivées** (temps au format mm:ss, horodatage).
  - Un dossard ne peut **arriver qu’une fois** (anti-doublon).

- **Résultats & impression**
  - Écran en **thème dark** (texte clair).
  - Impression **fond blanc / texte noir** (CSS `@media print`).
  - Courses au tour : impression **individuelle** *et* **par classe**.

- **Aide intégrée**
  - Bouton **Aide** (header) → **modal** de mode d’emploi. Fond de l’appli avec **effet blur** quand un modal est ouvert.

---

## 🧭 Mode d’emploi (exhaustif)

### 1) Import des élèves
- **CSV** : choisissez le fichier puis cliquez **Importer**. Colonnes supportées :  
  `nom, prenom, classe, date_naissance, genre`  
  > Seul **nom** est requis. Séparateur **,** ou **;**.
- **Manuel** : renseignez au minimum **Nom** puis **Ajouter**.
- **Reset général** : efface **tout** (élèves, courses, inscriptions, résultats). Confirmation demandée.

**Exemple CSV minimal**
```csv
nom,prenom,classe,date_naissance,genre
Dupont,Emma,5A,2013-04-12,F
Martin,Noah,5B,2013-11-03,M
````

### 2) Paramétrages

* Saisissez **Nom**, **Type** (Tours / Temps), **Date** (option).
* **Filtres** : Genre, Classes (`5A,5B`), Âge min/max (âge calculé au **31/12** de l’année de la date si fournie, sinon année courante).
* **Prévisualiser** → affiche les élèves correspondants.
* **Créer la course** → génère la liste d’inscrits.
* **Éditer** (tableau des courses) → met à jour la course (réinscrit les participants filtrés et **remet à zéro** ses résultats).

### 3) Dossards

* Choisir la **course**, définir **Préfixe** (option) et **Début** (ex. 1).
* **Générer** → numérote et crée les **code-barres CODE128**.
* **Imprimer** : format **½ A4** (**2 dossards par A4**).
  *Astuce douchette : le code-barres encode **exactement** le numéro de dossard.*

### 4) Course au tour (comptage par scan)

1. **G1** : *Choisir la course* (type Tours) → **Charger**.
   (La liste des participants est prête ; focus scanner **inactif**.)
2. **G2** : **Démarrer** → focus scanner **actif**.
   Chaque scan du dossard **ajoute 1 tour** et met à jour le **live**.
3. **Fin** → stoppe la course et **relâche** le focus.
4. **Réinitialiser** (G1) → efface les résultats de cette course (participants intacts).

> La liste `<select>` **met en pause** le focus collant quand on l’ouvre, puis le focus **reprend** automatiquement à la fermeture.

### 5) Course au temps (ordre d’arrivée)

1. **G1** : *Choisir la course* (type Temps) → **Charger**.
   Vous voyez **Inscrits** (participants avec dossard) et **Arrivées** (vide).
2. **G2** : **Départ** → lance le **chrono** (format **mm\:ss**) et **active** le focus “arrivées”.
3. Scannez chaque **arrivant** : l’athlète quitte **Inscrits** et entre dans **Arrivées** avec son **temps** + **horodatage**.
4. **Fin** → stoppe la saisie et relâche le focus.
5. **Réinitialiser** (G1) → efface les arrivées et remet le chrono à `00:00`.

### 6) Résultats & impression

* Sélectionnez la **course**.
* **Course au tour** : basculez entre **Individuel** (tours) et **Par classe** (tours cumulés), imprimez l’un ou l’autre.
* **Course au temps** : imprimez la liste d’arrivée standard.
* **Affichage écran** : thème **dark** (texte clair).
* **Impression** : **fond blanc / texte noir** forcé pour lisibilité.

---

## 🧩 Caractéristiques techniques

### Architecture

* **Front-only**, aucun backend, fichiers statiques :

  ```
  /index.html
  /styles.css
  /app.js
  ```
* **Données** : `localStorage` (clé/valeur JSON).

### Dépendances

* **JsBarcode** (CDN) pour générer les **CODE128** dans les dossards.
* Aucune autre librairie. Pas de bundler, pas de build.

### Stockage (localStorage)

* `cross.students` → `Array<Eleve>`
* `cross.courses`  → `Array<Course>`
* `cross.entries.<courseId>` → `Array<{studentId, bib}>`
* `cross.res.laps.<courseId>` → `{ lapsByBib: { [bib]: number }, last: { [bib]: ISOString }, started: boolean }`
* `cross.res.time.<courseId>` → `{ startedAt: epochMs | null, arrivals: Array<{ bib, ms, at: ISOString }> }`

**Schémas**

```ts
type Eleve = {
  id: string;           // uid
  nom: string;          // requis
  prenom?: string;
  classe?: string;
  naissance?: string;   // ISO (YYYY-MM-DD) sinon vide
  genre?: 'F'|'M'|'X'|''; 
};

type Course = {
  id: string;           // uid
  nom: string;
  type: 'laps'|'time';  // tours|temps
  date?: string|null;   // ISO date pour calcul d'âge (option)
  filters: {
    genre?: 'F'|'M'|'X'|'';
    classes?: string[]; // ex. ['5A','5B']
    ageMin?: number|null;
    ageMax?: number|null;
  };
  entriesCount: number; // participants inscrits (dossard à attribuer ensuite)
};
```

### UX & États (G1 / G2)

* **G1** (Charger, Réinitialiser) **actif** seulement **hors course** (state `idle`/`loaded`), **désactivé** en `running`.
* **G2** (Démarrer/Fin ou Départ/Fin) **actif** en `loaded`/`running` ; bascule **Start ↔ Fin** selon l’état.
* **Focus “collant”** (scanner) actif en **G2**, inactif en **G1** ; **pause auto** durant l’ouverture d’un `<select>`.

### Impression

* Rendu **noir sur blanc** forcé (`@media print`) + désactivation de l’habillage sombre.
* **Dossards** : **½ A4** → **2 par page A4** (bordures, grosse typographie, code-barres).

### Compatibilité & Matériel

* Navigateurs modernes (Chrome/Edge/Firefox, Safari récents).
* **Douchette USB** (mode clavier) ou **caméra/lecteur** configuré pour envoyer la valeur + `Enter`.
* Aucun prérequis réseau une fois la page chargée (mais **pas** de Service Worker/PWA).

### Performance

* Tri/agrégation **en mémoire** (listes en centaines/quelques milliers d’entrées sans souci).
* Rendu progressif (DOM direct), rafraîchissements ciblés par onglet.

### Sécurité & confidentialité

* **Aucune donnée** quittant le navigateur.
* **Pas de traqueur**, pas d’analytics.
* Réinitialisation complète disponible (et par course).

---

## 🚀 Installation & Déploiement

### Local (démo rapide)

* Ouvrez `index.html` dans votre navigateur.

  > Pour éviter des restrictions locales (certaines lectures de fichiers), vous pouvez aussi lancer un mini serveur :

  ```bash
  # Python
  python3 -m http.server 8080
  # ou Node
  npx http-server -p 8080
  ```

  Puis ouvrez `http://localhost:8080`.

### GitHub Pages

1. Créez un dépôt et poussez `index.html`, `styles.css`, `app.js`.
2. **Settings → Pages** → Source = `main` / `/ (root)`.
3. L’URL sera fournie par GitHub Pages (quelques minutes).

### Netlify / Vercel

* Nouveau site → **déploiement statique** (aucune config particulière).

---

## 🧪 Tests manuels conseillés

* Import CSV avec virgule **et** point-virgule.
* Filtres par classe + genre + bornes d’âge.
* Dossards avec **préfixe** (ex. `C1-`) & départ ≠ 1.
* Laps : scan **rapide** (doublons rapprochés), pause focus via `<select>`.
* Time : `Départ` → scan arrivées → **anti-doublon** → `Fin`.
* Résultats : bascule **individuel / par classe** + **impression** (contraste OK).

---

## 🛠️ Personnalisation

* **Styles** : variables CSS dans `:root` (`styles.css`) – couleurs, bordures, etc.
* **Logo/entête d’évènement** : zone “Nom de l’évènement” dans l’onglet dossards.
* **Format des dossards** : règles `@media print` (largeur/hauteur ½ A4) ajustables si besoin.

---

## ❓Dépannage

* **La liste de courses ne s’ouvre pas**
  → Le focus scanner se **met en pause** quand vous ouvrez une liste. Sinon, cliquez **Fin** (G2) ou **Charger** (G1) pour reprendre la main.

* **Impression sombre / fond noir**
  → Le thème d’impression force **fond blanc / texte noir**. Vérifiez “Imprimer l’arrière-plan” si votre navigateur l’exige.

* **Codes-barres non lus**
  → Vérifiez la **police** de la douchette (mode clavier), et que le **retour chariot** (`Enter`) est bien envoyé après le code.

---

## 📂 Structure du projet

```
.
├── index.html     # Interface (onglets, modals, selects)
├── styles.css     # Thème dark (écran), thème print (noir sur blanc), mise en page dossards
└── app.js         # Logique : import, filtres, courses, dossards, scan, chrono, résultats, stockage
```

---

## 🤝 Contribuer

* Issues & PR bienvenues (bugs, accessibilité, compatibilité matériels).
* Idées futures : export PDF/CSV des résultats, classements multi-critères, service worker (PWA), multi-postes (WebRTC).

---

## 📄 Licence

À définir par l’auteur du dépôt (recommandation : **MIT**).

---

```

Si tu veux, je peux aussi te générer un **badge de release** + un **CHANGELOG** minimal pour le dépôt.
```
