"""
Configuration pour les sources de données immobilières.
"""

# Sources de données immobilières pour Paris
REAL_ESTATE_APIS = [
    {
        "name": "dvf_data",
        "url": "https://www.data.gouv.fr/api/1/datasets/demandes-de-valeurs-foncieres/",
        "description": "Données DVF (Demandes de Valeurs Foncières) - données publiques",
        "params": None,
        "format": "json"
    },
    {
        "name": "insee_logements_sociaux",
        "url": "https://api.insee.fr/donnees-locales/V0.1/donnees/geo-ARRONDISSEMENT_PLM@GEO2020RP2017/LOG@GEO2020RP2017",
        "description": "Données INSEE sur les logements sociaux par arrondissement",
        "params": None,
        "format": "json",
        "headers": {
            # Note: Nécessite une clé API INSEE
            # "Authorization": "Bearer YOUR_INSEE_API_KEY"
        }
    }
]

# Sources de données pour les indicateurs personnalisés
CUSTOM_INDICATORS_APIS = [
    {
        "name": "airparif_qualite_air",
        "url": "https://www.data.gouv.fr/api/1/datasets/qualite-de-lair-mesuree-dans-la-station-chatelet-les-halles/",
        "description": "Airparif - Qualité de l'air par arrondissement (via data.gouv.fr)",
        "source": "data.gouv.fr / Airparif",
        "indicator": "pollution_qualite_air"
    },
    {
        "name": "opendata_paris_delits",
        "url": "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/bodacc/records",
        "description": "OpenData Paris - Délits et infractions enregistrés",
        "source": "OpenData Paris",
        "indicator": "delits_enregistres"
    },
    {
        "name": "insee_revenus",
        "url": "https://api.insee.fr/donnees-locales/V0.1/donnees/geo-ARRONDISSEMENT_PLM@GEO2020RP2017/REV@GEO2020RP2017",
        "description": "INSEE - Revenus moyens par arrondissement",
        "source": "INSEE",
        "indicator": "revenus_moyens",
        "headers": {
            # Note: Nécessite une clé API INSEE
            # "Authorization": "Bearer YOUR_INSEE_API_KEY"
        }
    },
    {
        "name": "insee_densite_population",
        "url": "https://api.insee.fr/donnees-locales/V0.1/donnees/geo-ARRONDISSEMENT_PLM@GEO2020RP2017/POP@GEO2020RP2017",
        "description": "INSEE - Densité de population par arrondissement",
        "source": "INSEE",
        "indicator": "densite_population",
        "headers": {
            # Note: Nécessite une clé API INSEE
            # "Authorization": "Bearer YOUR_INSEE_API_KEY"
        }
    }
]

# Configuration des arrondissements de Paris
PARIS_ARRONDISSEMENTS = [
    {"num": 1, "nom": "1er", "code_insee": "75101"},
    {"num": 2, "nom": "2e", "code_insee": "75102"},
    {"num": 3, "nom": "3e", "code_insee": "75103"},
    {"num": 4, "nom": "4e", "code_insee": "75104"},
    {"num": 5, "nom": "5e", "code_insee": "75105"},
    {"num": 6, "nom": "6e", "code_insee": "75106"},
    {"num": 7, "nom": "7e", "code_insee": "75107"},
    {"num": 8, "nom": "8e", "code_insee": "75108"},
    {"num": 9, "nom": "9e", "code_insee": "75109"},
    {"num": 10, "nom": "10e", "code_insee": "75110"},
    {"num": 11, "nom": "11e", "code_insee": "75111"},
    {"num": 12, "nom": "12e", "code_insee": "75112"},
    {"num": 13, "nom": "13e", "code_insee": "75113"},
    {"num": 14, "nom": "14e", "code_insee": "75114"},
    {"num": 15, "nom": "15e", "code_insee": "75115"},
    {"num": 16, "nom": "16e", "code_insee": "75116"},
    {"num": 17, "nom": "17e", "code_insee": "75117"},
    {"num": 18, "nom": "18e", "code_insee": "75118"},
    {"num": 19, "nom": "19e", "code_insee": "75119"},
    {"num": 20, "nom": "20e", "code_insee": "75120"},
]

# Typologies de logements
TYPOLOGIES = {
    "Studio": {"pieces": 1, "surface_min": 0, "surface_max": 30},
    "T2": {"pieces": 2, "surface_min": 30, "surface_max": 50},
    "T3": {"pieces": 3, "surface_min": 50, "surface_max": 80},
    "T4": {"pieces": 4, "surface_min": 80, "surface_max": 120},
    "T5+": {"pieces": 5, "surface_min": 120, "surface_max": 999}
}

