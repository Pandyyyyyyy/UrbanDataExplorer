# 🏠 Dashboard Immobilier Paris - Comparaison par Arrondissement

Dashboard web interactif avec carte choroplèthe pour comparer les prix immobiliers et indicateurs par arrondissement à Paris.

## 🎯 Fonctionnalités

- **Architecture Medallion** (Bronze → Silver → Gold)
- **API REST FastAPI** avec 15+ endpoints
- **Dashboard interactif** avec carte choroplèthe MapLibre
- **8 indicateurs** : Prix/m², Évolution, Logements sociaux, Typologie, Pollution, Délits, Revenus, Densité
- **Export multi-formats** (CSV, Parquet, GeoJSON)

## 🚀 Installation

```bash
pip install -r requirements.txt
python pipeline.py
python api.py
```

Ouvrez `dashboard/index.html` dans votre navigateur.

## 📁 Structure

```
.
├── data/
│   ├── bronze/          # Données brutes
│   ├── silver/          # Données nettoyées
│   ├── gold/            # Données enrichies
│   └── export/          # Tables exportées
├── dashboard/           # Frontend
├── api.py               # API FastAPI
├── pipeline.py          # Pipeline complet
└── requirements.txt
```

## 🔌 API Endpoints

- `GET /arrondissements` - Liste complète
- `GET /prix?annee=2023` - Prix par année
- `GET /comparaison?arr1=1&arr2=6` - Comparaison
- `GET /timeline?arr=6` - Timeline d'évolution
- Documentation : http://localhost:8001/docs

## 📊 Indicateurs

**Principaux** : Prix/m², Évolution temporelle, Logements sociaux (%), Typologie  
**Personnalisés** : Pollution, Délits, Revenus, Densité

## 📋 Documentation projet

- **[SYNTHESE_ECARTS.md](SYNTHESE_ECARTS.md)** — Synthèse des écarts et checklist avant soutenance (vérifications complètes du projet).
- **[VALIDATION_RNCP.md](VALIDATION_RNCP.md)** — Validation des 8 compétences RNCP (preuves, commandes).
- **[BDD_RELATIONNELLE.md](BDD_RELATIONNELLE.md)** · **[BDD_NON_RELATIONNELLE.md](BDD_NON_RELATIONNELLE.md)** — Les 2 compétences BDD (SQL + NoSQL).
- **[DATA_LAKE.md](DATA_LAKE.md)** · **[RGPD.md](RGPD.md)** — Data Lake et conformité.

### Plateforme data (8 compétences RNCP)

```bash
python pipeline.py
docker compose up -d
python scripts/validate_rncp.py
curl http://localhost:8001/health
curl http://localhost:8001/sql/accessibilite
```

Endpoints compétences BDD : `/bdd/relationnelle`, `/bdd/non-relationnelle`, `/sql/accessibilite`, `/mongo/arrondissements`.

## 📝 Licence

MIT License
