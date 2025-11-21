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
- Documentation : http://localhost:8000/docs

## 📊 Indicateurs

**Principaux** : Prix/m², Évolution temporelle, Logements sociaux (%), Typologie  
**Personnalisés** : Pollution, Délits, Revenus, Densité

## 📝 Licence

MIT License
