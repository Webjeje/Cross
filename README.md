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
